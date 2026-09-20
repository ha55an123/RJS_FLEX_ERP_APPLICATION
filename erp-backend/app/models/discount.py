from sqlalchemy import (
    Column, Integer, String, Boolean, Float, Date, DateTime,
    ForeignKey, Text, Enum as SAEnum
)
from sqlalchemy.orm import relationship
from app.core.database import Base
from datetime import datetime
import enum


class DiscountType(str, enum.Enum):
    PERCENTAGE = "percentage"
    FIXED = "fixed"


class DiscountStatus(str, enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    EXPIRED = "expired"


class Discount(Base):
    __tablename__ = "discounts"

    id                  = Column(Integer, primary_key=True, index=True)
    name                = Column(String, nullable=False, index=True)
    description         = Column(Text, nullable=True)
    discount_type       = Column(
        SAEnum(DiscountType, values_callable=lambda x: [e.value for e in x]),
        nullable=False
    )
    discount_value      = Column(Float, nullable=False)  # percentage or fixed amount
    min_amount          = Column(Float, nullable=True)   # minimum purchase amount
    max_discount        = Column(Float, nullable=True)   # maximum discount amount
    start_date          = Column(Date, nullable=True)
    end_date            = Column(Date, nullable=True)
    status              = Column(
        SAEnum(DiscountStatus, values_callable=lambda x: [e.value for e in x]),
        nullable=False, default=DiscountStatus.ACTIVE.value
    )
    applicable_to       = Column(String, nullable=True)   # 'all', 'membership', 'monthly_fee', 'joining_fee', 'admission_fee'
    plan_ids            = Column(Text, nullable=True)     # JSON array of applicable plan IDs
    usage_limit         = Column(Integer, nullable=True)  # null = unlimited
    usage_count         = Column(Integer, default=0)
    created_by          = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at          = Column(DateTime, default=datetime.utcnow)
    updated_at          = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def is_valid(self):
        """Check if discount is currently valid"""
        if self.status != DiscountStatus.ACTIVE.value:
            return False
        if self.start_date and datetime.utcnow().date() < self.start_date:
            return False
        if self.end_date and datetime.utcnow().date() > self.end_date:
            return False
        if self.usage_limit and self.usage_count >= self.usage_limit:
            return False
        return True

    def calculate_discount(self, amount):
        """Calculate discount amount for given base amount"""
        if not self.is_valid():
            return 0
        if self.min_amount and amount < self.min_amount:
            return 0
        
        if self.discount_type == DiscountType.PERCENTAGE.value:
            discount = amount * (self.discount_value / 100)
        else:
            discount = self.discount_value
        
        if self.max_discount:
            discount = min(discount, self.max_discount)
        
        return max(0, discount)
