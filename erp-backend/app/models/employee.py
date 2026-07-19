from sqlalchemy import Column, Integer, String, Boolean, Float, Date, DateTime, event
from sqlalchemy.orm import validates
from app.core.database import Base
from datetime import datetime


class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True)
    employee_code = Column(String, unique=True, index=True, nullable=True)
    full_name = Column(String, nullable=False)
    designation = Column(String, nullable=True)
    department = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    email = Column(String, unique=True, index=True, nullable=True)
    address = Column(String, nullable=True)
    joining_date = Column(Date, nullable=True)
    salary = Column(Float, nullable=True)
    status = Column(String, nullable=False, default="active")  # active | inactive
    is_active = Column(Boolean, nullable=False, default=True)
    notes = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
