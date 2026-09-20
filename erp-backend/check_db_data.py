#!/usr/bin/env python3
"""Script to check database data for gym models"""

# Import all models in correct order first
from app.models import branch, gym_member, gym_staff, membership

from app.core.database import SessionLocal
from app.models.gym_staff import GymStaff
from app.models.membership import MembershipSubscription, MembershipPlan

db = SessionLocal()
try:
    # Check staff count
    staff_count = db.query(GymStaff).count()
    print(f'Total staff: {staff_count}')
    
    # Check subscriptions count
    subs_count = db.query(MembershipSubscription).count()
    print(f'Total subscriptions: {subs_count}')
    
    # Check plans count
    plans_count = db.query(MembershipPlan).count()
    print(f'Total plans: {plans_count}')
    
    # Show sample staff data
    if staff_count > 0:
        staff = db.query(GymStaff).first()
        print(f'Sample staff: id={staff.id}, first_name={staff.first_name}, role={staff.role}')
    
    # Show sample plan data
    if plans_count > 0:
        plan = db.query(MembershipPlan).first()
        print(f'Sample plan: id={plan.id}, name={plan.name}, is_active={plan.is_active}')
        
finally:
    db.close()
