from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.core.auth_dependencies import get_current_user, require_role
from app.models.order import Order, OrderItem
from app.models.inventory import InventoryItem
from app.models.production_payroll import ProductionEntry, ProductionLoan, ProductionAdvance, ProductionPayrollRun
from app.models.employee import Employee
from app.models.accounting import DailyExpense, UtilityBill

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/revenue")
def get_revenue(
    db: Session = Depends(get_db),
    user=Depends(require_role(["admin", "company_manager"]))
):
    total = db.query(func.sum(Order.total_amount)).filter(Order.status == "confirmed").scalar() or 0
    return {"total_revenue": total}


@router.get("/orders-summary")
def orders_summary(
    db: Session = Depends(get_db),
    user=Depends(require_role(["admin", "company_manager"]))
):
    total = db.query(func.count(Order.id)).scalar() or 0
    confirmed = db.query(func.count(Order.id)).filter(Order.status == "confirmed").scalar() or 0
    pending = db.query(func.count(Order.id)).filter(Order.status == "pending").scalar() or 0
    return {"total": total, "confirmed": confirmed, "pending": pending}


@router.get("/inventory")
def inventory_status(
    db: Session = Depends(get_db),
    user=Depends(require_role(["admin", "company_manager"]))
):
    items = db.query(InventoryItem).all()
    return {"items": [{"sku": i.sku, "name": i.name, "quantity": i.quantity} for i in items]}


@router.get("/overview")
def dashboard_overview(
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    total_revenue = db.query(func.sum(Order.total_amount)).filter(Order.status == "confirmed").scalar() or 0
    total_orders = db.query(func.count(Order.id)).scalar() or 0
    
    # Production metrics
    total_employees = db.query(func.count(Employee.id)).scalar() or 0
    active_employees = db.query(func.count(Employee.id)).filter(Employee.is_active == True).scalar() or 0
    total_production_entries = db.query(func.count(ProductionEntry.id)).scalar() or 0
    total_loans = db.query(func.count(ProductionLoan.id)).filter(ProductionLoan.status == "active").scalar() or 0
    total_advances = db.query(func.count(ProductionAdvance.id)).filter(ProductionAdvance.status == "active").scalar() or 0
    
    # Accounting metrics
    total_expenses = db.query(func.sum(DailyExpense.amount)).scalar() or 0
    pending_bills = db.query(func.count(UtilityBill.id)).filter(UtilityBill.status == "Pending").scalar() or 0
    
    return {
        "total_revenue": total_revenue,
        "total_orders": total_orders,
        "total_employees": total_employees,
        "active_employees": active_employees,
        "total_production_entries": total_production_entries,
        "total_loans": total_loans,
        "total_advances": total_advances,
        "total_expenses": total_expenses,
        "pending_bills": pending_bills
    }


@router.get("/production-metrics")
def production_metrics(
    db: Session = Depends(get_db),
    user=Depends(require_role(["admin", "company_manager"]))
):
    # Get current month production
    from datetime import date
    current_month = date.today().month
    current_year = date.today().year
    
    monthly_entries = db.query(func.count(ProductionEntry.id)).filter(
        func.extract('month', ProductionEntry.production_date) == current_month,
        func.extract('year', ProductionEntry.production_date) == current_year
    ).scalar() or 0
    
    monthly_quantity = db.query(func.sum(ProductionEntry.quantity)).filter(
        func.extract('month', ProductionEntry.production_date) == current_month,
        func.extract('year', ProductionEntry.production_date) == current_year
    ).scalar() or 0
    
    total_loans_balance = db.query(func.sum(ProductionLoan.balance)).filter(ProductionLoan.status == "active").scalar() or 0
    total_advances_balance = db.query(func.sum(ProductionAdvance.balance)).filter(ProductionAdvance.status == "active").scalar() or 0
    
    return {
        "monthly_entries": monthly_entries,
        "monthly_quantity": monthly_quantity,
        "total_loans_balance": total_loans_balance,
        "total_advances_balance": total_advances_balance
    }


@router.get("/accounting-metrics")
def accounting_metrics(
    db: Session = Depends(get_db),
    user=Depends(require_role(["admin", "company_manager"]))
):
    from datetime import date
    current_month = date.today().month
    current_year = date.today().year
    
    monthly_expenses = db.query(func.sum(DailyExpense.amount)).filter(
        func.extract('month', DailyExpense.expense_date) == current_month,
        func.extract('year', DailyExpense.expense_date) == current_year
    ).scalar() or 0
    
    pending_bills_amount = db.query(func.sum(UtilityBill.amount)).filter(UtilityBill.status == "Pending").scalar() or 0
    overdue_bills = db.query(func.count(UtilityBill.id)).filter(
        UtilityBill.status == "Pending",
        UtilityBill.due_date < date.today()
    ).scalar() or 0
    
    return {
        "monthly_expenses": monthly_expenses,
        "pending_bills_amount": pending_bills_amount,
        "overdue_bills": overdue_bills
    }
