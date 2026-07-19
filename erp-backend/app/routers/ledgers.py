from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
import io, csv
from datetime import datetime

from app.core.database import get_db
from app.core.auth_dependencies import get_current_user, require_role
from app.models.accounting import Ledger, DailyExpense, UtilityBill, LedgerEntry
from app.schemas.accounting import LedgerCreate, LedgerUpdate, LedgerOut, LedgerEntryOut

router = APIRouter(prefix="/ledgers", tags=["Ledgers"])

ADMIN_MANAGER = ["admin", "company_manager"]


def _next_code(db: Session) -> str:
    count = db.query(func.count(Ledger.id)).scalar() or 0
    return f"LED-{count + 1:04d}"


@router.get("/", response_model=list[LedgerOut])
def list_ledgers(
    search: Optional[str] = None,
    ledger_type: Optional[str] = None,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    _=Depends(require_role(ADMIN_MANAGER)),
):
    q = db.query(Ledger)
    if search:
        q = q.filter(Ledger.ledger_name.ilike(f"%{search}%"))
    if ledger_type:
        q = q.filter(Ledger.ledger_type == ledger_type)
    if status:
        q = q.filter(Ledger.status == status)
    return q.order_by(Ledger.id.desc()).offset(skip).limit(limit).all()


@router.get("/{ledger_id}/entries", response_model=list[LedgerEntryOut])
def list_ledger_entries(
    ledger_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_role(ADMIN_MANAGER)),
):
    ledger = db.query(Ledger).filter(Ledger.id == ledger_id).first()
    if not ledger:
        raise HTTPException(404, "Ledger not found")
    return (
        db.query(LedgerEntry)
        .filter(LedgerEntry.ledger_id == ledger_id)
        .order_by(LedgerEntry.transaction_date.desc())
        .all()
    )


@router.post("/", response_model=LedgerOut)
def create_ledger(
    data: LedgerCreate,
    db: Session = Depends(get_db),
    user=Depends(require_role(ADMIN_MANAGER)),
):
    if db.query(Ledger).filter(Ledger.ledger_name == data.ledger_name).first():
        raise HTTPException(400, "Ledger name already exists")
    ledger = Ledger(
        **data.model_dump(),
        ledger_code=_next_code(db),
        current_balance=data.opening_balance,
        created_by=user.id,
    )
    db.add(ledger)
    db.commit()
    db.refresh(ledger)
    return ledger


@router.get("/{ledger_id}", response_model=LedgerOut)
def get_ledger(ledger_id: int, db: Session = Depends(get_db), _=Depends(require_role(ADMIN_MANAGER))):
    ledger = db.query(Ledger).filter(Ledger.id == ledger_id).first()
    if not ledger:
        raise HTTPException(404, "Ledger not found")
    return ledger


@router.put("/{ledger_id}", response_model=LedgerOut)
def update_ledger(
    ledger_id: int,
    data: LedgerUpdate,
    db: Session = Depends(get_db),
    _=Depends(require_role(ADMIN_MANAGER)),
):
    ledger = db.query(Ledger).filter(Ledger.id == ledger_id).first()
    if not ledger:
        raise HTTPException(404, "Ledger not found")
    if data.ledger_name and data.ledger_name != ledger.ledger_name:
        if db.query(Ledger).filter(Ledger.ledger_name == data.ledger_name).first():
            raise HTTPException(400, "Ledger name already exists")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(ledger, k, v)
    db.commit()
    db.refresh(ledger)
    return ledger


@router.delete("/{ledger_id}")
def delete_ledger(
    ledger_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_role(["admin"])),
):
    ledger = db.query(Ledger).filter(Ledger.id == ledger_id).first()
    if not ledger:
        raise HTTPException(404, "Ledger not found")
    has_expenses = db.query(DailyExpense).filter(DailyExpense.ledger_id == ledger_id).first()
    has_bills = db.query(UtilityBill).filter(UtilityBill.ledger_id == ledger_id).first()
    if has_expenses or has_bills:
        raise HTTPException(400, "Cannot delete ledger with existing transactions")
    db.delete(ledger)
    db.commit()
    return {"message": "Ledger deleted"}


@router.get("/export/csv")
def export_ledgers_csv(
    db: Session = Depends(get_db),
    _=Depends(require_role(ADMIN_MANAGER)),
):
    ledgers = db.query(Ledger).order_by(Ledger.id).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Code", "Name", "Type", "Opening Balance", "Current Balance", "Status"])
    for l in ledgers:
        writer.writerow([l.ledger_code, l.ledger_name, l.ledger_type.value, l.opening_balance, l.current_balance, l.status])
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=ledgers.csv"},
    )
