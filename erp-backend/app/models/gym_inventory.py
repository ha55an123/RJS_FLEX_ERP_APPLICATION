from sqlalchemy import (
    Column, Integer, String, Boolean, Float, Date, DateTime,
    ForeignKey, Text
)
from sqlalchemy.orm import relationship
from app.core.database import Base
from datetime import datetime


class GymInventoryItem(Base):
    __tablename__ = "gym_inventory_items"

    id              = Column(Integer, primary_key=True, index=True)
    branch_id       = Column(Integer, ForeignKey("branches.id"), nullable=True)  # null = all branches
    sku             = Column(String, unique=True, index=True, nullable=False)
    name            = Column(String, nullable=False, index=True)
    category        = Column(String, nullable=True)
    # supplement | protein | water_bottle | accessory | merchandise | cleaning | equipment_part | other
    description     = Column(Text, nullable=True)
    barcode         = Column(String, nullable=True, index=True)

    purchase_price  = Column(Float, nullable=True)
    selling_price   = Column(Float, nullable=True)
    tax_percent     = Column(Float, default=0.0)

    quantity        = Column(Integer, default=0)
    minimum_stock   = Column(Integer, default=5)
    reorder_level   = Column(Integer, default=10)

    supplier_name   = Column(String, nullable=True)
    supplier_contact = Column(String, nullable=True)
    expiry_date     = Column(Date, nullable=True)

    is_active       = Column(Boolean, default=True)
    created_at      = Column(DateTime, default=datetime.utcnow)
    updated_at      = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    transactions    = relationship("GymInventoryTransaction", back_populates="item")


class GymInventoryTransaction(Base):
    __tablename__ = "gym_inventory_transactions"

    id              = Column(Integer, primary_key=True, index=True)
    item_id         = Column(Integer, ForeignKey("gym_inventory_items.id"), nullable=False, index=True)
    transaction_type = Column(String, nullable=False)   # purchase | sale | adjustment | return | transfer
    quantity        = Column(Integer, nullable=False)
    unit_price      = Column(Float, nullable=True)
    total_amount    = Column(Float, nullable=True)
    reference       = Column(String, nullable=True)     # invoice / PO number
    notes           = Column(Text, nullable=True)
    created_by      = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at      = Column(DateTime, default=datetime.utcnow)

    item            = relationship("GymInventoryItem", back_populates="transactions")
