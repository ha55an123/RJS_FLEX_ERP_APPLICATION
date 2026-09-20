from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_token
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token")
    if payload.get("type") != "access":
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token type")
    user = db.query(User).filter(User.email == payload["sub"]).first()
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found")
    if not user.is_active:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "User disabled")
    return user


def require_role(required_roles: list):
    def role_checker(current_user: User = Depends(get_current_user)):
        user_role = current_user.role.value if hasattr(current_user.role, 'value') else str(current_user.role).lower()
        if user_role not in [r.lower() for r in required_roles]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"You do not have permission to access this resource. Required roles: {required_roles}, Your role: {user_role}",
            )
        return current_user
    return role_checker


# ── Convenience role groups ───────────────────────────────────────────────────
ADMIN_ROLES    = ["super_admin", "gym_owner"]
MANAGER_ROLES  = ["super_admin", "gym_owner", "manager"]
STAFF_ROLES    = ["super_admin", "gym_owner", "manager", "receptionist", "trainer", "accountant"]
ALL_ROLES      = ["super_admin", "gym_owner", "manager", "receptionist", "trainer", "accountant", "member"]
