from sqlalchemy import (
    Column, Integer, String, Boolean, Float, Date, DateTime,
    ForeignKey, Text, Enum as SAEnum
)
from sqlalchemy.orm import relationship
from app.core.database import Base
from datetime import datetime
import enum


class StaffRole(str, enum.Enum):
    TRAINER      = "trainer"
    RECEPTIONIST = "receptionist"
    MANAGER      = "manager"
    ACCOUNTANT   = "accountant"
    SECURITY     = "security"
    CLEANING     = "cleaning"
    MAINTENANCE  = "maintenance"
    OTHER        = "other"


class StaffStatus(str, enum.Enum):
    ACTIVE      = "active"
    INACTIVE    = "inactive"
    ON_LEAVE    = "on_leave"
    TERMINATED  = "terminated"


class GymStaff(Base):
    __tablename__ = "gym_staff"

    id                  = Column(Integer, primary_key=True, index=True)
    staff_code          = Column(String, unique=True, index=True, nullable=False)
    branch_id           = Column(Integer, ForeignKey("branches.id"), nullable=False, index=True)
    user_id             = Column(Integer, ForeignKey("users.id"), nullable=True, unique=True)

    # Personal
    first_name          = Column(String, nullable=False)
    last_name           = Column(String, nullable=False)
    gender              = Column(String, nullable=True)
    date_of_birth       = Column(Date, nullable=True)
    cnic                = Column(String, nullable=True)
    phone               = Column(String, nullable=True)
    email               = Column(String, nullable=True, index=True)
    address             = Column(Text, nullable=True)
    profile_picture     = Column(String, nullable=True)

    # Professional
    role                = Column(
        SAEnum(StaffRole, values_callable=lambda x: [e.value for e in x]),
        nullable=False, default=StaffRole.OTHER.value
    )
    designation         = Column(String, nullable=True)
    qualification       = Column(String, nullable=True)
    specialization      = Column(String, nullable=True)   # for trainers
    experience_years    = Column(Integer, nullable=True)
    joining_date        = Column(Date, nullable=True)
    salary              = Column(Float, nullable=True)
    commission_percent  = Column(Float, nullable=True, default=0.0)

    # Biometric / Access
    biometric_user_id   = Column(String, nullable=True, index=True)
    rfid_number         = Column(String, nullable=True, index=True)

    # Status
    status              = Column(
        SAEnum(StaffStatus, values_callable=lambda x: [e.value for e in x]),
        nullable=False, default=StaffStatus.ACTIVE.value
    )
    is_active           = Column(Boolean, default=True)
    notes               = Column(Text, nullable=True)
    deleted_at          = Column(DateTime, nullable=True)
    created_at          = Column(DateTime, default=datetime.utcnow)
    updated_at          = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    branch              = relationship("Branch", back_populates="staff")
    user                = relationship("User", foreign_keys=[user_id])
    assigned_members    = relationship("GymMember", foreign_keys="GymMember.assigned_trainer_id", overlaps="assigned_trainer")
    schedules           = relationship("TrainerSchedule", back_populates="trainer")
    attendance_records  = relationship("StaffAttendance", back_populates="staff")

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"
