from sqlalchemy.orm import Session
from app.models.order import Order, OrderItem
from app.models.inventory import InventoryItem
from app.services.invoice_service import create_invoice


def create_order(db: Session, user_id: int, items: list):
    order = Order(user_id=user_id, status="pending")
    db.add(order)
    db.flush()

    total = 0

    for item in items:
        inventory = db.query(InventoryItem).filter(InventoryItem.sku == item.sku).first()

        if not inventory:
            raise Exception(f"SKU {item.sku} not found")

        if inventory.quantity < item.quantity:
            raise Exception(f"Insufficient stock for {item.sku}")

        inventory.quantity -= item.quantity
        line_total = inventory.unit_price * item.quantity
        total += line_total

        db.add(OrderItem(
            order_id=order.id,
            sku=item.sku,
            quantity=item.quantity,
            price=inventory.unit_price
        ))

    order.total_amount = total
    order.status = "confirmed"

    db.commit()
    db.refresh(order)

    create_invoice(db, order)

    return order
