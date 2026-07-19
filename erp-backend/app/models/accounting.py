from sqlalchemy import Column, Integer, Float, String, ForeignKey, DateTime, Date, Boolean, Text, Enum as SAEnum
from sqlalchemy.orm import relationship
from app.core.database import Base
from datetime import datetime
import enum

# Avoid SQLAlchemy relationship() mapper errors by ensuring User is importable.
from app.models.user import User



class LedgerType(str, enum.Enum):
    ASSET = "Asset"
    LIABILITY = "Liability"
    INCOME = "Income"
    EXPENSE = "Expense"
    EQUITY = "Equity"


class Ledger(Base):
    __tablename__ = "ledgers"

    id = Column(Integer, primary_key=True, index=True)
    ledger_code = Column(String, unique=True, index=True, nullable=False)
    ledger_name = Column(String, unique=True, nullable=False)
    ledger_type = Column(SAEnum(LedgerType, values_callable=lambda x: [e.value for e in x]), nullable=False)
    description = Column(Text, nullable=True)
    opening_balance = Column(Float, default=0.0)
    current_balance = Column(Float, default=0.0)
    status = Column(String, default="Active")  # Active / Inactive
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    expenses = relationship("DailyExpense", back_populates="ledger")
    utility_bills = relationship("UtilityBill", back_populates="ledger")
    entries = relationship("LedgerEntry", back_populates="ledger")


class LedgerEntry(Base):
    __tablename__ = "ledger_entries"

    id = Column(Integer, primary_key=True, index=True)
    ledger_id = Column(Integer, ForeignKey("ledgers.id"), nullable=False, index=True)
    transaction_date = Column(DateTime, default=datetime.utcnow)
    amount = Column(Float, nullable=False)
    entry_type = Column(String, nullable=False)  # debit | credit
    description = Column(Text, nullable=True)
    reference_type = Column(String, nullable=True)
    reference_id = Column(Integer, nullable=True)

    ledger = relationship("Ledger", back_populates="entries")


class DailyExpense(Base):
    __tablename__ = "daily_expenses"

    id = Column(Integer, primary_key=True, index=True)
    expense_number = Column(String, unique=True, index=True, nullable=False)
    expense_date = Column(Date, nullable=False)
    ledger_id = Column(Integer, ForeignKey("ledgers.id"), nullable=False)
    category = Column(String, nullable=False)
    amount = Column(Float, nullable=False)
    payment_method = Column(String, nullable=False)  # Cash/Bank/Cheque/Online Transfer
    vendor_name = Column(String, nullable=True)
    invoice_number = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    attachment = Column(String, nullable=True)  # file path
    approved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    ledger = relationship("Ledger", back_populates="expenses")
    creator = relationship("User", foreign_keys=[created_by])


class UtilityBill(Base):
    __tablename__ = "utility_bills"

    id = Column(Integer, primary_key=True, index=True)
    bill_number = Column(String, unique=True, index=True, nullable=False)
    utility_type = Column(String, nullable=False)
    ledger_id = Column(Integer, ForeignKey("ledgers.id"), nullable=False)
    billing_month = Column(Integer, nullable=False)
    billing_year = Column(Integer, nullable=False)
    due_date = Column(Date, nullable=False)
    payment_date = Column(Date, nullable=True)
    amount = Column(Float, nullable=False)
    late_fee = Column(Float, default=0.0)
    status = Column(String, default="Pending")  # Pending/Paid/Overdue/Cancelled
    receipt = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    ledger = relationship("Ledger", back_populates="utility_bills")
    creator = relationship("User", foreign_keys=[created_by])


class PurchaseRequest(Base):
    __tablename__ = "purchase_requests"

    id = Column(Integer, primary_key=True, index=True)
    request_number = Column(String, unique=True, index=True, nullable=False)
    employee_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    department = Column(String, nullable=True)
    request_date = Column(Date, nullable=False)
    required_date = Column(Date, nullable=True)
    priority = Column(String, default="Medium")  # Low/Medium/High/Urgent
    status = Column(String, default="Pending")   # Pending/Manager Approved/Admin Approved/Rejected/Purchased/Cancelled
    item_name = Column(String, nullable=False)
    quantity = Column(Integer, nullable=False)
    estimated_price = Column(Float, nullable=True)
    vendor = Column(String, nullable=True)
    reason = Column(Text, nullable=True)
    remarks = Column(Text, nullable=True)
    attachment = Column(String, nullable=True)
    manager_comments = Column(Text, nullable=True)
    admin_comments = Column(Text, nullable=True)
    approved_date = Column(Date, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    employee = relationship("User", foreign_keys=[employee_id])
