from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
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
