from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.auth_dependencies import get_current_user, require_role
from app.schemas.order import OrderCreate
from app.services.order_service import create_order
from app.models.order import Order

router = APIRouter(prefix="/orders", tags=["Orders"])


# -------------------------
# CREATE ORDER (ALL USERS)
# -------------------------
@router.post("/")
def place_order(
    order: OrderCreate,
    db: Session = Depends(get_db),
    user = Depends(get_current_user)
):
    try:
        return create_order(db, user.id, order.items)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# -------------------------
# GET MY ORDERS
# -------------------------
@router.get("/my")
def my_orders(
    db: Session = Depends(get_db),
    user = Depends(get_current_user)
):
    return db.query(Order).filter(Order.user_id == user.id).all()


# -------------------------
# GET ALL ORDERS (ADMIN/MANAGER)
# -------------------------
@router.get("/")
def all_orders(
    db: Session = Depends(get_db),
    user = Depends(require_role(["admin", "company_manager"]))
):
    return db.query(Order).all()
