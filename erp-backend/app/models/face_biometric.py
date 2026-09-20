from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, LargeBinary, Float
from sqlalchemy.orm import relationship
from app.core.database import Base
from datetime import datetime


class FaceBiometric(Base):
    __tablename__ = "face_biometrics"

    id = Column(Integer, primary_key=True, index=True)
    member_id = Column(Integer, ForeignKey("gym_members.id"), nullable=False, index=True)
    staff_id = Column(Integer, ForeignKey("gym_staff.id"), nullable=True, index=True)
    
    # Face embedding vector (stored as binary)
    face_embedding = Column(LargeBinary, nullable=False)
    
    # Face recognition model used
    model_name = Column(String, default="VGG-Face")
    
    # Quality metrics
    face_quality_score = Column(Float, nullable=True)
    enrollment_confidence = Column(Float, nullable=True)
    
    # Metadata
    enrollment_device = Column(String, nullable=True)  # IP address or device ID
    enrollment_ip = Column(String, nullable=True)
    
    # Status
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)  # Admin verification
    
    # Security
    failed_attempts = Column(Integer, default=0)
    last_used_at = Column(DateTime, nullable=True)
    
    # Audit
    registered_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Soft delete
    deleted_at = Column(DateTime, nullable=True)
    
    member = relationship("GymMember", foreign_keys=[member_id])
    staff = relationship("GymStaff", foreign_keys=[staff_id])
    registrar = relationship("User", foreign_keys=[registered_by])


class FaceRecognitionLog(Base):
    __tablename__ = "face_recognition_logs"

    id = Column(Integer, primary_key=True, index=True)
    face_biometric_id = Column(Integer, ForeignKey("face_biometrics.id"), nullable=True, index=True)
    member_id = Column(Integer, ForeignKey("gym_members.id"), nullable=True, index=True)
    staff_id = Column(Integer, ForeignKey("gym_staff.id"), nullable=True, index=True)
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=False, index=True)
    
    # Recognition results
    is_recognized = Column(Boolean, nullable=False)
    confidence_score = Column(Float, nullable=True)
    recognition_method = Column(String, default="face")
    
    # Attempt details
    attempt_device = Column(String, nullable=True)
    attempt_ip = Column(String, nullable=True)
    face_quality_score = Column(Float, nullable=True)
    
    # Error handling
    error_message = Column(Text, nullable=True)
    
    # Timestamp
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    member = relationship("GymMember", foreign_keys=[member_id])
    staff = relationship("GymStaff", foreign_keys=[staff_id])
    branch = relationship("Branch")
    biometric = relationship("FaceBiometric", foreign_keys=[face_biometric_id])
