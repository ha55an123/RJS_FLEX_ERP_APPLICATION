from datetime import datetime
from sqlalchemy.orm import Session
from app.models.invoice import Invoice


def generate_invoice_number(order_id: int) -> str:
    date_part = datetime.utcnow().strftime("%Y%m%d")
    return f"INV-{date_part}-{order_id}"


def create_invoice(db: Session, order) -> Invoice:
    invoice = Invoice(
        invoice_number=generate_invoice_number(order.id),
        order_id=order.id,
        user_id=order.user_id,
        total_amount=order.total_amount,
        status="unpaid"
    )
    db.add(invoice)
    db.commit()
    db.refresh(invoice)
    return invoice
