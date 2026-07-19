from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel, EmailStr
from datetime import date

from app.core.database import get_db
from app.core.auth_dependencies import require_role
from app.models.employee import Employee

router = APIRouter(prefix="/employees", tags=["Employees"])


class EmployeeCreate(BaseModel):
    full_name: str
    employee_code: Optional[str] = None
    designation: Optional[str] = None
    department: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    address: Optional[str] = None
    joining_date: Optional[date] = None
    salary: Optional[float] = None
    status: Optional[str] = "active"
    notes: Optional[str] = None


class EmployeeUpdate(BaseModel):
    full_name: Optional[str] = None
    employee_code: Optional[str] = None
    designation: Optional[str] = None
    department: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    address: Optional[str] = None
    joining_date: Optional[date] = None
    salary: Optional[float] = None
    status: Optional[str] = None
    notes: Optional[str] = None


def _serialize(e: Employee) -> dict:
    return {
        "id": e.id,
        "employee_code": e.employee_code,
        "full_name": e.full_name,
        "designation": e.designation,
        "department": e.department,
        "phone": e.phone,
        "email": e.email,
        "address": e.address,
        "joining_date": e.joining_date.isoformat() if e.joining_date else None,
        "salary": e.salary,
        "status": e.status,
        "notes": e.notes,
        "created_at": e.created_at,
        "updated_at": e.updated_at,
    }


@router.get("/")
def list_employees(
    db: Session = Depends(get_db),
    _=Depends(require_role(["admin", "company_manager"])),
):
    return [_serialize(e) for e in db.query(Employee).order_by(Employee.id).all()]


@router.get("/{employee_id}")
def get_employee(
    employee_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_role(["admin", "company_manager"])),
):
    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    if not emp:
        raise HTTPException(404, "Employee not found")
    return _serialize(emp)


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_employee(
    data: EmployeeCreate,
    db: Session = Depends(get_db),
    _=Depends(require_role(["admin"])),
):
    if data.email and db.query(Employee).filter(Employee.email == data.email).first():
        raise HTTPException(400, "Email already registered")
    if data.employee_code and db.query(Employee).filter(Employee.employee_code == data.employee_code).first():
        raise HTTPException(400, "Employee code already in use")

    emp = Employee(**data.model_dump())
    db.add(emp)
    db.commit()
    db.refresh(emp)
    return _serialize(emp)


@router.put("/{employee_id}")
def update_employee(
    employee_id: int,
    data: EmployeeUpdate,
    db: Session = Depends(get_db),
    _=Depends(require_role(["admin"])),
):
    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    if not emp:
        raise HTTPException(404, "Employee not found")

    if data.email is not None:
        conflict = db.query(Employee).filter(Employee.email == data.email, Employee.id != employee_id).first()
        if conflict:
            raise HTTPException(400, "Email already in use")

    if data.employee_code is not None:
        conflict = db.query(Employee).filter(Employee.employee_code == data.employee_code, Employee.id != employee_id).first()
        if conflict:
            raise HTTPException(400, "Employee code already in use")

    for field, val in data.model_dump(exclude_unset=True).items():
        setattr(emp, field, val)

    db.commit()
    db.refresh(emp)
    return _serialize(emp)


@router.delete("/{employee_id}")
def delete_employee(
    employee_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_role(["admin"])),
):
    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    if not emp:
        raise HTTPException(404, "Employee not found")

    # Prevent deletion if employee has a linked user account
    from app.models.user import User
    if db.query(User).filter(User.employee_id == employee_id).first():
        raise HTTPException(400, "Cannot delete employee with an active user account. Remove the user account first.")

    db.delete(emp)
    db.commit()
    return {"message": "Employee deleted"}
