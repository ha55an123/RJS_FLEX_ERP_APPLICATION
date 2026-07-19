"""add production payroll and ledger entry tables

Revision ID: f7g8h9i0j1k2
Revises: e1f2a3b4c5d6
Create Date: 2026-07-13 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = 'f7g8h9i0j1k2'
down_revision = 'e1f2a3b4c5d6'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'ledger_entries',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('ledger_id', sa.Integer(), sa.ForeignKey('ledgers.id'), nullable=False),
        sa.Column('transaction_date', sa.DateTime(), nullable=True),
        sa.Column('amount', sa.Float(), nullable=False),
        sa.Column('entry_type', sa.String(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('reference_type', sa.String(), nullable=True),
        sa.Column('reference_id', sa.Integer(), nullable=True),
    )
    op.create_index('ix_ledger_entries_ledger_id', 'ledger_entries', ['ledger_id'])
    op.create_index('ix_ledger_entries_id', 'ledger_entries', ['id'])

    op.create_table(
        'production_departments',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('name', sa.String(), nullable=False, unique=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('status', sa.String(), nullable=False, default='active'),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
    )
    op.create_index('ix_production_departments_id', 'production_departments', ['id'])

    op.create_table(
        'production_technologies',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('department_id', sa.Integer(), sa.ForeignKey('production_departments.id'), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('unit_rate', sa.Float(), nullable=False, default=0.0),
        sa.Column('status', sa.String(), nullable=False, default='active'),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
    )
    op.create_index('ix_production_technologies_id', 'production_technologies', ['id'])
    op.create_index('ix_production_technology_department', 'production_technologies', ['department_id'])

    op.create_table(
        'employee_technology_assignments',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('employee_id', sa.Integer(), sa.ForeignKey('employees.id'), nullable=False),
        sa.Column('technology_id', sa.Integer(), sa.ForeignKey('production_technologies.id'), nullable=False),
        sa.Column('assigned_date', sa.Date(), nullable=False),
        sa.Column('status', sa.String(), nullable=False, default='active'),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
    )
    op.create_index('ix_employee_technology_assignments_id', 'employee_technology_assignments', ['id'])

    op.create_table(
        'production_entries',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('employee_id', sa.Integer(), sa.ForeignKey('employees.id'), nullable=False),
        sa.Column('technology_id', sa.Integer(), sa.ForeignKey('production_technologies.id'), nullable=False),
        sa.Column('production_date', sa.Date(), nullable=False),
        sa.Column('quantity', sa.Float(), nullable=False, default=0.0),
        sa.Column('remarks', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
    )
    op.create_index('ix_production_entries_id', 'production_entries', ['id'])
    op.create_index('ix_production_entries_production_date', 'production_entries', ['production_date'])

    op.create_table(
        'production_payroll_runs',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('period_year', sa.Integer(), nullable=False),
        sa.Column('period_month', sa.Integer(), nullable=False),
        sa.Column('bonus', sa.Float(), nullable=False, default=0.0),
        sa.Column('deductions', sa.Float(), nullable=False, default=0.0),
        sa.Column('status', sa.String(), nullable=False, default='draft'),
        sa.Column('created_at', sa.DateTime(), nullable=True),
    )
    op.create_index('ix_production_payroll_runs_id', 'production_payroll_runs', ['id'])
    op.create_index('ix_production_payroll_runs_period', 'production_payroll_runs', ['period_year', 'period_month'])

    op.create_table(
        'production_payroll_items',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('payroll_run_id', sa.Integer(), sa.ForeignKey('production_payroll_runs.id'), nullable=False),
        sa.Column('employee_id', sa.Integer(), sa.ForeignKey('employees.id'), nullable=False),
        sa.Column('total_quantity', sa.Float(), nullable=False, default=0.0),
        sa.Column('total_amount', sa.Float(), nullable=False, default=0.0),
        sa.Column('bonus', sa.Float(), nullable=False, default=0.0),
        sa.Column('deductions', sa.Float(), nullable=False, default=0.0),
        sa.Column('loan_deduction', sa.Float(), nullable=False, default=0.0),
        sa.Column('advance_deduction', sa.Float(), nullable=False, default=0.0),
        sa.Column('net_pay', sa.Float(), nullable=False, default=0.0),
        sa.Column('created_at', sa.DateTime(), nullable=True),
    )
    op.create_index('ix_production_payroll_items_id', 'production_payroll_items', ['id'])
    op.create_index('ix_production_payroll_items_run', 'production_payroll_items', ['payroll_run_id'])

    op.create_table(
        'production_loans',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('employee_id', sa.Integer(), sa.ForeignKey('employees.id'), nullable=False),
        sa.Column('ledger_id', sa.Integer(), sa.ForeignKey('ledgers.id'), nullable=False),
        sa.Column('amount', sa.Float(), nullable=False, default=0.0),
        sa.Column('balance', sa.Float(), nullable=False, default=0.0),
        sa.Column('monthly_deduction', sa.Float(), nullable=False, default=0.0),
        sa.Column('issue_date', sa.Date(), nullable=False),
        sa.Column('due_date', sa.Date(), nullable=True),
        sa.Column('status', sa.String(), nullable=False, default='active'),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
    )
    op.create_index('ix_production_loans_id', 'production_loans', ['id'])
    op.create_index('ix_production_loans_employee', 'production_loans', ['employee_id'])

    op.create_table(
        'production_advances',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('employee_id', sa.Integer(), sa.ForeignKey('employees.id'), nullable=False),
        sa.Column('ledger_id', sa.Integer(), sa.ForeignKey('ledgers.id'), nullable=False),
        sa.Column('amount', sa.Float(), nullable=False, default=0.0),
        sa.Column('balance', sa.Float(), nullable=False, default=0.0),
        sa.Column('monthly_deduction', sa.Float(), nullable=False, default=0.0),
        sa.Column('issue_date', sa.Date(), nullable=False),
        sa.Column('status', sa.String(), nullable=False, default='active'),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
    )
    op.create_index('ix_production_advances_id', 'production_advances', ['id'])
    op.create_index('ix_production_advances_employee', 'production_advances', ['employee_id'])


def downgrade():
    op.drop_table('production_advances')
    op.drop_table('production_loans')
    op.drop_table('production_payroll_items')
    op.drop_table('production_payroll_runs')
    op.drop_table('production_entries')
    op.drop_table('employee_technology_assignments')
    op.drop_table('production_technologies')
    op.drop_table('production_departments')
    op.drop_table('ledger_entries')
