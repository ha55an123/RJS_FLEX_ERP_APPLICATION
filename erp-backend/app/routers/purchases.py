from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

from app.core.database import get_db
from app.core.auth_dependencies import get_current_user, require_role
from app.models.purchase import PurchaseOrder, PurchaseOrderItem
from app.models.inventory import InventoryItem

router = APIRouter(prefix="/purchases", tags=["Purchases"])


class POItemCreate(BaseModel):
    sku: str
    item_name: str
    quantity: int
    unit_cost: float


class POCreate(BaseModel):
    supplier_name: str
    items: List[POItemCreate]


@router.get("/")
def list_purchases(
    db: Session = Depends(get_db),
    _=Depends(require_role(["admin", "company_manager"])),
):
    orders = db.query(PurchaseOrder).order_by(PurchaseOrder.id.desc()).all()
    result = []
    for po in orders:
        result.append({
            "id": po.id,
            "supplier_name": po.supplier_name,
            "status": po.status,
            "total_amount": po.total_amount,
            "created_by": po.created_by,
            "created_at": po.created_at,
            "items": [
                {
                    "id": i.id,
                    "sku": i.sku,
                    "item_name": i.item_name,
                    "quantity": i.quantity,
                    "unit_cost": i.unit_cost,
                }
                for i in po.items
            ],
        })
    return result


@router.post("/")
def create_purchase(
    data: POCreate,
    db: Session = Depends(get_db),
    user=Depends(require_role(["admin", "company_manager"])),
):
    total = sum(i.quantity * i.unit_cost for i in data.items)
    po = PurchaseOrder(
        supplier_name=data.supplier_name,
        total_amount=total,
        created_by=user.id,
        status="pending",
    )
    db.add(po)
    db.flush()

    for item in data.items:
        db.add(PurchaseOrderItem(
            purchase_order_id=po.id,
            sku=item.sku,
            item_name=item.item_name,
            quantity=item.quantity,
            unit_cost=item.unit_cost,
        ))

    db.commit()
    db.refresh(po)
    return {"id": po.id, "status": po.status, "total_amount": po.total_amount}


@router.post("/{po_id}/receive")
def receive_purchase(
    po_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_role(["admin", "company_manager"])),
):
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id).first()
    if not po:
        raise HTTPException(404, "Purchase order not found")
    if po.status == "received":
        raise HTTPException(400, "Already received")
    if po.status == "cancelled":
        raise HTTPException(400, "Order is cancelled")

    for item in po.items:
        inv = db.query(InventoryItem).filter(InventoryItem.sku == item.sku).first()
        if inv:
            inv.quantity += item.quantity
        else:
            db.add(InventoryItem(
                sku=item.sku,
                name=item.item_name,
                quantity=item.quantity,
                unit_price=item.unit_cost,
                location="warehouse",
            ))

    po.status = "received"
    db.commit()
    return {"message": "Purchase order received and stock updated"}


@router.post("/{po_id}/cancel")
def cancel_purchase(
    po_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_role(["admin", "company_manager"])),
):
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id).first()
    if not po:
        raise HTTPException(404, "Purchase order not found")
    if po.status != "pending":
        raise HTTPException(400, f"Cannot cancel a {po.status} order")
    po.status = "cancelled"
    db.commit()
    return {"message": "Purchase order cancelled"}
