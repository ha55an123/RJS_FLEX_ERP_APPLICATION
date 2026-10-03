from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, ForeignKey, Enum as SAEnum
)
from sqlalchemy.orm import relationship
from app.core.database import Base
from datetime import datetime
import enum


class BiometricType(str, enum.Enum):
    FINGERPRINT = "fingerprint"
    FACE = "face"


class FingerType(str, enum.Enum):
    RIGHT_THUMB = "right_thumb"
    LEFT_THUMB = "left_thumb"
    RIGHT_INDEX = "right_index"
    LEFT_INDEX = "left_index"
    RIGHT_MIDDLE = "right_middle"
    LEFT_MIDDLE = "left_middle"
    RIGHT_RING = "right_ring"
    LEFT_RING = "left_ring"
    RIGHT_LITTLE = "right_little"
    LEFT_LITTLE = "left_little"


class RegistrationStatus(str, enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    FAILED = "failed"


class BiometricRegistration(Base):
    """
    Stores biometric registrations for members.
    Supports both fingerprint and face biometrics.
    Allows multiple fingerprints per member.
    """
    __tablename__ = "biometric_registrations"

    id = Column(Integer, primary_key=True, index=True)
    member_id = Column(Integer, ForeignKey("gym_members.id"), nullable=False, index=True)
    device_id = Column(Integer, ForeignKey("biometric_devices.id"), nullable=False, index=True)
    
    # Biometric type (fingerprint or face)
    biometric_type = Column(
        SAEnum(BiometricType, values_callable=lambda x: [e.value for e in x]),
        nullable=False
    )
    
    # Finger type (only for fingerprint biometrics)
    finger_type = Column(
        SAEnum(FingerType, values_callable=lambda x: [e.value for e in x]),
        nullable=True
    )
    
    # ZKTeco User ID - maps to the user ID on the device
    zkteco_user_id = Column(String, nullable=False, index=True)
    
    # Reference ID for the biometric template on the device
    template_reference_id = Column(String, nullable=True)
    
    # Registration status
    status = Column(
        SAEnum(RegistrationStatus, values_callable=lambda x: [e.value for e in x]),
        nullable=False, default=RegistrationStatus.ACTIVE.value
    )
    
    # Quality score (0-1) for face biometrics
    quality_score = Column(Integer, nullable=True)
    
    # Metadata
    notes = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    member = relationship("GymMember", back_populates="biometric_registrations")
    device = relationship("BiometricDevice")

    # Ensure unique combination of member, device, biometric_type, and finger_type
    __table_args__ = (
        {'extend_existing': True}
    )
