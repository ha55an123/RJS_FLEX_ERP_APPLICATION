"""add accounting expense utility purchase_request tables

Revision ID: e1f2a3b4c5d6
Revises: d79a85fc787a
Create Date: 2025-01-01 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = 'e1f2a3b4c5d6'
down_revision = 'd79a85fc787a'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'ledgers',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('ledger_code', sa.String(), nullable=False, unique=True),
        sa.Column('ledger_name', sa.String(), nullable=False, unique=True),
        sa.Column('ledger_type', sa.String(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('opening_balance', sa.Float(), default=0.0),
        sa.Column('current_balance', sa.Float(), default=0.0),
        sa.Column('status', sa.String(), default='Active'),
        sa.Column('created_by', sa.Integer(), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
    )
    op.create_index('ix_ledgers_ledger_code', 'ledgers', ['ledger_code'])
    op.create_index('ix_ledgers_id', 'ledgers', ['id'])

    op.create_table(
        'daily_expenses',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('expense_number', sa.String(), nullable=False, unique=True),
        sa.Column('expense_date', sa.Date(), nullable=False),
        sa.Column('ledger_id', sa.Integer(), sa.ForeignKey('ledgers.id'), nullable=False),
        sa.Column('category', sa.String(), nullable=False),
        sa.Column('amount', sa.Float(), nullable=False),
        sa.Column('payment_method', sa.String(), nullable=False),
        sa.Column('vendor_name', sa.String(), nullable=True),
        sa.Column('invoice_number', sa.String(), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('attachment', sa.String(), nullable=True),
        sa.Column('approved_by', sa.Integer(), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('created_by', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
    )
    op.create_index('ix_daily_expenses_expense_number', 'daily_expenses', ['expense_number'])
    op.create_index('ix_daily_expenses_id', 'daily_expenses', ['id'])

    op.create_table(
        'utility_bills',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('bill_number', sa.String(), nullable=False, unique=True),
        sa.Column('utility_type', sa.String(), nullable=False),
        sa.Column('ledger_id', sa.Integer(), sa.ForeignKey('ledgers.id'), nullable=False),
        sa.Column('billing_month', sa.Integer(), nullable=False),
        sa.Column('billing_year', sa.Integer(), nullable=False),
        sa.Column('due_date', sa.Date(), nullable=False),
        sa.Column('payment_date', sa.Date(), nullable=True),
        sa.Column('amount', sa.Float(), nullable=False),
        sa.Column('late_fee', sa.Float(), default=0.0),
        sa.Column('status', sa.String(), default='Pending'),
        sa.Column('receipt', sa.String(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_by', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
    )
    op.create_index('ix_utility_bills_bill_number', 'utility_bills', ['bill_number'])
    op.create_index('ix_utility_bills_id', 'utility_bills', ['id'])

    op.create_table(
        'purchase_requests',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('request_number', sa.String(), nullable=False, unique=True),
        sa.Column('employee_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('department', sa.String(), nullable=True),
        sa.Column('request_date', sa.Date(), nullable=False),
        sa.Column('required_date', sa.Date(), nullable=True),
        sa.Column('priority', sa.String(), default='Medium'),
        sa.Column('status', sa.String(), default='Pending'),
        sa.Column('item_name', sa.String(), nullable=False),
        sa.Column('quantity', sa.Integer(), nullable=False),
        sa.Column('estimated_price', sa.Float(), nullable=True),
        sa.Column('vendor', sa.String(), nullable=True),
        sa.Column('reason', sa.Text(), nullable=True),
        sa.Column('remarks', sa.Text(), nullable=True),
        sa.Column('attachment', sa.String(), nullable=True),
        sa.Column('manager_comments', sa.Text(), nullable=True),
        sa.Column('admin_comments', sa.Text(), nullable=True),
        sa.Column('approved_date', sa.Date(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
    )
    op.create_index('ix_purchase_requests_request_number', 'purchase_requests', ['request_number'])
    op.create_index('ix_purchase_requests_id', 'purchase_requests', ['id'])


def downgrade():
    op.drop_table('purchase_requests')
    op.drop_table('utility_bills')
    op.drop_table('daily_expenses')
    op.drop_table('ledgers')
