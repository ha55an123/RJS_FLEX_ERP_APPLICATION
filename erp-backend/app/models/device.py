from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from datetime import datetime
from app.core.database import Base


class UserDevice(Base):
    __tablename__ = "user_devices"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    device_id = Column(String, unique=True)
    device_name = Column(String)
    ip_address = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)