"""add timezone to payments timestamps

Revision ID: h3i4j5k6l7m8
Revises: g1h2i3j4k5l6
Create Date: 2026-10-01 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = 'h3i4j5k6l7m8'
down_revision = 'g1h2i3j4k5l6'
branch_labels = None
depends_on = None


def upgrade():
    # Convert created_at and updated_at to TIMESTAMP WITH TIME ZONE
    # First, ensure all existing naive timestamps are treated as UTC
    op.execute("ALTER TABLE gym_payments ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE USING created_at AT TIME ZONE 'UTC'")
    op.execute("ALTER TABLE gym_payments ALTER COLUMN updated_at TYPE TIMESTAMP WITH TIME ZONE USING updated_at AT TIME ZONE 'UTC'")


def downgrade():
    # Revert back to TIMESTAMP WITHOUT TIME ZONE
    op.execute("ALTER TABLE gym_payments ALTER COLUMN created_at TYPE TIMESTAMP WITHOUT TIME ZONE")
    op.execute("ALTER TABLE gym_payments ALTER COLUMN updated_at TYPE TIMESTAMP WITHOUT TIME ZONE")
