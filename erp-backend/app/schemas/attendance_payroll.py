from pydantic import BaseModel, Field
from typing import Literal, List
from datetime import date


AttendanceStatus = Literal["present", "absent", "half_day", "leave"]


class AttendanceUpsert(BaseModel):
    employee_id: int
    work_date: date
    status: AttendanceStatus = "present"
    overtime_hours: float = 0


class PayrollRunCreate(BaseModel):
    period_year: int
    period_month: int
    month_plan: Literal["24", "30"] = "30"
    overtime_rate_type: Literal["single", "double"] = "single"
    overtime_block_hours: float = Field(default=1.5, gt=0)


class PayrollItemResult(BaseModel):
    employee_id: int
    base_salary: float
    absent_days: int
    half_days: int = 0
    absent_deduction: float
    overtime_hours_total: float
    overtime_blocks: float
    overtime_multiplier: float
    overtime_pay: float
    final_salary: float


class PayrollRunResult(BaseModel):
    id: int
    period_year: int
    period_month: int
    month_plan: str
    overtime_rate_type: str
    status: str
    items: List[PayrollItemResult]
