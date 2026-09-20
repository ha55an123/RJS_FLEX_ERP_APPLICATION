from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime, date

from app.core.database import get_db
from app.core.auth_dependencies import require_role
from app.models.discount import Discount, DiscountType, DiscountStatus

router = APIRouter(prefix="/discounts", tags=["Discounts"])

ADMIN_ROLES = ["super_admin", "gym_owner", "manager"]


class DiscountCreate(BaseModel):
    name: str
    description: Optional[str] = None
    discount_type: str
    discount_value: float
    min_amount: Optional[float] = None
    max_discount: Optional[float] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    applicable_to: Optional[str] = "all"
    plan_ids: Optional[str] = None
    usage_limit: Optional[int] = None


class DiscountUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    discount_type: Optional[str] = None
    discount_value: Optional[float] = None
    min_amount: Optional[float] = None
    max_discount: Optional[float] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    status: Optional[str] = None
    applicable_to: Optional[str] = None
    plan_ids: Optional[str] = None
    usage_limit: Optional[int] = None


def _serialize(d: Discount) -> dict:
    return {
        "id": d.id,
        "name": d.name,
        "description": d.description,
        "discount_type": d.discount_type,
        "discount_value": d.discount_value,
        "min_amount": d.min_amount,
        "max_discount": d.max_discount,
        "start_date": d.start_date,
        "end_date": d.end_date,
        "status": d.status,
        "applicable_to": d.applicable_to,
        "plan_ids": d.plan_ids,
        "usage_limit": d.usage_limit,
        "usage_count": d.usage_count,
        "is_valid": d.is_valid(),
        "created_at": d.created_at,
        "updated_at": d.updated_at,
    }


@router.get("/")
def list_discounts(db: Session = Depends(get_db), _=Depends(require_role(ADMIN_ROLES))):
    return [_serialize(d) for d in db.query(Discount).order_by(Discount.created_at.desc()).all()]


@router.get("/active/")
def list_active_discounts(db: Session = Depends(get_db)):
    """Returns only currently valid discounts - can be used by frontend for selection"""
    return [_serialize(d) for d in db.query(Discount).filter(
        Discount.status == DiscountStatus.ACTIVE.value
    ).order_by(Discount.created_at.desc()).all() if d.is_valid()]


@router.get("/{discount_id}/")
def get_discount(discount_id: int, db: Session = Depends(get_db), _=Depends(require_role(ADMIN_ROLES))):
    d = db.query(Discount).filter(Discount.id == discount_id).first()
    if not d:
        raise HTTPException(404, "Discount not found")
    return _serialize(d)


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_discount(data: DiscountCreate, db: Session = Depends(get_db), _=Depends(require_role(ADMIN_ROLES))):
    d = Discount(**data.model_dump())
    db.add(d)
    db.commit()
    db.refresh(d)
    return _serialize(d)


@router.put("/{discount_id}/")
def update_discount(
    discount_id: int, data: DiscountUpdate,
    db: Session = Depends(get_db), _=Depends(require_role(ADMIN_ROLES))
):
    d = db.query(Discount).filter(Discount.id == discount_id).first()
    if not d:
        raise HTTPException(404, "Discount not found")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(d, k, v)
    d.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(d)
    return _serialize(d)


@router.delete("/{discount_id}/")
def delete_discount(discount_id: int, db: Session = Depends(get_db), _=Depends(require_role(ADMIN_ROLES))):
    d = db.query(Discount).filter(Discount.id == discount_id).first()
    if not d:
        raise HTTPException(404, "Discount not found")
    db.delete(d)
    db.commit()
    return {"message": "Discount deleted"}


@router.post("/{discount_id}/increment-usage/")
def increment_usage(discount_id: int, db: Session = Depends(get_db)):
    """Increment usage count - called internally when discount is applied"""
    d = db.query(Discount).filter(Discount.id == discount_id).first()
    if not d:
        raise HTTPException(404, "Discount not found")
    d.usage_count += 1
    db.commit()
    return {"message": "Usage incremented", "usage_count": d.usage_count}
