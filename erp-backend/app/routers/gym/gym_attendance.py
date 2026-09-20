from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from pydantic import BaseModel
from datetime import date, datetime

from app.core.database import get_db
from app.core.auth_dependencies import require_role, get_current_user
from app.models.gym_attendance import GymAttendance, StaffAttendance, CheckInMethod, AttendanceStatus
from app.models.gym_member import GymMember
from app.models.membership import MembershipSubscription, SubscriptionStatus

router = APIRouter(prefix="/attendance", tags=["Attendance"])

STAFF_ROLES = ["super_admin", "gym_owner", "manager", "receptionist"]


class CheckInRequest(BaseModel):
    identifier: str   # member_code | barcode | qr_code | rfid_number | biometric_user_id
    method: CheckInMethod
    branch_id: int
    device_id: Optional[int] = None
    notes: Optional[str] = None


class ManualAttendance(BaseModel):
    member_id: int
    branch_id: int
    attendance_date: date
    check_in_time: Optional[datetime] = None
    check_out_time: Optional[datetime] = None
    method: CheckInMethod = CheckInMethod.MANUAL
    notes: Optional[str] = None


class StaffAttendanceCreate(BaseModel):
    staff_id: int
    branch_id: int
    attendance_date: date
    check_in_time: Optional[datetime] = None
    check_out_time: Optional[datetime] = None
    method: CheckInMethod = CheckInMethod.MANUAL
    status: str = "present"
    notes: Optional[str] = None


def _find_member(identifier: str, branch_id: int, db: Session) -> GymMember:
    return db.query(GymMember).filter(
        (
            (GymMember.member_code == identifier) |
            (GymMember.barcode == identifier) |
            (GymMember.qr_code == identifier) |
            (GymMember.rfid_number == identifier) |
            (GymMember.biometric_user_id == identifier)
        ),
        GymMember.branch_id == branch_id,
    ).first()


@router.post("/checkin/")
def checkin(
    data: CheckInRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    member = _find_member(data.identifier, data.branch_id, db)
    if not member:
        raise HTTPException(404, "Member not found")

    active_sub = db.query(MembershipSubscription).filter(
        MembershipSubscription.member_id == member.id,
        MembershipSubscription.status == SubscriptionStatus.ACTIVE.value,
        MembershipSubscription.end_date >= date.today(),
    ).first()

    # Already checked in today → treat as checkout
    existing = db.query(GymAttendance).filter(
        GymAttendance.member_id == member.id,
        GymAttendance.attendance_date == date.today(),
        GymAttendance.check_out_time.is_(None),
    ).first()

    if existing:
        existing.check_out_time = datetime.utcnow()
        delta = existing.check_out_time - existing.check_in_time
        existing.total_hours = round(delta.total_seconds() / 3600, 2)
        existing.status = AttendanceStatus.CHECKED_OUT.value
        db.commit()
        return {
            "action": "checkout",
            "member": {"id": member.id, "name": member.full_name, "code": member.member_code},
            "check_out_time": str(existing.check_out_time),
            "total_hours": existing.total_hours,
            "membership_valid": active_sub is not None,
        }

    record = GymAttendance(
        member_id=member.id,
        branch_id=data.branch_id,
        device_id=data.device_id,
        attendance_date=date.today(),
        check_in_time=datetime.utcnow(),
        method=data.method.value,
        status=AttendanceStatus.CHECKED_IN.value,
        notes=data.notes,
        recorded_by=current_user.id,
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    from app.models.gym_payment import GymPayment
    pending = db.query(func.sum(GymPayment.total_amount)).filter(
        GymPayment.member_id == member.id, GymPayment.status == "pending"
    ).scalar() or 0

    return {
        "action": "checkin",
        "member": {"id": member.id, "name": member.full_name, "code": member.member_code, "status": member.status},
        "membership_valid": active_sub is not None,
        "membership_expiry": str(active_sub.end_date) if active_sub else None,
        "pending_payments": pending,
        "check_in_time": str(record.check_in_time),
    }


@router.post("/manual/")
def manual_attendance(
    data: ManualAttendance,
    db: Session = Depends(get_db),
    current_user=Depends(require_role(STAFF_ROLES)),
):
    record = GymAttendance(
        member_id=data.member_id,
        branch_id=data.branch_id,
        attendance_date=data.attendance_date,
        check_in_time=data.check_in_time or datetime.utcnow(),
        check_out_time=data.check_out_time,
        method=data.method.value,
        status=AttendanceStatus.CHECKED_IN.value,
        notes=data.notes,
        recorded_by=current_user.id,
    )
    if data.check_in_time and data.check_out_time:
        delta = data.check_out_time - data.check_in_time
        record.total_hours = round(delta.total_seconds() / 3600, 2)
        record.status = AttendanceStatus.CHECKED_OUT.value
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.get("/today/")
def today_attendance(
    branch_id: Optional[int] = None,
    db: Session = Depends(get_db),
    _=Depends(require_role(STAFF_ROLES)),
):
    q = db.query(GymAttendance).filter(GymAttendance.attendance_date == date.today())
    if branch_id:
        q = q.filter(GymAttendance.branch_id == branch_id)
    return q.order_by(GymAttendance.check_in_time.desc()).all()


@router.get("/member/{member_id}/")
def member_attendance(
    member_id: int,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(30, ge=1, le=100),
    db: Session = Depends(get_db),
    _=Depends(require_role(STAFF_ROLES + ["trainer"])),
):
    q = db.query(GymAttendance).filter(GymAttendance.member_id == member_id)
    if from_date:
        q = q.filter(GymAttendance.attendance_date >= from_date)
    if to_date:
        q = q.filter(GymAttendance.attendance_date <= to_date)
    total = q.count()
    items = q.order_by(GymAttendance.attendance_date.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return {"total": total, "page": page, "page_size": page_size, "items": items}


@router.post("/staff/")
def record_staff_attendance(
    data: StaffAttendanceCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_role(STAFF_ROLES)),
):
    record = StaffAttendance(**data.model_dump())
    if data.check_in_time and data.check_out_time:
        delta = data.check_out_time - data.check_in_time
        record.total_hours = round(delta.total_seconds() / 3600, 2)
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.get("/staff/{staff_id}/")
def staff_attendance(
    staff_id: int,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(30, ge=1, le=100),
    db: Session = Depends(get_db),
    _=Depends(require_role(STAFF_ROLES)),
):
    q = db.query(StaffAttendance).filter(StaffAttendance.staff_id == staff_id)
    if from_date:
        q = q.filter(StaffAttendance.attendance_date >= from_date)
    if to_date:
        q = q.filter(StaffAttendance.attendance_date <= to_date)
    total = q.count()
    items = q.order_by(StaffAttendance.attendance_date.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return {"total": total, "page": page, "page_size": page_size, "items": items}
