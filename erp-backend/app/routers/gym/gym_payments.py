from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from typing import Optional
from pydantic import BaseModel
from datetime import date, datetime
import random, string

from app.core.database import get_db
from app.core.auth_dependencies import require_role, get_current_user
from app.models.gym_payment import GymPayment, PaymentMethod, PaymentType

router = APIRouter(prefix="/payments", tags=["Payments"])

STAFF_ROLES   = ["super_admin", "gym_owner", "manager", "receptionist", "accountant"]
MANAGER_ROLES = ["super_admin", "gym_owner", "manager", "accountant"]


def _gen_payment_number(db: Session) -> str:
    while True:
        num = "PAY-" + datetime.utcnow().strftime("%Y%m%d") + "-" + "".join(random.choices(string.digits, k=4))
        if not db.query(GymPayment).filter(GymPayment.payment_number == num).first():
            return num


class PaymentCreate(BaseModel):
    member_id: int
    branch_id: int
    subscription_id: Optional[int] = None
    payment_type: PaymentType = PaymentType.MEMBERSHIP
    payment_method: PaymentMethod = PaymentMethod.CASH
    amount: float
    tax_amount: float = 0.0
    discount_amount: float = 0.0
    payment_date: date
    notes: Optional[str] = None


class PaymentUpdate(BaseModel):
    member_id: Optional[int] = None
    branch_id: Optional[int] = None
    payment_type: Optional[PaymentType] = None
    payment_method: Optional[PaymentMethod] = None
    amount: Optional[float] = None
    tax_amount: Optional[float] = None
    discount_amount: Optional[float] = None
    payment_date: Optional[date] = None
    status: Optional[str] = None
    notes: Optional[str] = None


def _serialize_payment(payment: GymPayment) -> dict:
    return {
        "id": payment.id,
        "payment_number": payment.payment_number,
        "member_id": payment.member_id,
        "member_name": payment.member.full_name if payment.member else None,
        "member_code": payment.member.member_code if payment.member else None,
        "branch_id": payment.branch_id,
        "subscription_id": payment.subscription_id,
        "payment_type": payment.payment_type,
        "payment_method": payment.payment_method,
        "amount": payment.amount,
        "tax_amount": payment.tax_amount,
        "discount_amount": payment.discount_amount,
        "total_amount": payment.total_amount,
        "payment_date": payment.payment_date.isoformat() if payment.payment_date else None,
        "reference_number": payment.reference_number,
        "status": payment.status,
        "notes": payment.notes,
        "received_by": payment.received_by,
        "created_at": payment.created_at.isoformat() if payment.created_at else None,
        "updated_at": payment.updated_at.isoformat() if payment.updated_at else None,
    }


@router.get("/")
def list_payments(
    member_id: Optional[int] = None,
    branch_id: Optional[int] = None,
    payment_type: Optional[str] = None,
    status: Optional[str] = None,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    _=Depends(require_role(STAFF_ROLES)),
):
    q = db.query(GymPayment).options(joinedload(GymPayment.member))
    if member_id:
        q = q.filter(GymPayment.member_id == member_id)
    if branch_id:
        q = q.filter(GymPayment.branch_id == branch_id)
    if payment_type:
        q = q.filter(GymPayment.payment_type == payment_type)
    if status:
        q = q.filter(GymPayment.status == status)
    if from_date:
        q = q.filter(GymPayment.payment_date >= from_date)
    if to_date:
        q = q.filter(GymPayment.payment_date <= to_date)
    total = q.count()
    items = q.order_by(GymPayment.payment_date.desc()).offset((page - 1) * page_size).limit(page_size).all()
    
    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": [_serialize_payment(payment) for payment in items],
    }


@router.get("/{payment_id}/")
def get_payment(payment_id: int, db: Session = Depends(get_db), _=Depends(require_role(STAFF_ROLES))):
    p = db.query(GymPayment).filter(GymPayment.id == payment_id).first()
    if not p:
        raise HTTPException(404, "Payment not found")
    return _serialize_payment(p)


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_payment(
    data: PaymentCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_role(STAFF_ROLES)),
):
    from app.models.gym_member import GymMember

    member = db.query(GymMember).filter(GymMember.id == data.member_id, GymMember.deleted_at.is_(None)).first()
    if not member:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Member not found")
    if data.amount <= 0:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Amount must be greater than zero")

    payload = data.model_dump(exclude={"reference_number"})
    total = round(data.amount + data.tax_amount - data.discount_amount, 2)
    payment = GymPayment(
        **payload,
        payment_number=_gen_payment_number(db),
        total_amount=total,
        status="paid",
        received_by=current_user.id,
        reference_number=None,
    )
    db.add(payment)
    db.commit()
    db.refresh(payment)
    return _serialize_payment(payment)


@router.put("/{payment_id}/")
def update_payment(
    payment_id: int,
    data: PaymentUpdate,
    db: Session = Depends(get_db),
    _=Depends(require_role(MANAGER_ROLES)),
):
    payment = db.query(GymPayment).filter(GymPayment.id == payment_id).first()
    if not payment:
        raise HTTPException(404, "Payment not found")
    if payment.status == "refunded":
        raise HTTPException(400, "Refunded payments cannot be edited")

    updates = data.model_dump(exclude_none=True)
    if "member_id" in updates:
        from app.models.gym_member import GymMember
        member = db.query(GymMember).filter(
            GymMember.id == updates["member_id"],
            GymMember.deleted_at.is_(None),
        ).first()
        if not member:
            raise HTTPException(404, "Member not found")
        if "branch_id" not in updates:
            updates["branch_id"] = member.branch_id

    for key, value in updates.items():
        setattr(payment, key, value)
    payment.total_amount = round(payment.amount + payment.tax_amount - payment.discount_amount, 2)
    payment.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(payment)
    return _serialize_payment(payment)


@router.delete("/{payment_id}/")
def delete_payment(
    payment_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_role(["super_admin", "gym_owner"])),
):
    payment = db.query(GymPayment).filter(GymPayment.id == payment_id).first()
    if not payment:
        raise HTTPException(404, "Payment not found")
    db.delete(payment)
    db.commit()
    return {"message": "Payment deleted"}


@router.post("/{payment_id}/refund/")
def refund_payment(
    payment_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_role(MANAGER_ROLES)),
):
    p = db.query(GymPayment).filter(GymPayment.id == payment_id).first()
    if not p:
        raise HTTPException(404, "Payment not found")
    if p.status == "refunded":
        raise HTTPException(400, "Payment already refunded")
    p.status = "refunded"
    p.updated_at = datetime.utcnow()
    db.commit()
    return {"message": "Payment refunded", "payment_number": p.payment_number}


@router.get("/member/{member_id}/pending/")
def pending_payments(member_id: int, db: Session = Depends(get_db), _=Depends(require_role(STAFF_ROLES))):
    from sqlalchemy import func
    total = db.query(func.sum(GymPayment.total_amount)).filter(
        GymPayment.member_id == member_id,
        GymPayment.status == "pending"
    ).scalar() or 0
    items = db.query(GymPayment).filter(
        GymPayment.member_id == member_id,
        GymPayment.status == "pending"
    ).all()
    return {"total_pending": total, "items": items}
