from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordRequestForm
from datetime import datetime, timedelta
import random

from app.core.database import get_db
from app.core.security import (
    verify_password, get_password_hash,
    create_access_token, create_refresh_token, decode_token
)
from app.core.auth_dependencies import get_current_user
from app.core.email_service import send_otp_email, send_reset_otp_email
from app.models.user import User
from app.models.otp import UserOTP

router = APIRouter(prefix="/auth", tags=["Auth"])


def _generate_otp() -> str:
    return str(random.randint(100000, 999999))


def _display_name(user: User) -> str:
    """Return employee full name if linked, otherwise fall back to username."""
    if user.employee and user.employee.full_name:
        return user.employee.full_name
    return user.username


@router.post("/login")
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    # Allow login with either username or email
    user = (
        db.query(User).filter(User.username == form_data.username).first()
        or db.query(User).filter(User.email == form_data.username).first()
    )
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect username or password")
    if not user.is_active:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Account disabled")

    # Invalidate old unused OTPs (login type only)
    db.query(UserOTP).filter(
        UserOTP.user_id == user.id,
        UserOTP.is_used == False,  # noqa: E712
    ).update({"is_used": True})

    otp_code = _generate_otp()
    db.add(UserOTP(
        user_id=user.id,
        otp_code=otp_code,
        expires_at=datetime.utcnow() + timedelta(minutes=5),
    ))
    db.commit()

    try:
        send_otp_email(user.email, otp_code)
    except Exception as e:
        print(f"[EMAIL ERROR] {e} — OTP for {user.email}: {otp_code}")

    return {"message": "OTP sent to registered email"}


@router.post("/verify-otp")
def verify_otp(email: str, otp: str, db: Session = Depends(get_db)):
    # Support lookup by username or email
    user = (
        db.query(User).filter(User.email == email).first()
        or db.query(User).filter(User.username == email).first()
    )
    if not user:
        raise HTTPException(404, "User not found")

    record = (
        db.query(UserOTP)
        .filter(
            UserOTP.user_id == user.id,
            UserOTP.otp_code == otp,
            UserOTP.is_used == False,  # noqa: E712
            UserOTP.expires_at > datetime.utcnow(),
        )
        .order_by(UserOTP.created_at.desc())
        .first()
    )

    if not record:
        raise HTTPException(400, "Invalid or expired OTP")

    record.is_used = True
    user.last_login = datetime.utcnow()
    db.commit()

    return {
        "access_token": create_access_token({
            "sub": user.email,
            "role": user.role.value,
            "name": _display_name(user),
        }),
        "refresh_token": create_refresh_token({"sub": user.email}),
        "token_type": "bearer",
    }


@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {
        "email": current_user.email,
        "username": current_user.username,
        "role": current_user.role.value,
        "name": _display_name(current_user),
        "is_active": current_user.is_active,
    }


@router.post("/refresh")
def refresh(token: str, db: Session = Depends(get_db)):
    payload = decode_token(token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(401, "Invalid refresh token")

    user = db.query(User).filter(User.email == payload["sub"]).first()
    if not user:
        raise HTTPException(404, "User not found")

    return {"access_token": create_access_token({
        "sub": user.email,
        "role": user.role.value,
        "name": _display_name(user),
    })}


@router.get("/me")
def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current authenticated user info."""
    return {
        "sub": current_user.email,
        "role": current_user.role.value,
        "name": _display_name(current_user),
    }


@router.post("/logout")
def logout():
    return {"message": "Logged out successfully"}


# ─── Forgot Password ──────────────────────────────────────────────────────────

@router.post("/forgot-password")
def forgot_password(email: str, db: Session = Depends(get_db)):
    """Step 1 — send a reset OTP to the user's email."""
    user = (
        db.query(User).filter(User.email == email).first()
        or db.query(User).filter(User.username == email).first()
    )
    # Always return the same message to prevent user enumeration
    if not user:
        return {"message": "If that account exists, a reset OTP has been sent"}

    # Invalidate any existing reset OTPs
    db.query(UserOTP).filter(
        UserOTP.user_id == user.id,
        UserOTP.otp_type == "reset",
        UserOTP.is_used == False,  # noqa: E712
    ).update({"is_used": True})

    otp_code = _generate_otp()
    db.add(UserOTP(
        user_id=user.id,
        otp_code=otp_code,
        otp_type="reset",
        expires_at=datetime.utcnow() + timedelta(minutes=10),
    ))
    db.commit()

    try:
        send_reset_otp_email(user.email, otp_code)
    except Exception as e:
        print(f"[EMAIL ERROR] {e} — Reset OTP for {user.email}: {otp_code}")

    return {"message": "If that account exists, a reset OTP has been sent"}


@router.post("/verify-reset-otp")
def verify_reset_otp(email: str, otp: str, db: Session = Depends(get_db)):
    """Step 2 — verify the reset OTP and return a short-lived reset token."""
    user = (
        db.query(User).filter(User.email == email).first()
        or db.query(User).filter(User.username == email).first()
    )
    if not user:
        raise HTTPException(400, "Invalid or expired OTP")

    record = (
        db.query(UserOTP)
        .filter(
            UserOTP.user_id == user.id,
            UserOTP.otp_code == otp,
            UserOTP.otp_type == "reset",
            UserOTP.is_used == False,  # noqa: E712
            UserOTP.expires_at > datetime.utcnow(),
        )
        .order_by(UserOTP.created_at.desc())
        .first()
    )
    if not record:
        raise HTTPException(400, "Invalid or expired OTP")

    record.is_used = True
    db.commit()

    # Issue a short-lived reset token (5 min), type="reset" so it can't be used as access token
    reset_token = create_access_token(
        {"sub": user.email, "type": "reset"},
        expires_minutes=5,
    )
    return {"reset_token": reset_token}


@router.post("/reset-password")
def reset_password(reset_token: str, new_password: str, db: Session = Depends(get_db)):
    """Step 3 — set the new password using the reset token."""
    payload = decode_token(reset_token)
    if not payload or payload.get("type") != "reset":
        raise HTTPException(400, "Invalid or expired reset token")

    user = db.query(User).filter(User.email == payload["sub"]).first()
    if not user:
        raise HTTPException(400, "Invalid or expired reset token")

    if len(new_password) < 6:
        raise HTTPException(400, "Password must be at least 6 characters")

    user.hashed_password = get_password_hash(new_password)
    user.updated_at = datetime.utcnow()
    db.commit()
    return {"message": "Password reset successfully"}


# ─── Registration ─────────────────────────────────────────────────────────────

from pydantic import BaseModel


class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str
    full_name: str = None


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(data: RegisterRequest, db: Session = Depends(get_db)):
    """Register a new user account."""
    # Check if username already exists
    if db.query(User).filter(User.username == data.username).first():
        raise HTTPException(400, "Username already taken")
    
    # Check if email already exists
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(400, "Email already registered")
    
    # Validate password
    if len(data.password) < 6:
        raise HTTPException(400, "Password must be at least 6 characters")
    
    # Create new user with MEMBER role (default for self-registration)
    from app.models.user import UserRole
    new_user = User(
        username=data.username,
        email=data.email,
        hashed_password=get_password_hash(data.password),
        role=UserRole.MEMBER,
        is_active=True,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return {"message": "Registration successful", "username": new_user.username, "role": new_user.role.value}
