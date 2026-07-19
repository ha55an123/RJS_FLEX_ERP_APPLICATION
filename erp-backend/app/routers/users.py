from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel, EmailStr
from datetime import datetime

from app.core.database import get_db
from app.core.auth_dependencies import require_role
from app.core.security import get_password_hash
from app.models.user import User, UserRole
from app.models.employee import Employee

router = APIRouter(prefix="/users", tags=["Users"])

# Roles that a non-admin can never assign — enforced on backend regardless of frontend
_ADMIN_ONLY_ROLES = {UserRole.ADMIN}


class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    role: UserRole
    employee_id: Optional[int] = None
    is_active: bool = True


class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    role: Optional[UserRole] = None
    employee_id: Optional[int] = None
    is_active: Optional[bool] = None


def _serialize(u: User) -> dict:
    emp = u.employee
    return {
        "id": u.id,
        "username": u.username,
        "email": u.email,
        "role": u.role.value,
        "is_active": u.is_active,
        "employee_id": u.employee_id,
        "employee_name": emp.full_name if emp else None,
        "last_login": u.last_login,
        "created_at": u.created_at,
        "updated_at": u.updated_at,
    }


def _validate_employee(employee_id: int, user_id: Optional[int], db: Session):
    """Ensure employee exists and is not already linked to another user."""
    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    if not emp:
        raise HTTPException(404, "Employee not found")
    existing = db.query(User).filter(
        User.employee_id == employee_id,
        User.id != user_id,
    ).first()
    if existing:
        raise HTTPException(400, "This employee already has a user account")
    return emp


@router.get("/")
def list_users(
    db: Session = Depends(get_db),
    _=Depends(require_role(["admin"])),
):
    return [_serialize(u) for u in db.query(User).order_by(User.id).all()]


@router.get("/{user_id}")
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_role(["admin"])),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")
    return _serialize(user)


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_user(
    data: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin"])),
):
    # SECURITY: Only admins can create admin accounts — enforced server-side
    if data.role in _ADMIN_ONLY_ROLES and current_user.role != UserRole.ADMIN:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only admins can create admin accounts")

    if db.query(User).filter(User.username == data.username).first():
        raise HTTPException(400, "Username already taken")
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(400, "Email already registered")

    if data.employee_id:
        _validate_employee(data.employee_id, None, db)

    user = User(
        username=data.username,
        email=data.email,
        hashed_password=get_password_hash(data.password),
        role=data.role,
        employee_id=data.employee_id,
        is_active=data.is_active,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return _serialize(user)


@router.put("/{user_id}")
def update_user(
    user_id: int,
    data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin"])),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")

    # SECURITY: Prevent privilege escalation — only admins can assign admin role
    if data.role in _ADMIN_ONLY_ROLES and current_user.role != UserRole.ADMIN:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only admins can assign the admin role")

    if data.username is not None:
        conflict = db.query(User).filter(User.username == data.username, User.id != user_id).first()
        if conflict:
            raise HTTPException(400, "Username already taken")
        user.username = data.username

    if data.email is not None:
        conflict = db.query(User).filter(User.email == data.email, User.id != user_id).first()
        if conflict:
            raise HTTPException(400, "Email already in use")
        user.email = data.email

    if data.password is not None:
        user.hashed_password = get_password_hash(data.password)

    if data.role is not None:
        user.role = data.role

    if data.employee_id is not None:
        _validate_employee(data.employee_id, user_id, db)
        user.employee_id = data.employee_id

    if data.is_active is not None:
        user.is_active = data.is_active

    user.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(user)
    return _serialize(user)


@router.delete("/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin"])),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")
    # Prevent admin from deleting their own account
    if user.id == current_user.id:
        raise HTTPException(400, "Cannot delete your own account")
    db.delete(user)
    db.commit()
    return {"message": "User deleted"}
