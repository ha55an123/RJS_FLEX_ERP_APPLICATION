from __future__ import annotations

from datetime import date

from sqlalchemy.orm import Session

from app.models import user, otp, device, audit_log, inventory, order, invoice, purchase, outlet, attendance_payroll, production_payroll
from app.models import employee, accounting  # noqa: F401
from app.models.accounting import Ledger, LedgerType, DailyExpense, UtilityBill
from app.models.employee import Employee
from app.models.production_payroll import (
    ProductionAdvance,
    ProductionDepartment,
    ProductionEntry,
    ProductionLoan,
    ProductionPayrollItem,
    ProductionPayrollRun,
    ProductionTechnology,
    EmployeeTechnologyAssignment,
)


def seed_production_payroll_demo_data(db: Session) -> dict[str, int]:
    # Seed Employees
    employees_data = [
        {"employee_code": "EMP-1001", "full_name": "Ali Ahmed", "designation": "Operator", "department": "Cutting", "phone": "03001234567", "email": "ali@example.com", "address": "Karachi", "joining_date": date.today(), "salary": 45000.0, "status": "active", "is_active": True},
        {"employee_code": "EMP-1002", "full_name": "Fatima Bibi", "designation": "Operator", "department": "Packing", "phone": "03001234568", "email": "fatima@example.com", "address": "Lahore", "joining_date": date.today(), "salary": 42000.0, "status": "active", "is_active": True},
        {"employee_code": "EMP-1003", "full_name": "Usman Khan", "designation": "Supervisor", "department": "Production", "phone": "03001234569", "email": "usman@example.com", "address": "Islamabad", "joining_date": date.today(), "salary": 55000.0, "status": "active", "is_active": True},
        {"employee_code": "EMP-1004", "full_name": "Sara Ali", "designation": "Operator", "department": "Checking", "phone": "03001234570", "email": "sara@example.com", "address": "Karachi", "joining_date": date.today(), "salary": 40000.0, "status": "active", "is_active": True},
        {"employee_code": "EMP-1005", "full_name": "Ahmed Raza", "designation": "Operator", "department": "Bundling", "phone": "03001234571", "email": "ahmed@example.com", "address": "Faisalabad", "joining_date": date.today(), "salary": 38000.0, "status": "active", "is_active": True},
    ]
    
    employees = []
    for emp_data in employees_data:
        existing = db.query(Employee).filter(Employee.employee_code == emp_data["employee_code"]).first()
        if not existing:
            emp = Employee(**emp_data)
            db.add(emp)
            db.flush()
            employees.append(emp)
        else:
            employees.append(existing)
    
    if not employees:
        employee = Employee(
            employee_code="EMP-1001",
            full_name="Demo Employee",
            designation="Operator",
            department="Production",
            phone="03001234567",
            email="demo.employee@example.com",
            address="Demo Address",
            joining_date=date.today(),
            salary=50000.0,
            status="active",
            is_active=True,
        )
        db.add(employee)
        db.flush()
        employees.append(employee)

    # Seed Ledgers
    ledgers_data = [
        {"ledger_code": "LED-001", "ledger_name": "Cash Account", "ledger_type": LedgerType.ASSET, "description": "Main cash account", "opening_balance": 500000.0, "current_balance": 500000.0, "status": "Active"},
        {"ledger_code": "LED-002", "ledger_name": "Bank Account", "ledger_type": LedgerType.ASSET, "description": "Main bank account", "opening_balance": 2000000.0, "current_balance": 2000000.0, "status": "Active"},
        {"ledger_code": "LED-003", "ledger_name": "Production Expenses", "ledger_type": LedgerType.EXPENSE, "description": "Production related expenses", "opening_balance": 0.0, "current_balance": 0.0, "status": "Active"},
        {"ledger_code": "LED-004", "ledger_name": "Utility Bills", "ledger_type": LedgerType.EXPENSE, "description": "Electricity, gas, water bills", "opening_balance": 0.0, "current_balance": 0.0, "status": "Active"},
        {"ledger_code": "LED-005", "ledger_name": "Loan Fund", "ledger_type": LedgerType.LIABILITY, "description": "Employee loan fund", "opening_balance": 0.0, "current_balance": 0.0, "status": "Active"},
    ]
    
    ledgers = []
    for ledger_data in ledgers_data:
        existing = db.query(Ledger).filter(Ledger.ledger_code == ledger_data["ledger_code"]).first()
        if not existing:
            ledger = Ledger(**ledger_data)
            db.add(ledger)
            db.flush()
            ledgers.append(ledger)
        else:
            ledgers.append(existing)
    
    if not ledgers:
        ledger = Ledger(
            ledger_code="LEDGER-PP1",
            ledger_name="Production Payroll Ledger",
            ledger_type=LedgerType.ASSET,
            description="Demo ledger for production payroll",
            opening_balance=0.0,
            current_balance=0.0,
            status="Active",
        )
        db.add(ledger)
        db.flush()
        ledgers.append(ledger)

    # Seed Production Departments
    departments_data = [
        {"name": "Cutting", "description": "Cutting department", "status": "active"},
        {"name": "Die Cutting", "description": "Die cutting department", "status": "active"},
        {"name": "Manual Cutting", "description": "Manual cutting department", "status": "active"},
        {"name": "Press", "description": "Press department", "status": "active"},
        {"name": "Checking", "description": "Quality checking department", "status": "active"},
        {"name": "Bundling", "description": "Bundling department", "status": "active"},
        {"name": "Packing", "description": "Packing department", "status": "active"},
    ]
    
    departments = []
    for dept_data in departments_data:
        existing = db.query(ProductionDepartment).filter(ProductionDepartment.name == dept_data["name"]).first()
        if not existing:
            dept = ProductionDepartment(**dept_data)
            db.add(dept)
            db.flush()
            departments.append(dept)
        else:
            departments.append(existing)
    
    if not departments:
        department = ProductionDepartment(
            name="Packing",
            description="Packing department",
            status="active",
        )
        db.add(department)
        db.flush()
        departments.append(department)

    # Seed Production Technologies with unit prices
    technologies_data = [
        {"department_id": departments[0].id if len(departments) > 0 else 1, "name": "Cutting", "unit_rate": 15.0, "status": "active", "description": "Manual cutting operation"},
        {"department_id": departments[1].id if len(departments) > 1 else 1, "name": "Die Cutting", "unit_rate": 20.0, "status": "active", "description": "Die cutting machine operation"},
        {"department_id": departments[2].id if len(departments) > 2 else 1, "name": "Manual Cutting", "unit_rate": 12.0, "status": "active", "description": "Manual cutting by hand"},
        {"department_id": departments[3].id if len(departments) > 3 else 1, "name": "Press", "unit_rate": 18.0, "status": "active", "description": "Press machine operation"},
        {"department_id": departments[4].id if len(departments) > 4 else 1, "name": "Checking", "unit_rate": 10.0, "status": "active", "description": "Quality checking"},
        {"department_id": departments[5].id if len(departments) > 5 else 1, "name": "Bundling", "unit_rate": 8.0, "status": "active", "description": "Bundling operation"},
        {"department_id": departments[6].id if len(departments) > 6 else 1, "name": "Packing", "unit_rate": 12.0, "status": "active", "description": "Packing operation"},
    ]
    
    technologies = []
    for tech_data in technologies_data:
        existing = db.query(ProductionTechnology).filter(
            ProductionTechnology.name == tech_data["name"],
            ProductionTechnology.department_id == tech_data["department_id"]
        ).first()
        if not existing:
            tech = ProductionTechnology(**tech_data)
            db.add(tech)
            db.flush()
            technologies.append(tech)
        else:
            technologies.append(existing)
    
    if not technologies:
        technology = ProductionTechnology(
            department_id=departments[0].id if departments else 1,
            name="Packing Line",
            unit_rate=120.0,
            status="active",
            description="Packing line production technology",
        )
        db.add(technology)
        db.flush()
        technologies.append(technology)

    # Seed Employee Technology Assignments
    assignments_data = [
        {"employee_id": employees[0].id if len(employees) > 0 else 1, "technology_id": technologies[0].id if len(technologies) > 0 else 1, "assigned_date": date.today(), "status": "active", "notes": "Cutting assignment"},
        {"employee_id": employees[1].id if len(employees) > 1 else 1, "technology_id": technologies[6].id if len(technologies) > 6 else 1, "assigned_date": date.today(), "status": "active", "notes": "Packing assignment"},
        {"employee_id": employees[3].id if len(employees) > 3 else 1, "technology_id": technologies[4].id if len(technologies) > 4 else 1, "assigned_date": date.today(), "status": "active", "notes": "Checking assignment"},
        {"employee_id": employees[4].id if len(employees) > 4 else 1, "technology_id": technologies[5].id if len(technologies) > 5 else 1, "assigned_date": date.today(), "status": "active", "notes": "Bundling assignment"},
    ]
    
    for assign_data in assignments_data:
        existing = db.query(EmployeeTechnologyAssignment).filter(
            EmployeeTechnologyAssignment.employee_id == assign_data["employee_id"],
            EmployeeTechnologyAssignment.technology_id == assign_data["technology_id"]
        ).first()
        if not existing:
            assignment = EmployeeTechnologyAssignment(**assign_data)
            db.add(assignment)
            db.flush()

    # Seed Production Entries (daily production records)
    from random import randint
    entries_data = []
    for i in range(20):  # Create 20 sample production entries
        emp = employees[randint(0, len(employees) - 1)] if employees else None
        tech = technologies[randint(0, len(technologies) - 1)] if technologies else None
        if emp and tech:
            entry = ProductionEntry(
                employee_id=emp.id,
                technology_id=tech.id,
                production_date=date.today(),
                quantity=float(randint(100, 500)),
                remarks=f"Production entry {i+1}",
            )
            entries_data.append(entry)
    
    for entry in entries_data:
        existing = db.query(ProductionEntry).filter(
            ProductionEntry.employee_id == entry.employee_id,
            ProductionEntry.technology_id == entry.technology_id,
            ProductionEntry.production_date == entry.production_date
        ).first()
        if not existing:
            db.add(entry)
            db.flush()

    # Seed Production Loans
    loans_data = [
        {"employee_id": employees[0].id if len(employees) > 0 else 1, "ledger_id": ledgers[4].id if len(ledgers) > 4 else 1, "amount": 50000.0, "balance": 50000.0, "monthly_deduction": 5000.0, "issue_date": date.today(), "due_date": date.today(), "status": "active", "notes": "Emergency loan"},
        {"employee_id": employees[1].id if len(employees) > 1 else 1, "ledger_id": ledgers[4].id if len(ledgers) > 4 else 1, "amount": 30000.0, "balance": 30000.0, "monthly_deduction": 3000.0, "issue_date": date.today(), "due_date": date.today(), "status": "active", "notes": "Medical loan"},
    ]
    
    for loan_data in loans_data:
        existing = db.query(ProductionLoan).filter(
            ProductionLoan.employee_id == loan_data["employee_id"],
            ProductionLoan.ledger_id == loan_data["ledger_id"]
        ).first()
        if not existing:
            loan = ProductionLoan(**loan_data)
            db.add(loan)
            db.flush()

    # Seed Production Advances
    advances_data = [
        {"employee_id": employees[2].id if len(employees) > 2 else 1, "ledger_id": ledgers[4].id if len(ledgers) > 4 else 1, "amount": 15000.0, "balance": 15000.0, "monthly_deduction": 2500.0, "issue_date": date.today(), "status": "active", "notes": "Salary advance"},
        {"employee_id": employees[3].id if len(employees) > 3 else 1, "ledger_id": ledgers[4].id if len(ledgers) > 4 else 1, "amount": 10000.0, "balance": 10000.0, "monthly_deduction": 2000.0, "issue_date": date.today(), "status": "active", "notes": "Travel advance"},
    ]
    
    for advance_data in advances_data:
        existing = db.query(ProductionAdvance).filter(
            ProductionAdvance.employee_id == advance_data["employee_id"],
            ProductionAdvance.ledger_id == advance_data["ledger_id"]
        ).first()
        if not existing:
            advance = ProductionAdvance(**advance_data)
            db.add(advance)
            db.flush()

    # Seed Daily Expenses
    expenses_data = [
        {"expense_number": "EXP-00001", "expense_date": date.today(), "ledger_id": ledgers[2].id if len(ledgers) > 2 else 1, "category": "Tea", "amount": 500.0, "payment_method": "Cash", "vendor_name": "Canteen", "description": "Office tea", "created_by": 1},
        {"expense_number": "EXP-00002", "expense_date": date.today(), "ledger_id": ledgers[2].id if len(ledgers) > 2 else 1, "category": "Fuel", "amount": 2000.0, "payment_method": "Cash", "vendor_name": "Petrol Station", "description": "Vehicle fuel", "created_by": 1},
        {"expense_number": "EXP-00003", "expense_date": date.today(), "ledger_id": ledgers[2].id if len(ledgers) > 2 else 1, "category": "Office Expense", "amount": 1500.0, "payment_method": "Cash", "vendor_name": "Stationery Shop", "description": "Office supplies", "created_by": 1},
        {"expense_number": "EXP-00004", "expense_date": date.today(), "ledger_id": ledgers[2].id if len(ledgers) > 2 else 1, "category": "Transport", "amount": 3000.0, "payment_method": "Cash", "vendor_name": "Transport Service", "description": "Goods transport", "created_by": 1},
        {"expense_number": "EXP-00005", "expense_date": date.today(), "ledger_id": ledgers[2].id if len(ledgers) > 2 else 1, "category": "Internet", "amount": 1000.0, "payment_method": "Bank Transfer", "vendor_name": "ISP", "description": "Monthly internet", "created_by": 1},
    ]
    
    for exp_data in expenses_data:
        existing = db.query(DailyExpense).filter(DailyExpense.expense_number == exp_data["expense_number"]).first()
        if not existing:
            expense = DailyExpense(**exp_data)
            db.add(expense)
            db.flush()

    # Seed Utility Bills
    utility_bills_data = [
        {"bill_number": "UTIL-00001", "utility_type": "Electricity", "ledger_id": ledgers[3].id if len(ledgers) > 3 else 1, "billing_month": date.today().month, "billing_year": date.today().year, "due_date": date.today(), "amount": 15000.0, "late_fee": 0.0, "status": "Pending", "created_by": 1},
        {"bill_number": "UTIL-00002", "utility_type": "Gas", "ledger_id": ledgers[3].id if len(ledgers) > 3 else 1, "billing_month": date.today().month, "billing_year": date.today().year, "due_date": date.today(), "amount": 8000.0, "late_fee": 0.0, "status": "Pending", "created_by": 1},
        {"bill_number": "UTIL-00003", "utility_type": "Water", "ledger_id": ledgers[3].id if len(ledgers) > 3 else 1, "billing_month": date.today().month, "billing_year": date.today().year, "due_date": date.today(), "amount": 2000.0, "late_fee": 0.0, "status": "Pending", "created_by": 1},
        {"bill_number": "UTIL-00004", "utility_type": "Internet", "ledger_id": ledgers[3].id if len(ledgers) > 3 else 1, "billing_month": date.today().month, "billing_year": date.today().year, "due_date": date.today(), "amount": 3000.0, "late_fee": 0.0, "status": "Pending", "created_by": 1},
        {"bill_number": "UTIL-00005", "utility_type": "Telephone", "ledger_id": ledgers[3].id if len(ledgers) > 3 else 1, "billing_month": date.today().month, "billing_year": date.today().year, "due_date": date.today(), "amount": 1500.0, "late_fee": 0.0, "status": "Pending", "created_by": 1},
    ]
    
    for bill_data in utility_bills_data:
        existing = db.query(UtilityBill).filter(UtilityBill.bill_number == bill_data["bill_number"]).first()
        if not existing:
            bill = UtilityBill(**bill_data)
            db.add(bill)
            db.flush()

    db.commit()
    return {
        "employees": db.query(Employee).count(),
        "departments": db.query(ProductionDepartment).count(),
        "technologies": db.query(ProductionTechnology).count(),
        "assignments": db.query(EmployeeTechnologyAssignment).count(),
        "entries": db.query(ProductionEntry).count(),
        "loans": db.query(ProductionLoan).count(),
        "advances": db.query(ProductionAdvance).count(),
        "ledgers": db.query(Ledger).count(),
        "expenses": db.query(DailyExpense).count(),
        "utility_bills": db.query(UtilityBill).count(),
    }
