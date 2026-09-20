# Import all models to ensure they're registered with SQLAlchemy
# Order matters for relationships - import base models first

# Core models that others depend on
from app.models.user import User
from app.models import otp
from app.models import device
from app.models import audit_log
from app.models import order
from app.models import invoice
from app.models import purchase
from app.models import attendance_payroll
from app.models import production_payroll
from app.models import accounting
from app.models import employee

# Gym models - import branch AFTER user since Branch references User
from app.models.branch import Branch
from app.models.gym_member import GymMember
from app.models.gym_staff import GymStaff
from app.models.membership import MembershipSubscription, MembershipPlan
from app.models.gym_attendance import GymAttendance
from app.models.biometric_device import BiometricDevice
from app.models.workout import WorkoutPlan, MemberWorkoutPlan, WorkoutProgress
from app.models.diet import MealPlan, MemberDietPlan, NutritionLog
from app.models.gym_equipment import GymEquipment
from app.models.gym_inventory import GymInventoryItem
from app.models.gym_payment import GymPayment
from app.models.discount import Discount
from app.models.outlet import Outlet
from app.models.security import LoginAuditLog
from app.models.token_blacklist import TokenBlacklist
from app.models.face_biometric import FaceBiometric, FaceRecognitionLog

__all__ = [
    'User', 'otp', 'device', 'audit_log', 'order', 'invoice', 'purchase',
    'attendance_payroll', 'production_payroll', 'accounting', 'employee',
    'Branch', 'GymMember', 'GymStaff', 'MembershipSubscription', 'MembershipPlan',
    'GymAttendance', 'BiometricDevice', 'WorkoutPlan', 'MemberWorkoutPlan', 'WorkoutProgress',
    'MealPlan', 'MemberDietPlan', 'NutritionLog', 'GymEquipment', 'GymInventoryItem',
    'GymPayment', 'Discount', 'Outlet', 'LoginAuditLog', 'TokenBlacklist',
    'FaceBiometric', 'FaceRecognitionLog',
]
