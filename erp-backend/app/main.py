import subprocess
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.database import engine, Base

# Import all models so Base knows about them
from app.models import user, otp, device, audit_log, inventory, order, invoice, purchase, outlet, attendance_payroll, production_payroll
from app.models import employee  # noqa: F401
from app.models import accounting  # noqa: F401

from app.routers import (
    auth,
    dashboard,
    inventory as inv_router,
    order as order_router,
    invoice as inv_bill_router,
    employees,
    users,
    purchases,
    outlets,
    attendance_payroll,
    ledgers,
    expenses,
    utility_bills,
    purchase_requests,
    production_payroll,
)
from app.core.seed_data import seed_production_payroll_demo_data
from app.core.database import SessionLocal

def _run_migrations() -> None:
    project_root = Path(__file__).resolve().parents[1]
    try:
        result = subprocess.run(
            ["alembic", "upgrade", "heads"],
            cwd=project_root,
            capture_output=True,
            text=True,
            check=False,
        )
        if result.returncode != 0:
            stderr = (result.stderr or result.stdout or "").strip()
            # If multiple heads exist in the repo, upgrade can fail; DB may already be migrated.
            print(f"[MIGRATIONS] alembic upgrade heads failed: {stderr}")
        else:
            print("[MIGRATIONS] alembic upgrade heads completed")


    except Exception as exc:
        print(f"[MIGRATIONS] could not run alembic upgrade head: {exc}")


# try:
#     _run_migrations()
# except Exception as exc:
#     print(f"[MIGRATIONS] migration startup hook failed: {exc}")
#     Base.metadata.create_all(bind=engine)
Base.metadata.create_all(bind=engine)

# Auto-patch: add otp_type column to user_otps if it doesn't exist yet
# (handles existing DBs that were created before this column was added)
def _apply_patches():
    from sqlalchemy import text
    with engine.connect() as conn:
        try:
            conn.execute(text(
                "ALTER TABLE user_otps ADD COLUMN IF NOT EXISTS otp_type VARCHAR DEFAULT 'login' NOT NULL"
            ))
            conn.commit()
        except Exception:
            conn.rollback()

try:
    _apply_patches()
except Exception as e:
    print(f"[PATCH] Could not apply DB patches: {e}")


def _seed_production_payroll_demo_data():
    try:
        with SessionLocal() as db:
            counts = seed_production_payroll_demo_data(db)
            print(f"[SEED] production payroll demo data seeded: {counts}")
    except Exception as exc:
        print(f"[SEED] could not seed production payroll demo data: {exc}")


# _seed_production_payroll_demo_data()

app = FastAPI(title="Forest ERP", version="1.0.0")

# CORS must be registered before routers
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(dashboard.router)
app.include_router(inv_router.router)
app.include_router(order_router.router)
app.include_router(inv_bill_router.router)
app.include_router(employees.router)
app.include_router(users.router)
app.include_router(purchases.router)
app.include_router(outlets.router)
app.include_router(attendance_payroll.router)
app.include_router(ledgers.router)
app.include_router(expenses.router)
app.include_router(utility_bills.router)
app.include_router(purchase_requests.router)
app.include_router(production_payroll.router)


@app.get("/")
def root():
    return {"message": "Forest ERP Running", "version": "1.0.0"}
