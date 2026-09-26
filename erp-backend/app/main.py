from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi.staticfiles import StaticFiles
from pathlib import Path
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from app.core.database import engine, Base

# ── Core / preserved models ──────────────────────────────────────────────────
from app.models import (
    user, otp, device, audit_log, order, invoice,
    purchase, attendance_payroll, production_payroll,
    accounting,
)
from app.models import employee  # noqa: F401

# ── New Gym models ────────────────────────────────────────────────────────────
from app.models import branch          # noqa: F401
from app.models import gym_member      # noqa: F401
from app.models import gym_staff       # noqa: F401
from app.models import membership      # noqa: F401
from app.models import gym_attendance  # noqa: F401
from app.models import biometric_device  # noqa: F401
from app.models import workout         # noqa: F401
from app.models import diet            # noqa: F401
from app.models import gym_equipment   # noqa: F401
from app.models import gym_inventory   # noqa: F401
from app.models import gym_payment     # noqa: F401
from app.models import discount        # noqa: F401
from app.models import face_biometric  # noqa: F401

# ── Preserved routers ─────────────────────────────────────────────────────────
from app.routers import (
    auth,
    users,
    employees,
    ledgers,
    expenses,
    utility_bills,
    purchase_requests,
    attendance_payroll as att_payroll_router,
    production_payroll as prod_payroll_router,
    purchases,
    invoice as inv_bill_router,
)

# ── New Gym routers ───────────────────────────────────────────────────────────
from app.routers.gym import (
    dashboard as gym_dashboard,
    branches,
    members,
    memberships,
    gym_staff as staff_router,
    gym_attendance as attendance_router,
    biometric_devices,
    workouts,
    diet as diet_router,
    equipment,
    gym_inventory as inventory_router,
    gym_payments,
    discounts,
    reports,
    face_biometrics,
)

Base.metadata.create_all(bind=engine)


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


def _init_admin_user():
    from app.core.database import SessionLocal
    from app.core.init_admin import create_default_admin
    db = SessionLocal()
    try:
        create_default_admin(db)
    except Exception as e:
        print(f"[ADMIN] Could not create admin user: {e}")
    finally:
        db.close()


try:
    _init_admin_user()
except Exception as e:
    print(f"[ADMIN] Admin initialization failed: {e}")


app = FastAPI(
    title="Gym ERP",
    version="2.0.0",
    description="Enterprise Gym ERP Management System",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount uploads directory for static file serving
uploads_dir = Path("uploads")
uploads_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(uploads_dir)), name="uploads")


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.error(f"Validation error on {request.method} {request.url}: {exc.errors()}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": exc.errors()},
    )

# ── Preserved routes (keep existing paths intact) ────────────────────────────
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(employees.router)
app.include_router(ledgers.router)
app.include_router(expenses.router)
app.include_router(utility_bills.router)
app.include_router(purchase_requests.router)
app.include_router(att_payroll_router.router)
app.include_router(prod_payroll_router.router)
app.include_router(purchases.router)
app.include_router(inv_bill_router.router)

# ── Gym API v1 routes ─────────────────────────────────────────────────────────
V1 = "/api/v1"
app.include_router(gym_dashboard.router,   prefix=V1)
app.include_router(branches.router,        prefix=V1)
app.include_router(members.router,         prefix=V1)
app.include_router(memberships.router,     prefix=V1)
app.include_router(staff_router.router,    prefix=V1)
app.include_router(attendance_router.router, prefix=V1)
app.include_router(biometric_devices.router, prefix=V1)
app.include_router(workouts.router,        prefix=V1)
app.include_router(diet_router.router,     prefix=V1)
app.include_router(equipment.router,       prefix=V1)
app.include_router(inventory_router.router, prefix=V1)
app.include_router(gym_payments.router,    prefix=V1)
app.include_router(discounts.router,       prefix=V1)
app.include_router(reports.router,         prefix=V1)
app.include_router(face_biometrics.router, prefix=V1)


@app.get("/")
def root():
    return {"message": "Gym ERP Running", "version": "2.0.0"}


@app.get("/health")
def health():
    return {"status": "healthy"}
