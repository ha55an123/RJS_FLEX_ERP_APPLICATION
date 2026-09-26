from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date

from app.core.database import get_db
from app.core.auth_dependencies import get_current_user, require_role
from app.models.gym_member import GymMember, MemberStatus
from app.models.membership import MembershipSubscription, SubscriptionStatus
from app.models.gym_attendance import GymAttendance
from app.models.gym_staff import GymStaff, StaffRole
from app.models.gym_payment import GymPayment
from app.models.accounting import DailyExpense
from app.models.gym_equipment import GymEquipment, EquipmentStatus
from app.models.gym_inventory import GymInventoryItem

router = APIRouter(prefix="/dashboard", tags=["Gym Dashboard"])

MANAGER_ROLES = ["super_admin", "gym_owner", "manager", "accountant"]


@router.get("/overview")
def overview(
    branch_id: int = None,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    today = date.today()

    def _filter(q, model):
        if hasattr(model, "deleted_at"):
            q = q.filter(model.deleted_at.is_(None))
        if branch_id is not None and hasattr(model, "branch_id"):
            q = q.filter(model.branch_id == branch_id)
        return q

    total_members   = _filter(db.query(func.count(GymMember.id)), GymMember).scalar() or 0
    active_members  = _filter(
        db.query(func.count(GymMember.id)).filter(GymMember.status == MemberStatus.ACTIVE.value),
        GymMember
    ).scalar() or 0
    expired_members = _filter(
        db.query(func.count(GymMember.id)).filter(GymMember.status == MemberStatus.EXPIRED.value),
        GymMember
    ).scalar() or 0

    checkins_today  = _filter(
        db.query(func.count(GymAttendance.id)).filter(GymAttendance.attendance_date == today),
        GymAttendance
    ).scalar() or 0
    checkouts_today = _filter(
        db.query(func.count(GymAttendance.id)).filter(
            GymAttendance.attendance_date == today,
            GymAttendance.check_out_time.isnot(None)
        ),
        GymAttendance
    ).scalar() or 0

    trainer_count   = _filter(
        db.query(func.count(GymStaff.id)).filter(GymStaff.role == StaffRole.TRAINER.value),
        GymStaff
    ).scalar() or 0

    total_revenue   = _filter(
        db.query(func.sum(GymPayment.total_amount)).filter(GymPayment.status == "paid"),
        GymPayment
    ).scalar() or 0
    total_expenses  = db.query(func.sum(DailyExpense.amount)).scalar() or 0
    profit          = total_revenue - total_expenses

    equipment_issues = _filter(
        db.query(func.count(GymEquipment.id)).filter(
            GymEquipment.status.in_([EquipmentStatus.MAINTENANCE.value, EquipmentStatus.OUT_OF_ORDER.value])
        ),
        GymEquipment
    ).scalar() or 0

    low_stock_items = db.query(func.count(GymInventoryItem.id)).filter(
        GymInventoryItem.quantity <= GymInventoryItem.minimum_stock
    ).scalar() or 0

    from datetime import timedelta
    seven_days_later = date.today() + timedelta(days=7)
    expiring_soon = _filter(
        db.query(func.count(MembershipSubscription.id)).filter(
            MembershipSubscription.status == SubscriptionStatus.ACTIVE.value,
            MembershipSubscription.end_date <= seven_days_later,
        ),
        MembershipSubscription
    ).scalar() or 0

    pending_payments = _filter(
        db.query(func.count(GymPayment.id)).filter(GymPayment.status == "pending"),
        GymPayment
    ).scalar() or 0

    return {
        "total_members":    total_members,
        "active_members":   active_members,
        "expired_members":  expired_members,
        "checkins_today":   checkins_today,
        "checkouts_today":  checkouts_today,
        "trainer_count":    trainer_count,
        "total_revenue":    total_revenue,
        "total_expenses":   total_expenses,
        "profit":           profit,
        "equipment_issues": equipment_issues,
        "low_stock_items":  low_stock_items,
        "expiring_soon":    expiring_soon,
        "pending_payments": pending_payments,
    }


@router.get("/attendance-chart")
def attendance_chart(
    branch_id: int = None,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    """Daily check-in counts for the last 30 days."""
    rows = (
        db.query(GymAttendance.attendance_date, func.count(GymAttendance.id))
        .filter(
            *([GymAttendance.branch_id == branch_id] if branch_id else [])
        )
        .group_by(GymAttendance.attendance_date)
        .order_by(GymAttendance.attendance_date.desc())
        .limit(30)
        .all()
    )
    return [{"date": str(r[0]), "count": r[1]} for r in reversed(rows)]


@router.get("/revenue-chart")
def revenue_chart(
    branch_id: int = None,
    db: Session = Depends(get_db),
    _=Depends(require_role(MANAGER_ROLES)),
):
    """Monthly revenue for the last 12 months."""
    rows = (
        db.query(
            func.extract("year",  GymPayment.payment_date).label("year"),
            func.extract("month", GymPayment.payment_date).label("month"),
            func.sum(GymPayment.total_amount).label("revenue"),
        )
        .filter(
            GymPayment.status == "paid",
            *([GymPayment.branch_id == branch_id] if branch_id else []),
        )
        .group_by("year", "month")
        .order_by("year", "month")
        .limit(12)
        .all()
    )
    return [{"year": int(r.year), "month": int(r.month), "revenue": r.revenue or 0} for r in rows]


@router.get("/branch-comparison")
def branch_comparison(
    db: Session = Depends(get_db),
    _=Depends(require_role(MANAGER_ROLES)),
):
    from app.models.branch import Branch
    branches = db.query(Branch).filter(Branch.is_active == True).all()  # noqa: E712
    result = []
    for b in branches:
        members = db.query(func.count(GymMember.id)).filter(GymMember.branch_id == b.id).scalar() or 0
        revenue = db.query(func.sum(GymPayment.total_amount)).filter(
            GymPayment.branch_id == b.id, GymPayment.status == "paid"
        ).scalar() or 0
        result.append({"branch": b.name, "members": members, "revenue": revenue})
    return result
