from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from app.core.database import Base
from datetime import datetime

class InventoryItem(Base):
    __tablename__ = "inventory_items"

    id = Column(Integer, primary_key=True, index=True)
    sku = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    description = Column(String)
    quantity = Column(Integer, default=0)
    unit_price = Column(Float)
    location = Column(String)  # company or outlet
    created_at = Column(DateTime, default=datetime.utcnow)

class StockTransaction(Base):
    __tablename__ = "stock_transactions"

    id = Column(Integer, primary_key=True, index=True)
    item_id = Column(Integer, ForeignKey("inventory_items.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    qty = Column(Integer)
    transaction_type = Column(String)  # 'in', 'out', 'transfer'
    from_location = Column(String, nullable=True)
    to_location = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

    item = relationship("InventoryItem")


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)

    name = Column(String, nullable=False, index=True)
    sku = Column(String, unique=True, index=True, nullable=False)

    price = Column(Float, nullable=False)
    description = Column(String, nullable=True)
