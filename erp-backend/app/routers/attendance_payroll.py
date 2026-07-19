from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session
from typing import List
from datetime import date
from calendar import monthrange

from app.core.database import get_db
from app.core.auth_dependencies import require_role
from app.models.employee import Employee
from app.models.attendance_payroll import AttendanceRecord, PayrollRun, PayrollItem
from app.schemas.attendance_payroll import (
    AttendanceUpsert,
    PayrollRunCreate,
    PayrollRunResult,
)

router = APIRouter(prefix="/attendance-payroll", tags=["Attendance & Payroll"])


def _per_day_salary(salary: float, month_plan: str) -> float:
    if month_plan == "24":
        return salary / 24.0
    if month_plan == "30":
        return salary / 30.0
    raise HTTPException(status_code=400, detail="Invalid month_plan")


# ─── Attendance ───────────────────────────────────────────────────────────────

@router.post("/attendance")
def upsert_attendance(
    data: AttendanceUpsert,
    db: Session = Depends(get_db),
    _=Depends(require_role(["admin", "company_manager"]))
):
    if not db.query(Employee).filter(Employee.id == data.employee_id).first():
        raise HTTPException(status_code=404, detail="Employee not found")

    record = (
        db.query(AttendanceRecord)
        .filter(
            AttendanceRecord.employee_id == data.employee_id,
            AttendanceRecord.work_date == data.work_date,
        )
        .first()
    )

    if record:
        record.status = data.status
        record.overtime_hours = float(data.overtime_hours or 0)
    else:
        record = AttendanceRecord(
            employee_id=data.employee_id,
            work_date=data.work_date,
            status=data.status,
            overtime_hours=float(data.overtime_hours or 0),
        )
        db.add(record)

    db.commit()
    db.refresh(record)
    return {
        "id": record.id,
        "employee_id": record.employee_id,
        "work_date": str(record.work_date),
        "status": record.status,
        "overtime_hours": record.overtime_hours,
    }


@router.get("/attendance/{employee_id}")
def get_attendance(
    employee_id: int,
    year: int,
    month: int,
    db: Session = Depends(get_db),
    _=Depends(require_role(["admin", "company_manager"]))
):
    if not db.query(Employee).filter(Employee.id == employee_id).first():
        raise HTTPException(status_code=404, detail="Employee not found")

    start_date = date(year, month, 1)
    end_date = date(year, month, monthrange(year, month)[1])

    records = (
        db.query(AttendanceRecord)
        .filter(
            AttendanceRecord.employee_id == employee_id,
            AttendanceRecord.work_date >= start_date,
            AttendanceRecord.work_date <= end_date,
        )
        .order_by(AttendanceRecord.work_date)
        .all()
    )

    return [
        {
            "id": r.id,
            "employee_id": r.employee_id,
            "work_date": str(r.work_date),
            "status": r.status,
            "overtime_hours": r.overtime_hours,
        }
        for r in records
    ]


# ─── Payroll ──────────────────────────────────────────────────────────────────

@router.post("/payroll/runs", status_code=status.HTTP_201_CREATED)
def run_payroll(
    payload: PayrollRunCreate,
    db: Session = Depends(get_db),
    _=Depends(require_role(["admin", "company_manager"]))
):
    existing = (
        db.query(PayrollRun)
        .filter(
            PayrollRun.period_year == payload.period_year,
            PayrollRun.period_month == payload.period_month,
        )
        .first()
    )
    if existing and existing.status == "finalized":
        raise HTTPException(status_code=400, detail="Payroll already finalized for this period")

    if existing:
        run = existing
        run.month_plan = payload.month_plan
        run.overtime_rate_type = payload.overtime_rate_type
        run.overtime_block_hours = payload.overtime_block_hours
        run.status = "draft"
        db.query(PayrollItem).filter(PayrollItem.payroll_run_id == run.id).delete()
    else:
        run = PayrollRun(
            period_year=payload.period_year,
            period_month=payload.period_month,
            month_plan=payload.month_plan,
            overtime_rate_type=payload.overtime_rate_type,
            overtime_hours_factor=1.0,
            overtime_block_hours=payload.overtime_block_hours,
            status="draft",
        )
        db.add(run)
        db.commit()
        db.refresh(run)

    employees: List[Employee] = (
        db.query(Employee)
        .filter(Employee.salary != None, Employee.is_active == True)  # noqa: E711
        .all()
    )

    start_date = date(payload.period_year, payload.period_month, 1)
    end_date = date(
        payload.period_year,
        payload.period_month,
        monthrange(payload.period_year, payload.period_month)[1],
    )

    for emp in employees:
        base_salary = float(emp.salary or 0)
        per_day = _per_day_salary(base_salary, payload.month_plan)

        absent_days = (
            db.query(func.count(AttendanceRecord.id))
            .filter(
                AttendanceRecord.employee_id == emp.id,
                AttendanceRecord.status == "absent",
                AttendanceRecord.work_date >= start_date,
                AttendanceRecord.work_date <= end_date,
            )
            .scalar() or 0
        )

        half_days = (
            db.query(func.count(AttendanceRecord.id))
            .filter(
                AttendanceRecord.employee_id == emp.id,
                AttendanceRecord.status == "half_day",
                AttendanceRecord.work_date >= start_date,
                AttendanceRecord.work_date <= end_date,
            )
            .scalar() or 0
        )

        absent_deduction = (absent_days * per_day) + (half_days * per_day * 0.5)

        # FIX: use func.sum() instead of scalar() to get total overtime hours
        overtime_hours_total = (
            db.query(func.sum(AttendanceRecord.overtime_hours))
            .filter(
                AttendanceRecord.employee_id == emp.id,
                AttendanceRecord.work_date >= start_date,
                AttendanceRecord.work_date <= end_date,
            )
            .scalar() or 0
        )

        overtime_blocks = float(overtime_hours_total) / float(payload.overtime_block_hours)
        multiplier = 2.0 if payload.overtime_rate_type == "double" else 1.0
        overtime_pay = per_day * overtime_blocks * multiplier
        final_salary = base_salary - absent_deduction + overtime_pay

        db.add(PayrollItem(
            payroll_run_id=run.id,
            employee_id=emp.id,
            base_salary=base_salary,
            absent_days=absent_days,
            half_days=half_days,
            absent_deduction=absent_deduction,
            overtime_hours_total=float(overtime_hours_total),
            overtime_blocks=overtime_blocks,
            overtime_multiplier=multiplier,
            overtime_pay=overtime_pay,
            final_salary=final_salary,
        ))

    run.status = "finalized"
    db.commit()
    db.refresh(run)

    return _build_run_response(run, db)


@router.get("/payroll/runs")
def list_payroll_runs(
    db: Session = Depends(get_db),
    _=Depends(require_role(["admin", "company_manager"]))
):
    runs = db.query(PayrollRun).order_by(PayrollRun.period_year.desc(), PayrollRun.period_month.desc()).all()
    return [
        {
            "id": r.id,
            "period_year": r.period_year,
            "period_month": r.period_month,
            "month_plan": r.month_plan,
            "overtime_rate_type": r.overtime_rate_type,
            "status": r.status,
        }
        for r in runs
    ]


@router.get("/payroll/runs/{run_id}", response_model=PayrollRunResult)
def get_payroll_run(
    run_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_role(["admin", "company_manager"]))
):
    run = db.query(PayrollRun).filter(PayrollRun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Payroll run not found")
    return _build_run_response(run, db)


def _build_run_response(run: PayrollRun, db: Session) -> dict:
    items = db.query(PayrollItem).filter(PayrollItem.payroll_run_id == run.id).all()
    return {
        "id": run.id,
        "period_year": run.period_year,
        "period_month": run.period_month,
        "month_plan": run.month_plan,
        "overtime_rate_type": run.overtime_rate_type,
        "status": run.status,
        "items": [
            {
                "employee_id": it.employee_id,
                "base_salary": it.base_salary,
                "absent_days": it.absent_days,
                "absent_deduction": it.absent_deduction,
                "overtime_hours_total": it.overtime_hours_total,
                "overtime_blocks": it.overtime_blocks,
                "overtime_multiplier": it.overtime_multiplier,
                "overtime_pay": it.overtime_pay,
                "final_salary": it.final_salary,
            }
            for it in items
        ],
    }
