import uuid
from datetime import datetime, timedelta
from app.core.security import verify_password
from app.models.user import User
from app.models.device import UserDevice
from app.models.otp import UserOTP
from app.models.audit_log import AuditLog
from app.core.security import (
    create_access_token,
    create_refresh_token
)


def generate_otp():
    return str(uuid.uuid4().int)[:6]


def otp_expiry():
    return datetime.utcnow() + timedelta(minutes=5)


def login_user(db, user, request):
    device_id = str(uuid.uuid4())

    db.add(UserDevice(
        user_id=user.id,
        device_id=device_id,
        device_name=request.headers.get("user-agent")
    ))

    otp = generate_otp()

    db.add(UserOTP(
        user_id=user.id,
        otp_code=otp,
        expires_at=otp_expiry()
    ))

    db.add(AuditLog(
        user_id=user.id,
        action="LOGIN_ATTEMPT",
        timestamp=datetime.utcnow()
    ))

    db.commit()

    return device_id, otp
