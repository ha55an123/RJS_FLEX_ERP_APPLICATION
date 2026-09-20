#!/usr/bin/env python3
"""Seed script to create initial gym data using raw SQL"""

from app.core.database import engine
from sqlalchemy import text
from datetime import date

def seed_gym_data():
    with engine.connect() as conn:
        # Check if data already exists
        result = conn.execute(text('SELECT COUNT(*) FROM branches'))
        if result.scalar() > 0:
            print("Data already exists, skipping seed")
            return
        
        try:
            # Get admin user id
            result = conn.execute(text("SELECT id FROM users WHERE username = 'admin'"))
            admin_id = result.scalar()
            if not admin_id:
                print("Admin user not found")
                return
            
            # Create branch
            result = conn.execute(text("""
                INSERT INTO branches (name, code, address, city, phone, email, manager_id, is_active, opening_time, closing_time, capacity, created_at, updated_at)
                VALUES ('Main Gym', 'MAIN', '123 Fitness Street', 'Karachi', '0211234567', 'main@gym.com', :admin_id, TRUE, '06:00', '23:00', 500, NOW(), NOW())
                RETURNING id
            """), {"admin_id": admin_id})
            branch_id = result.scalar()
            print(f"Created branch: Main Gym (id={branch_id})")
            
            # Create membership plans
            plans = [
                ("Basic", "Access to gym equipment", "monthly", 30, 5000),
                ("Premium", "Access to gym + trainer sessions", "monthly", 30, 10000),
                ("Annual", "Full year access with all benefits", "annual", 365, 50000)
            ]
            
            for name, desc, duration_type, duration, price in plans:
                conn.execute(text("""
                    INSERT INTO membership_plans (name, description, duration_type, duration_days, price, is_active, created_at, updated_at)
                    VALUES (:name, :desc, :duration_type, :duration, :price, TRUE, NOW(), NOW())
                """), {"name": name, "desc": desc, "duration_type": duration_type, "duration": duration, "price": price})
            print(f"Created {len(plans)} membership plans")
            
            # Create staff members
            staff_data = [
                ("TR001", "Ahmed", "Khan", "male", "03001234567", "ahmed@gym.com", "trainer", "Senior Trainer", "Weight Training", 5, 50000),
                ("TR002", "Fatima", "Ali", "female", "03007654321", "fatima@gym.com", "trainer", "Yoga Instructor", "Yoga & Pilates", 3, 45000),
                ("RC001", "Sara", "Ahmed", "female", "03009876543", "sara@gym.com", "receptionist", "Front Desk", None, 2, 35000),
                ("MG001", "Ali", "Hassan", "male", "03001112233", "ali@gym.com", "manager", "Gym Manager", None, 8, 80000)
            ]
            
            for code, first, last, gender, phone, email, role, designation, spec, exp, salary in staff_data:
                conn.execute(text("""
                    INSERT INTO gym_staff (staff_code, branch_id, first_name, last_name, gender, phone, email, role, designation, specialization, experience_years, salary, status, is_active, joining_date, created_at, updated_at)
                    VALUES (:code, :branch_id, :first, :last, :gender, :phone, :email, :role, :designation, :spec, :exp, :salary, 'active', TRUE, CURRENT_DATE, NOW(), NOW())
                """), {"code": code, "branch_id": branch_id, "first": first, "last": last, "gender": gender, "phone": phone, "email": email, "role": role, "designation": designation, "spec": spec, "exp": exp, "salary": salary})
            
            print(f"Created {len(staff_data)} staff members")
            
            conn.commit()
            print("Seed data created successfully!")
            
        except Exception as e:
            conn.rollback()
            print(f"Error seeding data: {e}")
            raise

if __name__ == "__main__":
    seed_gym_data()
