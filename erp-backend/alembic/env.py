from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context
import sys, os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.database import Base

# ── Preserved models ──────────────────────────────────────────────────────────
from app.models.user import User
from app.models.otp import UserOTP
from app.models.device import UserDevice
from app.models.audit_log import AuditLog
from app.models.inventory import InventoryItem, StockTransaction, Product
from app.models.order import Order, OrderItem
from app.models.invoice import Invoice
from app.models.employee import Employee
import app.models.accounting
import app.models.production_payroll
import app.models.attendance_payroll
import app.models.purchase

# ── New Gym models ────────────────────────────────────────────────────────────
import app.models.branch
import app.models.gym_member
import app.models.gym_staff
import app.models.membership
import app.models.gym_attendance
import app.models.biometric_device
import app.models.workout
import app.models.diet
import app.models.gym_equipment
import app.models.gym_inventory
import app.models.gym_payment

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline():
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online():
    connectable = engine_from_config(
        config.get_section(config.config_ini_section),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
