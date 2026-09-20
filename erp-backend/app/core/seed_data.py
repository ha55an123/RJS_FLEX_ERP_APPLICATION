from __future__ import annotations

from datetime import date, timedelta

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

# Gym models
from app.models.branch import Branch
from app.models.gym_member import GymMember, MemberStatus, Gender
from app.models.gym_staff import GymStaff, StaffRole, StaffStatus
from app.models.membership import MembershipPlan, MembershipSubscription, PlanDuration, SubscriptionStatus
from app.models.gym_attendance import GymAttendance, CheckInMethod, AttendanceStatus
from app.models.gym_payment import GymPayment
from app.models.gym_equipment import GymEquipment, EquipmentStatus
from app.models.gym_inventory import GymInventoryItem
from app.models.workout import Exercise, WorkoutPlan, MuscleGroup, DifficultyLevel
from app.models.diet import DietPlan


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


def seed_gym_demo_data(db: Session) -> dict[str, int]:
    """Seed gym-specific demo data"""
    
    # Seed Branches
    branches_data = [
        {"name": "Main Branch", "code": "BR-001", "address": "123 Main Street, Karachi", "city": "Karachi", "phone": "021-1234567", "email": "main@gym.com", "opening_time": "06:00", "closing_time": "23:00", "capacity": 200, "is_active": True},
        {"name": "Downtown Branch", "code": "BR-002", "address": "456 Downtown Ave, Lahore", "city": "Lahore", "phone": "042-7654321", "email": "downtown@gym.com", "opening_time": "05:30", "closing_time": "22:00", "capacity": 150, "is_active": True},
    ]
    
    branches = []
    for branch_data in branches_data:
        existing = db.query(Branch).filter(Branch.code == branch_data["code"]).first()
        if not existing:
            branch = Branch(**branch_data)
            db.add(branch)
            db.flush()
            branches.append(branch)
        else:
            branches.append(existing)
    
    if not branches:
        branch = Branch(
            name="Main Branch",
            code="BR-001",
            address="123 Main Street",
            city="Karachi",
            phone="021-1234567",
            opening_time="06:00",
            closing_time="23:00",
            capacity=200,
            is_active=True
        )
        db.add(branch)
        db.flush()
        branches.append(branch)
    
    # Seed Gym Staff (Trainers)
    staff_data = [
        {"staff_code": "STF-001", "branch_id": branches[0].id, "first_name": "John", "last_name": "Smith", "gender": Gender.MALE.value, "phone": "0300-1111111", "email": "john@gym.com", "role": StaffRole.TRAINER.value, "specialization": "Strength Training", "experience_years": 5, "salary": 60000.0, "status": StaffStatus.ACTIVE.value, "is_active": True},
        {"staff_code": "STF-002", "branch_id": branches[0].id, "first_name": "Sarah", "last_name": "Johnson", "gender": Gender.FEMALE.value, "phone": "0300-2222222", "email": "sarah@gym.com", "role": StaffRole.TRAINER.value, "specialization": "Cardio & HIIT", "experience_years": 3, "salary": 55000.0, "status": StaffStatus.ACTIVE.value, "is_active": True},
        {"staff_code": "STF-003", "branch_id": branches[0].id, "first_name": "Mike", "last_name": "Wilson", "gender": Gender.MALE.value, "phone": "0300-3333333", "email": "mike@gym.com", "role": StaffRole.RECEPTIONIST.value, "status": StaffStatus.ACTIVE.value, "is_active": True},
        {"staff_code": "STF-004", "branch_id": branches[1].id if len(branches) > 1 else branches[0].id, "first_name": "Emily", "last_name": "Davis", "gender": Gender.FEMALE.value, "phone": "0300-4444444", "email": "emily@gym.com", "role": StaffRole.TRAINER.value, "specialization": "Yoga & Pilates", "experience_years": 4, "salary": 58000.0, "status": StaffStatus.ACTIVE.value, "is_active": True},
    ]
    
    staff = []
    for staff_info in staff_data:
        existing = db.query(GymStaff).filter(GymStaff.staff_code == staff_info["staff_code"]).first()
        if not existing:
            s = GymStaff(**staff_info)
            db.add(s)
            db.flush()
            staff.append(s)
        else:
            staff.append(existing)
    
    # Seed Membership Plans
    plans_data = [
        {"name": "Daily Pass", "description": "Single day access", "duration_type": PlanDuration.DAILY.value, "duration_days": 1, "price": 500.0, "joining_fee": 0.0, "is_active": True},
        {"name": "Weekly Pass", "description": "7 days access", "duration_type": PlanDuration.WEEKLY.value, "duration_days": 7, "price": 2500.0, "joining_fee": 0.0, "is_active": True},
        {"name": "Monthly Silver", "description": "1 month standard access", "duration_type": PlanDuration.MONTHLY.value, "duration_days": 30, "price": 5000.0, "joining_fee": 1000.0, "is_active": True},
        {"name": "Monthly Gold", "description": "1 month premium access with trainer", "duration_type": PlanDuration.MONTHLY.value, "duration_days": 30, "price": 8000.0, "joining_fee": 1500.0, "is_active": True},
        {"name": "Quarterly", "description": "3 months access", "duration_type": PlanDuration.QUARTERLY.value, "duration_days": 90, "price": 12000.0, "joining_fee": 1000.0, "is_active": True},
        {"name": "Annual Platinum", "description": "12 months all-inclusive", "duration_type": PlanDuration.ANNUAL.value, "duration_days": 365, "price": 40000.0, "joining_fee": 2000.0, "is_active": True},
    ]
    
    plans = []
    for plan_data in plans_data:
        existing = db.query(MembershipPlan).filter(MembershipPlan.name == plan_data["name"]).first()
        if not existing:
            plan = MembershipPlan(**plan_data)
            db.add(plan)
            db.flush()
            plans.append(plan)
        else:
            plans.append(existing)
    
    # Seed Gym Members
    members_data = [
        {"member_code": "MEM-001", "branch_id": branches[0].id, "first_name": "Ahmed", "last_name": "Khan", "gender": Gender.MALE.value, "phone": "0300-5555555", "email": "ahmed@example.com", "address": "Karachi", "status": MemberStatus.ACTIVE.value, "joining_date": date.today() - timedelta(days=60), "assigned_trainer_id": staff[0].id if staff else None},
        {"member_code": "MEM-002", "branch_id": branches[0].id, "first_name": "Fatima", "last_name": "Zahra", "gender": Gender.FEMALE.value, "phone": "0300-6666666", "email": "fatima@example.com", "address": "Karachi", "status": MemberStatus.ACTIVE.value, "joining_date": date.today() - timedelta(days=30), "assigned_trainer_id": staff[1].id if len(staff) > 1 else None},
        {"member_code": "MEM-003", "branch_id": branches[0].id, "first_name": "Usman", "last_name": "Ali", "gender": Gender.MALE.value, "phone": "0300-7777777", "email": "usman@example.com", "address": "Lahore", "status": MemberStatus.ACTIVE.value, "joining_date": date.today() - timedelta(days=90), "assigned_trainer_id": staff[0].id if staff else None},
        {"member_code": "MEM-004", "branch_id": branches[1].id if len(branches) > 1 else branches[0].id, "first_name": "Ayesha", "last_name": "Hassan", "gender": Gender.FEMALE.value, "phone": "0300-8888888", "email": "ayesha@example.com", "address": "Lahore", "status": MemberStatus.EXPIRED.value, "joining_date": date.today() - timedelta(days=120)},
        {"member_code": "MEM-005", "branch_id": branches[0].id, "first_name": "Bilal", "last_name": "Ahmed", "gender": Gender.MALE.value, "phone": "0300-9999999", "email": "bilal@example.com", "address": "Karachi", "status": MemberStatus.ACTIVE.value, "joining_date": date.today() - timedelta(days=15), "assigned_trainer_id": staff[1].id if len(staff) > 1 else None},
    ]
    
    members = []
    for member_data in members_data:
        existing = db.query(GymMember).filter(GymMember.member_code == member_data["member_code"]).first()
        if not existing:
            member = GymMember(**member_data)
            db.add(member)
            db.flush()
            members.append(member)
        else:
            members.append(existing)
    
    # Seed Membership Subscriptions
    subscriptions_data = []
    for i, member in enumerate(members):
        plan = plans[i % len(plans)]
        start_date = date.today() - timedelta(days=30)
        end_date = start_date + timedelta(days=plan.duration_days or 30)
        
        sub_data = {
            "member_id": member.id,
            "plan_id": plan.id,
            "branch_id": member.branch_id,
            "start_date": start_date,
            "end_date": end_date,
            "price_paid": plan.price,
            "tax_amount": plan.price * (plan.tax_percent or 0) / 100,
            "joining_fee_paid": plan.joining_fee,
            "discount_amount": 0.0,
            "total_amount": plan.price + plan.joining_fee,
            "payment_method": "Cash",
            "payment_status": "paid",
            "status": SubscriptionStatus.ACTIVE.value if end_date >= date.today() else SubscriptionStatus.EXPIRED.value,
        }
        subscriptions_data.append(sub_data)
    
    for sub_data in subscriptions_data:
        existing = db.query(MembershipSubscription).filter(
            MembershipSubscription.member_id == sub_data["member_id"],
            MembershipSubscription.plan_id == sub_data["plan_id"]
        ).first()
        if not existing:
            subscription = MembershipSubscription(**sub_data)
            db.add(subscription)
            db.flush()
    
    # Seed Gym Attendance
    attendance_data = []
    for i in range(10):  # Create 10 attendance records
        member = members[i % len(members)]
        attendance = GymAttendance(
            member_id=member.id,
            branch_id=member.branch_id,
            attendance_date=date.today() - timedelta(days=i),
            check_in_time=date.today() - timedelta(days=i),
            method=CheckInMethod.MANUAL.value,
            status=AttendanceStatus.CHECKED_OUT.value,
        )
        attendance_data.append(attendance)
    
    for attendance in attendance_data:
        existing = db.query(GymAttendance).filter(
            GymAttendance.member_id == attendance.member_id,
            GymAttendance.attendance_date == attendance.attendance_date
        ).first()
        if not existing:
            db.add(attendance)
            db.flush()
    
    # Seed Gym Payments
    payments_data = []
    for i, member in enumerate(members):
        payment = GymPayment(
            payment_number=f"PAY-{1001 + i}",
            member_id=member.id,
            branch_id=member.branch_id,
            amount=5000.0,
            discount_amount=0.0,
            tax_amount=0.0,
            total_amount=5000.0,
            paid_amount=5000.0,
            remaining_amount=0.0,
            payment_method="Cash",
            payment_date=date.today() - timedelta(days=i * 5),
            status="paid"
        )
        payments_data.append(payment)
    
    for payment in payments_data:
        existing = db.query(GymPayment).filter(GymPayment.payment_number == payment.payment_number).first()
        if not existing:
            db.add(payment)
            db.flush()
    
    # Seed Gym Equipment
    equipment_data = [
        {"branch_id": branches[0].id, "name": "Treadmill Pro", "brand": "NordicTrack", "model": "T 6.5 S", "category": "cardio", "purchase_price": 150000.0, "status": EquipmentStatus.OPERATIONAL.value},
        {"branch_id": branches[0].id, "name": "Leg Press Machine", "brand": "Hammer Strength", "model": "Leg Press", "category": "strength", "purchase_price": 200000.0, "status": EquipmentStatus.OPERATIONAL.value},
        {"branch_id": branches[0].id, "name": "Olympic Barbell Set", "brand": "Rogue Fitness", "model": "Ohio Bar", "category": "free_weights", "purchase_price": 80000.0, "status": EquipmentStatus.OPERATIONAL.value},
        {"branch_id": branches[0].id, "name": "Cable Crossover", "brand": "Life Fitness", "model": "Pro Series", "category": "strength", "purchase_price": 250000.0, "status": EquipmentStatus.MAINTENANCE.value},
        {"branch_id": branches[1].id if len(branches) > 1 else branches[0].id, "name": "Elliptical Trainer", "brand": "Precor", "model": "EFX 835", "category": "cardio", "purchase_price": 180000.0, "status": EquipmentStatus.OPERATIONAL.value},
    ]
    
    for eq_data in equipment_data:
        existing = db.query(GymEquipment).filter(
            GymEquipment.name == eq_data["name"],
            GymEquipment.branch_id == eq_data["branch_id"]
        ).first()
        if not existing:
            equipment = GymEquipment(**eq_data)
            db.add(equipment)
            db.flush()
    
    # Seed Gym Inventory
    inventory_data = [
        {"item_code": "INV-001", "branch_id": branches[0].id, "category": "Supplements", "name": "Whey Protein", "brand": "Optimum Nutrition", "unit": "kg", "quantity": 50.0, "minimum_stock": 10.0, "unit_price": 8500.0},
        {"item_code": "INV-002", "branch_id": branches[0].id, "category": "Supplements", "name": "BCAA Powder", "brand": "XTEND", "unit": "kg", "quantity": 30.0, "minimum_stock": 5.0, "unit_price": 6500.0},
        {"item_code": "INV-003", "branch_id": branches[0].id, "category": "Beverages", "name": "Energy Drink", "brand": "Red Bull", "unit": "can", "quantity": 100.0, "minimum_stock": 20.0, "unit_price": 250.0},
        {"item_code": "INV-004", "branch_id": branches[0].id, "category": "Accessories", "name": "Gym Towel", "brand": "Generic", "unit": "piece", "quantity": 200.0, "minimum_stock": 50.0, "unit_price": 500.0},
    ]
    
    for inv_data in inventory_data:
        existing = db.query(GymInventoryItem).filter(GymInventoryItem.item_code == inv_data["item_code"]).first()
        if not existing:
            item = GymInventoryItem(**inv_data)
            db.add(item)
            db.flush()
    
    # Seed Exercises
    exercises_data = [
        {"name": "Bench Press", "muscle_group": MuscleGroup.CHEST.value, "difficulty": DifficultyLevel.INTERMEDIATE.value, "equipment_needed": "Barbell, Bench"},
        {"name": "Squat", "muscle_group": MuscleGroup.LEGS.value, "difficulty": DifficultyLevel.INTERMEDIATE.value, "equipment_needed": "Barbell, Rack"},
        {"name": "Deadlift", "muscle_group": MuscleGroup.BACK.value, "difficulty": DifficultyLevel.ADVANCED.value, "equipment_needed": "Barbell"},
        {"name": "Pull-up", "muscle_group": MuscleGroup.BACK.value, "difficulty": DifficultyLevel.INTERMEDIATE.value, "equipment_needed": "Pull-up bar"},
        {"name": "Shoulder Press", "muscle_group": MuscleGroup.SHOULDERS.value, "difficulty": DifficultyLevel.BEGINNER.value, "equipment_needed": "Dumbbells"},
        {"name": "Bicep Curl", "muscle_group": MuscleGroup.BICEPS.value, "difficulty": DifficultyLevel.BEGINNER.value, "equipment_needed": "Dumbbells"},
        {"name": "Tricep Dip", "muscle_group": MuscleGroup.TRICEPS.value, "difficulty": DifficultyLevel.BEGINNER.value, "equipment_needed": "Parallel bars"},
        {"name": "Plank", "muscle_group": MuscleGroup.CORE.value, "difficulty": DifficultyLevel.BEGINNER.value, "equipment_needed": "None"},
        {"name": "Running", "muscle_group": MuscleGroup.CARDIO.value, "difficulty": DifficultyLevel.BEGINNER.value, "equipment_needed": "Treadmill or outdoor"},
        {"name": "Lunges", "muscle_group": MuscleGroup.LEGS.value, "difficulty": DifficultyLevel.BEGINNER.value, "equipment_needed": "None"},
    ]
    
    for ex_data in exercises_data:
        existing = db.query(Exercise).filter(Exercise.name == ex_data["name"]).first()
        if not existing:
            exercise = Exercise(**ex_data)
            db.add(exercise)
            db.flush()
    
    # Seed Workout Plans
    workout_plans_data = [
        {"name": "Beginner Full Body", "description": "Full body workout for beginners", "trainer_id": staff[0].id if staff else None, "duration_weeks": 4, "difficulty": DifficultyLevel.BEGINNER.value, "goal": "General Fitness"},
        {"name": "Muscle Building", "description": "Hypertrophy focused program", "trainer_id": staff[0].id if staff else None, "duration_weeks": 8, "difficulty": DifficultyLevel.INTERMEDIATE.value, "goal": "Muscle Gain"},
        {"name": "Fat Loss HIIT", "description": "High intensity interval training", "trainer_id": staff[1].id if len(staff) > 1 else None, "duration_weeks": 6, "difficulty": DifficultyLevel.INTERMEDIATE.value, "goal": "Weight Loss"},
    ]
    
    for wp_data in workout_plans_data:
        existing = db.query(WorkoutPlan).filter(WorkoutPlan.name == wp_data["name"]).first()
        if not existing:
            workout_plan = WorkoutPlan(**wp_data)
            db.add(workout_plan)
            db.flush()
    
    # Seed Diet Plans
    diet_plans_data = [
        {"name": "Balanced Nutrition", "description": "Balanced macro distribution", "trainer_id": staff[1].id if len(staff) > 1 else None, "daily_calories": 2000, "protein_grams": 150, "carbs_grams": 200, "fats_grams": 65, "water_liters": 3.0, "goal": "Maintenance"},
        {"name": "High Protein", "description": "Protein-rich diet for muscle building", "trainer_id": staff[0].id if staff else None, "daily_calories": 2500, "protein_grams": 200, "carbs_grams": 200, "fats_grams": 80, "water_liters": 4.0, "goal": "Muscle Gain"},
    ]
    
    for dp_data in diet_plans_data:
        existing = db.query(DietPlan).filter(DietPlan.name == dp_data["name"]).first()
        if not existing:
            diet_plan = DietPlan(**dp_data)
            db.add(diet_plan)
            db.flush()
    
    db.commit()
    
    return {
        "branches": db.query(Branch).count(),
        "staff": db.query(GymStaff).count(),
        "members": db.query(GymMember).count(),
        "membership_plans": db.query(MembershipPlan).count(),
        "subscriptions": db.query(MembershipSubscription).count(),
        "attendance": db.query(GymAttendance).count(),
        "payments": db.query(GymPayment).count(),
        "equipment": db.query(GymEquipment).count(),
        "inventory": db.query(GymInventoryItem).count(),
        "exercises": db.query(Exercise).count(),
        "workout_plans": db.query(WorkoutPlan).count(),
        "diet_plans": db.query(DietPlan).count(),
    }
