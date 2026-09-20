from sqlalchemy import (
    Column, Integer, String, Boolean, Float, Date, DateTime,
    ForeignKey, Text, Enum as SAEnum
)
from sqlalchemy.orm import relationship
from app.core.database import Base
from datetime import datetime
import enum


class EquipmentStatus(str, enum.Enum):
    OPERATIONAL  = "operational"
    MAINTENANCE  = "maintenance"
    REPAIR       = "repair"
    OUT_OF_ORDER = "out_of_order"
    RETIRED      = "retired"


class GymEquipment(Base):
    __tablename__ = "gym_equipment"

    id                  = Column(Integer, primary_key=True, index=True)
    branch_id           = Column(Integer, ForeignKey("branches.id"), nullable=False, index=True)
    name                = Column(String, nullable=False, index=True)
    brand               = Column(String, nullable=True)
    model               = Column(String, nullable=True)
    serial_number       = Column(String, nullable=True, index=True)
    category            = Column(String, nullable=True)   # cardio | strength | free_weights | functional | other
    purchase_date       = Column(Date, nullable=True)
    purchase_price      = Column(Float, nullable=True)
    warranty_expiry     = Column(Date, nullable=True)
    expected_lifespan_years = Column(Integer, nullable=True)
    replacement_date    = Column(Date, nullable=True)

    status              = Column(
        SAEnum(EquipmentStatus, values_callable=lambda x: [e.value for e in x]),
        nullable=False, default=EquipmentStatus.OPERATIONAL.value
    )
    last_maintenance_date = Column(Date, nullable=True)
    next_maintenance_date = Column(Date, nullable=True)
    maintenance_interval_days = Column(Integer, default=90)

    location            = Column(String, nullable=True)   # floor / zone
    notes               = Column(Text, nullable=True)
    image_url           = Column(String, nullable=True)
    is_active           = Column(Boolean, default=True)
    created_at          = Column(DateTime, default=datetime.utcnow)
    updated_at          = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    branch              = relationship("Branch", back_populates="equipment")
    maintenance_logs    = relationship("EquipmentMaintenance", back_populates="equipment")


class EquipmentMaintenance(Base):
    __tablename__ = "equipment_maintenance"

    id              = Column(Integer, primary_key=True, index=True)
    equipment_id    = Column(Integer, ForeignKey("gym_equipment.id"), nullable=False, index=True)
    maintenance_date = Column(Date, nullable=False)
    maintenance_type = Column(String, nullable=False)   # routine | repair | inspection | replacement
    description     = Column(Text, nullable=True)
    cost            = Column(Float, nullable=True)
    technician_name = Column(String, nullable=True)
    technician_contact = Column(String, nullable=True)
    next_due_date   = Column(Date, nullable=True)
    status          = Column(String, default="completed")   # scheduled | in_progress | completed
    created_by      = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at      = Column(DateTime, default=datetime.utcnow)

    equipment       = relationship("GymEquipment", back_populates="maintenance_logs")
