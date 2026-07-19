from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from datetime import date


class ProductionDepartmentCreate(BaseModel):
    name: str
    description: Optional[str] = None
    status: Literal["active", "inactive"] = "active"


class ProductionDepartmentUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[Literal["active", "inactive"]] = None


class ProductionDepartmentOut(BaseModel):
    id: int
    name: str
    description: Optional[str]
    status: str
    created_at: str
    updated_at: Optional[str] = None


class ProductionTechnologyCreate(BaseModel):
    department_id: int
    name: str
    unit_rate: float = Field(gt=0)
    status: Literal["active", "inactive"] = "active"
    description: Optional[str] = None


class ProductionTechnologyUpdate(BaseModel):
    department_id: Optional[int] = None
    name: Optional[str] = None
    unit_rate: Optional[float] = Field(default=None, gt=0)
    status: Optional[Literal["active", "inactive"]] = None
    description: Optional[str] = None


class ProductionTechnologyOut(BaseModel):
    id: int
    department_id: int
    name: str
    unit_rate: float
    status: str
    description: Optional[str]
    created_at: str
    updated_at: Optional[str] = None


class EmployeeTechnologyAssignmentCreate(BaseModel):
    employee_id: int
    technology_id: int
    assigned_date: Optional[date] = None
    status: Literal["active", "inactive"] = "active"
    notes: Optional[str] = None


class EmployeeTechnologyAssignmentUpdate(BaseModel):
    employee_id: Optional[int] = None
    technology_id: Optional[int] = None
    assigned_date: Optional[date] = None
    status: Optional[Literal["active", "inactive"]] = None
    notes: Optional[str] = None


class EmployeeTechnologyAssignmentOut(BaseModel):
    id: int
    employee_id: int
    technology_id: int
    assigned_date: date
    status: str
    notes: Optional[str]
    created_at: str


class ProductionEntryCreate(BaseModel):
    employee_id: int
    technology_id: int
    production_date: date
    quantity: float = Field(gt=0)
    remarks: Optional[str] = None


class ProductionEntryUpdate(BaseModel):
    employee_id: Optional[int] = None
    technology_id: Optional[int] = None
    production_date: Optional[date] = None
    quantity: Optional[float] = Field(default=None, gt=0)
    remarks: Optional[str] = None


class ProductionEntryOut(BaseModel):
    id: int
    employee_id: int
    technology_id: int
    technology_name: str
    department_id: int
    unit_rate: float
    production_date: date
    quantity: float
    remarks: Optional[str]
    created_at: str


class ProductionPayrollRunCreate(BaseModel):
    period_year: int
    period_month: int
    bonus: float = 0.0
    deductions: float = 0.0


class ProductionLoanCreate(BaseModel):
    employee_id: int
    ledger_id: int
    amount: float
    monthly_deduction: float
    issue_date: Optional[date] = None
    due_date: Optional[date] = None
    notes: Optional[str] = None


class ProductionLoanOut(BaseModel):
    id: int
    employee_id: int
    ledger_id: int
    amount: float
    balance: float
    monthly_deduction: float
    issue_date: date
    due_date: Optional[date]
    status: str
    notes: Optional[str]
    created_at: str

    class Config:
        from_attributes = True


class ProductionAdvanceCreate(BaseModel):
    employee_id: int
    ledger_id: int
    amount: float
    monthly_deduction: float
    issue_date: Optional[date] = None
    notes: Optional[str] = None


class ProductionAdvanceOut(BaseModel):
    id: int
    employee_id: int
    ledger_id: int
    amount: float
    balance: float
    monthly_deduction: float
    issue_date: date
    status: str
    notes: Optional[str]
    created_at: str

    class Config:
        from_attributes = True


class ProductionPayrollItemResult(BaseModel):
    employee_id: int
    employee_name: Optional[str] = None
    total_quantity: float
    total_amount: float
    production_salary: float
    bonus: float
    deductions: float
    loan_deduction: float
    advance_deduction: float
    net_pay: float


class ProductionPayrollRunResult(BaseModel):
    id: int
    period_year: int
    period_month: int
    bonus: float
    deductions: float
    status: str
    items: List[ProductionPayrollItemResult]
