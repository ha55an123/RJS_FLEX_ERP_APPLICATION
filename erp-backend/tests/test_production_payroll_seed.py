from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.database import Base
from app.core.seed_data import seed_production_payroll_demo_data
from app.models import user, otp, device, audit_log, inventory, order, invoice, purchase, outlet, attendance_payroll, production_payroll
from app.models import employee, accounting  # noqa: F401
from app.models.accounting import Ledger
from app.models.employee import Employee
from app.models.production_payroll import (
    ProductionAdvance,
    ProductionDepartment,
    ProductionEntry,
    ProductionLoan,
    ProductionPayrollItem,
    ProductionPayrollRun,
    ProductionTechnology,
)


def test_seed_production_payroll_demo_data_creates_demo_records():
    engine = create_engine("sqlite:///:memory:")
    TestingSession = sessionmaker(bind=engine)
    Base.metadata.create_all(bind=engine)

    with TestingSession() as db:
        seed_production_payroll_demo_data(db)

        assert db.query(Employee).count() >= 1
        assert db.query(ProductionDepartment).count() >= 1
        assert db.query(ProductionTechnology).count() >= 1
        assert db.query(ProductionEntry).count() >= 1
        assert db.query(ProductionLoan).count() >= 1
        assert db.query(ProductionAdvance).count() >= 1
        assert db.query(ProductionPayrollRun).count() >= 1
        assert db.query(ProductionPayrollItem).count() >= 1
        assert db.query(Ledger).count() >= 1
