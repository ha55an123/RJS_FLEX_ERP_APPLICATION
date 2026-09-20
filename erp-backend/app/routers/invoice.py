from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Literal
import os

from app.core.database import get_db
from app.core.auth_dependencies import get_current_user, require_role
from app.models.invoice import Invoice
from app.services.pdf_service import generate_invoice_pdf

router = APIRouter(prefix="/invoices", tags=["Invoices"])


class InvoiceStatusUpdate(BaseModel):
    status: Literal["paid", "unpaid"]


@router.get("/")
def my_invoices(
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    return db.query(Invoice).filter(Invoice.user_id == user.id).all()


@router.get("/all")
def all_invoices(
    db: Session = Depends(get_db),
    user=Depends(require_role(["admin", "company_manager", "super_admin", "gym_owner"]))
):
    return db.query(Invoice).all()


@router.get("/{invoice_id}")
def get_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return invoice


@router.patch("/{invoice_id}/status")
def update_invoice_status(
    invoice_id: int,
    data: InvoiceStatusUpdate,
    db: Session = Depends(get_db),
    _=Depends(require_role(["admin", "company_manager"])),
):
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    if invoice.status == "cancelled":
        raise HTTPException(status_code=400, detail="Cannot update a cancelled invoice")

    invoice.status = data.status
    db.commit()
    db.refresh(invoice)
    return invoice


@router.get("/{invoice_id}/download")
def download_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    file_path = f"/tmp/invoice_{invoice.invoice_number}.pdf"

    # Try to include order items (if relationship is available).
    items = None
    try:
        if getattr(invoice, "order", None) is not None:
            items = getattr(invoice.order, "items", None)
    except Exception:
        items = None

    generate_invoice_pdf(invoice, items=items, file_path=file_path)


    return FileResponse(
        file_path,
        media_type="application/pdf",
        filename=f"{invoice.invoice_number}.pdf"
    )
