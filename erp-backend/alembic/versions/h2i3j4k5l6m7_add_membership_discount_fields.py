"""add membership admission and monthly discount fields

Revision ID: h2i3j4k5l6m7
Revises: g1h2i3j4k5l6
Create Date: 2026-09-12 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = 'h2i3j4k5l6m7'
down_revision = 'g1h2i3j4k5l6'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        'membership_plans',
        sa.Column('admission_discount_percent', sa.Float(), nullable=True, server_default='0'),
    )
    op.add_column(
        'membership_plans',
        sa.Column('monthly_discount_percent', sa.Float(), nullable=True, server_default='0'),
    )


def downgrade():
    op.drop_column('membership_plans', 'monthly_discount_percent')
    op.drop_column('membership_plans', 'admission_discount_percent')
