from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime
from app.core.database import get_db
from app.core.auth_dependencies import require_role, get_current_user
from app.models.user import User
from app.models.gym_member import GymMember
from app.models.biometric_device import BiometricDevice
from app.models.biometric_registration import (
    BiometricRegistration, BiometricType, FingerType, RegistrationStatus
)
from app.services.biometric_service import BiometricDeviceFactory, DeviceUser
from loguru import logger

router = APIRouter(prefix="/biometric", tags=["Biometric Registrations"])

STAFF_ROLES = ["super_admin", "gym_owner", "manager", "receptionist"]
MANAGER_ROLES = ["super_admin", "gym_owner", "manager"]


# Pydantic Models
class BiometricEnrollRequest(BaseModel):
    member_id: int
    device_id: int
    biometric_type: BiometricType
    finger_type: Optional[FingerType] = None
    zkteco_user_id: str


class BiometricEnrollResponse(BaseModel):
    success: bool
    message: str
    registration_id: Optional[int] = None
    zkteco_user_id: Optional[str] = None
    device_name: Optional[str] = None


class BiometricStatusResponse(BaseModel):
    member_id: int
    registrations: List[dict]


class DeviceCapabilitiesResponse(BaseModel):
    device_id: int
    device_name: str
    supports_fingerprint: bool
    supports_face: bool


@router.get("/devices")
def list_devices(
    branch_id: Optional[int] = None,
    db: Session = Depends(get_db),
    _=Depends(require_role(STAFF_ROLES)),
):
    """List biometric devices with their capabilities"""
    q = db.query(BiometricDevice).filter(BiometricDevice.is_active == True)
    
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
            "supports_fingerprint": d.supports_fingerprint,
            "supports_face": d.supports_face,
            "last_heartbeat": d.last_heartbeat.isoformat() if d.last_heartbeat else None,
            "branch_id": d.branch_id
        }
        for d in devices
    ]


@router.get("/device/{device_id}/capabilities", response_model=DeviceCapabilitiesResponse)
def get_device_capabilities(
    device_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_role(STAFF_ROLES)),
):
    """Get device capabilities"""
    device = db.query(BiometricDevice).filter(BiometricDevice.id == device_id).first()
    
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device not found"
        )
    
    return DeviceCapabilitiesResponse(
        device_id=device.id,
        device_name=device.device_name,
        supports_fingerprint=device.supports_fingerprint,
        supports_face=device.supports_face
    )


@router.get("/member/{member_id}", response_model=BiometricStatusResponse)
def get_member_biometric_status(
    member_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_role(STAFF_ROLES)),
):
    """Get all biometric registrations for a member"""
    member = db.query(GymMember).filter(
        GymMember.id == member_id,
        GymMember.deleted_at.is_(None)
    ).first()
    
    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member not found"
        )
    
    registrations = db.query(BiometricRegistration).filter(
        BiometricRegistration.member_id == member_id,
        BiometricRegistration.status == RegistrationStatus.ACTIVE
    ).all()
    
    return BiometricStatusResponse(
        member_id=member_id,
        registrations=[
            {
                "id": reg.id,
                "biometric_type": reg.biometric_type,
                "finger_type": reg.finger_type,
                "device_id": reg.device_id,
                "device_name": reg.device.device_name if reg.device else None,
                "zkteco_user_id": reg.zkteco_user_id,
                "status": reg.status,
                "created_at": reg.created_at.isoformat() if reg.created_at else None
            }
            for reg in registrations
        ]
    )


@router.post("/enroll", response_model=BiometricEnrollResponse)
def enroll_biometric(
    data: BiometricEnrollRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Enroll a member's biometric (fingerprint or face) on a device.
    Validates device capabilities before enrollment.
    """
    try:
        # Verify member exists
        member = db.query(GymMember).filter(
            GymMember.id == data.member_id,
            GymMember.deleted_at.is_(None)
        ).first()
        
        if not member:
            return BiometricEnrollResponse(
                success=False,
                message="Member not found"
            )
        
        # Verify device exists and is active
        device = db.query(BiometricDevice).filter(
            BiometricDevice.id == data.device_id,
            BiometricDevice.is_active == True
        ).first()
        
        if not device:
            return BiometricEnrollResponse(
                success=False,
                message="Device not found or inactive"
            )
        
        # Verify member belongs to the same branch as the device
        if member.branch_id != device.branch_id:
            return BiometricEnrollResponse(
                success=False,
                message="Member does not belong to the same branch as the device"
            )
        
        # Validate device capability
        if data.biometric_type == BiometricType.FINGERPRINT and not device.supports_fingerprint:
            return BiometricEnrollResponse(
                success=False,
                message="The selected device does not support fingerprint enrollment"
            )
        
        if data.biometric_type == BiometricType.FACE and not device.supports_face:
            return BiometricEnrollResponse(
                success=False,
                message="The selected device does not support face enrollment. Please select a face-capable device."
            )
        
        # For fingerprint, finger_type is required
        if data.biometric_type == BiometricType.FINGERPRINT and not data.finger_type:
            return BiometricEnrollResponse(
                success=False,
                message="Finger type is required for fingerprint enrollment"
            )
        
        # Check for duplicate registration (same member, device, biometric_type, finger_type)
        existing_registration = db.query(BiometricRegistration).filter(
            BiometricRegistration.member_id == data.member_id,
            BiometricRegistration.device_id == data.device_id,
            BiometricRegistration.biometric_type == data.biometric_type,
            BiometricRegistration.finger_type == data.finger_type,
            BiometricRegistration.status == RegistrationStatus.ACTIVE
        ).first()
        
        if existing_registration:
            if data.biometric_type == BiometricType.FINGERPRINT:
                return BiometricEnrollResponse(
                    success=False,
                    message=f"This finger ({data.finger_type}) is already registered on this device"
                )
            else:
                return BiometricEnrollResponse(
                    success=False,
                    message="Face is already registered on this device"
                )
        
        # Check if zkteco_user_id is already used by another registration on the same device
        existing_user_id = db.query(BiometricRegistration).filter(
            BiometricRegistration.device_id == data.device_id,
            BiometricRegistration.zkteco_user_id == data.zkteco_user_id,
            BiometricRegistration.status == RegistrationStatus.ACTIVE,
            BiometricRegistration.id != data.member_id
        ).first()
        
        if existing_user_id:
            return BiometricEnrollResponse(
                success=False,
                message=f"ZKTeco User ID {data.zkteco_user_id} is already in use on this device"
            )
        
        # Create device interface and test connection
        device_interface = BiometricDeviceFactory.create_device(
            brand=device.brand,
            protocol=device.protocol,
            ip_address=device.ip_address,
            port=device.port,
            device_id=device.id
        )
        
        is_connected, message = device_interface.test_connection()
        if not is_connected:
            return BiometricEnrollResponse(
                success=False,
                message=f"Device connection failed: {message}"
            )
        
        # Enroll user on device
        device_user = DeviceUser(
            user_id=data.zkteco_user_id,
            name=member.full_name,
            privilege=0
        )
        
        success, enroll_message = device_interface.enroll_user(device_user)
        
        if not success:
            return BiometricEnrollResponse(
                success=False,
                message=f"Enrollment failed: {enroll_message}"
            )
        
        # Create biometric registration record
        registration = BiometricRegistration(
            member_id=data.member_id,
            device_id=data.device_id,
            biometric_type=data.biometric_type,
            finger_type=data.finger_type,
            zkteco_user_id=data.zkteco_user_id,
            status=RegistrationStatus.ACTIVE
        )
        
        db.add(registration)
        db.commit()
        db.refresh(registration)
        
        logger.info(
            f"Biometric enrolled: Member {member.id}, Device {device.id}, "
            f"Type {data.biometric_type}, Finger {data.finger_type}, "
            f"ZKTeco User ID {data.zkteco_user_id}"
        )
        
        return BiometricEnrollResponse(
            success=True,
            message=enroll_message,
            registration_id=registration.id,
            zkteco_user_id=data.zkteco_user_id,
            device_name=device.device_name
        )
        
    except Exception as e:
        logger.error(f"Biometric enrollment error: {e}")
        db.rollback()
        return BiometricEnrollResponse(
            success=False,
            message=f"Enrollment failed: {str(e)}"
        )


@router.delete("/registration/{registration_id}")
def delete_biometric_registration(
    registration_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_role(STAFF_ROLES)),
):
    """Delete a biometric registration"""
    registration = db.query(BiometricRegistration).filter(
        BiometricRegistration.id == registration_id
    ).first()
    
    if not registration:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Registration not found"
        )
    
    # Optionally, remove user from device
    try:
        device = db.query(BiometricDevice).filter(
            BiometricDevice.id == registration.device_id
        ).first()
        
        if device:
            device_interface = BiometricDeviceFactory.create_device(
                brand=device.brand,
                protocol=device.protocol,
                ip_address=device.ip_address,
                port=device.port,
                device_id=device.id
            )
            
            # Delete user from device
            device_interface.delete_user(registration.zkteco_user_id)
    except Exception as e:
        logger.warning(f"Failed to delete user from device: {e}")
    
    # Mark registration as inactive instead of deleting
    registration.status = RegistrationStatus.INACTIVE
    db.commit()
    
    return {"success": True, "message": "Registration deleted successfully"}
