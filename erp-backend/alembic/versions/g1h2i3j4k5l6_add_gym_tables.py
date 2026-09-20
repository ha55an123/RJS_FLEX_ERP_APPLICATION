"""add gym management tables

Revision ID: g1h2i3j4k5l6
Revises: f7g8h9i0j1k2
Create Date: 2026-08-16 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = 'g1h2i3j4k5l6'
down_revision = 'f7g8h9i0j1k2'
branch_labels = None
depends_on = None


def upgrade():
    # Branches table
    op.create_table(
        'branches',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('code', sa.String(), nullable=False),
        sa.Column('address', sa.Text(), nullable=True),
        sa.Column('city', sa.String(), nullable=True),
        sa.Column('phone', sa.String(), nullable=True),
        sa.Column('email', sa.String(), nullable=True),
        sa.Column('manager_id', sa.Integer(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('opening_time', sa.String(), nullable=True),
        sa.Column('closing_time', sa.String(), nullable=True),
        sa.Column('capacity', sa.Integer(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['manager_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('code')
    )
    op.create_index(op.f('ix_branches_id'), 'branches', ['id'], unique=False)
    op.create_index(op.f('ix_branches_name'), 'branches', ['name'], unique=False)

    # Gym Members table
    op.create_table(
        'gym_members',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('member_code', sa.String(), nullable=False),
        sa.Column('branch_id', sa.Integer(), nullable=False),
        sa.Column('assigned_trainer_id', sa.Integer(), nullable=True),
        sa.Column('first_name', sa.String(), nullable=False),
        sa.Column('last_name', sa.String(), nullable=False),
        sa.Column('gender', sa.String(), nullable=True),
        sa.Column('date_of_birth', sa.Date(), nullable=True),
        sa.Column('cnic', sa.String(), nullable=True),
        sa.Column('passport_number', sa.String(), nullable=True),
        sa.Column('phone', sa.String(), nullable=True),
        sa.Column('whatsapp', sa.String(), nullable=True),
        sa.Column('email', sa.String(), nullable=True),
        sa.Column('address', sa.Text(), nullable=True),
        sa.Column('profile_picture', sa.String(), nullable=True),
        sa.Column('emergency_contact_name', sa.String(), nullable=True),
        sa.Column('emergency_contact_phone', sa.String(), nullable=True),
        sa.Column('emergency_contact_relation', sa.String(), nullable=True),
        sa.Column('blood_group', sa.String(), nullable=True),
        sa.Column('medical_conditions', sa.Text(), nullable=True),
        sa.Column('allergies', sa.Text(), nullable=True),
        sa.Column('height_cm', sa.Float(), nullable=True),
        sa.Column('weight_kg', sa.Float(), nullable=True),
        sa.Column('bmi', sa.Float(), nullable=True),
        sa.Column('body_fat_percent', sa.Float(), nullable=True),
        sa.Column('fitness_goal', sa.String(), nullable=True),
        sa.Column('barcode', sa.String(), nullable=True),
        sa.Column('qr_code', sa.String(), nullable=True),
        sa.Column('rfid_number', sa.String(), nullable=True),
        sa.Column('biometric_user_id', sa.String(), nullable=True),
        sa.Column('status', sa.String(), nullable=False),
        sa.Column('joining_date', sa.Date(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['assigned_trainer_id'], ['gym_staff.id'], ),
        sa.ForeignKeyConstraint(['branch_id'], ['branches.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('barcode'),
        sa.UniqueConstraint('member_code'),
        sa.UniqueConstraint('qr_code'),
        sa.UniqueConstraint('rfid_number')
    )
    op.create_index(op.f('ix_gym_members_branch_id'), 'gym_members', ['branch_id'], unique=False)
    op.create_index(op.f('ix_gym_members_cnic'), 'gym_members', ['cnic'], unique=False)
    op.create_index(op.f('ix_gym_members_email'), 'gym_members', ['email'], unique=False)
    op.create_index(op.f('ix_gym_members_id'), 'gym_members', ['id'], unique=False)
    op.create_index(op.f('ix_gym_members_member_code'), 'gym_members', ['member_code'], unique=False)

    # Gym Staff table
    op.create_table(
        'gym_staff',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('staff_code', sa.String(), nullable=False),
        sa.Column('branch_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('first_name', sa.String(), nullable=False),
        sa.Column('last_name', sa.String(), nullable=False),
        sa.Column('gender', sa.String(), nullable=True),
        sa.Column('date_of_birth', sa.Date(), nullable=True),
        sa.Column('cnic', sa.String(), nullable=True),
        sa.Column('phone', sa.String(), nullable=True),
        sa.Column('email', sa.String(), nullable=True),
        sa.Column('address', sa.Text(), nullable=True),
        sa.Column('profile_picture', sa.String(), nullable=True),
        sa.Column('role', sa.String(), nullable=False),
        sa.Column('designation', sa.String(), nullable=True),
        sa.Column('qualification', sa.String(), nullable=True),
        sa.Column('specialization', sa.String(), nullable=True),
        sa.Column('experience_years', sa.Integer(), nullable=True),
        sa.Column('joining_date', sa.Date(), nullable=True),
        sa.Column('salary', sa.Float(), nullable=True),
        sa.Column('commission_percent', sa.Float(), nullable=True),
        sa.Column('biometric_user_id', sa.String(), nullable=True),
        sa.Column('rfid_number', sa.String(), nullable=True),
        sa.Column('status', sa.String(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['branch_id'], ['branches.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('staff_code'),
        sa.UniqueConstraint('user_id')
    )
    op.create_index(op.f('ix_gym_staff_branch_id'), 'gym_staff', ['branch_id'], unique=False)
    op.create_index(op.f('ix_gym_staff_email'), 'gym_staff', ['email'], unique=False)
    op.create_index(op.f('ix_gym_staff_id'), 'gym_staff', ['id'], unique=False)
    op.create_index(op.f('ix_gym_staff_staff_code'), 'gym_staff', ['staff_code'], unique=False)

    # Membership Plans table
    op.create_table(
        'membership_plans',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('duration_type', sa.String(), nullable=False),
        sa.Column('duration_days', sa.Integer(), nullable=True),
        sa.Column('price', sa.Float(), nullable=False),
        sa.Column('tax_percent', sa.Float(), nullable=True),
        sa.Column('joining_fee', sa.Float(), nullable=True),
        sa.Column('discount_percent', sa.Float(), nullable=True),
        sa.Column('freeze_allowed', sa.Boolean(), nullable=True),
        sa.Column('max_freeze_days', sa.Integer(), nullable=True),
        sa.Column('auto_renewal', sa.Boolean(), nullable=True),
        sa.Column('renewal_reminder_days', sa.Integer(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_membership_plans_id'), 'membership_plans', ['id'], unique=False)
    op.create_index(op.f('ix_membership_plans_name'), 'membership_plans', ['name'], unique=False)

    # Membership Subscriptions table
    op.create_table(
        'membership_subscriptions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('member_id', sa.Integer(), nullable=False),
        sa.Column('plan_id', sa.Integer(), nullable=False),
        sa.Column('branch_id', sa.Integer(), nullable=False),
        sa.Column('start_date', sa.Date(), nullable=False),
        sa.Column('end_date', sa.Date(), nullable=False),
        sa.Column('actual_end_date', sa.Date(), nullable=True),
        sa.Column('price_paid', sa.Float(), nullable=False),
        sa.Column('tax_amount', sa.Float(), nullable=True),
        sa.Column('joining_fee_paid', sa.Float(), nullable=True),
        sa.Column('discount_amount', sa.Float(), nullable=True),
        sa.Column('total_amount', sa.Float(), nullable=False),
        sa.Column('payment_method', sa.String(), nullable=True),
        sa.Column('payment_reference', sa.String(), nullable=True),
        sa.Column('payment_status', sa.String(), nullable=True),
        sa.Column('status', sa.String(), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['branch_id'], ['branches.id'], ),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
        sa.ForeignKeyConstraint(['member_id'], ['gym_members.id'], ),
        sa.ForeignKeyConstraint(['plan_id'], ['membership_plans.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_membership_subscriptions_branch_id'), 'membership_subscriptions', ['branch_id'], unique=False)
    op.create_index(op.f('ix_membership_subscriptions_id'), 'membership_subscriptions', ['id'], unique=False)
    op.create_index(op.f('ix_membership_subscriptions_member_id'), 'membership_subscriptions', ['member_id'], unique=False)
    op.create_index(op.f('ix_membership_subscriptions_plan_id'), 'membership_subscriptions', ['plan_id'], unique=False)

    # Membership Freezes table
    op.create_table(
        'membership_freezes',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('subscription_id', sa.Integer(), nullable=False),
        sa.Column('freeze_start', sa.Date(), nullable=False),
        sa.Column('freeze_end', sa.Date(), nullable=False),
        sa.Column('freeze_days', sa.Integer(), nullable=False),
        sa.Column('reason', sa.Text(), nullable=True),
        sa.Column('approved_by', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['approved_by'], ['users.id'], ),
        sa.ForeignKeyConstraint(['subscription_id'], ['membership_subscriptions.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_membership_freezes_id'), 'membership_freezes', ['id'], unique=False)
    op.create_index(op.f('ix_membership_freezes_subscription_id'), 'membership_freezes', ['subscription_id'], unique=False)

    # Membership Transfers table
    op.create_table(
        'membership_transfers',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('subscription_id', sa.Integer(), nullable=False),
        sa.Column('from_member_id', sa.Integer(), nullable=False),
        sa.Column('to_member_id', sa.Integer(), nullable=False),
        sa.Column('transfer_date', sa.Date(), nullable=False),
        sa.Column('reason', sa.Text(), nullable=True),
        sa.Column('approved_by', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['approved_by'], ['users.id'], ),
        sa.ForeignKeyConstraint(['from_member_id'], ['gym_members.id'], ),
        sa.ForeignKeyConstraint(['subscription_id'], ['membership_subscriptions.id'], ),
        sa.ForeignKeyConstraint(['to_member_id'], ['gym_members.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_membership_transfers_id'), 'membership_transfers', ['id'], unique=False)

    # Gym Attendance table
    op.create_table(
        'gym_attendance',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('member_id', sa.Integer(), nullable=False),
        sa.Column('branch_id', sa.Integer(), nullable=False),
        sa.Column('device_id', sa.Integer(), nullable=True),
        sa.Column('attendance_date', sa.Date(), nullable=False),
        sa.Column('check_in_time', sa.DateTime(), nullable=True),
        sa.Column('check_out_time', sa.DateTime(), nullable=True),
        sa.Column('total_hours', sa.Float(), nullable=True),
        sa.Column('method', sa.String(), nullable=False),
        sa.Column('status', sa.String(), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('recorded_by', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['branch_id'], ['branches.id'], ),
        sa.ForeignKeyConstraint(['device_id'], ['biometric_devices.id'], ),
        sa.ForeignKeyConstraint(['member_id'], ['gym_members.id'], ),
        sa.ForeignKeyConstraint(['recorded_by'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_gym_attendance_attendance_date'), 'gym_attendance', ['attendance_date'], unique=False)
    op.create_index(op.f('ix_gym_attendance_branch_id'), 'gym_attendance', ['branch_id'], unique=False)
    op.create_index(op.f('ix_gym_attendance_id'), 'gym_attendance', ['id'], unique=False)
    op.create_index(op.f('ix_gym_attendance_member_id'), 'gym_attendance', ['member_id'], unique=False)

    # Staff Attendance table
    op.create_table(
        'staff_attendance',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('staff_id', sa.Integer(), nullable=False),
        sa.Column('branch_id', sa.Integer(), nullable=False),
        sa.Column('device_id', sa.Integer(), nullable=True),
        sa.Column('attendance_date', sa.Date(), nullable=False),
        sa.Column('check_in_time', sa.DateTime(), nullable=True),
        sa.Column('check_out_time', sa.DateTime(), nullable=True),
        sa.Column('total_hours', sa.Float(), nullable=True),
        sa.Column('overtime_hours', sa.Float(), nullable=True),
        sa.Column('method', sa.String(), nullable=False),
        sa.Column('status', sa.String(), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['branch_id'], ['branches.id'], ),
        sa.ForeignKeyConstraint(['device_id'], ['biometric_devices.id'], ),
        sa.ForeignKeyConstraint(['staff_id'], ['gym_staff.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_staff_attendance_attendance_date'), 'staff_attendance', ['attendance_date'], unique=False)
    op.create_index(op.f('ix_staff_attendance_branch_id'), 'staff_attendance', ['branch_id'], unique=False)
    op.create_index(op.f('ix_staff_attendance_id'), 'staff_attendance', ['id'], unique=False)
    op.create_index(op.f('ix_staff_attendance_staff_id'), 'staff_attendance', ['staff_id'], unique=False)

    # Trainer Schedules table
    op.create_table(
        'trainer_schedules',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('trainer_id', sa.Integer(), nullable=False),
        sa.Column('branch_id', sa.Integer(), nullable=False),
        sa.Column('day_of_week', sa.Integer(), nullable=False),
        sa.Column('start_time', sa.String(), nullable=False),
        sa.Column('end_time', sa.String(), nullable=False),
        sa.Column('is_available', sa.Boolean(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['branch_id'], ['branches.id'], ),
        sa.ForeignKeyConstraint(['trainer_id'], ['gym_staff.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_trainer_schedules_id'), 'trainer_schedules', ['id'], unique=False)
    op.create_index(op.f('ix_trainer_schedules_trainer_id'), 'trainer_schedules', ['trainer_id'], unique=False)

    # Biometric Devices table
    op.create_table(
        'biometric_devices',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('branch_id', sa.Integer(), nullable=False),
        sa.Column('device_name', sa.String(), nullable=False),
        sa.Column('device_uid', sa.String(), nullable=False),
        sa.Column('brand', sa.String(), nullable=False),
        sa.Column('model', sa.String(), nullable=True),
        sa.Column('serial_number', sa.String(), nullable=True),
        sa.Column('ip_address', sa.String(), nullable=True),
        sa.Column('port', sa.Integer(), nullable=True),
        sa.Column('sdk_version', sa.String(), nullable=True),
        sa.Column('firmware_version', sa.String(), nullable=True),
        sa.Column('protocol', sa.String(), nullable=False),
        sa.Column('sync_interval', sa.String(), nullable=False),
        sa.Column('connection_status', sa.String(), nullable=False),
        sa.Column('last_sync_at', sa.DateTime(), nullable=True),
        sa.Column('last_heartbeat', sa.DateTime(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['branch_id'], ['branches.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('device_uid')
    )
    op.create_index(op.f('ix_biometric_devices_branch_id'), 'biometric_devices', ['branch_id'], unique=False)
    op.create_index(op.f('ix_biometric_devices_id'), 'biometric_devices', ['id'], unique=False)
    op.create_index(op.f('ix_biometric_devices_serial_number'), 'biometric_devices', ['serial_number'], unique=False)

    # Device Sync Logs table
    op.create_table(
        'device_sync_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('device_id', sa.Integer(), nullable=False),
        sa.Column('sync_started_at', sa.DateTime(), nullable=False),
        sa.Column('sync_ended_at', sa.DateTime(), nullable=True),
        sa.Column('records_fetched', sa.Integer(), nullable=True),
        sa.Column('records_saved', sa.Integer(), nullable=True),
        sa.Column('status', sa.String(), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['device_id'], ['biometric_devices.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_device_sync_logs_device_id'), 'device_sync_logs', ['device_id'], unique=False)
    op.create_index(op.f('ix_device_sync_logs_id'), 'device_sync_logs', ['id'], unique=False)

    # Exercises table
    op.create_table(
        'exercises',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('muscle_group', sa.String(), nullable=True),
        sa.Column('difficulty', sa.String(), nullable=True),
        sa.Column('equipment_needed', sa.String(), nullable=True),
        sa.Column('image_url', sa.String(), nullable=True),
        sa.Column('video_url', sa.String(), nullable=True),
        sa.Column('instructions', sa.Text(), nullable=True),
        sa.Column('calories_per_min', sa.Float(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_exercises_id'), 'exercises', ['id'], unique=False)
    op.create_index(op.f('ix_exercises_name'), 'exercises', ['name'], unique=False)

    # Workout Plans table
    op.create_table(
        'workout_plans',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('trainer_id', sa.Integer(), nullable=True),
        sa.Column('duration_weeks', sa.Integer(), nullable=True),
        sa.Column('difficulty', sa.String(), nullable=True),
        sa.Column('goal', sa.String(), nullable=True),
        sa.Column('is_template', sa.Boolean(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['trainer_id'], ['gym_staff.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_workout_plans_id'), 'workout_plans', ['id'], unique=False)

    # Workout Plan Exercises table
    op.create_table(
        'workout_plan_exercises',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('plan_id', sa.Integer(), nullable=False),
        sa.Column('exercise_id', sa.Integer(), nullable=False),
        sa.Column('day_number', sa.Integer(), nullable=False),
        sa.Column('sets', sa.Integer(), nullable=True),
        sa.Column('reps', sa.String(), nullable=True),
        sa.Column('rest_seconds', sa.Integer(), nullable=True),
        sa.Column('duration_minutes', sa.Integer(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('order_index', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['exercise_id'], ['exercises.id'], ),
        sa.ForeignKeyConstraint(['plan_id'], ['workout_plans.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_workout_plan_exercises_exercise_id'), 'workout_plan_exercises', ['exercise_id'], unique=False)
    op.create_index(op.f('ix_workout_plan_exercises_id'), 'workout_plan_exercises', ['id'], unique=False)
    op.create_index(op.f('ix_workout_plan_exercises_plan_id'), 'workout_plan_exercises', ['plan_id'], unique=False)

    # Member Workout Plans table
    op.create_table(
        'member_workout_plans',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('member_id', sa.Integer(), nullable=False),
        sa.Column('plan_id', sa.Integer(), nullable=False),
        sa.Column('trainer_id', sa.Integer(), nullable=True),
        sa.Column('start_date', sa.Date(), nullable=False),
        sa.Column('end_date', sa.Date(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('trainer_notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['member_id'], ['gym_members.id'], ),
        sa.ForeignKeyConstraint(['plan_id'], ['workout_plans.id'], ),
        sa.ForeignKeyConstraint(['trainer_id'], ['gym_staff.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_member_workout_plans_id'), 'member_workout_plans', ['id'], unique=False)
    op.create_index(op.f('ix_member_workout_plans_member_id'), 'member_workout_plans', ['member_id'], unique=False)

    # Workout Progress table
    op.create_table(
        'workout_progress',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('member_id', sa.Integer(), nullable=False),
        sa.Column('exercise_id', sa.Integer(), nullable=False),
        sa.Column('log_date', sa.Date(), nullable=False),
        sa.Column('sets_completed', sa.Integer(), nullable=True),
        sa.Column('reps_completed', sa.String(), nullable=True),
        sa.Column('weight_kg', sa.Float(), nullable=True),
        sa.Column('duration_minutes', sa.Integer(), nullable=True),
        sa.Column('calories_burned', sa.Float(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['exercise_id'], ['exercises.id'], ),
        sa.ForeignKeyConstraint(['member_id'], ['gym_members.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_workout_progress_exercise_id'), 'workout_progress', ['exercise_id'], unique=False)
    op.create_index(op.f('ix_workout_progress_id'), 'workout_progress', ['id'], unique=False)
    op.create_index(op.f('ix_workout_progress_log_date'), 'workout_progress', ['log_date'], unique=False)
    op.create_index(op.f('ix_workout_progress_member_id'), 'workout_progress', ['member_id'], unique=False)

    # Diet Plans table
    op.create_table(
        'diet_plans',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('trainer_id', sa.Integer(), nullable=True),
        sa.Column('daily_calories', sa.Integer(), nullable=True),
        sa.Column('protein_grams', sa.Float(), nullable=True),
        sa.Column('carbs_grams', sa.Float(), nullable=True),
        sa.Column('fats_grams', sa.Float(), nullable=True),
        sa.Column('water_liters', sa.Float(), nullable=True),
        sa.Column('goal', sa.String(), nullable=True),
        sa.Column('is_template', sa.Boolean(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['trainer_id'], ['gym_staff.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_diet_plans_id'), 'diet_plans', ['id'], unique=False)

    # Diet Meals table
    op.create_table(
        'diet_meals',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('plan_id', sa.Integer(), nullable=False),
        sa.Column('meal_type', sa.String(), nullable=False),
        sa.Column('meal_name', sa.String(), nullable=False),
        sa.Column('foods', sa.Text(), nullable=True),
        sa.Column('calories', sa.Float(), nullable=True),
        sa.Column('protein', sa.Float(), nullable=True),
        sa.Column('carbs', sa.Float(), nullable=True),
        sa.Column('fats', sa.Float(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['plan_id'], ['diet_plans.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_diet_meals_id'), 'diet_meals', ['id'], unique=False)
    op.create_index(op.f('ix_diet_meals_plan_id'), 'diet_meals', ['plan_id'], unique=False)

    # Member Diet Plans table
    op.create_table(
        'member_diet_plans',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('member_id', sa.Integer(), nullable=False),
        sa.Column('plan_id', sa.Integer(), nullable=False),
        sa.Column('trainer_id', sa.Integer(), nullable=True),
        sa.Column('start_date', sa.Date(), nullable=False),
        sa.Column('end_date', sa.Date(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('trainer_notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['member_id'], ['gym_members.id'], ),
        sa.ForeignKeyConstraint(['plan_id'], ['diet_plans.id'], ),
        sa.ForeignKeyConstraint(['trainer_id'], ['gym_staff.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_member_diet_plans_id'), 'member_diet_plans', ['id'], unique=False)
    op.create_index(op.f('ix_member_diet_plans_member_id'), 'member_diet_plans', ['member_id'], unique=False)

    # Gym Payments table
    op.create_table(
        'gym_payments',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('payment_number', sa.String(), nullable=False),
        sa.Column('member_id', sa.Integer(), nullable=False),
        sa.Column('subscription_id', sa.Integer(), nullable=True),
        sa.Column('branch_id', sa.Integer(), nullable=False),
        sa.Column('amount', sa.Float(), nullable=False),
        sa.Column('discount_amount', sa.Float(), nullable=True),
        sa.Column('tax_amount', sa.Float(), nullable=True),
        sa.Column('total_amount', sa.Float(), nullable=False),
        sa.Column('paid_amount', sa.Float(), nullable=True),
        sa.Column('remaining_amount', sa.Float(), nullable=True),
        sa.Column('payment_method', sa.String(), nullable=True),
        sa.Column('payment_date', sa.Date(), nullable=False),
        sa.Column('payment_reference', sa.String(), nullable=True),
        sa.Column('status', sa.String(), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['branch_id'], ['branches.id'], ),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
        sa.ForeignKeyConstraint(['member_id'], ['gym_members.id'], ),
        sa.ForeignKeyConstraint(['subscription_id'], ['membership_subscriptions.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('payment_number')
    )
    op.create_index(op.f('ix_gym_payments_branch_id'), 'gym_payments', ['branch_id'], unique=False)
    op.create_index(op.f('ix_gym_payments_id'), 'gym_payments', ['id'], unique=False)
    op.create_index(op.f('ix_gym_payments_member_id'), 'gym_payments', ['member_id'], unique=False)
    op.create_index(op.f('ix_gym_payments_payment_number'), 'gym_payments', ['payment_number'], unique=False)

    # Gym Inventory Items table
    op.create_table(
        'gym_inventory_items',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('item_code', sa.String(), nullable=False),
        sa.Column('branch_id', sa.Integer(), nullable=False),
        sa.Column('category', sa.String(), nullable=True),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('brand', sa.String(), nullable=True),
        sa.Column('unit', sa.String(), nullable=True),
        sa.Column('quantity', sa.Float(), nullable=False),
        sa.Column('minimum_stock', sa.Float(), nullable=True),
        sa.Column('maximum_stock', sa.Float(), nullable=True),
        sa.Column('unit_price', sa.Float(), nullable=True),
        sa.Column('supplier_id', sa.Integer(), nullable=True),
        sa.Column('expiry_date', sa.Date(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['branch_id'], ['branches.id'], ),
        sa.ForeignKeyConstraint(['supplier_id'], ['suppliers.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('item_code')
    )
    op.create_index(op.f('ix_gym_inventory_items_branch_id'), 'gym_inventory_items', ['branch_id'], unique=False)
    op.create_index(op.f('ix_gym_inventory_items_id'), 'gym_inventory_items', ['id'], unique=False)
    op.create_index(op.f('ix_gym_inventory_items_item_code'), 'gym_inventory_items', ['item_code'], unique=False)

    # Gym Equipment table
    op.create_table(
        'gym_equipment',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('branch_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('brand', sa.String(), nullable=True),
        sa.Column('model', sa.String(), nullable=True),
        sa.Column('serial_number', sa.String(), nullable=True),
        sa.Column('category', sa.String(), nullable=True),
        sa.Column('purchase_date', sa.Date(), nullable=True),
        sa.Column('purchase_price', sa.Float(), nullable=True),
        sa.Column('warranty_expiry', sa.Date(), nullable=True),
        sa.Column('expected_lifespan_years', sa.Integer(), nullable=True),
        sa.Column('replacement_date', sa.Date(), nullable=True),
        sa.Column('status', sa.String(), nullable=False),
        sa.Column('last_maintenance_date', sa.Date(), nullable=True),
        sa.Column('next_maintenance_date', sa.Date(), nullable=True),
        sa.Column('maintenance_interval_days', sa.Integer(), nullable=True),
        sa.Column('location', sa.String(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('image_url', sa.String(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['branch_id'], ['branches.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_gym_equipment_branch_id'), 'gym_equipment', ['branch_id'], unique=False)
    op.create_index(op.f('ix_gym_equipment_id'), 'gym_equipment', ['id'], unique=False)
    op.create_index(op.f('ix_gym_equipment_name'), 'gym_equipment', ['name'], unique=False)
    op.create_index(op.f('ix_gym_equipment_serial_number'), 'gym_equipment', ['serial_number'], unique=False)

    # Equipment Maintenance table
    op.create_table(
        'equipment_maintenance',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('equipment_id', sa.Integer(), nullable=False),
        sa.Column('maintenance_date', sa.Date(), nullable=False),
        sa.Column('maintenance_type', sa.String(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('cost', sa.Float(), nullable=True),
        sa.Column('technician_name', sa.String(), nullable=True),
        sa.Column('technician_contact', sa.String(), nullable=True),
        sa.Column('next_due_date', sa.Date(), nullable=True),
        sa.Column('status', sa.String(), nullable=True),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
        sa.ForeignKeyConstraint(['equipment_id'], ['gym_equipment.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_equipment_maintenance_equipment_id'), 'equipment_maintenance', ['equipment_id'], unique=False)
    op.create_index(op.f('ix_equipment_maintenance_id'), 'equipment_maintenance', ['id'], unique=False)


def downgrade():
    op.drop_index(op.f('ix_equipment_maintenance_id'), table_name='equipment_maintenance')
    op.drop_index(op.f('ix_equipment_maintenance_equipment_id'), table_name='equipment_maintenance')
    op.drop_table('equipment_maintenance')
    
    op.drop_index(op.f('ix_gym_equipment_serial_number'), table_name='gym_equipment')
    op.drop_index(op.f('ix_gym_equipment_name'), table_name='gym_equipment')
    op.drop_index(op.f('ix_gym_equipment_id'), table_name='gym_equipment')
    op.drop_index(op.f('ix_gym_equipment_branch_id'), table_name='gym_equipment')
    op.drop_table('gym_equipment')
    
    op.drop_index(op.f('ix_gym_inventory_items_item_code'), table_name='gym_inventory_items')
    op.drop_index(op.f('ix_gym_inventory_items_id'), table_name='gym_inventory_items')
    op.drop_index(op.f('ix_gym_inventory_items_branch_id'), table_name='gym_inventory_items')
    op.drop_table('gym_inventory_items')
    
    op.drop_index(op.f('ix_gym_payments_payment_number'), table_name='gym_payments')
    op.drop_index(op.f('ix_gym_payments_member_id'), table_name='gym_payments')
    op.drop_index(op.f('ix_gym_payments_id'), table_name='gym_payments')
    op.drop_index(op.f('ix_gym_payments_branch_id'), table_name='gym_payments')
    op.drop_table('gym_payments')
    
    op.drop_index(op.f('ix_member_diet_plans_member_id'), table_name='member_diet_plans')
    op.drop_index(op.f('ix_member_diet_plans_id'), table_name='member_diet_plans')
    op.drop_table('member_diet_plans')
    
    op.drop_index(op.f('ix_diet_meals_plan_id'), table_name='diet_meals')
    op.drop_index(op.f('ix_diet_meals_id'), table_name='diet_meals')
    op.drop_table('diet_meals')
    
    op.drop_index(op.f('ix_diet_plans_id'), table_name='diet_plans')
    op.drop_table('diet_plans')
    
    op.drop_index(op.f('ix_workout_progress_member_id'), table_name='workout_progress')
    op.drop_index(op.f('ix_workout_progress_log_date'), table_name='workout_progress')
    op.drop_index(op.f('ix_workout_progress_id'), table_name='workout_progress')
    op.drop_index(op.f('ix_workout_progress_exercise_id'), table_name='workout_progress')
    op.drop_table('workout_progress')
    
    op.drop_index(op.f('ix_member_workout_plans_member_id'), table_name='member_workout_plans')
    op.drop_index(op.f('ix_member_workout_plans_id'), table_name='member_workout_plans')
    op.drop_table('member_workout_plans')
    
    op.drop_index(op.f('ix_workout_plan_exercises_plan_id'), table_name='workout_plan_exercises')
    op.drop_index(op.f('ix_workout_plan_exercises_id'), table_name='workout_plan_exercises')
    op.drop_index(op.f('ix_workout_plan_exercises_exercise_id'), table_name='workout_plan_exercises')
    op.drop_table('workout_plan_exercises')
    
    op.drop_index(op.f('ix_workout_plans_id'), table_name='workout_plans')
    op.drop_table('workout_plans')
    
    op.drop_index(op.f('ix_exercises_name'), table_name='exercises')
    op.drop_index(op.f('ix_exercises_id'), table_name='exercises')
    op.drop_table('exercises')
    
    op.drop_index(op.f('ix_device_sync_logs_id'), table_name='device_sync_logs')
    op.drop_index(op.f('ix_device_sync_logs_device_id'), table_name='device_sync_logs')
    op.drop_table('device_sync_logs')
    
    op.drop_index(op.f('ix_biometric_devices_serial_number'), table_name='biometric_devices')
    op.drop_index(op.f('ix_biometric_devices_id'), table_name='biometric_devices')
    op.drop_index(op.f('ix_biometric_devices_branch_id'), table_name='biometric_devices')
    op.drop_table('biometric_devices')
    
    op.drop_index(op.f('ix_trainer_schedules_trainer_id'), table_name='trainer_schedules')
    op.drop_index(op.f('ix_trainer_schedules_id'), table_name='trainer_schedules')
    op.drop_table('trainer_schedules')
    
    op.drop_index(op.f('ix_staff_attendance_staff_id'), table_name='staff_attendance')
    op.drop_index(op.f('ix_staff_attendance_id'), table_name='staff_attendance')
    op.drop_index(op.f('ix_staff_attendance_branch_id'), table_name='staff_attendance')
    op.drop_index(op.f('ix_staff_attendance_attendance_date'), table_name='staff_attendance')
    op.drop_table('staff_attendance')
    
    op.drop_index(op.f('ix_gym_attendance_member_id'), table_name='gym_attendance')
    op.drop_index(op.f('ix_gym_attendance_id'), table_name='gym_attendance')
    op.drop_index(op.f('ix_gym_attendance_branch_id'), table_name='gym_attendance')
    op.drop_index(op.f('ix_gym_attendance_attendance_date'), table_name='gym_attendance')
    op.drop_table('gym_attendance')
    
    op.drop_index(op.f('ix_membership_transfers_id'), table_name='membership_transfers')
    op.drop_table('membership_transfers')
    
    op.drop_index(op.f('ix_membership_freezes_subscription_id'), table_name='membership_freezes')
    op.drop_index(op.f('ix_membership_freezes_id'), table_name='membership_freezes')
    op.drop_table('membership_freezes')
    
    op.drop_index(op.f('ix_membership_subscriptions_plan_id'), table_name='membership_subscriptions')
    op.drop_index(op.f('ix_membership_subscriptions_member_id'), table_name='membership_subscriptions')
    op.drop_index(op.f('ix_membership_subscriptions_id'), table_name='membership_subscriptions')
    op.drop_index(op.f('ix_membership_subscriptions_branch_id'), table_name='membership_subscriptions')
    op.drop_table('membership_subscriptions')
    
    op.drop_index(op.f('ix_membership_plans_name'), table_name='membership_plans')
    op.drop_index(op.f('ix_membership_plans_id'), table_name='membership_plans')
    op.drop_table('membership_plans')
    
    op.drop_index(op.f('ix_gym_staff_staff_code'), table_name='gym_staff')
    op.drop_index(op.f('ix_gym_staff_id'), table_name='gym_staff')
    op.drop_index(op.f('ix_gym_staff_email'), table_name='gym_staff')
    op.drop_index(op.f('ix_gym_staff_branch_id'), table_name='gym_staff')
    op.drop_table('gym_staff')
    
    op.drop_index(op.f('ix_gym_members_member_code'), table_name='gym_members')
    op.drop_index(op.f('ix_gym_members_id'), table_name='gym_members')
    op.drop_index(op.f('ix_gym_members_email'), table_name='gym_members')
    op.drop_index(op.f('ix_gym_members_cnic'), table_name='gym_members')
    op.drop_index(op.f('ix_gym_members_branch_id'), table_name='gym_members')
    op.drop_table('gym_members')
    
    op.drop_index(op.f('ix_branches_name'), table_name='branches')
    op.drop_index(op.f('ix_branches_id'), table_name='branches')
    op.drop_table('branches')
