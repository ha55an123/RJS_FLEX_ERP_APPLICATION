from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.models.inventory import InventoryItem, StockTransaction


# -----------------------
# CREATE ITEM
# -----------------------
def create_item(
    db: Session,
    sku: str,
    name: str,
    quantity: int,
    user_id: int,
    location: str,
    description: str | None = None,
    unit_price: float | None = None,
):
    existing = db.query(InventoryItem).filter(InventoryItem.sku == sku).first()
    if existing:
        raise HTTPException(400, f"SKU '{sku}' already exists")

    item = InventoryItem(
        sku=sku,
        name=name,
        description=description,
        quantity=quantity,
        unit_price=unit_price,
        location=location,
    )
    db.add(item)
    db.flush()

    if quantity > 0:
        db.add(StockTransaction(
            item_id=item.id,
            user_id=user_id,
            qty=quantity,
            transaction_type="in",
            to_location=location,
        ))

    db.commit()
    db.refresh(item)
    return item


# -----------------------
# ADD STOCK
# -----------------------
def add_stock(db: Session, sku: str, qty: int, user_id: int, location: str):

    item = db.query(InventoryItem).filter(InventoryItem.sku == sku).first()

    if not item:
        raise HTTPException(404, "Inventory item not found. Create the item first or use Add Item.")

    item.quantity += qty

    transaction = StockTransaction(
        item_id=item.id,
        user_id=user_id,
        qty=qty,
        transaction_type="in",
        to_location=location
    )

    db.add(transaction)
    db.commit()

    return item


# -----------------------
# REMOVE STOCK (SALE)
# -----------------------
def remove_stock(db: Session, sku: str, qty: int, user_id: int, location: str):

    item = db.query(InventoryItem).filter(InventoryItem.sku == sku).first()

    if not item:
        raise HTTPException(404, "Inventory item not found")

    if item.quantity < qty:
        raise HTTPException(400, "Insufficient stock")

    item.quantity -= qty

    transaction = StockTransaction(
        item_id=item.id,
        user_id=user_id,
        qty=qty,
        transaction_type="out",
        from_location=location
    )

    db.add(transaction)
    db.commit()

    return item
