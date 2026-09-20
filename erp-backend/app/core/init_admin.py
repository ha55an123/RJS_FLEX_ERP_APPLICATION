import os
from sqlalchemy.orm import Session
from app.models.user import User, UserRole
from app.core.security import get_password_hash


def create_default_admin(db: Session) -> None:
    """Ensure hairfan545@gmail.com exists as super_admin. Idempotent."""
    target_email = "hairfan545@gmail.com"
    target_username = "hairfan545"

    existing = (
        db.query(User).filter(User.email == target_email).first()
        or db.query(User).filter(User.username == target_username).first()
    )

    if existing:
        # Upgrade role if needed
        if existing.role != UserRole.SUPER_ADMIN:
            existing.role = UserRole.SUPER_ADMIN
            existing.is_active = True
            db.commit()
            print(f"✓ Admin role upgraded for: {target_email}")
        else:
            print(f"✓ Admin already exists: {target_email}")
        return

    # Read password from env; fall back to a strong default that must be changed
    password = os.environ.get("ADMIN_PASSWORD", "GymAdmin@2024!")
    admin = User(
        username=target_username,
        email=target_email,
        hashed_password=get_password_hash(password),
        role=UserRole.SUPER_ADMIN,
        is_active=True,
    )
    db.add(admin)
    db.commit()
    print(f"✓ Admin created: {target_email} (set ADMIN_PASSWORD env var to customise)")

    # Also keep a fallback 'admin' account for local dev if it doesn't exist
    if not db.query(User).filter(User.username == "admin").first():
        fallback = User(
            username="admin",
            email="admin@rjsflexgym.com",
            hashed_password=get_password_hash(os.environ.get("ADMIN_PASSWORD", "GymAdmin@2024!")),
            role=UserRole.SUPER_ADMIN,
            is_active=True,
        )
        db.add(fallback)
        db.commit()
        print("✓ Fallback admin created: username=admin")
