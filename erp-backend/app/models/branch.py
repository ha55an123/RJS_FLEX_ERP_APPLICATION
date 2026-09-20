from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Float
from sqlalchemy.orm import relationship
from app.core.database import Base
from datetime import datetime


class Branch(Base):
    __tablename__ = "branches"

    id          = Column(Integer, primary_key=True, index=True)
    name        = Column(String, nullable=False, index=True)
    code        = Column(String, unique=True, index=True, nullable=False)
    address     = Column(Text, nullable=True)
    city        = Column(String, nullable=True)
    phone       = Column(String, nullable=True)
    email       = Column(String, nullable=True)
    manager_id  = Column(Integer, ForeignKey("users.id"), nullable=True)
    is_active   = Column(Boolean, default=True)
    opening_time = Column(String, nullable=True)   # e.g. "06:00"
    closing_time = Column(String, nullable=True)   # e.g. "23:00"
    capacity    = Column(Integer, nullable=True)
    notes       = Column(Text, nullable=True)
    created_at  = Column(DateTime, default=datetime.utcnow)
    updated_at  = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    manager     = relationship("User", foreign_keys=[manager_id])
    members     = relationship("GymMember", back_populates="branch")
    staff       = relationship("GymStaff", back_populates="branch")
    devices     = relationship("BiometricDevice", back_populates="branch")
    equipment   = relationship("GymEquipment", back_populates="branch")
