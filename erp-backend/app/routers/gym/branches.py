from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel
from datetime import datetime

from app.core.database import get_db
from app.core.auth_dependencies import require_role
from app.models.branch import Branch

router = APIRouter(prefix="/branches", tags=["Branches"])

ADMIN_ROLES = ["super_admin", "gym_owner"]
MANAGER_ROLES = ["super_admin", "gym_owner", "manager", "receptionist"]


class BranchCreate(BaseModel):
    name: str
    code: str
    address: Optional[str] = None
    city: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    manager_id: Optional[int] = None
    opening_time: Optional[str] = None
    closing_time: Optional[str] = None
    capacity: Optional[int] = None
    notes: Optional[str] = None
    is_active: bool = True


class BranchUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    manager_id: Optional[int] = None
    opening_time: Optional[str] = None
    closing_time: Optional[str] = None
    capacity: Optional[int] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None


def _serialize(b: Branch) -> dict:
    return {
        "id": b.id, "name": b.name, "code": b.code,
        "address": b.address, "city": b.city,
        "phone": b.phone, "email": b.email,
        "manager_id": b.manager_id,
        "opening_time": b.opening_time, "closing_time": b.closing_time,
        "capacity": b.capacity, "notes": b.notes,
        "is_active": b.is_active,
        "created_at": b.created_at, "updated_at": b.updated_at,
    }


@router.get("/")
def list_branches(db: Session = Depends(get_db), _=Depends(require_role(MANAGER_ROLES))):
    branches = db.query(Branch).order_by(Branch.name).all()
    return {"items": [_serialize(b) for b in branches]}


@router.get("/{branch_id}/")
def get_branch(branch_id: int, db: Session = Depends(get_db), _=Depends(require_role(MANAGER_ROLES))):
    b = db.query(Branch).filter(Branch.id == branch_id).first()
    if not b:
        raise HTTPException(404, "Branch not found")
    return _serialize(b)


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_branch(data: BranchCreate, db: Session = Depends(get_db), _=Depends(require_role(ADMIN_ROLES))):
    if db.query(Branch).filter(Branch.code == data.code).first():
        raise HTTPException(400, "Branch code already exists")
    b = Branch(**data.model_dump())
    db.add(b)
    db.commit()
    db.refresh(b)
    return _serialize(b)


@router.put("/{branch_id}/")
def update_branch(
    branch_id: int, data: BranchUpdate,
    db: Session = Depends(get_db), _=Depends(require_role(ADMIN_ROLES))
):
    b = db.query(Branch).filter(Branch.id == branch_id).first()
    if not b:
        raise HTTPException(404, "Branch not found")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(b, k, v)
    b.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(b)
    return _serialize(b)


@router.delete("/{branch_id}/")
def delete_branch(branch_id: int, db: Session = Depends(get_db), _=Depends(require_role(ADMIN_ROLES))):
    b = db.query(Branch).filter(Branch.id == branch_id).first()
    if not b:
        raise HTTPException(404, "Branch not found")
    b.is_active = False
    b.updated_at = datetime.utcnow()
    db.commit()
    return {"message": "Branch deactivated"}
