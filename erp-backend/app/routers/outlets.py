from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime

from app.core.database import get_db
from app.core.auth_dependencies import get_current_user, require_role
from app.models.outlet import Outlet, OutletProduct, OutletSale, OutletSaleItem

router = APIRouter(prefix="/outlets", tags=["Outlets"])


# ── Schemas ──────────────────────────────────────────

class OutletCreate(BaseModel):
    name: str
    location: Optional[str] = None
    phone: Optional[str] = None
    manager_id: Optional[int] = None

class OutletUpdate(BaseModel):
    name: Optional[str] = None
    location: Optional[str] = None
    phone: Optional[str] = None
    manager_id: Optional[int] = None
    is_active: Optional[bool] = None

class ProductCreate(BaseModel):
    sku: str
    name: str
    description: Optional[str] = None
    sale_price: float
    stock: int = 0

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    sale_price: Optional[float] = None
    stock: Optional[int] = None
    is_active: Optional[bool] = None

class SaleItemIn(BaseModel):
    product_id: int
    quantity: int

class SaleCreate(BaseModel):
    outlet_id: int
    customer_name: Optional[str] = None
    payment_method: str = "cash"
    discount: float = 0
    items: List[SaleItemIn]


# ── Helpers ───────────────────────────────────────────

def _outlet_dict(o: Outlet):
    return {
        "id": o.id, "name": o.name, "location": o.location,
        "phone": o.phone, "manager_id": o.manager_id,
        "is_active": o.is_active, "created_at": o.created_at,
    }

def _product_dict(p: OutletProduct):
    return {
        "id": p.id, "outlet_id": p.outlet_id, "sku": p.sku,
        "name": p.name, "description": p.description,
        "sale_price": p.sale_price, "stock": p.stock, "is_active": p.is_active,
    }

def _sale_dict(s: OutletSale):
    return {
        "id": s.id, "outlet_id": s.outlet_id, "sold_by": s.sold_by,
        "customer_name": s.customer_name, "payment_method": s.payment_method,
        "discount": s.discount, "total_amount": s.total_amount,
        "created_at": s.created_at,
        "items": [
            {
                "id": i.id, "product_id": i.product_id, "sku": i.sku,
                "name": i.name, "quantity": i.quantity,
                "unit_price": i.unit_price, "subtotal": i.subtotal,
            }
            for i in s.items
        ],
    }


# ── Outlets ───────────────────────────────────────────

@router.get("/")
def list_outlets(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return [_outlet_dict(o) for o in db.query(Outlet).order_by(Outlet.id).all()]


@router.post("/")
def create_outlet(data: OutletCreate, db: Session = Depends(get_db),
                  _=Depends(require_role(["admin", "company_manager"]))):
    o = Outlet(**data.model_dump())
    db.add(o)
    db.commit()
    db.refresh(o)
    return _outlet_dict(o)


@router.put("/{outlet_id}")
def update_outlet(outlet_id: int, data: OutletUpdate, db: Session = Depends(get_db),
                  _=Depends(require_role(["admin", "company_manager"]))):
    o = db.query(Outlet).filter(Outlet.id == outlet_id).first()
    if not o:
        raise HTTPException(404, "Outlet not found")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(o, k, v)
    db.commit()
    return _outlet_dict(o)


@router.delete("/{outlet_id}")
def delete_outlet(outlet_id: int, db: Session = Depends(get_db),
                  _=Depends(require_role(["admin"]))):
    o = db.query(Outlet).filter(Outlet.id == outlet_id).first()
    if not o:
        raise HTTPException(404, "Outlet not found")
    db.delete(o)
    db.commit()
    return {"message": "Deleted"}


# ── Outlet Products ───────────────────────────────────

@router.get("/{outlet_id}/products")
def list_products(outlet_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return [_product_dict(p) for p in
            db.query(OutletProduct).filter(OutletProduct.outlet_id == outlet_id).all()]


@router.post("/{outlet_id}/products")
def add_product(outlet_id: int, data: ProductCreate, db: Session = Depends(get_db),
                _=Depends(require_role(["admin", "company_manager"]))):
    if not db.query(Outlet).filter(Outlet.id == outlet_id).first():
        raise HTTPException(404, "Outlet not found")
    p = OutletProduct(outlet_id=outlet_id, **data.model_dump())
    db.add(p)
    db.commit()
    db.refresh(p)
    return _product_dict(p)


@router.put("/{outlet_id}/products/{product_id}")
def update_product(outlet_id: int, product_id: int, data: ProductUpdate,
                   db: Session = Depends(get_db),
                   _=Depends(require_role(["admin", "company_manager"]))):
    p = db.query(OutletProduct).filter(
        OutletProduct.id == product_id, OutletProduct.outlet_id == outlet_id).first()
    if not p:
        raise HTTPException(404, "Product not found")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(p, k, v)
    db.commit()
    return _product_dict(p)


@router.delete("/{outlet_id}/products/{product_id}")
def delete_product(outlet_id: int, product_id: int, db: Session = Depends(get_db),
                   _=Depends(require_role(["admin", "company_manager"]))):
    p = db.query(OutletProduct).filter(
        OutletProduct.id == product_id, OutletProduct.outlet_id == outlet_id).first()
    if not p:
        raise HTTPException(404, "Product not found")
    db.delete(p)
    db.commit()
    return {"message": "Deleted"}


# ── Sales / POS ───────────────────────────────────────

@router.post("/sales")
def create_sale(data: SaleCreate, db: Session = Depends(get_db),
                user=Depends(get_current_user)):
    outlet = db.query(Outlet).filter(Outlet.id == data.outlet_id).first()
    if not outlet:
        raise HTTPException(404, "Outlet not found")

    sale = OutletSale(
        outlet_id=data.outlet_id,
        sold_by=user.id,
        customer_name=data.customer_name,
        payment_method=data.payment_method,
        discount=data.discount,
    )
    db.add(sale)
    db.flush()

    total = 0
    for item in data.items:
        product = db.query(OutletProduct).filter(
            OutletProduct.id == item.product_id,
            OutletProduct.outlet_id == data.outlet_id,
            OutletProduct.is_active == True,
        ).first()
        if not product:
            raise HTTPException(404, f"Product {item.product_id} not found in outlet")
        if product.stock < item.quantity:
            raise HTTPException(400, f"Insufficient stock for {product.name}")

        product.stock -= item.quantity
        subtotal = product.sale_price * item.quantity
        total += subtotal

        db.add(OutletSaleItem(
            sale_id=sale.id,
            product_id=product.id,
            sku=product.sku,
            name=product.name,
            quantity=item.quantity,
            unit_price=product.sale_price,
            subtotal=subtotal,
        ))

    after_discount = max(0, total - data.discount)
    sale.total_amount = after_discount
    db.commit()
    db.refresh(sale)
    return _sale_dict(sale)


@router.get("/{outlet_id}/sales")
def get_sales(outlet_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    sales = db.query(OutletSale).filter(
        OutletSale.outlet_id == outlet_id).order_by(OutletSale.id.desc()).all()
    return [_sale_dict(s) for s in sales]


@router.get("/sales/all")
def all_sales(db: Session = Depends(get_db),
              _=Depends(require_role(["admin", "company_manager"]))):
    return [_sale_dict(s) for s in db.query(OutletSale).order_by(OutletSale.id.desc()).all()]


@router.get("/{outlet_id}/summary")
def outlet_summary(outlet_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    total_sales = db.query(func.count(OutletSale.id)).filter(
        OutletSale.outlet_id == outlet_id).scalar() or 0
    total_revenue = db.query(func.sum(OutletSale.total_amount)).filter(
        OutletSale.outlet_id == outlet_id).scalar() or 0
    total_products = db.query(func.count(OutletProduct.id)).filter(
        OutletProduct.outlet_id == outlet_id).scalar() or 0
    low_stock = db.query(func.count(OutletProduct.id)).filter(
        OutletProduct.outlet_id == outlet_id, OutletProduct.stock < 5).scalar() or 0
    return {
        "total_sales": total_sales,
        "total_revenue": total_revenue,
        "total_products": total_products,
        "low_stock": low_stock,
    }
