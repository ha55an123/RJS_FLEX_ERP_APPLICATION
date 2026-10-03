from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel
from datetime import datetime, date, timedelta
from app.core.database import get_db
from app.core.auth_dependencies import require_role, get_current_user
from app.models.user import User
from app.models.gym_member import GymMember
from app.models.gym_attendance import GymAttendance, CheckInMethod, AttendanceStatus
from app.models.biometric_device import BiometricDevice, DeviceStatus
from app.models.biometric_registration import BiometricRegistration, BiometricType, RegistrationStatus
from app.services.biometric_service import BiometricDeviceFactory, DeviceUser
from loguru import logger

router = APIRouter(prefix="/fingerprint-attendance", tags=["Fingerprint Attendance"])

STAFF_ROLES = ["super_admin", "gym_owner", "manager", "receptionist"]
MANAGER_ROLES = ["super_admin", "gym_owner", "manager"]


class FingerprintAttendanceRequest(BaseModel):
    biometric_user_id: str
    device_id: int
    branch_id: int
    verification_type: str = "fingerprint"


class FingerprintAttendanceResponse(BaseModel):
    success: bool
    message: str
    member_id: Optional[int] = None
    member_name: Optional[str] = None
    member_code: Optional[str] = None
    attendance_recorded: bool = False
    check_in_time: Optional[str] = None
    check_out_time: Optional[str] = None


class DeviceStatusResponse(BaseModel):
    device_id: int
    device_name: str
    connection_status: str
    last_heartbeat: Optional[str] = None
    is_active: bool


class FingerprintEnrollRequest(BaseModel):
    member_id: int
    device_id: int
    biometric_user_id: str


class FingerprintEnrollResponse(BaseModel):
    success: bool
    message: str
    biometric_user_id: Optional[str] = None
    device_name: Optional[str] = None


@router.post("/record", response_model=FingerprintAttendanceResponse)
def record_fingerprint_attendance(
    data: FingerprintAttendanceRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Record attendance from fingerprint scanner.
    This endpoint is called by the biometric agent/device when a fingerprint is verified.
    """
    try:
        # Verify device exists and is active
        device = db.query(BiometricDevice).filter(
            BiometricDevice.id == data.device_id,
            BiometricDevice.is_active == True
        ).first()
        
        if not device:
            logger.warning(f"Device {data.device_id} not found or inactive")
            return FingerprintAttendanceResponse(
                success=False,
                message="Device not found or inactive"
            )
        
        if device.connection_status != DeviceStatus.ONLINE.value:
            logger.warning(f"Device {data.device_id} is not online")
            return FingerprintAttendanceResponse(
                success=False,
                message="Device is not online"
            )
        
        # Find biometric registration by zkteco_user_id and device_id
        registration = db.query(BiometricRegistration).filter(
            BiometricRegistration.zkteco_user_id == data.biometric_user_id,
            BiometricRegistration.device_id == data.device_id,
            BiometricRegistration.status == RegistrationStatus.ACTIVE
        ).first()
        
        if not registration:
            raise HTTPException(
                status_code=404,
                detail=f"No biometric registration found for ZKTeco User ID: {data.biometric_user_id} on device {data.device_id}"
            )
        
        # Get member from registration
        member = db.query(GymMember).filter(
            GymMember.id == registration.member_id,
            GymMember.deleted_at.is_(None)
        ).first()
        
        if not member:
            raise HTTPException(
                status_code=404,
                detail=f"Member not found for registration ID: {registration.id}"
            )
        
        # Determine check-in method based on verification type
        check_in_method = CheckInMethod.FINGERPRINT
        if data.verification_type == "face":
            check_in_method = CheckInMethod.FACE
        
        # Check duplicate attendance (within 1 hour)
        one_hour_ago = datetime.utcnow() - timedelta(hours=1)
        recent_attendance = db.query(GymAttendance).filter(
            GymAttendance.member_id == member.id,
            GymAttendance.check_in_time >= one_hour_ago
        ).first()
        
        if recent_attendance:
            logger.info(f"Duplicate attendance prevented for member {member.id}")
            return FingerprintAttendanceResponse(
                success=True,
                message="Attendance already recorded recently",
                member_id=member.id,
                member_name=member.full_name,
                member_code=member.member_code,
                attendance_recorded=False,
                check_in_time=recent_attendance.check_in_time.isoformat() if recent_attendance.check_in_time else None,
                check_out_time=recent_attendance.check_out_time.isoformat() if recent_attendance.check_out_time else None
            )
        
        # Record attendance
        today = date.today()
        today_attendance = db.query(GymAttendance).filter(
            GymAttendance.member_id == member.id,
            GymAttendance.attendance_date == today
        ).first()
        
        attendance_recorded = False
        check_in_time = None
        check_out_time = None
        
        if today_attendance and today_attendance.status == AttendanceStatus.CHECKED_IN.value:
            # Record check-out
            today_attendance.check_out_time = datetime.utcnow()
            today_attendance.status = AttendanceStatus.CHECKED_OUT.value
            today_attendance.total_hours = round(
                (today_attendance.check_out_time - today_attendance.check_in_time).total_seconds() / 3600, 2
            )
            db.commit()
            attendance_recorded = True
            check_out_time = today_attendance.check_out_time.isoformat()
            logger.info(f"Check-out recorded for member {member.id} via {check_in_method}")
        else:
            # Record check-in
            attendance = GymAttendance(
                member_id=member.id,
                branch_id=data.branch_id,
                device_id=data.device_id,
                attendance_date=date.today(),
                check_in_time=datetime.utcnow(),
                method=check_in_method,
                status=AttendanceStatus.CHECKED_IN.value,
                recorded_by=current_user.id
            )
            db.add(attendance)
            db.commit()
            attendance_recorded = True
            check_in_time = attendance.check_in_time.isoformat()
            logger.info(f"Check-in recorded for member {member.id} via {check_in_method}")
        
        # Update device heartbeat
        device.last_heartbeat = datetime.utcnow()
        device.connection_status = DeviceStatus.ONLINE.value
        db.commit()
        
        return FingerprintAttendanceResponse(
            success=True,
            message="Attendance recorded successfully",
            member_id=member.id,
            member_name=member.full_name,
            member_code=member.member_code,
            attendance_recorded=attendance_recorded,
            check_in_time=check_in_time,
            check_out_time=check_out_time
        )
        
    except Exception as e:
        logger.error(f"Biometric attendance error: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to record attendance: {str(e)}")


@router.get("/device-status/{device_id}", response_model=DeviceStatusResponse)
def get_device_status(
    device_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_role(STAFF_ROLES)),
):
    """Get the current status of a fingerprint device"""
    device = db.query(BiometricDevice).filter(
        BiometricDevice.id == device_id
    ).first()
    
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    
    return DeviceStatusResponse(
        device_id=device.id,
        device_name=device.device_name,
        connection_status=device.connection_status,
        last_heartbeat=device.last_heartbeat.isoformat() if device.last_heartbeat else None,
        is_active=device.is_active
    )


@router.get("/devices")
def list_active_devices(
    branch_id: Optional[int] = None,
    db: Session = Depends(get_db),
    _=Depends(require_role(STAFF_ROLES)),
):
    """List active fingerprint devices for attendance"""
    from app.models.biometric_device import DeviceBrand
    
    q = db.query(BiometricDevice).filter(
        BiometricDevice.is_active == True
    )
    
    # Remove brand filter to show all biometric devices, not just specific brands
    # This ensures devices are visible even if brand is not set to ZKTeco/eSSL/Suprema
    
    if branch_id:
        q = q.filter(BiometricDevice.branch_id == branch_id)
    
    devices = q.all()
    
    return [
        {
            "id": d.id,
            "device_name": d.device_name,
            "brand": d.brand,
            "model": d.model,
            "ip_address": d.ip_address,
            "connection_status": d.connection_status,
            "last_heartbeat": d.last_heartbeat.isoformat() if d.last_heartbeat else None,
            "branch_id": d.branch_id
        }
        for d in devices
    ]


@router.post("/enroll", response_model=FingerprintEnrollResponse)
def enroll_fingerprint(
    data: FingerprintEnrollRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Enroll a member's fingerprint on a ZKTeco device.
    This creates the user on the device and associates the biometric_user_id with the member.
    """
    try:
        # Verify member exists
        member = db.query(GymMember).filter(
            GymMember.id == data.member_id,
            GymMember.deleted_at.is_(None)
        ).first()
        
        if not member:
            return FingerprintEnrollResponse(
                success=False,
                message="Member not found"
            )
        
        # Verify device exists and is active
        device = db.query(BiometricDevice).filter(
            BiometricDevice.id == data.device_id,
            BiometricDevice.is_active == True
        ).first()
        
        if not device:
            return FingerprintEnrollResponse(
                success=False,
                message="Device not found or inactive"
            )
        
        # Verify member belongs to the same branch as the device
        if member.branch_id != device.branch_id:
            return FingerprintEnrollResponse(
                success=False,
                message="Member does not belong to the same branch as the device"
            )
        
        # Check if biometric_user_id is already used by another member
        existing_member = db.query(GymMember).filter(
            GymMember.rfid_number == data.biometric_user_id,
            GymMember.id != data.member_id,
            GymMember.deleted_at.is_(None)
        ).first()
        
        if existing_member:
            return FingerprintEnrollResponse(
                success=False,
                message=f"Biometric User ID {data.biometric_user_id} is already assigned to another member"
            )
        
        # Create device interface and enroll user
        device_interface = BiometricDeviceFactory.create_device(
            brand=device.brand,
            protocol=device.protocol,
            ip_address=device.ip_address,
            port=device.port,
            device_id=device.id
        )
        
        # Test connection first
        is_connected, message = device_interface.test_connection()
        if not is_connected:
            return FingerprintEnrollResponse(
                success=False,
                message=f"Device connection failed: {message}"
            )
        
        # Enroll user on device
        device_user = DeviceUser(
            user_id=data.biometric_user_id,
            name=member.full_name,
            privilege=0  # Default privilege
        )
        
        success, enroll_message = device_interface.enroll_user(device_user)
        
        if not success:
            return FingerprintEnrollResponse(
                success=False,
                message=f"Enrollment failed: {enroll_message}"
            )
        
        # Update member's biometric_user_id
        member.rfid_number = data.biometric_user_id
        member.biometric_user_id = data.biometric_user_id
        db.commit()
        
        logger.info(f"Member {member.id} enrolled on device {device.id} with biometric_user_id {data.biometric_user_id}")
        
        return FingerprintEnrollResponse(
            success=True,
            message=enroll_message,
            biometric_user_id=data.biometric_user_id,
            device_name=device.device_name
        )
        
    except Exception as e:
        logger.error(f"Fingerprint enrollment error: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to enroll fingerprint: {str(e)}")


@router.get("/member/{member_id}")
def get_member_fingerprint_status(
    member_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_role(STAFF_ROLES)),
):
    """Get fingerprint enrollment status for a member"""
    member = db.query(GymMember).filter(
        GymMember.id == member_id,
        GymMember.deleted_at.is_(None)
    ).first()
    
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    
    return {
        "member_id": member.id,
        "member_name": member.full_name,
        "biometric_user_id": member.rfid_number,
        "has_fingerprint": bool(member.rfid_number)
    }
