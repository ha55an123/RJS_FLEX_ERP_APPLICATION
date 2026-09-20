from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel

from app.core.database import get_db
from app.core.auth_dependencies import require_role
from app.models.inventory import InventoryItem
from app.services.inventory_service import add_stock, remove_stock, create_item

router = APIRouter(prefix="/inventory", tags=["Inventory"])


class InventoryItemCreate(BaseModel):
    sku: str
    name: str
    quantity: int = 0
    location: str = "warehouse"
    description: Optional[str] = None
    unit_price: Optional[float] = None


@router.get("/")
def get_inventory(
    db: Session = Depends(get_db),
    user = Depends(require_role(["admin", "company_manager"]))
):
    return db.query(InventoryItem).all()


@router.post("/")
def create_inventory_item(
    data: InventoryItemCreate,
    db: Session = Depends(get_db),
    user = Depends(require_role(["admin", "company_manager"]))
):
    return create_item(
        db,
        sku=data.sku,
        name=data.name,
        quantity=data.quantity,
        user_id=user.id,
        location=data.location,
        description=data.description,
        unit_price=data.unit_price,
    )


@router.post("/add")
def stock_in(
    sku: str,
    qty: int,
    location: str,
    db: Session = Depends(get_db),
    user = Depends(require_role(["admin", "company_manager"]))
):
    return add_stock(db, sku, qty, user.id, location)


@router.post("/remove")
def stock_out(
    sku: str,
    qty: int,
    location: str,
    db: Session = Depends(get_db),
    user = Depends(require_role(["admin", "company_manager", "receptionist"]))
):
    return remove_stock(db, sku, qty, user.id, location)
