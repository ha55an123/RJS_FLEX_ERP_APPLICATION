from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Boolean
from sqlalchemy.orm import relationship
from app.core.database import Base
from datetime import datetime


class Outlet(Base):
    __tablename__ = "outlets"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    location = Column(String)
    phone = Column(String)
    manager_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    products = relationship("OutletProduct", back_populates="outlet")
    sales = relationship("OutletSale", back_populates="outlet")


class OutletProduct(Base):
    __tablename__ = "outlet_products"

    id = Column(Integer, primary_key=True, index=True)
    outlet_id = Column(Integer, ForeignKey("outlets.id"))
    sku = Column(String, nullable=False)
    name = Column(String, nullable=False)
    description = Column(String)
    sale_price = Column(Float, nullable=False)
    stock = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)

    outlet = relationship("Outlet", back_populates="products")


class OutletSale(Base):
    __tablename__ = "outlet_sales"

    id = Column(Integer, primary_key=True, index=True)
    outlet_id = Column(Integer, ForeignKey("outlets.id"))
    sold_by = Column(Integer, ForeignKey("users.id"))
    customer_name = Column(String)
    payment_method = Column(String, default="cash")   # cash | card | online
    discount = Column(Float, default=0)
    total_amount = Column(Float, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    outlet = relationship("Outlet", back_populates="sales")
    items = relationship("OutletSaleItem", back_populates="sale")


class OutletSaleItem(Base):
    __tablename__ = "outlet_sale_items"

    id = Column(Integer, primary_key=True, index=True)
    sale_id = Column(Integer, ForeignKey("outlet_sales.id"))
    product_id = Column(Integer, ForeignKey("outlet_products.id"))
    sku = Column(String)
    name = Column(String)
    quantity = Column(Integer)
    unit_price = Column(Float)
    subtotal = Column(Float)

    sale = relationship("OutletSale", back_populates="items")
