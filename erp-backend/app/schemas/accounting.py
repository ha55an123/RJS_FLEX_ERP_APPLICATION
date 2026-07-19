from pydantic import BaseModel, field_validator
from typing import Optional, List
from datetime import date, datetime
from app.models.accounting import LedgerType


# ─── Ledger ───────────────────────────────────────────────
class LedgerCreate(BaseModel):
    ledger_name: str
    ledger_type: LedgerType
    description: Optional[str] = None
    opening_balance: float = 0.0
    status: str = "Active"

    @field_validator("opening_balance")
    @classmethod
    def balance_not_negative(cls, v):
        if v < 0:
            raise ValueError("Opening balance cannot be negative")
        return v


class LedgerUpdate(BaseModel):
    ledger_name: Optional[str] = None
    ledger_type: Optional[LedgerType] = None
    description: Optional[str] = None
    opening_balance: Optional[float] = None
    status: Optional[str] = None


class LedgerOut(BaseModel):
    id: int
    ledger_code: str
    ledger_name: str
    ledger_type: LedgerType
    description: Optional[str]
    opening_balance: float
    current_balance: float
    status: str
    created_by: Optional[int]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class LedgerEntryCreate(BaseModel):
    ledger_id: int
    amount: float
    entry_type: str
    description: Optional[str] = None
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None


class LedgerEntryOut(BaseModel):
    id: int
    ledger_id: int
    transaction_date: datetime
    amount: float
    entry_type: str
    description: Optional[str]
    reference_type: Optional[str]
    reference_id: Optional[int]

    class Config:
        from_attributes = True


# ─── Daily Expense ────────────────────────────────────────
class ExpenseCreate(BaseModel):
    expense_date: date
    ledger_id: int
    category: str
    amount: float
    payment_method: str
    vendor_name: Optional[str] = None
    invoice_number: Optional[str] = None
    description: Optional[str] = None


class ExpenseUpdate(BaseModel):
    expense_date: Optional[date] = None
    ledger_id: Optional[int] = None
    category: Optional[str] = None
    amount: Optional[float] = None
    payment_method: Optional[str] = None
    vendor_name: Optional[str] = None
    invoice_number: Optional[str] = None
    description: Optional[str] = None


class ExpenseOut(BaseModel):
    id: int
    expense_number: str
    expense_date: date
    ledger_id: int
    ledger_name: Optional[str] = None
    category: str
    amount: float
    payment_method: str
    vendor_name: Optional[str]
    invoice_number: Optional[str]
    description: Optional[str]
    attachment: Optional[str]
    approved_by: Optional[int]
    created_by: int
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Utility Bill ─────────────────────────────────────────
class UtilityBillCreate(BaseModel):
    utility_type: str
    ledger_id: int
    billing_month: int
    billing_year: int
    due_date: date
    amount: float
    late_fee: float = 0.0
    notes: Optional[str] = None


class UtilityBillUpdate(BaseModel):
    utility_type: Optional[str] = None
    ledger_id: Optional[int] = None
    billing_month: Optional[int] = None
    billing_year: Optional[int] = None
    due_date: Optional[date] = None
    payment_date: Optional[date] = None
    amount: Optional[float] = None
    late_fee: Optional[float] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class UtilityBillOut(BaseModel):
    id: int
    bill_number: str
    utility_type: str
    ledger_id: int
    ledger_name: Optional[str] = None
    billing_month: int
    billing_year: int
    due_date: date
    payment_date: Optional[date]
    amount: float
    late_fee: float
    status: str
    receipt: Optional[str]
    notes: Optional[str]
    created_by: int
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Purchase Request ─────────────────────────────────────
class PurchaseRequestCreate(BaseModel):
    department: Optional[str] = None
    request_date: date
    required_date: Optional[date] = None
    priority: str = "Medium"
    item_name: str
    quantity: int
    estimated_price: Optional[float] = None
    vendor: Optional[str] = None
    reason: Optional[str] = None
    remarks: Optional[str] = None


class PurchaseRequestUpdate(BaseModel):
    department: Optional[str] = None
    required_date: Optional[date] = None
    priority: Optional[str] = None
    item_name: Optional[str] = None
    quantity: Optional[int] = None
    estimated_price: Optional[float] = None
    vendor: Optional[str] = None
    reason: Optional[str] = None
    remarks: Optional[str] = None


class PurchaseRequestAction(BaseModel):
    comments: Optional[str] = None


class PurchaseRequestOut(BaseModel):
    id: int
    request_number: str
    employee_id: int
    department: Optional[str]
    request_date: date
    required_date: Optional[date]
    priority: str
    status: str
    item_name: str
    quantity: int
    estimated_price: Optional[float]
    vendor: Optional[str]
    reason: Optional[str]
    remarks: Optional[str]
    attachment: Optional[str]
    manager_comments: Optional[str]
    admin_comments: Optional[str]
    approved_date: Optional[date]
    created_at: datetime

    class Config:
        from_attributes = True
