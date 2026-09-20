from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel
from datetime import date, datetime

from app.core.database import get_db
from app.core.auth_dependencies import require_role
from app.models.gym_staff import GymStaff, StaffRole, StaffStatus
from app.models.gym_attendance import TrainerSchedule

router = APIRouter(prefix="/staff", tags=["Gym Staff"])

MANAGER_ROLES = ["super_admin", "gym_owner", "manager"]
STAFF_ROLES   = ["super_admin", "gym_owner", "manager", "receptionist"]


def _gen_code(db: Session) -> str:
    import random, string
    while True:
        code = "STF-" + "".join(random.choices(string.digits, k=5))
        if not db.query(GymStaff).filter(GymStaff.staff_code == code).first():
            return code


def _serialize(s: GymStaff) -> dict:
    return {
        "id": s.id, "staff_code": s.staff_code,
        "branch_id": s.branch_id, "user_id": s.user_id,
        "first_name": s.first_name, "last_name": s.last_name,
        "full_name": s.full_name,
        "gender": s.gender, "date_of_birth": s.date_of_birth,
        "cnic": s.cnic, "phone": s.phone, "email": s.email,
        "address": s.address, "profile_picture": s.profile_picture,
        "role": s.role, "designation": s.designation,
        "qualification": s.qualification, "specialization": s.specialization,
        "experience_years": s.experience_years,
        "joining_date": s.joining_date, "salary": s.salary,
        "commission_percent": s.commission_percent,
        "biometric_user_id": s.biometric_user_id, "rfid_number": s.rfid_number,
        "status": s.status, "is_active": s.is_active, "notes": s.notes,
        "created_at": s.created_at, "updated_at": s.updated_at,
    }


class StaffCreate(BaseModel):
    branch_id: int
    first_name: str
    last_name: str
    role: StaffRole
    gender: Optional[str] = None
    date_of_birth: Optional[date] = None
    cnic: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    designation: Optional[str] = None
    qualification: Optional[str] = None
    specialization: Optional[str] = None
    experience_years: Optional[int] = None
    joining_date: Optional[date] = None
    salary: Optional[float] = None
    commission_percent: Optional[float] = 0.0
    biometric_user_id: Optional[str] = None
    rfid_number: Optional[str] = None
    user_id: Optional[int] = None
    notes: Optional[str] = None


class StaffUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    role: Optional[StaffRole] = None
    gender: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    designation: Optional[str] = None
    qualification: Optional[str] = None
    specialization: Optional[str] = None
    experience_years: Optional[int] = None
    salary: Optional[float] = None
    commission_percent: Optional[float] = None
    biometric_user_id: Optional[str] = None
    rfid_number: Optional[str] = None
    status: Optional[StaffStatus] = None
    is_active: Optional[bool] = None
    notes: Optional[str] = None


class ScheduleCreate(BaseModel):
    day_of_week: int   # 0=Mon … 6=Sun
    start_time: str
    end_time: str
    is_available: bool = True
    notes: Optional[str] = None


@router.get("/")
def list_staff(
    branch_id: Optional[int] = None,
    role: Optional[str] = None,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    _=Depends(require_role(STAFF_ROLES)),
):
    q = db.query(GymStaff).filter(GymStaff.deleted_at.is_(None))
    if branch_id:
        q = q.filter(GymStaff.branch_id == branch_id)
    if role:
        q = q.filter(GymStaff.role == role)
    if search:
        like = f"%{search}%"
        q = q.filter(
            GymStaff.first_name.ilike(like) |
            GymStaff.last_name.ilike(like) |
            GymStaff.staff_code.ilike(like) |
            GymStaff.phone.ilike(like)
        )
    total = q.count()
    items = q.order_by(GymStaff.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return {"total": total, "page": page, "page_size": page_size, "items": [_serialize(s) for s in items]}


@router.get("/trainers/")
def list_trainers(branch_id: Optional[int] = None, db: Session = Depends(get_db), _=Depends(require_role(STAFF_ROLES))):
    q = db.query(GymStaff).filter(GymStaff.role == StaffRole.TRAINER.value, GymStaff.is_active == True)  # noqa: E712
    if branch_id:
        q = q.filter(GymStaff.branch_id == branch_id)
    return [_serialize(s) for s in q.all()]


@router.get("/{staff_id}/")
def get_staff(staff_id: int, db: Session = Depends(get_db), _=Depends(require_role(STAFF_ROLES))):
    s = db.query(GymStaff).filter(GymStaff.id == staff_id, GymStaff.deleted_at.is_(None)).first()
    if not s:
        raise HTTPException(404, "Staff not found")
    return _serialize(s)


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_staff(data: StaffCreate, db: Session = Depends(get_db), _=Depends(require_role(MANAGER_ROLES))):
    s = GymStaff(**data.model_dump(), staff_code=_gen_code(db))
    db.add(s)
    db.commit()
    db.refresh(s)
    return _serialize(s)


@router.put("/{staff_id}/")
def update_staff(staff_id: int, data: StaffUpdate, db: Session = Depends(get_db), _=Depends(require_role(MANAGER_ROLES))):
    s = db.query(GymStaff).filter(GymStaff.id == staff_id, GymStaff.deleted_at.is_(None)).first()
    if not s:
        raise HTTPException(404, "Staff not found")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(s, k, v)
    s.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(s)
    return _serialize(s)


@router.delete("/{staff_id}/")
def delete_staff(staff_id: int, db: Session = Depends(get_db), _=Depends(require_role(MANAGER_ROLES))):
    s = db.query(GymStaff).filter(GymStaff.id == staff_id).first()
    if not s:
        raise HTTPException(404, "Staff not found")
    s.deleted_at = datetime.utcnow()
    s.is_active = False
    db.commit()
    return {"message": "Staff deleted"}


# ── Trainer Schedules ─────────────────────────────────────────────────────────

@router.get("/{staff_id}/schedule/")
def get_schedule(staff_id: int, db: Session = Depends(get_db), _=Depends(require_role(STAFF_ROLES))):
    return db.query(TrainerSchedule).filter(TrainerSchedule.trainer_id == staff_id).order_by(TrainerSchedule.day_of_week).all()


@router.post("/{staff_id}/schedule/", status_code=status.HTTP_201_CREATED)
def add_schedule(
    staff_id: int, data: ScheduleCreate,
    db: Session = Depends(get_db), _=Depends(require_role(MANAGER_ROLES))
):
    s = db.query(GymStaff).filter(GymStaff.id == staff_id).first()
    if not s:
        raise HTTPException(404, "Staff not found")
    sched = TrainerSchedule(trainer_id=staff_id, branch_id=s.branch_id, **data.model_dump())
    db.add(sched)
    db.commit()
    db.refresh(sched)
    return sched


@router.delete("/{staff_id}/schedule/{schedule_id}/")
def delete_schedule(staff_id: int, schedule_id: int, db: Session = Depends(get_db), _=Depends(require_role(MANAGER_ROLES))):
    sched = db.query(TrainerSchedule).filter(
        TrainerSchedule.id == schedule_id, TrainerSchedule.trainer_id == staff_id
    ).first()
    if not sched:
        raise HTTPException(404, "Schedule not found")
    db.delete(sched)
    db.commit()
    return {"message": "Schedule deleted"}
