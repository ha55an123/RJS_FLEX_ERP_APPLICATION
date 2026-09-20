from sqlalchemy import (
    Column, Integer, String, Boolean, Float, Date, DateTime,
    ForeignKey, Text, Enum as SAEnum
)
from sqlalchemy.orm import relationship
from app.core.database import Base
from datetime import datetime
import enum


class MemberStatus(str, enum.Enum):
    ACTIVE   = "active"
    EXPIRED  = "expired"
    FROZEN   = "frozen"
    INACTIVE = "inactive"
    PENDING  = "pending"


class Gender(str, enum.Enum):
    MALE   = "male"
    FEMALE = "female"
    OTHER  = "other"


class BloodGroup(str, enum.Enum):
    A_POS  = "A+"
    A_NEG  = "A-"
    B_POS  = "B+"
    B_NEG  = "B-"
    AB_POS = "AB+"
    AB_NEG = "AB-"
    O_POS  = "O+"
    O_NEG  = "O-"


class GymMember(Base):
    __tablename__ = "gym_members"

    id                  = Column(Integer, primary_key=True, index=True)
    member_code         = Column(String, unique=True, index=True, nullable=False)
    branch_id           = Column(Integer, ForeignKey("branches.id"), nullable=False, index=True)
    assigned_trainer_id = Column(Integer, ForeignKey("gym_staff.id"), nullable=True)

    # Personal Info
    first_name          = Column(String, nullable=False)
    last_name           = Column(String, nullable=False)
    gender              = Column(SAEnum(Gender, values_callable=lambda x: [e.value for e in x]), nullable=True)
    date_of_birth       = Column(Date, nullable=True)
    cnic                = Column(String, nullable=True, index=True)
    passport_number     = Column(String, nullable=True)
    phone               = Column(String, nullable=True)
    whatsapp            = Column(String, nullable=True)
    email               = Column(String, nullable=True, index=True)
    address             = Column(Text, nullable=True)
    profile_picture     = Column(String, nullable=True)   # file path

    # Emergency
    emergency_contact_name  = Column(String, nullable=True)
    emergency_contact_phone = Column(String, nullable=True)
    emergency_contact_relation = Column(String, nullable=True)

    # Medical
    blood_group         = Column(SAEnum(BloodGroup, values_callable=lambda x: [e.value for e in x]), nullable=True)
    medical_conditions  = Column(Text, nullable=True)
    allergies           = Column(Text, nullable=True)

    # Physical
    height_cm           = Column(Float, nullable=True)
    weight_kg           = Column(Float, nullable=True)
    bmi                 = Column(Float, nullable=True)
    body_fat_percent    = Column(Float, nullable=True)
    fitness_goal        = Column(String, nullable=True)

    # Identification / Access
    barcode             = Column(String, unique=True, nullable=True, index=True)
    qr_code             = Column(String, unique=True, nullable=True, index=True)
    rfid_number         = Column(String, unique=True, nullable=True, index=True)
    biometric_user_id   = Column(String, nullable=True, index=True)

    # Status
    status              = Column(
        SAEnum(MemberStatus, values_callable=lambda x: [e.value for e in x]),
        nullable=False, default=MemberStatus.PENDING.value
    )
    joining_date        = Column(Date, nullable=True)
    notes               = Column(Text, nullable=True)
    is_active           = Column(Boolean, default=True)

    # Soft delete
    deleted_at          = Column(DateTime, nullable=True)
    created_at          = Column(DateTime, default=datetime.utcnow)
    updated_at          = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    branch              = relationship("Branch", back_populates="members")
    assigned_trainer    = relationship("GymStaff", foreign_keys=[assigned_trainer_id])
    memberships         = relationship("MembershipSubscription", back_populates="member")
    attendance_records  = relationship("GymAttendance", back_populates="member")

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"
