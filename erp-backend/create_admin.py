#!/usr/bin/env python3
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.database import SessionLocal
from app.models.user import User, UserRole
from app.core.security import get_password_hash

def create_admin():
    db = SessionLocal()
    try:
        # Check if admin exists
        admin = db.query(User).filter(User.username == "admin").first()
        if admin:
            print(f"Admin user already exists: {admin.username}")
            return
        
        # Create admin
        admin = User(
            username="admin",
            email="admin@rjsflexgym.com",
            hashed_password=get_password_hash("admin123"),
            role=UserRole.SUPER_ADMIN,
            is_active=True
        )
        db.add(admin)
        db.commit()
        db.refresh(admin)
        print(f"✓ Admin user created successfully!")
        print(f"  Username: admin")
        print(f"  Password: admin123")
        print(f"  Email: admin@rjsflexgym.com")
        print(f"  Role: {admin.role.value}")
    except Exception as e:
        print(f"Error creating admin: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_admin()
