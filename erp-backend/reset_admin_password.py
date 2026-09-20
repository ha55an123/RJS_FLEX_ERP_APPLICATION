#!/usr/bin/env python3
"""Reset admin password to a known value for testing."""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.user import User
from app.core.security import get_password_hash

def reset_admin_password():
    """Reset admin password to 'admin123' for testing."""
    db = next(get_db())
    
    try:
        # Find admin user
        admin = db.query(User).filter(User.username == "admin").first()
        
        if not admin:
            print("Admin user not found. Creating...")
            admin = User(
                username="admin",
                email="admin@rjsflexgym.com",
                hashed_password=get_password_hash("admin123"),
                role="super_admin",
                is_active=True,
            )
            db.add(admin)
            db.commit()
            print("Admin user created with password: admin123")
        else:
            admin.hashed_password = get_password_hash("admin123")
            admin.is_active = True
            db.commit()
            print(f"Admin password reset to: admin123")
            print(f"Username: {admin.username}")
            print(f"Email: {admin.email}")
            print(f"Role: {admin.role.value}")
            
    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    reset_admin_password()
