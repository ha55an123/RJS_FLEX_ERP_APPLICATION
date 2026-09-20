from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel
from datetime import date, datetime

from app.core.database import get_db
from app.core.auth_dependencies import require_role, get_current_user
from app.models.gym_equipment import GymEquipment, EquipmentMaintenance, EquipmentStatus

router = APIRouter(prefix="/equipment", tags=["Equipment"])

MANAGER_ROLES = ["super_admin", "gym_owner", "manager"]
STAFF_ROLES   = ["super_admin", "gym_owner", "manager", "receptionist"]


class EquipmentCreate(BaseModel):
    branch_id: int
    name: str
    brand: Optional[str] = None
    model: Optional[str] = None
    serial_number: Optional[str] = None
    category: Optional[str] = None
    purchase_date: Optional[date] = None
    purchase_price: Optional[float] = None
    warranty_expiry: Optional[date] = None
    expected_lifespan_years: Optional[int] = None
    maintenance_interval_days: int = 90
    location: Optional[str] = None
    notes: Optional[str] = None


class EquipmentUpdate(BaseModel):
    name: Optional[str] = None
    brand: Optional[str] = None
    model: Optional[str] = None
    serial_number: Optional[str] = None
    category: Optional[str] = None
    status: Optional[EquipmentStatus] = None
    warranty_expiry: Optional[date] = None
    next_maintenance_date: Optional[date] = None
    replacement_date: Optional[date] = None
    maintenance_interval_days: Optional[int] = None
    location: Optional[str] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None


class MaintenanceCreate(BaseModel):
    maintenance_date: date
    maintenance_type: str
    description: Optional[str] = None
    cost: Optional[float] = None
    technician_name: Optional[str] = None
    technician_contact: Optional[str] = None
    next_due_date: Optional[date] = None
    status: str = "completed"


@router.get("/")
def list_equipment(
    branch_id: Optional[int] = None,
    status: Optional[str] = None,
    category: Optional[str] = None,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    _=Depends(require_role(STAFF_ROLES)),
):
    q = db.query(GymEquipment).filter(GymEquipment.is_active == True)  # noqa: E712
    if branch_id:
        q = q.filter(GymEquipment.branch_id == branch_id)
    if status:
        q = q.filter(GymEquipment.status == status)
    if category:
        q = q.filter(GymEquipment.category == category)
    if search:
        q = q.filter(GymEquipment.name.ilike(f"%{search}%"))
    total = q.count()
    items = q.order_by(GymEquipment.name).offset((page - 1) * page_size).limit(page_size).all()
    return {"total": total, "page": page, "page_size": page_size, "items": items}


@router.get("/{equipment_id}")
def get_equipment(equipment_id: int, db: Session = Depends(get_db), _=Depends(require_role(STAFF_ROLES))):
    eq = db.query(GymEquipment).filter(GymEquipment.id == equipment_id).first()
    if not eq:
        raise HTTPException(404, "Equipment not found")
    return eq


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_equipment(data: EquipmentCreate, db: Session = Depends(get_db), _=Depends(require_role(MANAGER_ROLES))):
    eq = GymEquipment(**data.model_dump())
    db.add(eq)
    db.commit()
    db.refresh(eq)
    return eq


@router.put("/{equipment_id}")
def update_equipment(
    equipment_id: int, data: EquipmentUpdate,
    db: Session = Depends(get_db), _=Depends(require_role(MANAGER_ROLES))
):
    eq = db.query(GymEquipment).filter(GymEquipment.id == equipment_id).first()
    if not eq:
        raise HTTPException(404, "Equipment not found")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(eq, k, v)
    eq.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(eq)
    return eq


@router.delete("/{equipment_id}")
def delete_equipment(equipment_id: int, db: Session = Depends(get_db), _=Depends(require_role(MANAGER_ROLES))):
    eq = db.query(GymEquipment).filter(GymEquipment.id == equipment_id).first()
    if not eq:
        raise HTTPException(404, "Equipment not found")
    eq.is_active = False
    eq.updated_at = datetime.utcnow()
    db.commit()
    return {"message": "Equipment deactivated"}


@router.get("/{equipment_id}/maintenance")
def get_maintenance_logs(equipment_id: int, db: Session = Depends(get_db), _=Depends(require_role(STAFF_ROLES))):
    return db.query(EquipmentMaintenance).filter(
        EquipmentMaintenance.equipment_id == equipment_id
    ).order_by(EquipmentMaintenance.maintenance_date.desc()).all()


@router.post("/{equipment_id}/maintenance", status_code=status.HTTP_201_CREATED)
def add_maintenance(
    equipment_id: int, data: MaintenanceCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_role(MANAGER_ROLES)),
):
    eq = db.query(GymEquipment).filter(GymEquipment.id == equipment_id).first()
    if not eq:
        raise HTTPException(404, "Equipment not found")
    log = EquipmentMaintenance(
        equipment_id=equipment_id,
        created_by=current_user.id,
        **data.model_dump()
    )
    db.add(log)
    eq.last_maintenance_date = data.maintenance_date
    if data.next_due_date:
        eq.next_maintenance_date = data.next_due_date
    if data.status == "completed" and eq.status == EquipmentStatus.MAINTENANCE.value:
        eq.status = EquipmentStatus.OPERATIONAL.value
    eq.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(log)
    return log
