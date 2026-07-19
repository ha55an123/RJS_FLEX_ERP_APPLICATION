from sqlalchemy import Column, Integer, Float, String, ForeignKey, Date, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime

from app.core.database import Base


class AttendanceRecord(Base):
    __tablename__ = "attendance_records"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False, index=True)
    work_date = Column(Date, nullable=False, index=True)
    status = Column(String, nullable=False, default="present")  # present|absent|half_day|leave
    overtime_hours = Column(Float, nullable=False, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    employee = relationship("Employee", foreign_keys=[employee_id])


class PayrollRun(Base):
    __tablename__ = "payroll_runs"

    id = Column(Integer, primary_key=True, index=True)
    period_year = Column(Integer, nullable=False, index=True)
    period_month = Column(Integer, nullable=False, index=True)
    month_plan = Column(String, nullable=False, default="30")  # "24" | "30"
    overtime_rate_type = Column(String, nullable=False, default="single")  # single|double
    overtime_hours_factor = Column(Float, nullable=False, default=1.0)
    overtime_block_hours = Column(Float, nullable=False, default=1.5)
    status = Column(String, nullable=False, default="draft")  # draft|finalized
    created_at = Column(DateTime, default=datetime.utcnow)


class PayrollItem(Base):
    __tablename__ = "payroll_items"

    id = Column(Integer, primary_key=True, index=True)
    payroll_run_id = Column(Integer, ForeignKey("payroll_runs.id"), nullable=False, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False, index=True)
    base_salary = Column(Float, nullable=False, default=0)
    absent_days = Column(Integer, nullable=False, default=0)
    half_days = Column(Integer, nullable=False, default=0)
    absent_deduction = Column(Float, nullable=False, default=0)
    overtime_hours_total = Column(Float, nullable=False, default=0)
    overtime_blocks = Column(Float, nullable=False, default=0)
    overtime_multiplier = Column(Float, nullable=False, default=1.0)
    overtime_pay = Column(Float, nullable=False, default=0)
    final_salary = Column(Float, nullable=False, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    payroll_run = relationship("PayrollRun", foreign_keys=[payroll_run_id])
    employee = relationship("Employee", foreign_keys=[employee_id])
