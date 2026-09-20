from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from datetime import date
import io

from app.core.database import get_db
from app.core.auth_dependencies import require_role
from app.models.gym_member import GymMember, MemberStatus
from app.models.gym_attendance import GymAttendance, StaffAttendance
from app.models.membership import MembershipSubscription, SubscriptionStatus
from app.models.gym_payment import GymPayment
from app.models.accounting import DailyExpense
from app.models.gym_staff import GymStaff
from app.models.gym_equipment import GymEquipment, EquipmentStatus

router = APIRouter(prefix="/reports", tags=["Reports"])

MANAGER_ROLES = ["super_admin", "gym_owner", "manager", "accountant"]


@router.get("/revenue")
def revenue_report(
    branch_id: Optional[int] = None,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    db: Session = Depends(get_db),
    _=Depends(require_role(MANAGER_ROLES)),
):
    q = db.query(GymPayment).filter(GymPayment.status == "paid")
    if branch_id:
        q = q.filter(GymPayment.branch_id == branch_id)
    if from_date:
        q = q.filter(GymPayment.payment_date >= from_date)
    if to_date:
        q = q.filter(GymPayment.payment_date <= to_date)

    total_revenue = db.query(func.sum(GymPayment.total_amount)).filter(
        GymPayment.status == "paid",
        *([GymPayment.branch_id == branch_id] if branch_id else []),
        *([GymPayment.payment_date >= from_date] if from_date else []),
        *([GymPayment.payment_date <= to_date] if to_date else []),
    ).scalar() or 0

    by_type = db.query(
        GymPayment.payment_type,
        func.sum(GymPayment.total_amount).label("total"),
        func.count(GymPayment.id).label("count"),
    ).filter(
        GymPayment.status == "paid",
        *([GymPayment.branch_id == branch_id] if branch_id else []),
        *([GymPayment.payment_date >= from_date] if from_date else []),
        *([GymPayment.payment_date <= to_date] if to_date else []),
    ).group_by(GymPayment.payment_type).all()

    total_expenses = db.query(func.sum(DailyExpense.amount)).scalar() or 0

    return {
        "total_revenue": total_revenue,
        "total_expenses": total_expenses,
        "profit": total_revenue - total_expenses,
        "by_payment_type": [{"type": r.payment_type, "total": r.total, "count": r.count} for r in by_type],
    }


@router.get("/members")
def members_report(
    branch_id: Optional[int] = None,
    db: Session = Depends(get_db),
    _=Depends(require_role(MANAGER_ROLES)),
):
    q = db.query(GymMember)
    if branch_id:
        q = q.filter(GymMember.branch_id == branch_id)

    by_status = db.query(
        GymMember.status, func.count(GymMember.id).label("count")
    )
    if branch_id:
        by_status = by_status.filter(GymMember.branch_id == branch_id)
    by_status = by_status.group_by(GymMember.status).all()

    expiring_7 = db.query(func.count(MembershipSubscription.id)).filter(
        MembershipSubscription.status == SubscriptionStatus.ACTIVE.value,
        MembershipSubscription.end_date <= func.current_date() + 7,
        MembershipSubscription.end_date >= func.current_date(),
        *([MembershipSubscription.branch_id == branch_id] if branch_id else []),
    ).scalar() or 0

    return {
        "total": q.count(),
        "by_status": [{"status": r.status, "count": r.count} for r in by_status],
        "expiring_in_7_days": expiring_7,
    }


@router.get("/attendance")
def attendance_report(
    branch_id: Optional[int] = None,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    db: Session = Depends(get_db),
    _=Depends(require_role(MANAGER_ROLES)),
):
    q = db.query(
        GymAttendance.attendance_date,
        func.count(GymAttendance.id).label("checkins"),
    )
    if branch_id:
        q = q.filter(GymAttendance.branch_id == branch_id)
    if from_date:
        q = q.filter(GymAttendance.attendance_date >= from_date)
    if to_date:
        q = q.filter(GymAttendance.attendance_date <= to_date)
    rows = q.group_by(GymAttendance.attendance_date).order_by(GymAttendance.attendance_date).all()
    return [{"date": str(r.attendance_date), "checkins": r.checkins} for r in rows]


@router.get("/expiring-memberships")
def expiring_memberships(
    days: int = Query(7, ge=1, le=90),
    branch_id: Optional[int] = None,
    db: Session = Depends(get_db),
    _=Depends(require_role(MANAGER_ROLES)),
):
    q = db.query(MembershipSubscription).filter(
        MembershipSubscription.status == SubscriptionStatus.ACTIVE.value,
        MembershipSubscription.end_date <= func.current_date() + days,
        MembershipSubscription.end_date >= func.current_date(),
    )
    if branch_id:
        q = q.filter(MembershipSubscription.branch_id == branch_id)
    return q.order_by(MembershipSubscription.end_date).all()


@router.get("/equipment-status")
def equipment_status_report(
    branch_id: Optional[int] = None,
    db: Session = Depends(get_db),
    _=Depends(require_role(MANAGER_ROLES)),
):
    q = db.query(GymEquipment.status, func.count(GymEquipment.id).label("count"))
    if branch_id:
        q = q.filter(GymEquipment.branch_id == branch_id)
    rows = q.group_by(GymEquipment.status).all()
    return [{"status": r.status, "count": r.count} for r in rows]


@router.get("/export/members")
def export_members_csv(
    branch_id: Optional[int] = None,
    db: Session = Depends(get_db),
    _=Depends(require_role(MANAGER_ROLES)),
):
    """Export members list as CSV."""
    import csv
    q = db.query(GymMember)
    if branch_id:
        q = q.filter(GymMember.branch_id == branch_id)
    members = q.all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Code", "First Name", "Last Name", "Phone", "Email", "Status", "Joining Date"])
    for m in members:
        writer.writerow([m.id, m.member_code, m.first_name, m.last_name, m.phone, m.email, m.status, m.joining_date])

    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode()),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=members.csv"},
    )


@router.get("/export/attendance")
def export_attendance_csv(
    branch_id: Optional[int] = None,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    db: Session = Depends(get_db),
    _=Depends(require_role(MANAGER_ROLES)),
):
    import csv
    q = db.query(GymAttendance)
    if branch_id:
        q = q.filter(GymAttendance.branch_id == branch_id)
    if from_date:
        q = q.filter(GymAttendance.attendance_date >= from_date)
    if to_date:
        q = q.filter(GymAttendance.attendance_date <= to_date)
    records = q.order_by(GymAttendance.attendance_date.desc()).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Member ID", "Date", "Check In", "Check Out", "Total Hours", "Method", "Status"])
    for r in records:
        writer.writerow([r.id, r.member_id, r.attendance_date, r.check_in_time, r.check_out_time, r.total_hours, r.method, r.status])

    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode()),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=attendance.csv"},
    )
