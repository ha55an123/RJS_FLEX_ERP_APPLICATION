from app.core.database import SessionLocal
from app.models.user import User, UserRole
from app.models import employee  # noqa: F401 - Import to ensure Employee model is registered

def update_user_role(email: str, new_role: UserRole):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            print(f"❌ User with email '{email}' not found")
            return False
        
        old_role = user.role
        user.role = new_role
        db.commit()
        db.refresh(user)
        
        print(f"✅ User '{user.username}' ({email}) role updated from '{old_role.value}' to '{new_role.value}'")
        return True
    except Exception as e:
        print(f"❌ Error updating user role: {e}")
        db.rollback()
        return False
    finally:
        db.close()

if __name__ == "__main__":
    email = "hairfan545@gmail.com"
    new_role = UserRole.SUPER_ADMIN
    update_user_role(email, new_role)
