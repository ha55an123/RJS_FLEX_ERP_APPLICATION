"""add employees table and separate from users

Revision ID: a1b2c3d4e5f6
Revises: d79a85fc787a
Create Date: 2026-06-28 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = 'd79a85fc787a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add missing employee columns to users table (for backward compat if they exist)
    with op.batch_alter_table('users') as batch_op:
        try:
            batch_op.add_column(sa.Column('phone_number', sa.String(), nullable=True))
        except Exception:
            pass
        try:
            batch_op.add_column(sa.Column('department', sa.String(), nullable=True))
        except Exception:
            pass
        try:
            batch_op.add_column(sa.Column('address', sa.String(), nullable=True))
        except Exception:
            pass
        try:
            batch_op.add_column(sa.Column('cnic', sa.String(), nullable=True))
        except Exception:
            pass
        try:
            batch_op.add_column(sa.Column('dob', sa.Date(), nullable=True))
        except Exception:
            pass
        try:
            batch_op.add_column(sa.Column('salary', sa.Float(), nullable=True))
        except Exception:
            pass
        try:
            batch_op.add_column(sa.Column('remarks', sa.String(), nullable=True))
        except Exception:
            pass

    # Create employees table
    op.create_table(
        'employees',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('full_name', sa.String(), nullable=False),
        sa.Column('email', sa.String(), nullable=True),
        sa.Column('phone_number', sa.String(), nullable=True),
        sa.Column('department', sa.String(), nullable=True),
        sa.Column('location', sa.String(), nullable=True),
        sa.Column('address', sa.String(), nullable=True),
        sa.Column('cnic', sa.String(), nullable=True),
        sa.Column('dob', sa.Date(), nullable=True),
        sa.Column('salary', sa.Float(), nullable=True),
        sa.Column('remarks', sa.String(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_employees_id'), 'employees', ['id'], unique=False)
    op.create_index(op.f('ix_employees_email'), 'employees', ['email'], unique=True)

    # Drop old attendance_records and payroll_items tables and recreate with employees FK
    op.drop_table('payroll_items')
    op.drop_table('attendance_records')
    op.drop_table('payroll_runs')

    op.create_table(
        'attendance_records',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('employee_id', sa.Integer(), sa.ForeignKey('employees.id'), nullable=False),
        sa.Column('work_date', sa.Date(), nullable=False),
        sa.Column('status', sa.String(), nullable=False),
        sa.Column('overtime_hours', sa.Float(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_attendance_records_id'), 'attendance_records', ['id'], unique=False)
    op.create_index(op.f('ix_attendance_records_employee_id'), 'attendance_records', ['employee_id'], unique=False)
    op.create_index(op.f('ix_attendance_records_work_date'), 'attendance_records', ['work_date'], unique=False)

    op.create_table(
        'payroll_runs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('period_year', sa.Integer(), nullable=False),
        sa.Column('period_month', sa.Integer(), nullable=False),
        sa.Column('month_plan', sa.String(), nullable=False),
        sa.Column('overtime_rate_type', sa.String(), nullable=False),
        sa.Column('overtime_hours_factor', sa.Float(), nullable=False),
        sa.Column('overtime_block_hours', sa.Float(), nullable=False),
        sa.Column('status', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_payroll_runs_id'), 'payroll_runs', ['id'], unique=False)

    op.create_table(
        'payroll_items',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('payroll_run_id', sa.Integer(), sa.ForeignKey('payroll_runs.id'), nullable=False),
        sa.Column('employee_id', sa.Integer(), sa.ForeignKey('employees.id'), nullable=False),
        sa.Column('base_salary', sa.Float(), nullable=False),
        sa.Column('absent_days', sa.Integer(), nullable=False),
        sa.Column('half_days', sa.Integer(), nullable=False),
        sa.Column('absent_deduction', sa.Float(), nullable=False),
        sa.Column('overtime_hours_total', sa.Float(), nullable=False),
        sa.Column('overtime_blocks', sa.Float(), nullable=False),
        sa.Column('overtime_multiplier', sa.Float(), nullable=False),
        sa.Column('overtime_pay', sa.Float(), nullable=False),
        sa.Column('final_salary', sa.Float(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_payroll_items_id'), 'payroll_items', ['id'], unique=False)


def downgrade() -> None:
    op.drop_table('payroll_items')
    op.drop_table('payroll_runs')
    op.drop_table('attendance_records')
    op.drop_index(op.f('ix_employees_email'), table_name='employees')
    op.drop_index(op.f('ix_employees_id'), table_name='employees')
    op.drop_table('employees')
