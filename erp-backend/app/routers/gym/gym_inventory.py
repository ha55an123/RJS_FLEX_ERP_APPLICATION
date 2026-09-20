from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from typing import Optional
from pydantic import BaseModel
from datetime import date, datetime
import re

from app.core.database import get_db
from app.core.auth_dependencies import require_role, get_current_user
from app.models.gym_inventory import GymInventoryItem, GymInventoryTransaction

router = APIRouter(prefix="/inventory", tags=["Gym Inventory"])

INVENTORY_WRITE_ROLES = ["super_admin", "gym_owner", "manager", "accountant", "inventory_manager"]
STAFF_ROLES = ["super_admin", "gym_owner", "manager", "receptionist", "accountant", "inventory_manager"]


def _gen_sku(db: Session, name: str) -> str:
    slug = re.sub(r"[^A-Z0-9]", "", (name or "ITEM").upper())[:8] or "ITEM"
    base = f"SKU-{slug}"
    candidate = base
    suffix = 1
    while db.query(GymInventoryItem).filter(GymInventoryItem.sku == candidate).first():
        candidate = f"{base}-{suffix}"
        suffix += 1
    return candidate


def _serialize_item(item: GymInventoryItem) -> dict:
    return {
        "id": item.id,
        "branch_id": item.branch_id,
        "sku": item.sku,
        "name": item.name,
        "category": item.category,
        "description": item.description,
        "barcode": item.barcode,
        "purchase_price": item.purchase_price,
        "selling_price": item.selling_price,
        "tax_percent": item.tax_percent,
        "quantity": item.quantity,
        "minimum_stock": item.minimum_stock,
        "min_stock_level": item.minimum_stock,
        "reorder_level": item.reorder_level,
        "unit_price": item.purchase_price,
        "supplier_name": item.supplier_name,
        "supplier": item.supplier_name,
        "supplier_contact": item.supplier_contact,
        "expiry_date": item.expiry_date.isoformat() if item.expiry_date else None,
        "is_active": item.is_active,
        "created_at": item.created_at.isoformat() if item.created_at else None,
        "updated_at": item.updated_at.isoformat() if item.updated_at else None,
    }


class ItemCreate(BaseModel):
    branch_id: Optional[int] = None
    sku: Optional[str] = None
    name: str
    category: Optional[str] = None
    description: Optional[str] = None
    barcode: Optional[str] = None
    purchase_price: Optional[float] = None
    selling_price: Optional[float] = None
    tax_percent: float = 0.0
    quantity: int = 0
    minimum_stock: int = 5
    reorder_level: int = 10
    supplier_name: Optional[str] = None
    supplier_contact: Optional[str] = None
    expiry_date: Optional[date] = None


class ItemUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    purchase_price: Optional[float] = None
    selling_price: Optional[float] = None
    tax_percent: Optional[float] = None
    minimum_stock: Optional[int] = None
    reorder_level: Optional[int] = None
    supplier_name: Optional[str] = None
    supplier_contact: Optional[str] = None
    expiry_date: Optional[date] = None
    is_active: Optional[bool] = None


class StockAdjust(BaseModel):
    transaction_type: str   # purchase | sale | adjustment | return | transfer
    quantity: int
    unit_price: Optional[float] = None
    reference: Optional[str] = None
    notes: Optional[str] = None


@router.get("/")
def list_items(
    branch_id: Optional[int] = None,
    category: Optional[str] = None,
    low_stock: bool = False,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    _=Depends(require_role(STAFF_ROLES)),
):
    q = db.query(GymInventoryItem).filter(GymInventoryItem.is_active == True)  # noqa: E712
    if branch_id:
        q = q.filter(GymInventoryItem.branch_id == branch_id)
    if category:
        q = q.filter(GymInventoryItem.category == category)
    if low_stock:
        q = q.filter(GymInventoryItem.quantity <= GymInventoryItem.minimum_stock)
    if search:
        q = q.filter(
            GymInventoryItem.name.ilike(f"%{search}%") |
            GymInventoryItem.sku.ilike(f"%{search}%")
        )
    total = q.count()
    items = q.order_by(GymInventoryItem.name).offset((page - 1) * page_size).limit(page_size).all()
    return {"total": total, "page": page, "page_size": page_size, "items": [_serialize_item(i) for i in items]}


@router.get("/{item_id}/")
def get_item(item_id: int, db: Session = Depends(get_db), _=Depends(require_role(STAFF_ROLES))):
    item = db.query(GymInventoryItem).filter(GymInventoryItem.id == item_id).first()
    if not item:
        raise HTTPException(404, "Item not found")
    return _serialize_item(item)


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_item(
    data: ItemCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_role(INVENTORY_WRITE_ROLES)),
):
    payload = data.model_dump()
    sku = (payload.get("sku") or "").strip()
    if not sku:
        sku = _gen_sku(db, payload["name"])
    elif db.query(GymInventoryItem).filter(GymInventoryItem.sku == sku).first():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "SKU already exists")
    payload["sku"] = sku

    initial_qty = int(payload.get("quantity") or 0)
    item = GymInventoryItem(**payload)
    db.add(item)
    try:
        db.flush()
        if initial_qty > 0:
            txn = GymInventoryTransaction(
                item_id=item.id,
                transaction_type="purchase",
                quantity=initial_qty,
                unit_price=payload.get("purchase_price"),
                total_amount=(payload.get("purchase_price") or 0) * initial_qty,
                notes="Initial stock on item creation",
                created_by=current_user.id,
            )
            db.add(txn)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "Could not create item (duplicate SKU or invalid data)")
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Failed to save inventory item")

    db.refresh(item)
    return _serialize_item(item)


@router.put("/{item_id}/")
def update_item(
    item_id: int, data: ItemUpdate,
    db: Session = Depends(get_db), _=Depends(require_role(INVENTORY_WRITE_ROLES))
):
    item = db.query(GymInventoryItem).filter(GymInventoryItem.id == item_id).first()
    if not item:
        raise HTTPException(404, "Item not found")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(item, k, v)
    item.updated_at = datetime.utcnow()
    try:
        db.commit()
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Failed to update inventory item")
    db.refresh(item)
    return _serialize_item(item)


@router.delete("/{item_id}/")
def delete_item(item_id: int, db: Session = Depends(get_db), _=Depends(require_role(INVENTORY_WRITE_ROLES))):
    item = db.query(GymInventoryItem).filter(GymInventoryItem.id == item_id).first()
    if not item:
        raise HTTPException(404, "Item not found")
    item.is_active = False
    item.updated_at = datetime.utcnow()
    db.commit()
    return {"message": "Item deactivated"}


@router.post("/{item_id}/adjust/")
def adjust_stock(
    item_id: int, data: StockAdjust,
    db: Session = Depends(get_db),
    current_user=Depends(require_role(INVENTORY_WRITE_ROLES)),
):
    item = db.query(GymInventoryItem).filter(GymInventoryItem.id == item_id).first()
    if not item:
        raise HTTPException(404, "Item not found")

    if data.transaction_type in ("sale", "transfer") and item.quantity < data.quantity:
        raise HTTPException(400, "Insufficient stock")

    qty_change = data.quantity if data.transaction_type in ("purchase", "return", "adjustment") else -data.quantity
    item.quantity += qty_change
    item.updated_at = datetime.utcnow()

    total = (data.unit_price or 0) * data.quantity
    txn = GymInventoryTransaction(
        item_id=item_id,
        transaction_type=data.transaction_type,
        quantity=data.quantity,
        unit_price=data.unit_price,
        total_amount=total,
        reference=data.reference,
        notes=data.notes,
        created_by=current_user.id,
    )
    db.add(txn)
    try:
        db.commit()
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Failed to adjust stock")
    db.refresh(item)
    return {"item": _serialize_item(item), "transaction": txn}


@router.get("/{item_id}/transactions/")
def item_transactions(
    item_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    _=Depends(require_role(STAFF_ROLES)),
):
    q = db.query(GymInventoryTransaction).filter(GymInventoryTransaction.item_id == item_id)
    total = q.count()
    items = q.order_by(GymInventoryTransaction.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return {"total": total, "page": page, "page_size": page_size, "items": items}
