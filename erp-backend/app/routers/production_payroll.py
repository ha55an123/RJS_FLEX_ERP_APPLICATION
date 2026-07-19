from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session
from typing import List
from datetime import date
from calendar import monthrange

from app.core.database import get_db
from app.core.auth_dependencies import require_role
from app.models.employee import Employee
from app.models.accounting import Ledger, LedgerEntry, LedgerType
from app.models.production_payroll import (
    ProductionDepartment,
    ProductionTechnology,
    EmployeeTechnologyAssignment,
    ProductionEntry,
    ProductionPayrollRun,
    ProductionPayrollItem,
    ProductionLoan,
    ProductionAdvance,
)
from app.schemas.production_payroll import (
    ProductionDepartmentCreate,
    ProductionDepartmentUpdate,
    ProductionDepartmentOut,
    ProductionTechnologyCreate,
    ProductionTechnologyUpdate,
    ProductionTechnologyOut,
    EmployeeTechnologyAssignmentCreate,
    EmployeeTechnologyAssignmentUpdate,
    EmployeeTechnologyAssignmentOut,
    ProductionEntryCreate,
    ProductionEntryUpdate,
    ProductionEntryOut,
    ProductionPayrollRunCreate,
    ProductionPayrollRunResult,
    ProductionPayrollItemResult,
    ProductionLoanCreate,
    ProductionLoanOut,
    ProductionAdvanceCreate,
    ProductionAdvanceOut,
)

router = APIRouter(prefix="/production", tags=["Production & Payroll"])


def _serialize_department(dep: ProductionDepartment) -> dict:
    return {
        "id": dep.id,
        "name": dep.name,
        "description": dep.description,
        "status": dep.status,
        "created_at": dep.created_at.isoformat(),
        "updated_at": dep.updated_at.isoformat() if dep.updated_at else None,
    }


def _serialize_technology(tech: ProductionTechnology) -> dict:
    return {
        "id": tech.id,
        "department_id": tech.department_id,
        "name": tech.name,
        "unit_rate": tech.unit_rate,
        "status": tech.status,
        "description": tech.description,
        "created_at": tech.created_at.isoformat(),
        "updated_at": tech.updated_at.isoformat() if tech.updated_at else None,
    }


def _serialize_assignment(assign: EmployeeTechnologyAssignment) -> dict:
    return {
        "id": assign.id,
        "employee_id": assign.employee_id,
        "technology_id": assign.technology_id,
        "assigned_date": assign.assigned_date.isoformat(),
        "status": assign.status,
        "notes": assign.notes,
        "created_at": assign.created_at.isoformat(),
    }


def _serialize_entry(entry: ProductionEntry) -> dict:
    return {
        "id": entry.id,
        "employee_id": entry.employee_id,
        "technology_id": entry.technology_id,
        "technology_name": entry.technology.name if entry.technology else None,
        "department_id": entry.technology.department_id if entry.technology else None,
        "unit_rate": entry.technology.unit_rate if entry.technology else 0.0,
        "production_date": entry.production_date.isoformat(),
        "quantity": entry.quantity,
        "remarks": entry.remarks,
        "created_at": entry.created_at.isoformat(),
    }


def _apply_ledger_balance(ledger: Ledger, amount: float, entry_type: str):
    if entry_type not in {"debit", "credit"}:
        raise HTTPException(status_code=400, detail="Invalid ledger entry type")

    positive_balance = ledger.ledger_type in {LedgerType.ASSET, LedgerType.EXPENSE}
    if entry_type == "debit":
        ledger.current_balance += amount if positive_balance else -amount
    else:
        ledger.current_balance -= amount if positive_balance else amount


def _record_ledger_entry(
    db: Session,
    ledger: Ledger,
    amount: float,
    entry_type: str,
    description: str,
    reference_type: str,
    reference_id: int,
):
    entry = LedgerEntry(
        ledger_id=ledger.id,
        amount=amount,
        entry_type=entry_type,
        description=description,
        reference_type=reference_type,
        reference_id=reference_id,
    )
    db.add(entry)
    _apply_ledger_balance(ledger, amount, entry_type)
    return entry


@router.post("/departments", response_model=ProductionDepartmentOut, status_code=status.HTTP_201_CREATED)
def create_department(
    data: ProductionDepartmentCreate,
    db: Session = Depends(get_db),
    _=Depends(require_role(["admin", "company_manager"]))
):
    if db.query(ProductionDepartment).filter(ProductionDepartment.name == data.name).first():
        raise HTTPException(status_code=400, detail="Department already exists")

    dep = ProductionDepartment(**data.model_dump())
    db.add(dep)
    db.commit()
    db.refresh(dep)
    return dep


@router.get("/departments", response_model=List[ProductionDepartmentOut])
def list_departments(
    db: Session = Depends(get_db),
    _=Depends(require_role(["admin", "company_manager"]))
):
    return [
        _serialize_department(dep)
        for dep in db.query(ProductionDepartment).order_by(ProductionDepartment.id).all()
    ]


@router.put("/departments/{department_id}", response_model=ProductionDepartmentOut)
def update_department(
    department_id: int,
    data: ProductionDepartmentUpdate,
    db: Session = Depends(get_db),
    _=Depends(require_role(["admin", "company_manager"]))
):
    dep = db.query(ProductionDepartment).filter(ProductionDepartment.id == department_id).first()
    if not dep:
        raise HTTPException(status_code=404, detail="Department not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(dep, field, value)

    db.commit()
    db.refresh(dep)
    return dep


@router.post("/technologies", response_model=ProductionTechnologyOut, status_code=status.HTTP_201_CREATED)
def create_technology(
    data: ProductionTechnologyCreate,
    db: Session = Depends(get_db),
    _=Depends(require_role(["admin", "company_manager"]))
):
    if not db.query(ProductionDepartment).filter(ProductionDepartment.id == data.department_id).first():
        raise HTTPException(status_code=404, detail="Department not found")

    tech = ProductionTechnology(**data.model_dump())
    db.add(tech)
    db.commit()
    db.refresh(tech)
    return tech


@router.get("/technologies", response_model=List[ProductionTechnologyOut])
def list_technologies(
    department_id: int | None = None,
    db: Session = Depends(get_db),
    _=Depends(require_role(["admin", "company_manager"]))
):
    query = db.query(ProductionTechnology)
    if department_id:
        query = query.filter(ProductionTechnology.department_id == department_id)
    return [_serialize_technology(tech) for tech in query.order_by(ProductionTechnology.id).all()]


@router.put("/technologies/{technology_id}", response_model=ProductionTechnologyOut)
def update_technology(
    technology_id: int,
    data: ProductionTechnologyUpdate,
    db: Session = Depends(get_db),
    _=Depends(require_role(["admin", "company_manager"]))
):
    tech = db.query(ProductionTechnology).filter(ProductionTechnology.id == technology_id).first()
    if not tech:
        raise HTTPException(status_code=404, detail="Technology not found")

    if data.department_id is not None and not db.query(ProductionDepartment).filter(ProductionDepartment.id == data.department_id).first():
        raise HTTPException(status_code=404, detail="Department not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(tech, field, value)

    db.commit()
    db.refresh(tech)
    return tech


@router.post("/assignments", response_model=EmployeeTechnologyAssignmentOut, status_code=status.HTTP_201_CREATED)
def create_assignment(
    data: EmployeeTechnologyAssignmentCreate,
    db: Session = Depends(get_db),
    _=Depends(require_role(["admin", "company_manager"]))
):
    if not db.query(Employee).filter(Employee.id == data.employee_id).first():
        raise HTTPException(status_code=404, detail="Employee not found")
    if not db.query(ProductionTechnology).filter(ProductionTechnology.id == data.technology_id).first():
        raise HTTPException(status_code=404, detail="Technology not found")

    assignment = EmployeeTechnologyAssignment(**data.model_dump())
    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    return assignment


@router.get("/assignments", response_model=List[EmployeeTechnologyAssignmentOut])
def list_assignments(
    employee_id: int | None = None,
    technology_id: int | None = None,
    db: Session = Depends(get_db),
    _=Depends(require_role(["admin", "company_manager"]))
):
    query = db.query(EmployeeTechnologyAssignment)
    if employee_id:
        query = query.filter(EmployeeTechnologyAssignment.employee_id == employee_id)
    if technology_id:
        query = query.filter(EmployeeTechnologyAssignment.technology_id == technology_id)
    return [_serialize_assignment(a) for a in query.order_by(EmployeeTechnologyAssignment.id).all()]


@router.get("/assignments/{assignment_id}", response_model=EmployeeTechnologyAssignmentOut)
def get_assignment(
    assignment_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_role(["admin", "company_manager"]))
):
    assignment = db.query(EmployeeTechnologyAssignment).filter(EmployeeTechnologyAssignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    return _serialize_assignment(assignment)


@router.put("/assignments/{assignment_id}", response_model=EmployeeTechnologyAssignmentOut)
def update_assignment(
    assignment_id: int,
    data: EmployeeTechnologyAssignmentUpdate,
    db: Session = Depends(get_db),
    _=Depends(require_role(["admin", "company_manager"]))
):
    assignment = db.query(EmployeeTechnologyAssignment).filter(EmployeeTechnologyAssignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    if data.employee_id is not None and not db.query(Employee).filter(Employee.id == data.employee_id).first():
        raise HTTPException(status_code=404, detail="Employee not found")
    if data.technology_id is not None and not db.query(ProductionTechnology).filter(ProductionTechnology.id == data.technology_id).first():
        raise HTTPException(status_code=404, detail="Technology not found")
    
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(assignment, field, value)
    
    db.commit()
    db.refresh(assignment)
    return _serialize_assignment(assignment)


@router.delete("/assignments/{assignment_id}")
def delete_assignment(
    assignment_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_role(["admin"]))
):
    assignment = db.query(EmployeeTechnologyAssignment).filter(EmployeeTechnologyAssignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    db.delete(assignment)
    db.commit()
    return {"message": "Assignment deleted"}


@router.post("/entries", response_model=ProductionEntryOut, status_code=status.HTTP_201_CREATED)
def create_entry(
    data: ProductionEntryCreate,
    db: Session = Depends(get_db),
    _=Depends(require_role(["admin", "company_manager"]))
):
    if not db.query(Employee).filter(Employee.id == data.employee_id).first():
        raise HTTPException(status_code=404, detail="Employee not found")
    if not db.query(ProductionTechnology).filter(ProductionTechnology.id == data.technology_id).first():
        raise HTTPException(status_code=404, detail="Technology not found")

    entry = ProductionEntry(**data.model_dump())
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@router.post("/loans", response_model=ProductionLoanOut, status_code=status.HTTP_201_CREATED)
def create_loan(
    data: ProductionLoanCreate,
    db: Session = Depends(get_db),
    _=Depends(require_role(["admin", "company_manager"]))
):
    if not db.query(Employee).filter(Employee.id == data.employee_id).first():
        raise HTTPException(status_code=404, detail="Employee not found")

    ledger = db.query(Ledger).filter(Ledger.id == data.ledger_id).first()
    if not ledger:
        raise HTTPException(status_code=404, detail="Ledger not found")

    loan = ProductionLoan(
        employee_id=data.employee_id,
        ledger_id=data.ledger_id,
        amount=data.amount,
        balance=data.amount,
        monthly_deduction=data.monthly_deduction,
        issue_date=data.issue_date or date.today(),
        due_date=data.due_date,
        notes=data.notes,
    )
    db.add(loan)
    db.commit()
    db.refresh(loan)

    _record_ledger_entry(
        db,
        ledger,
        data.amount,
        "credit",
        f"Loan issued for employee {loan.employee_id}",
        "production_loan",
        loan.id,
    )
    db.commit()
    return loan


@router.get("/loans", response_model=List[ProductionLoanOut])
def list_loans(
    employee_id: int | None = None,
    status: str | None = None,
    db: Session = Depends(get_db),
    _=Depends(require_role(["admin", "company_manager"]))
):
    query = db.query(ProductionLoan)
    if employee_id:
        query = query.filter(ProductionLoan.employee_id == employee_id)
    if status:
        query = query.filter(ProductionLoan.status == status)
    loans = query.order_by(ProductionLoan.id.desc()).all()
    return [
        {
            "id": loan.id,
            "employee_id": loan.employee_id,
            "ledger_id": loan.ledger_id,
            "amount": loan.amount,
            "balance": loan.balance,
            "monthly_deduction": loan.monthly_deduction,
            "issue_date": loan.issue_date,
            "due_date": loan.due_date,
            "status": loan.status,
            "notes": loan.notes,
            "created_at": loan.created_at.isoformat(),
        }
        for loan in loans
    ]


@router.get("/loans/{loan_id}", response_model=ProductionLoanOut)
def get_loan(
    loan_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_role(["admin", "company_manager"]))
):
    loan = db.query(ProductionLoan).filter(ProductionLoan.id == loan_id).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    return {
        "id": loan.id,
        "employee_id": loan.employee_id,
        "ledger_id": loan.ledger_id,
        "amount": loan.amount,
        "balance": loan.balance,
        "monthly_deduction": loan.monthly_deduction,
        "issue_date": loan.issue_date,
        "due_date": loan.due_date,
        "status": loan.status,
        "notes": loan.notes,
        "created_at": loan.created_at.isoformat(),
    }


@router.put("/loans/{loan_id}", response_model=ProductionLoanOut)
def update_loan(
    loan_id: int,
    data: dict,
    db: Session = Depends(get_db),
    _=Depends(require_role(["admin", "company_manager"]))
):
    loan = db.query(ProductionLoan).filter(ProductionLoan.id == loan_id).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    
    for field, value in data.items():
        if hasattr(loan, field) and value is not None:
            setattr(loan, field, value)
    
    db.commit()
    db.refresh(loan)
    return {
        "id": loan.id,
        "employee_id": loan.employee_id,
        "ledger_id": loan.ledger_id,
        "amount": loan.amount,
        "balance": loan.balance,
        "monthly_deduction": loan.monthly_deduction,
        "issue_date": loan.issue_date,
        "due_date": loan.due_date,
        "status": loan.status,
        "notes": loan.notes,
        "created_at": loan.created_at.isoformat(),
    }


@router.delete("/loans/{loan_id}")
def delete_loan(
    loan_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_role(["admin"]))
):
    loan = db.query(ProductionLoan).filter(ProductionLoan.id == loan_id).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    db.delete(loan)
    db.commit()
    return {"message": "Loan deleted"}


@router.post("/advances", response_model=ProductionAdvanceOut, status_code=status.HTTP_201_CREATED)
def create_advance(
    data: ProductionAdvanceCreate,
    db: Session = Depends(get_db),
    _=Depends(require_role(["admin", "company_manager"]))
):
    if not db.query(Employee).filter(Employee.id == data.employee_id).first():
        raise HTTPException(status_code=404, detail="Employee not found")

    ledger = db.query(Ledger).filter(Ledger.id == data.ledger_id).first()
    if not ledger:
        raise HTTPException(status_code=404, detail="Ledger not found")

    advance = ProductionAdvance(
        employee_id=data.employee_id,
        ledger_id=data.ledger_id,
        amount=data.amount,
        balance=data.amount,
        monthly_deduction=data.monthly_deduction,
        issue_date=data.issue_date or date.today(),
        notes=data.notes,
    )
    db.add(advance)
    db.commit()
    db.refresh(advance)

    _record_ledger_entry(
        db,
        ledger,
        data.amount,
        "debit",
        f"Advance issued for employee {advance.employee_id}",
        "production_advance",
        advance.id,
    )
    db.commit()
    return advance


@router.get("/advances", response_model=List[ProductionAdvanceOut])
def list_advances(
    employee_id: int | None = None,
    status: str | None = None,
    db: Session = Depends(get_db),
    _=Depends(require_role(["admin", "company_manager"]))
):
    query = db.query(ProductionAdvance)
    if employee_id:
        query = query.filter(ProductionAdvance.employee_id == employee_id)
    if status:
        query = query.filter(ProductionAdvance.status == status)
    advances = query.order_by(ProductionAdvance.id.desc()).all()
    return [
        {
            "id": adv.id,
            "employee_id": adv.employee_id,
            "ledger_id": adv.ledger_id,
            "amount": adv.amount,
            "balance": adv.balance,
            "monthly_deduction": adv.monthly_deduction,
            "issue_date": adv.issue_date,
            "status": adv.status,
            "notes": adv.notes,
            "created_at": adv.created_at.isoformat(),
        }
        for adv in advances
    ]


@router.get("/advances/{advance_id}", response_model=ProductionAdvanceOut)
def get_advance(
    advance_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_role(["admin", "company_manager"]))
):
    advance = db.query(ProductionAdvance).filter(ProductionAdvance.id == advance_id).first()
    if not advance:
        raise HTTPException(status_code=404, detail="Advance not found")
    return {
        "id": advance.id,
        "employee_id": advance.employee_id,
        "ledger_id": advance.ledger_id,
        "amount": advance.amount,
        "balance": advance.balance,
        "monthly_deduction": advance.monthly_deduction,
        "issue_date": advance.issue_date,
        "status": advance.status,
        "notes": advance.notes,
        "created_at": advance.created_at.isoformat(),
    }


@router.put("/advances/{advance_id}", response_model=ProductionAdvanceOut)
def update_advance(
    advance_id: int,
    data: dict,
    db: Session = Depends(get_db),
    _=Depends(require_role(["admin", "company_manager"]))
):
    advance = db.query(ProductionAdvance).filter(ProductionAdvance.id == advance_id).first()
    if not advance:
        raise HTTPException(status_code=404, detail="Advance not found")
    
    for field, value in data.items():
        if hasattr(advance, field) and value is not None:
            setattr(advance, field, value)
    
    db.commit()
    db.refresh(advance)
    return {
        "id": advance.id,
        "employee_id": advance.employee_id,
        "ledger_id": advance.ledger_id,
        "amount": advance.amount,
        "balance": advance.balance,
        "monthly_deduction": advance.monthly_deduction,
        "issue_date": advance.issue_date,
        "status": advance.status,
        "notes": advance.notes,
        "created_at": advance.created_at.isoformat(),
    }


@router.delete("/advances/{advance_id}")
def delete_advance(
    advance_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_role(["admin"]))
):
    advance = db.query(ProductionAdvance).filter(ProductionAdvance.id == advance_id).first()
    if not advance:
        raise HTTPException(status_code=404, detail="Advance not found")
    db.delete(advance)
    db.commit()
    return {"message": "Advance deleted"}


@router.get("/entries", response_model=List[ProductionEntryOut])
def list_entries(
    employee_id: int | None = None,
    technology_id: int | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    db: Session = Depends(get_db),
    _=Depends(require_role(["admin", "company_manager"]))
):
    query = db.query(ProductionEntry)
    if employee_id:
        query = query.filter(ProductionEntry.employee_id == employee_id)
    if technology_id:
        query = query.filter(ProductionEntry.technology_id == technology_id)
    if start_date:
        query = query.filter(ProductionEntry.production_date >= start_date)
    if end_date:
        query = query.filter(ProductionEntry.production_date <= end_date)
    return [_serialize_entry(entry) for entry in query.order_by(ProductionEntry.production_date.desc()).all()]


@router.get("/entries/{entry_id}", response_model=ProductionEntryOut)
def get_entry(
    entry_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_role(["admin", "company_manager"]))
):
    entry = db.query(ProductionEntry).filter(ProductionEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Production entry not found")
    return _serialize_entry(entry)


@router.put("/entries/{entry_id}", response_model=ProductionEntryOut)
def update_entry(
    entry_id: int,
    data: ProductionEntryUpdate,
    db: Session = Depends(get_db),
    _=Depends(require_role(["admin", "company_manager"]))
):
    entry = db.query(ProductionEntry).filter(ProductionEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Production entry not found")
    
    if data.employee_id is not None and not db.query(Employee).filter(Employee.id == data.employee_id).first():
        raise HTTPException(status_code=404, detail="Employee not found")
    if data.technology_id is not None and not db.query(ProductionTechnology).filter(ProductionTechnology.id == data.technology_id).first():
        raise HTTPException(status_code=404, detail="Technology not found")
    
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(entry, field, value)
    
    db.commit()
    db.refresh(entry)
    return _serialize_entry(entry)


@router.delete("/entries/{entry_id}")
def delete_entry(
    entry_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_role(["admin"]))
):
    entry = db.query(ProductionEntry).filter(ProductionEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Production entry not found")
    db.delete(entry)
    db.commit()
    return {"message": "Production entry deleted"}


@router.post("/payroll/runs", status_code=status.HTTP_201_CREATED)
def run_production_payroll(
    payload: ProductionPayrollRunCreate,
    db: Session = Depends(get_db),
    _=Depends(require_role(["admin", "company_manager"]))
):
    existing = (
        db.query(ProductionPayrollRun)
        .filter(
            ProductionPayrollRun.period_year == payload.period_year,
            ProductionPayrollRun.period_month == payload.period_month,
        )
        .first()
    )
    if existing and existing.status == "finalized":
        raise HTTPException(status_code=400, detail="Payroll already finalized for this period")

    if existing:
        run = existing
        run.bonus = payload.bonus
        run.deductions = payload.deductions
        run.status = "draft"
        db.query(ProductionPayrollItem).filter(ProductionPayrollItem.payroll_run_id == run.id).delete()
    else:
        run = ProductionPayrollRun(
            period_year=payload.period_year,
            period_month=payload.period_month,
            bonus=payload.bonus,
            deductions=payload.deductions,
            status="draft",
        )
        db.add(run)
        db.commit()
        db.refresh(run)

    start_date = date(payload.period_year, payload.period_month, 1)
    end_date = date(
        payload.period_year,
        payload.period_month,
        monthrange(payload.period_year, payload.period_month)[1],
    )

    employees: List[Employee] = (
        db.query(Employee)
        .filter(Employee.is_active == True)  # noqa: E711
        .all()
    )

    def _collect_deductions(query_model):
        deductions = []
        total = 0.0
        records = (
            db.query(query_model)
            .filter(query_model.employee_id == emp.id, query_model.status == "active")
            .order_by(query_model.issue_date)
            .all()
        )
        for record in records:
            if record.balance <= 0:
                continue
            amount_due = min(record.monthly_deduction, record.balance)
            if amount_due <= 0:
                continue
            record.balance -= amount_due
            if record.balance <= 0:
                record.status = "paid"
            deductions.append((record, amount_due))
            total += amount_due
        return total, deductions

    for emp in employees:
        results = (
            db.query(
                func.coalesce(func.sum(ProductionEntry.quantity * ProductionTechnology.unit_rate), 0.0).label("total_amount"),
                func.coalesce(func.sum(ProductionEntry.quantity), 0.0).label("total_quantity"),
            )
            .join(ProductionTechnology, ProductionEntry.technology_id == ProductionTechnology.id)
            .filter(
                ProductionEntry.employee_id == emp.id,
                ProductionEntry.production_date >= start_date,
                ProductionEntry.production_date <= end_date,
            )
            .first()
        )

        total_quantity = float(results.total_quantity or 0)
        total_amount = float(results.total_amount or 0)
        if total_quantity == 0 and total_amount == 0:
            continue

        loan_deduction, loan_records = _collect_deductions(ProductionLoan)
        advance_deduction, advance_records = _collect_deductions(ProductionAdvance)

        item = ProductionPayrollItem(
            payroll_run_id=run.id,
            employee_id=emp.id,
            total_quantity=total_quantity,
            total_amount=total_amount,
            bonus=payload.bonus,
            deductions=payload.deductions,
            loan_deduction=loan_deduction,
            advance_deduction=advance_deduction,
            net_pay=total_amount + payload.bonus - payload.deductions - loan_deduction - advance_deduction,
        )
        db.add(item)

        for loan_record, amount_due in loan_records:
            loan_ledger = db.query(Ledger).filter(Ledger.id == loan_record.ledger_id).first()
            if loan_ledger:
                _record_ledger_entry(
                    db,
                    loan_ledger,
                    amount_due,
                    "debit",
                    f"Loan deduction for employee {emp.id}",
                    "production_loan",
                    loan_record.id,
                )

        for advance_record, amount_due in advance_records:
            advance_ledger = db.query(Ledger).filter(Ledger.id == advance_record.ledger_id).first()
            if advance_ledger:
                _record_ledger_entry(
                    db,
                    advance_ledger,
                    amount_due,
                    "credit",
                    f"Advance deduction for employee {emp.id}",
                    "production_advance",
                    advance_record.id,
                )

    run.status = "finalized"
    db.commit()
    db.refresh(run)

    return _build_run_response(run, db)


@router.get("/payroll/runs", response_model=List[ProductionPayrollRunResult])
def list_production_payroll_runs(
    db: Session = Depends(get_db),
    _=Depends(require_role(["admin", "company_manager"]))
):
    runs = db.query(ProductionPayrollRun).order_by(ProductionPayrollRun.period_year.desc(), ProductionPayrollRun.period_month.desc()).all()
    return [_build_run_response(run, db) for run in runs]


@router.get("/payroll/runs/{run_id}", response_model=ProductionPayrollRunResult)
def get_production_payroll_run(
    run_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_role(["admin", "company_manager"]))
):
    run = db.query(ProductionPayrollRun).filter(ProductionPayrollRun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Payroll run not found")
    return _build_run_response(run, db)


def _build_run_response(run: ProductionPayrollRun, db: Session) -> dict:
    items = db.query(ProductionPayrollItem).filter(ProductionPayrollItem.payroll_run_id == run.id).all()
    return {
        "id": run.id,
        "period_year": run.period_year,
        "period_month": run.period_month,
        "bonus": run.bonus,
        "deductions": run.deductions,
        "status": run.status,
        "items": [
            {
                "employee_id": item.employee_id,
                "employee_name": item.employee.full_name if item.employee else None,
                "total_quantity": item.total_quantity,
                "total_amount": item.total_amount,
                "production_salary": item.total_amount,
                "bonus": item.bonus,
                "deductions": item.deductions,
                "loan_deduction": item.loan_deduction,
                "advance_deduction": item.advance_deduction,
                "net_pay": item.net_pay,
            }
            for item in items
        ],
    }
