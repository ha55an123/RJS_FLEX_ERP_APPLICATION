from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel
from datetime import date, datetime
from sqlalchemy.exc import IntegrityError

from app.core.database import get_db
from app.core.auth_dependencies import require_role
from app.models.gym_member import GymMember, MemberStatus, Gender, BloodGroup
from app.services.member_code_service import generate_member_code

router = APIRouter(prefix="/members", tags=["Members"])

STAFF_ROLES = ["super_admin", "gym_owner", "manager", "receptionist", "trainer"]


def _serialize(m: GymMember) -> dict:
    return {
        "id": m.id, "member_code": m.member_code,
        "branch_id": m.branch_id,
        "first_name": m.first_name, "last_name": m.last_name,
        "full_name": m.full_name,
        "gender": m.gender, "date_of_birth": m.date_of_birth,
        "cnic": m.cnic, "passport_number": m.passport_number,
        "phone": m.phone, "whatsapp": m.whatsapp, "email": m.email,
        "address": m.address, "profile_picture": m.profile_picture,
        "emergency_contact_name": m.emergency_contact_name,
        "emergency_contact_phone": m.emergency_contact_phone,
        "emergency_contact_relation": m.emergency_contact_relation,
        "blood_group": m.blood_group,
        "medical_conditions": m.medical_conditions, "allergies": m.allergies,
        "height_cm": m.height_cm, "weight_kg": m.weight_kg,
        "bmi": m.bmi, "body_fat_percent": m.body_fat_percent,
        "fitness_goal": m.fitness_goal,
        "barcode": m.barcode, "qr_code": m.qr_code,
        "rfid_number": m.rfid_number, "biometric_user_id": m.biometric_user_id,
        "status": m.status, "joining_date": m.joining_date,
        "assigned_trainer_id": m.assigned_trainer_id,
        "notes": m.notes, "is_active": m.is_active,
        "created_at": m.created_at, "updated_at": m.updated_at,
    }


class MemberCreate(BaseModel):
    branch_id: int
    first_name: str
    last_name: str
    gender: Optional[Gender] = None
    date_of_birth: Optional[date] = None
    cnic: Optional[str] = None
    passport_number: Optional[str] = None
    phone: Optional[str] = None
    whatsapp: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    emergency_contact_relation: Optional[str] = None
    blood_group: Optional[BloodGroup] = None
    medical_conditions: Optional[str] = None
    allergies: Optional[str] = None
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    body_fat_percent: Optional[float] = None
    fitness_goal: Optional[str] = None
    rfid_number: Optional[str] = None
    biometric_user_id: Optional[str] = None
    assigned_trainer_id: Optional[int] = None
    joining_date: Optional[date] = None
    notes: Optional[str] = None


class MemberUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    gender: Optional[Gender] = None
    date_of_birth: Optional[date] = None
    cnic: Optional[str] = None
    passport_number: Optional[str] = None
    phone: Optional[str] = None
    whatsapp: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    emergency_contact_relation: Optional[str] = None
    blood_group: Optional[BloodGroup] = None
    medical_conditions: Optional[str] = None
    allergies: Optional[str] = None
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    body_fat_percent: Optional[float] = None
    fitness_goal: Optional[str] = None
    rfid_number: Optional[str] = None
    biometric_user_id: Optional[str] = None
    assigned_trainer_id: Optional[int] = None
    status: Optional[MemberStatus] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None


@router.get("/")
def list_members(
    branch_id: Optional[int] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    _=Depends(require_role(STAFF_ROLES)),
):
    q = db.query(GymMember).filter(GymMember.deleted_at.is_(None))
    if branch_id:
        q = q.filter(GymMember.branch_id == branch_id)
    if status:
        q = q.filter(GymMember.status == status)
    if search:
        term = search.strip()
        like = f"%{term}%"
        filters = (
            GymMember.first_name.ilike(like) |
            GymMember.last_name.ilike(like) |
            GymMember.member_code.ilike(like) |
            GymMember.phone.ilike(like) |
            GymMember.cnic.ilike(like)
        )
        # Allow searching "000123" to find "RJS-000123"
        if term.isdigit():
            padded = term.zfill(6)
            filters = filters | GymMember.member_code.ilike(f"%{padded}%")
        q = q.filter(filters)
    total = q.count()
    items = q.order_by(GymMember.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return {"total": total, "page": page, "page_size": page_size, "items": [_serialize(m) for m in items]}


@router.get("/{member_id}/")
def get_member(member_id: int, db: Session = Depends(get_db), _=Depends(require_role(STAFF_ROLES))):
    m = db.query(GymMember).filter(GymMember.id == member_id, GymMember.deleted_at.is_(None)).first()
    if not m:
        raise HTTPException(404, "Member not found")
    return _serialize(m)


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_member(data: MemberCreate, db: Session = Depends(get_db), _=Depends(require_role(STAFF_ROLES))):
    # Auto-calculate BMI
    bmi = None
    if data.height_cm and data.weight_kg:
        h = data.height_cm / 100
        bmi = round(data.weight_kg / (h * h), 2)

    for _ in range(5):
        code = generate_member_code(db)
        m = GymMember(
            **data.model_dump(),
            member_code=code,
            bmi=bmi,
            barcode=code,
            qr_code=code,
        )
        db.add(m)
        try:
            db.commit()
            db.refresh(m)
            return _serialize(m)
        except IntegrityError:
            db.rollback()

    raise HTTPException(status.HTTP_409_CONFLICT, "Could not generate a unique member ID. Please retry.")


@router.put("/{member_id}/")
def update_member(
    member_id: int, data: MemberUpdate,
    db: Session = Depends(get_db), _=Depends(require_role(STAFF_ROLES))
):
    m = db.query(GymMember).filter(GymMember.id == member_id, GymMember.deleted_at.is_(None)).first()
    if not m:
        raise HTTPException(404, "Member not found")
    updates = data.model_dump(exclude_none=True)
    for k, v in updates.items():
        setattr(m, k, v)
    # Recalculate BMI if height/weight changed
    if m.height_cm and m.weight_kg:
        h = m.height_cm / 100
        m.bmi = round(m.weight_kg / (h * h), 2)
    m.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(m)
    return _serialize(m)


@router.delete("/{member_id}/")
def delete_member(
    member_id: int, db: Session = Depends(get_db),
    _=Depends(require_role(["super_admin", "gym_owner", "manager"]))
):
    m = db.query(GymMember).filter(GymMember.id == member_id).first()
    if not m:
        raise HTTPException(404, "Member not found")
    m.deleted_at = datetime.utcnow()
    m.is_active = False
    db.commit()
    return {"message": "Member deleted"}


@router.get("/{member_id}/summary/")
def member_summary(member_id: int, db: Session = Depends(get_db), _=Depends(require_role(STAFF_ROLES))):
    """Returns member + active subscription + recent attendance."""
    from app.models.membership import MembershipSubscription, SubscriptionStatus
    from app.models.gym_attendance import GymAttendance
    from app.models.gym_payment import GymPayment

    m = db.query(GymMember).filter(GymMember.id == member_id).first()
    if not m:
        raise HTTPException(404, "Member not found")

    sub = (
        db.query(MembershipSubscription)
        .filter(
            MembershipSubscription.member_id == member_id,
            MembershipSubscription.status == SubscriptionStatus.ACTIVE.value,
        )
        .order_by(MembershipSubscription.end_date.desc())
        .first()
    )

    last_attendance = (
        db.query(GymAttendance)
        .filter(GymAttendance.member_id == member_id)
        .order_by(GymAttendance.check_in_time.desc())
        .first()
    )

    pending_amount = db.query(
        __import__("sqlalchemy", fromlist=["func"]).func.sum(GymPayment.total_amount)
    ).filter(GymPayment.member_id == member_id, GymPayment.status == "pending").scalar() or 0

    return {
        "member": _serialize(m),
        "active_subscription": {
            "plan_id": sub.plan_id if sub else None,
            "end_date": str(sub.end_date) if sub else None,
            "status": sub.status if sub else None,
        } if sub else None,
        "last_checkin": str(last_attendance.check_in_time) if last_attendance else None,
        "pending_payments": pending_amount,
    }
