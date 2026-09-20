from sqlalchemy import (
    Column, Integer, String, Boolean, Float, Date, DateTime,
    ForeignKey, Text, Enum as SAEnum
)
from sqlalchemy.orm import relationship
from app.core.database import Base
from datetime import datetime
import enum


class PlanDuration(str, enum.Enum):
    DAILY     = "daily"
    WEEKLY    = "weekly"
    MONTHLY   = "monthly"
    QUARTERLY = "quarterly"
    BIANNUAL  = "biannual"
    ANNUAL    = "annual"
    CUSTOM    = "custom"


class SubscriptionStatus(str, enum.Enum):
    ACTIVE    = "active"
    EXPIRED   = "expired"
    FROZEN    = "frozen"
    CANCELLED = "cancelled"
    PENDING   = "pending"


class MembershipPlan(Base):
    __tablename__ = "membership_plans"

    id                  = Column(Integer, primary_key=True, index=True)
    name                = Column(String, nullable=False, index=True)
    description         = Column(Text, nullable=True)
    duration_type       = Column(
        SAEnum(PlanDuration, values_callable=lambda x: [e.value for e in x]),
        nullable=False
    )
    duration_days       = Column(Integer, nullable=True)   # used when type=custom
    price               = Column(Float, nullable=False)
    tax_percent         = Column(Float, default=0.0)
    joining_fee         = Column(Float, default=0.0)
    discount_percent    = Column(Float, default=0.0)
    admission_discount_percent = Column(Float, default=0.0)
    monthly_discount_percent   = Column(Float, default=0.0)
    freeze_allowed      = Column(Boolean, default=True)
    max_freeze_days     = Column(Integer, default=30)
    auto_renewal        = Column(Boolean, default=False)
    renewal_reminder_days = Column(Integer, default=7)
    is_active           = Column(Boolean, default=True)
    created_at          = Column(DateTime, default=datetime.utcnow)
    updated_at          = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    subscriptions       = relationship("MembershipSubscription", back_populates="plan")


class MembershipSubscription(Base):
    __tablename__ = "membership_subscriptions"

    id                  = Column(Integer, primary_key=True, index=True)
    member_id           = Column(Integer, ForeignKey("gym_members.id"), nullable=False, index=True)
    plan_id             = Column(Integer, ForeignKey("membership_plans.id"), nullable=False, index=True)
    branch_id           = Column(Integer, ForeignKey("branches.id"), nullable=False, index=True)

    start_date          = Column(Date, nullable=False)
    end_date            = Column(Date, nullable=False)
    actual_end_date     = Column(Date, nullable=True)   # adjusted after freeze

    price_paid          = Column(Float, nullable=False)
    tax_amount          = Column(Float, default=0.0)
    joining_fee_paid    = Column(Float, default=0.0)
    discount_amount     = Column(Float, default=0.0)
    total_amount        = Column(Float, nullable=False)

    payment_method      = Column(String, nullable=True)
    payment_reference   = Column(String, nullable=True)
    payment_status      = Column(String, default="paid")   # paid | pending | partial

    status              = Column(
        SAEnum(SubscriptionStatus, values_callable=lambda x: [e.value for e in x]),
        nullable=False, default=SubscriptionStatus.ACTIVE.value
    )
    notes               = Column(Text, nullable=True)
    created_by          = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at          = Column(DateTime, default=datetime.utcnow)
    updated_at          = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    member              = relationship("GymMember", back_populates="memberships")
    plan                = relationship("MembershipPlan", back_populates="subscriptions")
    freezes             = relationship("MembershipFreeze", back_populates="subscription")


class MembershipFreeze(Base):
    __tablename__ = "membership_freezes"

    id                  = Column(Integer, primary_key=True, index=True)
    subscription_id     = Column(Integer, ForeignKey("membership_subscriptions.id"), nullable=False, index=True)
    freeze_start        = Column(Date, nullable=False)
    freeze_end          = Column(Date, nullable=False)
    freeze_days         = Column(Integer, nullable=False)
    reason              = Column(Text, nullable=True)
    approved_by         = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at          = Column(DateTime, default=datetime.utcnow)

    subscription        = relationship("MembershipSubscription", back_populates="freezes")


class MembershipTransfer(Base):
    __tablename__ = "membership_transfers"

    id                  = Column(Integer, primary_key=True, index=True)
    subscription_id     = Column(Integer, ForeignKey("membership_subscriptions.id"), nullable=False)
    from_member_id      = Column(Integer, ForeignKey("gym_members.id"), nullable=False)
    to_member_id        = Column(Integer, ForeignKey("gym_members.id"), nullable=False)
    transfer_date       = Column(Date, nullable=False)
    reason              = Column(Text, nullable=True)
    approved_by         = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at          = Column(DateTime, default=datetime.utcnow)
