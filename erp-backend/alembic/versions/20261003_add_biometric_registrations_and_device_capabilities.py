"""Add biometric_registrations table and device capability flags

Revision ID: 20261003_add_biometric_registrations
Revises: 
Create Date: 2026-10-03

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'j4k5l6m7n8o9'
down_revision = 'i3j4k5l6m7n8'
branch_labels = None
depends_on = None


def upgrade():
    # Add capability flags to biometric_devices table (idempotent)
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    
    # Check if columns exist before adding
    columns = [col['name'] for col in inspector.get_columns('biometric_devices')]
    
    if 'supports_fingerprint' not in columns:
        op.add_column('biometric_devices', sa.Column('supports_fingerprint', sa.Boolean(), nullable=False, server_default='true'))
    
    if 'supports_face' not in columns:
        op.add_column('biometric_devices', sa.Column('supports_face', sa.Boolean(), nullable=False, server_default='false'))
    
    # Create biometric_registrations table
    op.create_table(
        'biometric_registrations',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('member_id', sa.Integer(), nullable=False),
        sa.Column('device_id', sa.Integer(), nullable=False),
        sa.Column('biometric_type', sa.Enum('fingerprint', 'face', name='biometrictype'), nullable=False),
        sa.Column('finger_type', sa.Enum('right_thumb', 'left_thumb', 'right_index', 'left_index', 'right_middle', 'left_middle', 'right_ring', 'left_ring', 'right_little', 'left_little', name='fingertype'), nullable=True),
        sa.Column('zkteco_user_id', sa.String(), nullable=False),
        sa.Column('template_reference_id', sa.String(), nullable=True),
        sa.Column('status', sa.Enum('active', 'inactive', 'failed', name='registrationstatus'), nullable=False),
        sa.Column('quality_score', sa.Integer(), nullable=True),
        sa.Column('notes', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['device_id'], ['biometric_devices.id'], ),
        sa.ForeignKeyConstraint(['member_id'], ['gym_members.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_biometric_registrations_device_id'), 'biometric_registrations', ['device_id'], unique=False)
    op.create_index(op.f('ix_biometric_registrations_id'), 'biometric_registrations', ['id'], unique=False)
    op.create_index(op.f('ix_biometric_registrations_member_id'), 'biometric_registrations', ['member_id'], unique=False)
    op.create_index(op.f('ix_biometric_registrations_zkteco_user_id'), 'biometric_registrations', ['zkteco_user_id'], unique=False)


def downgrade():
    # Drop biometric_registrations table
    op.drop_index(op.f('ix_biometric_registrations_zkteco_user_id'), table_name='biometric_registrations')
    op.drop_index(op.f('ix_biometric_registrations_member_id'), table_name='biometric_registrations')
    op.drop_index(op.f('ix_biometric_registrations_id'), table_name='biometric_registrations')
    op.drop_index(op.f('ix_biometric_registrations_device_id'), table_name='biometric_registrations')
    op.drop_table('biometric_registrations')
    
    # Remove capability flags from biometric_devices table (idempotent)
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [col['name'] for col in inspector.get_columns('biometric_devices')]
    
    if 'supports_face' in columns:
        op.drop_column('biometric_devices', 'supports_face')
    
    if 'supports_fingerprint' in columns:
        op.drop_column('biometric_devices', 'supports_fingerprint')
