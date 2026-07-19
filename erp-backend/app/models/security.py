from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean
from datetime import datetime
from app.core.database import Base


class LoginAuditLog(Base):
    __tablename__ = "login_audit_logs"

    id = Column(Integer, primary_key=True)

    user_id = Column(Integer, ForeignKey("users.id"))

    ip_address = Column(String)
    user_agent = Column(String)

    device_id = Column(String)
    location = Column(String)

    status = Column(String)  # success / failed
    created_at = Column(DateTime, default=datetime.utcnow)

class UserDevice(Base):
    __tablename__ = "user_devices"

    id = Column(Integer, primary_key=True)

    user_id = Column(Integer, ForeignKey("users.id"))

    device_id = Column(String, unique=True)
    device_name = Column(String)

    last_login = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)


class UserOTP(Base):
    __tablename__ = "user_otps"

    id = Column(Integer, primary_key=True)

    user_id = Column(Integer, ForeignKey("users.id"))

    otp_code = Column(String)
    expires_at = Column(DateTime)

    is_used = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
