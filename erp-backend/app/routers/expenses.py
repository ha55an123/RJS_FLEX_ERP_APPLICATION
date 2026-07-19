from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from typing import Optional
from datetime import date, datetime
import io, csv, os, shutil, uuid

from app.core.database import get_db
from app.core.auth_dependencies import require_role
from app.models.accounting import DailyExpense, Ledger
from app.schemas.accounting import ExpenseCreate, ExpenseUpdate, ExpenseOut

router = APIRouter(prefix="/expenses", tags=["Daily Expenses"])

ADMIN_MANAGER = ["admin", "company_manager"]
UPLOAD_DIR = "uploads/expenses"
os.makedirs(UPLOAD_DIR, exist_ok=True)


def _next_number(db: Session) -> str:
    count = db.query(func.count(DailyExpense.id)).scalar() or 0
    return f"EXP-{count + 1:05d}"


def _enrich(exp: DailyExpense) -> dict:
    d = {c.name: getattr(exp, c.name) for c in exp.__table__.columns}
    d["ledger_name"] = exp.ledger.ledger_name if exp.ledger else None
    return d


@router.get("/summary")
def expense_summary(
    db: Session = Depends(get_db),
    _=Depends(require_role(ADMIN_MANAGER)),
):
    today = date.today()
    today_total = db.query(func.sum(DailyExpense.amount)).filter(
        DailyExpense.expense_date == today
    ).scalar() or 0
    month_total = db.query(func.sum(DailyExpense.amount)).filter(
        extract("month", DailyExpense.expense_date) == today.month,
        extract("year", DailyExpense.expense_date) == today.year,
    ).scalar() or 0
    year_total = db.query(func.sum(DailyExpense.amount)).filter(
        extract("year", DailyExpense.expense_date) == today.year
    ).scalar() or 0
    by_category = db.query(
        DailyExpense.category, func.sum(DailyExpense.amount)
    ).filter(
        extract("month", DailyExpense.expense_date) == today.month,
        extract("year", DailyExpense.expense_date) == today.year,
    ).group_by(DailyExpense.category).all()
    return {
        "today": today_total,
        "this_month": month_total,
        "this_year": year_total,
        "by_category": [{"category": c, "total": t} for c, t in by_category],
    }


@router.get("/")
def list_expenses(
    search: Optional[str] = None,
    category: Optional[str] = None,
    payment_method: Optional[str] = None,
    ledger_id: Optional[int] = None,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    month: Optional[int] = None,
    year: Optional[int] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    _=Depends(require_role(ADMIN_MANAGER)),
):
    q = db.query(DailyExpense)
    if search:
        q = q.filter(DailyExpense.description.ilike(f"%{search}%") | DailyExpense.vendor_name.ilike(f"%{search}%"))
    if category:
        q = q.filter(DailyExpense.category == category)
    if payment_method:
        q = q.filter(DailyExpense.payment_method == payment_method)
    if ledger_id:
        q = q.filter(DailyExpense.ledger_id == ledger_id)
    if from_date:
        q = q.filter(DailyExpense.expense_date >= from_date)
    if to_date:
        q = q.filter(DailyExpense.expense_date <= to_date)
    if month:
        q = q.filter(extract("month", DailyExpense.expense_date) == month)
    if year:
        q = q.filter(extract("year", DailyExpense.expense_date) == year)
    expenses = q.order_by(DailyExpense.id.desc()).offset(skip).limit(limit).all()
    return [_enrich(e) for e in expenses]


@router.post("/")
def create_expense(
    data: ExpenseCreate,
    db: Session = Depends(get_db),
    user=Depends(require_role(ADMIN_MANAGER)),
):
    ledger = db.query(Ledger).filter(Ledger.id == data.ledger_id).first()
    if not ledger:
        raise HTTPException(404, "Ledger not found")
    exp = DailyExpense(
        **data.model_dump(),
        expense_number=_next_number(db),
        created_by=user.id,
    )
    db.add(exp)
    
    # Create ledger entry
    from app.models.accounting import LedgerEntry
    entry = LedgerEntry(
        ledger_id=ledger.id,
        amount=data.amount,
        entry_type="debit",
        description=f"Daily expense: {data.category}",
        reference_type="daily_expense",
        reference_id=0,  # Will be set after commit
    )
    db.add(entry)
    
    # Update ledger balance
    positive_balance = ledger.ledger_type in {LedgerType.ASSET, LedgerType.EXPENSE}
    if positive_balance:
        ledger.current_balance += data.amount
    else:
        ledger.current_balance -= data.amount
    
    db.commit()
    db.refresh(exp)
    entry.reference_id = exp.id
    db.commit()
    return _enrich(exp)


@router.get("/{expense_id}")
def get_expense(expense_id: int, db: Session = Depends(get_db), _=Depends(require_role(ADMIN_MANAGER))):
    exp = db.query(DailyExpense).filter(DailyExpense.id == expense_id).first()
    if not exp:
        raise HTTPException(404, "Expense not found")
    return _enrich(exp)


@router.put("/{expense_id}")
def update_expense(
    expense_id: int,
    data: ExpenseUpdate,
    db: Session = Depends(get_db),
    _=Depends(require_role(ADMIN_MANAGER)),
):
    exp = db.query(DailyExpense).filter(DailyExpense.id == expense_id).first()
    if not exp:
        raise HTTPException(404, "Expense not found")
    if data.amount is not None and data.amount != exp.amount:
        ledger = db.query(Ledger).filter(Ledger.id == exp.ledger_id).first()
        if ledger:
            ledger.current_balance += exp.amount - data.amount
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(exp, k, v)
    db.commit()
    db.refresh(exp)
    return _enrich(exp)


@router.delete("/{expense_id}")
def delete_expense(
    expense_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_role(["admin"])),
):
    exp = db.query(DailyExpense).filter(DailyExpense.id == expense_id).first()
    if not exp:
        raise HTTPException(404, "Expense not found")
    ledger = db.query(Ledger).filter(Ledger.id == exp.ledger_id).first()
    if ledger:
        ledger.current_balance += exp.amount
    db.delete(exp)
    db.commit()
    return {"message": "Expense deleted"}


@router.post("/{expense_id}/upload")
def upload_receipt(
    expense_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _=Depends(require_role(ADMIN_MANAGER)),
):
    exp = db.query(DailyExpense).filter(DailyExpense.id == expense_id).first()
    if not exp:
        raise HTTPException(404, "Expense not found")
    ext = os.path.splitext(file.filename)[1]
    filename = f"{uuid.uuid4()}{ext}"
    path = os.path.join(UPLOAD_DIR, filename)
    with open(path, "wb") as f:
        shutil.copyfileobj(file.file, f)
    exp.attachment = path
    db.commit()
    return {"attachment": path}


@router.get("/export/csv")
def export_expenses_csv(
    db: Session = Depends(get_db),
    _=Depends(require_role(ADMIN_MANAGER)),
):
    expenses = db.query(DailyExpense).order_by(DailyExpense.expense_date.desc()).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Number", "Date", "Ledger", "Category", "Amount", "Payment Method", "Vendor", "Description"])
    for e in expenses:
        writer.writerow([
            e.expense_number, e.expense_date,
            e.ledger.ledger_name if e.ledger else "",
            e.category, e.amount, e.payment_method,
            e.vendor_name or "", e.description or "",
        ])
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=expenses.csv"},
    )
