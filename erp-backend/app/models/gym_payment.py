from sqlalchemy import (
    Column, Integer, String, Boolean, Float, Date, DateTime,
    ForeignKey, Text, Enum as SAEnum
)
from sqlalchemy.orm import relationship
from app.core.database import Base
from datetime import datetime
import enum


class PaymentMethod(str, enum.Enum):
    CASH        = "cash"
    CARD        = "card"
    BANK        = "bank"
    EASYPAISA   = "easypaisa"
    JAZZCASH    = "jazzcash"
    STRIPE      = "stripe"
    PAYPAL      = "paypal"
    OTHER       = "other"


class PaymentType(str, enum.Enum):
    MEMBERSHIP      = "membership"
    PERSONAL_TRAINING = "personal_training"
    SUPPLEMENT      = "supplement"
    LOCKER_RENTAL   = "locker_rental"
    REGISTRATION    = "registration"
    FINE            = "fine"
    OTHER           = "other"


class GymPayment(Base):
    __tablename__ = "gym_payments"

    id                  = Column(Integer, primary_key=True, index=True)
    payment_number      = Column(String, unique=True, index=True, nullable=False)
    member_id           = Column(Integer, ForeignKey("gym_members.id"), nullable=False, index=True)
    branch_id           = Column(Integer, ForeignKey("branches.id"), nullable=False, index=True)
    subscription_id     = Column(Integer, ForeignKey("membership_subscriptions.id"), nullable=True)

    payment_type        = Column(
        SAEnum(PaymentType, values_callable=lambda x: [e.value for e in x]),
        nullable=False, default=PaymentType.MEMBERSHIP.value
    )
    payment_method      = Column(
        SAEnum(PaymentMethod, values_callable=lambda x: [e.value for e in x]),
        nullable=False, default=PaymentMethod.CASH.value
    )

    amount              = Column(Float, nullable=False)
    tax_amount          = Column(Float, default=0.0)
    discount_amount     = Column(Float, default=0.0)
    total_amount        = Column(Float, nullable=False)

    payment_date        = Column(Date, nullable=False)
    reference_number    = Column(String, nullable=True)
    status              = Column(String, default="paid")   # paid | pending | refunded | partial

    notes               = Column(Text, nullable=True)
    received_by         = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at          = Column(DateTime, default=datetime.utcnow)
    updated_at          = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    member              = relationship("GymMember")
    subscription        = relationship("MembershipSubscription")
