from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import Optional
from pydantic import BaseModel
from datetime import date, datetime, timedelta

from app.core.database import get_db
from app.core.auth_dependencies import require_role, get_current_user
from app.models.membership import (
    MembershipPlan, MembershipSubscription, MembershipFreeze,
    MembershipTransfer, PlanDuration, SubscriptionStatus
)
from app.models.gym_member import GymMember, MemberStatus
from app.models.branch import Branch

router = APIRouter(prefix="/memberships", tags=["Memberships"])

STAFF_ROLES = ["super_admin", "gym_owner", "manager", "receptionist", "accountant"]


# ── Plan duration → days mapping ─────────────────────────────────────────────
DURATION_DAYS = {
    PlanDuration.DAILY:     1,
    PlanDuration.WEEKLY:    7,
    PlanDuration.MONTHLY:   30,
    PlanDuration.QUARTERLY: 90,
    PlanDuration.BIANNUAL:  180,
    PlanDuration.ANNUAL:    365,
}


def _plan_end_date(start: date, plan: MembershipPlan) -> date:
    days = DURATION_DAYS.get(plan.duration_type, plan.duration_days or 30)
    return start + timedelta(days=days)


# ─────────────────────────────────────────────────────────────────────────────
# PLANS
# ─────────────────────────────────────────────────────────────────────────────

class PlanCreate(BaseModel):
    name: str
    description: Optional[str] = None
    duration_type: PlanDuration
    duration_days: Optional[int] = None
    price: float
    tax_percent: float = 0.0
    joining_fee: float = 0.0
    discount_percent: float = 0.0
    admission_discount_percent: float = 0.0
    monthly_discount_percent: float = 0.0
    freeze_allowed: bool = True
    max_freeze_days: int = 30
    auto_renewal: bool = False
    renewal_reminder_days: int = 7
    is_active: bool = True


class PlanUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    tax_percent: Optional[float] = None
    joining_fee: Optional[float] = None
    discount_percent: Optional[float] = None
    admission_discount_percent: Optional[float] = None
    monthly_discount_percent: Optional[float] = None
    freeze_allowed: Optional[bool] = None
    max_freeze_days: Optional[int] = None
    auto_renewal: Optional[bool] = None
    renewal_reminder_days: Optional[int] = None
    is_active: Optional[bool] = None


@router.get("/plans/")
def list_plans(
    include_inactive: bool = False,
    db: Session = Depends(get_db), 
    _=Depends(require_role(STAFF_ROLES))
):
    query = db.query(MembershipPlan)
    if not include_inactive:
        query = query.filter(MembershipPlan.is_active == True)
    plans = query.order_by(MembershipPlan.name).all()
    serialized_plans = []
    for plan in plans:
        serialized_plans.append({
            "id": plan.id,
            "name": plan.name,
            "description": plan.description,
            "duration_type": plan.duration_type.value if plan.duration_type else None,
            "duration_days": plan.duration_days,
            "price": plan.price,
            "tax_percent": plan.tax_percent,
            "joining_fee": plan.joining_fee,
            "discount_percent": plan.discount_percent,
            "admission_discount_percent": plan.admission_discount_percent,
            "monthly_discount_percent": plan.monthly_discount_percent,
            "freeze_allowed": plan.freeze_allowed,
            "max_freeze_days": plan.max_freeze_days,
            "auto_renewal": plan.auto_renewal,
            "renewal_reminder_days": plan.renewal_reminder_days,
            "is_active": plan.is_active,
            "created_at": plan.created_at.isoformat() if plan.created_at else None,
            "updated_at": plan.updated_at.isoformat() if plan.updated_at else None,
        })
    return serialized_plans


@router.post("/plans/", status_code=status.HTTP_201_CREATED)
def create_plan(data: PlanCreate, db: Session = Depends(get_db), _=Depends(require_role(["super_admin", "gym_owner", "manager"]))):
    plan = MembershipPlan(**data.model_dump())
    db.add(plan)
    db.commit()
    db.refresh(plan)
    return plan


@router.put("/plans/{plan_id}/")
def update_plan(plan_id: int, data: PlanUpdate, db: Session = Depends(get_db), _=Depends(require_role(["super_admin", "gym_owner", "manager"]))):
    plan = db.query(MembershipPlan).filter(MembershipPlan.id == plan_id).first()
    if not plan:
        raise HTTPException(404, "Plan not found")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(plan, k, v)
    plan.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(plan)
    return plan


@router.delete("/plans/{plan_id}/")
def delete_plan(plan_id: int, db: Session = Depends(get_db), _=Depends(require_role(["super_admin", "gym_owner"]))):
    plan = db.query(MembershipPlan).filter(MembershipPlan.id == plan_id).first()
    if not plan:
        raise HTTPException(404, "Plan not found")
    plan.is_active = False
    plan.updated_at = datetime.utcnow()
    db.commit()
    return {"message": "Plan deactivated"}


# ─────────────────────────────────────────────────────────────────────────────
# SUBSCRIPTIONS
# ─────────────────────────────────────────────────────────────────────────────

class SubscriptionCreate(BaseModel):
    member_id: int
    plan_id: int
    branch_id: int
    start_date: date
    payment_method: Optional[str] = "cash"
    payment_reference: Optional[str] = None
    payment_status: str = "paid"
    discount_amount: float = 0.0
    admission_discount_amount: float = 0.0
    monthly_discount_amount: float = 0.0
    notes: Optional[str] = None


class SubscriptionUpdate(BaseModel):
    start_date: Optional[date] = None
    payment_method: Optional[str] = None
    payment_reference: Optional[str] = None
    payment_status: Optional[str] = None
    notes: Optional[str] = None


def _apply_percent_discount(amount: float, percent: float) -> float:
    if not amount or not percent:
        return amount
    return max(0.0, round(amount - (amount * percent / 100), 2))


def _subscription_totals(plan: MembershipPlan, data: SubscriptionCreate) -> dict:
    monthly_base = _apply_percent_discount(plan.price, plan.monthly_discount_percent or plan.discount_percent)
    admission_base = _apply_percent_discount(plan.joining_fee, plan.admission_discount_percent)

    monthly_after = max(0.0, round(monthly_base - data.monthly_discount_amount, 2))
    admission_after = max(0.0, round(admission_base - data.admission_discount_amount, 2))
    extra_discount = max(0.0, data.discount_amount)
    tax_amount = round(monthly_after * plan.tax_percent / 100, 2)
    total = round(monthly_after + tax_amount + admission_after - extra_discount, 2)

    return {
        "price_paid": monthly_after,
        "joining_fee_paid": admission_after,
        "tax_amount": tax_amount,
        "discount_amount": round(
            (plan.price - monthly_after)
            + (plan.joining_fee - admission_after)
            + extra_discount,
            2,
        ),
        "total_amount": max(0.0, total),
    }


def _serialize_subscription(sub: MembershipSubscription) -> dict:
    """Return the same shape from POST and GET so the client can render either."""
    return {
        "id": sub.id,
        "member_id": sub.member_id,
        "member_name": sub.member.full_name if sub.member else None,
        "member_code": sub.member.member_code if sub.member else None,
        "plan_id": sub.plan_id,
        "plan_name": sub.plan.name if sub.plan else None,
        "branch_id": sub.branch_id,
        "start_date": sub.start_date.isoformat() if sub.start_date else None,
        "end_date": sub.end_date.isoformat() if sub.end_date else None,
        "actual_end_date": sub.actual_end_date.isoformat() if sub.actual_end_date else None,
        "price_paid": sub.price_paid,
        "tax_amount": sub.tax_amount,
        "joining_fee_paid": sub.joining_fee_paid,
        "discount_amount": sub.discount_amount,
        "total_amount": sub.total_amount,
        "payment_method": sub.payment_method,
        "payment_reference": sub.payment_reference,
        "payment_status": sub.payment_status,
        "status": sub.status,
        "notes": sub.notes,
        "created_at": sub.created_at.isoformat() if sub.created_at else None,
        "updated_at": sub.updated_at.isoformat() if sub.updated_at else None,
    }


@router.get("/subscriptions/")
def list_subscriptions(
    member_id: Optional[int] = None,
    branch_id: Optional[int] = None,
    status: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    _=Depends(require_role(STAFF_ROLES)),
):
    q = db.query(MembershipSubscription)
    if member_id:
        q = q.filter(MembershipSubscription.member_id == member_id)
    if branch_id:
        q = q.filter(MembershipSubscription.branch_id == branch_id)
    if status:
        q = q.filter(MembershipSubscription.status == status)
    total = q.count()
    items = q.order_by(MembershipSubscription.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    
    serialized_items = [_serialize_subscription(sub) for sub in items]
    
    return {"total": total, "page": page, "page_size": page_size, "items": serialized_items}


@router.post("/subscriptions/", status_code=status.HTTP_201_CREATED)
def create_subscription(
    data: SubscriptionCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_role(STAFF_ROLES)),
):
    plan = db.query(MembershipPlan).filter(MembershipPlan.id == data.plan_id, MembershipPlan.is_active == True).first()  # noqa: E712
    if not plan:
        raise HTTPException(404, "Plan not found or inactive")

    member = db.query(GymMember).filter(GymMember.id == data.member_id).first()
    if not member:
        raise HTTPException(404, "Member not found")

    branch = db.query(Branch).filter(Branch.id == data.branch_id, Branch.is_active == True).first()  # noqa: E712
    if not branch:
        raise HTTPException(404, "Branch not found or inactive")

    end_date = _plan_end_date(data.start_date, plan)
    totals = _subscription_totals(plan, data)

    sub = MembershipSubscription(
        member_id=data.member_id,
        plan_id=data.plan_id,
        branch_id=data.branch_id,
        start_date=data.start_date,
        end_date=end_date,
        actual_end_date=end_date,
        price_paid=totals["price_paid"],
        tax_amount=totals["tax_amount"],
        joining_fee_paid=totals["joining_fee_paid"],
        discount_amount=totals["discount_amount"],
        total_amount=totals["total_amount"],
        payment_method=data.payment_method,
        payment_reference=data.payment_reference,
        payment_status=data.payment_status,
        status=SubscriptionStatus.ACTIVE.value,
        notes=data.notes,
        created_by=current_user.id,
    )
    db.add(sub)

    # Update member status
    member.status = MemberStatus.ACTIVE.value
    db.commit()
    db.refresh(sub)
    return _serialize_subscription(sub)


@router.get("/subscriptions/{sub_id}/")
def get_subscription(
    sub_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_role(STAFF_ROLES)),
):
    sub = db.query(MembershipSubscription).filter(MembershipSubscription.id == sub_id).first()
    if not sub:
        raise HTTPException(404, "Subscription not found")
    return _serialize_subscription(sub)


@router.put("/subscriptions/{sub_id}/")
def update_subscription(
    sub_id: int,
    data: SubscriptionUpdate,
    db: Session = Depends(get_db),
    _=Depends(require_role(["super_admin", "gym_owner", "manager"])),
):
    sub = db.query(MembershipSubscription).filter(MembershipSubscription.id == sub_id).first()
    if not sub:
        raise HTTPException(404, "Subscription not found")

    for key, value in data.model_dump(exclude_none=True).items():
        setattr(sub, key, value)
    if data.start_date is not None:
        plan = db.query(MembershipPlan).filter(MembershipPlan.id == sub.plan_id).first()
        sub.end_date = _plan_end_date(data.start_date, plan)
        sub.actual_end_date = sub.end_date
    sub.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(sub)
    return _serialize_subscription(sub)


@router.delete("/subscriptions/{sub_id}/")
def delete_subscription(
    sub_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_role(["super_admin", "gym_owner"])),
):
    sub = db.query(MembershipSubscription).filter(MembershipSubscription.id == sub_id).first()
    if not sub:
        raise HTTPException(404, "Subscription not found")
    try:
        db.delete(sub)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "Subscription cannot be deleted because it has related records")
    return {"message": "Subscription deleted"}


@router.post("/subscriptions/{sub_id}/freeze/")
def freeze_subscription(
    sub_id: int,
    freeze_data: dict,
    db: Session = Depends(get_db),
    current_user=Depends(require_role(STAFF_ROLES)),
):
    sub = db.query(MembershipSubscription).filter(MembershipSubscription.id == sub_id).first()
    if not sub:
        raise HTTPException(404, "Subscription not found")
    if sub.status != SubscriptionStatus.ACTIVE.value:
        raise HTTPException(400, "Only active subscriptions can be frozen")

    freeze_days = freeze_data.get("freeze_days", 30)
    freeze_start = date.today()
    freeze_end = freeze_start + timedelta(days=freeze_days)
    reason = freeze_data.get("reason")

    freeze = MembershipFreeze(
        subscription_id=sub_id,
        freeze_start=freeze_start,
        freeze_end=freeze_end,
        freeze_days=freeze_days,
        reason=reason,
        approved_by=current_user.id,
    )
    db.add(freeze)

    # Extend end date
    sub.actual_end_date = sub.actual_end_date + timedelta(days=freeze_days)
    sub.status = SubscriptionStatus.FROZEN.value
    db.commit()
    return {"message": "Subscription frozen", "new_end_date": str(sub.actual_end_date)}


@router.post("/subscriptions/{sub_id}/cancel/")
def cancel_subscription(
    sub_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_role(["super_admin", "gym_owner", "manager"])),
):
    sub = db.query(MembershipSubscription).filter(MembershipSubscription.id == sub_id).first()
    if not sub:
        raise HTTPException(404, "Subscription not found")
    sub.status = SubscriptionStatus.CANCELLED.value
    sub.updated_at = datetime.utcnow()
    db.commit()
    return {"message": "Subscription cancelled"}


@router.post("/subscriptions/{sub_id}/transfer/")
def transfer_subscription(
    sub_id: int,
    transfer_data: dict,
    db: Session = Depends(get_db),
    current_user=Depends(require_role(["super_admin", "gym_owner", "manager"])),
):
    sub = db.query(MembershipSubscription).filter(MembershipSubscription.id == sub_id).first()
    if not sub:
        raise HTTPException(404, "Subscription not found")
    to_member_id = transfer_data.get("to_member_id")
    to_member = db.query(GymMember).filter(GymMember.id == to_member_id).first()
    if not to_member:
        raise HTTPException(404, "Target member not found")

    transfer = MembershipTransfer(
        subscription_id=sub_id,
        from_member_id=sub.member_id,
        to_member_id=to_member_id,
        transfer_date=date.today(),
        reason=transfer_data.get("reason"),
        approved_by=current_user.id,
    )
    db.add(transfer)
    sub.member_id = to_member_id
    db.commit()
    return {"message": "Membership transferred"}


@router.post("/subscriptions/{sub_id}/renew/")
def renew_subscription(
    sub_id: int,
    renew_data: dict,
    db: Session = Depends(get_db),
    current_user=Depends(require_role(STAFF_ROLES)),
):
    sub = db.query(MembershipSubscription).filter(MembershipSubscription.id == sub_id).first()
    if not sub:
        raise HTTPException(404, "Subscription not found")
    
    plan = db.query(MembershipPlan).filter(MembershipPlan.id == sub.plan_id).first()
    if not plan:
        raise HTTPException(404, "Plan not found")
    
    # Calculate new end date from current end date
    new_end_date = sub.end_date + timedelta(days=DURATION_DAYS.get(plan.duration_type, plan.duration_days or 30))
    
    # Update subscription
    sub.end_date = new_end_date
    sub.actual_end_date = new_end_date
    sub.status = SubscriptionStatus.ACTIVE.value
    sub.updated_at = datetime.utcnow()
    db.commit()
    return {"message": "Subscription renewed", "new_end_date": str(new_end_date)}


@router.post("/subscriptions/{sub_id}/unfreeze/")
def unfreeze_subscription(
    sub_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_role(STAFF_ROLES)),
):
    sub = db.query(MembershipSubscription).filter(MembershipSubscription.id == sub_id).first()
    if not sub:
        raise HTTPException(404, "Subscription not found")
    if sub.status != SubscriptionStatus.FROZEN.value:
        raise HTTPException(400, "Only frozen subscriptions can be unfrozen")
    
    sub.status = SubscriptionStatus.ACTIVE.value
    sub.updated_at = datetime.utcnow()
    db.commit()
    return {"message": "Subscription unfrozen"}
