from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from typing import Optional
from datetime import date, timedelta
import io, csv, os, shutil, uuid

from app.core.database import get_db
from app.core.auth_dependencies import require_role
from app.models.accounting import UtilityBill, Ledger
from app.schemas.accounting import UtilityBillCreate, UtilityBillUpdate, UtilityBillOut

router = APIRouter(prefix="/utility-bills", tags=["Utility Bills"])

ADMIN_MANAGER = ["super_admin", "admin", "company_manager", "gym_owner"]
UPLOAD_DIR = "uploads/utility_bills"
os.makedirs(UPLOAD_DIR, exist_ok=True)


def _next_number(db: Session) -> str:
    count = db.query(func.count(UtilityBill.id)).scalar() or 0
    return f"UTIL-{count + 1:05d}"


def _enrich(bill: UtilityBill) -> dict:
    d = {c.name: getattr(bill, c.name) for c in bill.__table__.columns}
    d["ledger_name"] = bill.ledger.ledger_name if bill.ledger else None
    return d


@router.get("/upcoming")
def upcoming_bills(
    db: Session = Depends(get_db),
    _=Depends(require_role(ADMIN_MANAGER)),
):
    """Bills due within the next 7 days."""
    today = date.today()
    cutoff = today + timedelta(days=7)
    bills = db.query(UtilityBill).filter(
        UtilityBill.status == "Pending",
        UtilityBill.due_date >= today,
        UtilityBill.due_date <= cutoff,
    ).order_by(UtilityBill.due_date).all()
    return [_enrich(b) for b in bills]


@router.get("/summary")
def bills_summary(
    db: Session = Depends(get_db),
    _=Depends(require_role(ADMIN_MANAGER)),
):
    today = date.today()
    pending = db.query(func.count(UtilityBill.id)).filter(UtilityBill.status == "Pending").scalar() or 0
    paid = db.query(func.count(UtilityBill.id)).filter(UtilityBill.status == "Paid").scalar() or 0
    overdue = db.query(func.count(UtilityBill.id)).filter(UtilityBill.status == "Overdue").scalar() or 0
    month_cost = db.query(func.sum(UtilityBill.amount + UtilityBill.late_fee)).filter(
        extract("month", UtilityBill.due_date) == today.month,
        extract("year", UtilityBill.due_date) == today.year,
    ).scalar() or 0
    return {"pending": pending, "paid": paid, "overdue": overdue, "month_cost": month_cost}


@router.get("/")
def list_bills(
    status: Optional[str] = None,
    utility_type: Optional[str] = None,
    month: Optional[int] = None,
    year: Optional[int] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    _=Depends(require_role(ADMIN_MANAGER)),
):
    q = db.query(UtilityBill)
    if status:
        q = q.filter(UtilityBill.status == status)
    if utility_type:
        q = q.filter(UtilityBill.utility_type == utility_type)
    if month:
        q = q.filter(UtilityBill.billing_month == month)
    if year:
        q = q.filter(UtilityBill.billing_year == year)
    bills = q.order_by(UtilityBill.id.desc()).offset(skip).limit(limit).all()
    return [_enrich(b) for b in bills]


@router.post("/")
def create_bill(
    data: UtilityBillCreate,
    db: Session = Depends(get_db),
    user=Depends(require_role(ADMIN_MANAGER)),
):
    ledger = db.query(Ledger).filter(Ledger.id == data.ledger_id).first()
    if not ledger:
        raise HTTPException(404, "Ledger not found")
    bill = UtilityBill(
        **data.model_dump(),
        bill_number=_next_number(db),
        created_by=user.id,
    )
    db.add(bill)
    
    # Create ledger entry
    from app.models.accounting import LedgerEntry, LedgerType
    entry = LedgerEntry(
        ledger_id=ledger.id,
        amount=data.amount,
        entry_type="debit",
        description=f"Utility bill: {data.utility_type}",
        reference_type="utility_bill",
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
    db.refresh(bill)
    entry.reference_id = bill.id
    db.commit()
    return _enrich(bill)


@router.get("/{bill_id}")
def get_bill(bill_id: int, db: Session = Depends(get_db), _=Depends(require_role(ADMIN_MANAGER))):
    bill = db.query(UtilityBill).filter(UtilityBill.id == bill_id).first()
    if not bill:
        raise HTTPException(404, "Bill not found")
    return _enrich(bill)


@router.put("/{bill_id}")
def update_bill(
    bill_id: int,
    data: UtilityBillUpdate,
    db: Session = Depends(get_db),
    _=Depends(require_role(ADMIN_MANAGER)),
):
    bill = db.query(UtilityBill).filter(UtilityBill.id == bill_id).first()
    if not bill:
        raise HTTPException(404, "Bill not found")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(bill, k, v)
    db.commit()
    db.refresh(bill)
    return _enrich(bill)


@router.post("/{bill_id}/pay")
def mark_paid(
    bill_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_role(ADMIN_MANAGER)),
):
    bill = db.query(UtilityBill).filter(UtilityBill.id == bill_id).first()
    if not bill:
        raise HTTPException(404, "Bill not found")
    if bill.status == "Paid":
        raise HTTPException(400, "Bill already paid")
    
    ledger = db.query(Ledger).filter(Ledger.id == bill.ledger_id).first()
    if ledger:
        # Create credit entry for payment
        from app.models.accounting import LedgerEntry, LedgerType
        total_amount = bill.amount + bill.late_fee
        entry = LedgerEntry(
            ledger_id=ledger.id,
            amount=total_amount,
            entry_type="credit",
            description=f"Utility bill payment: {bill.utility_type}",
            reference_type="utility_bill_payment",
            reference_id=bill.id,
        )
        db.add(entry)
        
        # Update ledger balance
        positive_balance = ledger.ledger_type in {LedgerType.ASSET, LedgerType.EXPENSE}
        if positive_balance:
            ledger.current_balance -= total_amount
        else:
            ledger.current_balance += total_amount
    
    bill.status = "Paid"
    bill.payment_date = date.today()
    db.commit()
    return {"message": "Bill marked as paid"}


@router.delete("/{bill_id}")
def delete_bill(
    bill_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_role(["admin"])),
):
    bill = db.query(UtilityBill).filter(UtilityBill.id == bill_id).first()
    if not bill:
        raise HTTPException(404, "Bill not found")
    db.delete(bill)
    db.commit()
    return {"message": "Bill deleted"}


@router.post("/{bill_id}/upload")
def upload_receipt(
    bill_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _=Depends(require_role(ADMIN_MANAGER)),
):
    bill = db.query(UtilityBill).filter(UtilityBill.id == bill_id).first()
    if not bill:
        raise HTTPException(404, "Bill not found")
    ext = os.path.splitext(file.filename)[1]
    filename = f"{uuid.uuid4()}{ext}"
    path = os.path.join(UPLOAD_DIR, filename)
    with open(path, "wb") as f:
        shutil.copyfileobj(file.file, f)
    bill.receipt = path
    db.commit()
    return {"receipt": path}


@router.get("/export/csv")
def export_bills_csv(
    db: Session = Depends(get_db),
    _=Depends(require_role(ADMIN_MANAGER)),
):
    bills = db.query(UtilityBill).order_by(UtilityBill.due_date.desc()).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Number", "Type", "Month", "Year", "Due Date", "Amount", "Late Fee", "Status", "Payment Date"])
    for b in bills:
        writer.writerow([b.bill_number, b.utility_type, b.billing_month, b.billing_year,
                         b.due_date, b.amount, b.late_fee, b.status, b.payment_date or ""])
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=utility_bills.csv"},
    )
