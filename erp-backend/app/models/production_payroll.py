from __future__ import annotations

from datetime import datetime, date
import enum

from sqlalchemy import (
    Column,
    Date,
    DateTime,
    Enum as SAEnum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from app.core.database import Base


class ProductionStatus(str, enum.Enum):
    active = "active"
    inactive = "inactive"


class EmployeeTechnologyStatus(str, enum.Enum):
    active = "active"
    inactive = "inactive"


class LoanStatus(str, enum.Enum):
    active = "active"
    paid = "paid"
    cancelled = "cancelled"


class AdvanceStatus(str, enum.Enum):
    active = "active"
    paid = "paid"
    cancelled = "cancelled"


class ProductionDepartment(Base):
    __tablename__ = "production_departments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, unique=True)
    description = Column(Text, nullable=True)
    status = Column(
        SAEnum(ProductionStatus, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=ProductionStatus.active.value,
    )
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    technologies = relationship("ProductionTechnology", back_populates="department")


class ProductionTechnology(Base):
    __tablename__ = "production_technologies"
    __table_args__ = (
        UniqueConstraint("department_id", "name", name="uq_production_technology_department"),
    )

    id = Column(Integer, primary_key=True, index=True)
    department_id = Column(Integer, ForeignKey("production_departments.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    unit_rate = Column(Float, nullable=False, default=0.0)
    status = Column(
        SAEnum(ProductionStatus, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=ProductionStatus.active.value,
    )
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    department = relationship("ProductionDepartment", back_populates="technologies")
    assignments = relationship("EmployeeTechnologyAssignment", back_populates="technology")
    entries = relationship("ProductionEntry", back_populates="technology")


class EmployeeTechnologyAssignment(Base):
    __tablename__ = "employee_technology_assignments"
    __table_args__ = (
        UniqueConstraint("employee_id", "technology_id", name="uq_employee_technology_assignment"),
    )

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False, index=True)
    technology_id = Column(Integer, ForeignKey("production_technologies.id"), nullable=False, index=True)
    assigned_date = Column(Date, nullable=False, default=date.today)
    status = Column(
        SAEnum(EmployeeTechnologyStatus, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=EmployeeTechnologyStatus.active.value,
    )
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    employee = relationship("Employee", foreign_keys=[employee_id])
    technology = relationship("ProductionTechnology", back_populates="assignments")


class ProductionEntry(Base):
    __tablename__ = "production_entries"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False, index=True)
    technology_id = Column(Integer, ForeignKey("production_technologies.id"), nullable=False, index=True)
    production_date = Column(Date, nullable=False, index=True)
    quantity = Column(Float, nullable=False, default=0.0)
    remarks = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    employee = relationship("Employee", foreign_keys=[employee_id])
    technology = relationship("ProductionTechnology", back_populates="entries")


class ProductionPayrollRun(Base):
    __tablename__ = "production_payroll_runs"

    id = Column(Integer, primary_key=True, index=True)
    period_year = Column(Integer, nullable=False, index=True)
    period_month = Column(Integer, nullable=False, index=True)
    bonus = Column(Float, nullable=False, default=0.0)
    deductions = Column(Float, nullable=False, default=0.0)
    status = Column(String, nullable=False, default="draft")
    created_at = Column(DateTime, default=datetime.utcnow)

    items = relationship("ProductionPayrollItem", back_populates="payroll_run")


class ProductionPayrollItem(Base):
    __tablename__ = "production_payroll_items"

    id = Column(Integer, primary_key=True, index=True)
    payroll_run_id = Column(Integer, ForeignKey("production_payroll_runs.id"), nullable=False, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False, index=True)
    total_quantity = Column(Float, nullable=False, default=0.0)
    total_amount = Column(Float, nullable=False, default=0.0)
    bonus = Column(Float, nullable=False, default=0.0)
    deductions = Column(Float, nullable=False, default=0.0)
    loan_deduction = Column(Float, nullable=False, default=0.0)
    advance_deduction = Column(Float, nullable=False, default=0.0)
    net_pay = Column(Float, nullable=False, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)

    payroll_run = relationship("ProductionPayrollRun", back_populates="items")
    employee = relationship("Employee", foreign_keys=[employee_id])


class ProductionLoan(Base):
    __tablename__ = "production_loans"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False, index=True)
    ledger_id = Column(Integer, ForeignKey("ledgers.id"), nullable=False, index=True)
    amount = Column(Float, nullable=False, default=0.0)
    balance = Column(Float, nullable=False, default=0.0)
    monthly_deduction = Column(Float, nullable=False, default=0.0)
    issue_date = Column(Date, nullable=False, default=date.today)
    due_date = Column(Date, nullable=True)
    status = Column(
        SAEnum(LoanStatus, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=LoanStatus.active.value,
    )
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    employee = relationship("Employee", foreign_keys=[employee_id])
    ledger = relationship("Ledger", foreign_keys=[ledger_id])


class ProductionAdvance(Base):
    __tablename__ = "production_advances"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False, index=True)
    ledger_id = Column(Integer, ForeignKey("ledgers.id"), nullable=False, index=True)
    amount = Column(Float, nullable=False, default=0.0)
    balance = Column(Float, nullable=False, default=0.0)
    monthly_deduction = Column(Float, nullable=False, default=0.0)
    issue_date = Column(Date, nullable=False, default=date.today)
    status = Column(
        SAEnum(AdvanceStatus, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=AdvanceStatus.active.value,
    )
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    employee = relationship("Employee", foreign_keys=[employee_id])
    ledger = relationship("Ledger", foreign_keys=[ledger_id])

