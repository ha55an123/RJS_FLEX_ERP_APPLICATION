"""Sequential member ID generation (RJS-000001 format)."""

import re
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.models.gym_member import GymMember

MEMBER_CODE_PREFIX = "RJS"
MEMBER_CODE_PATTERN = re.compile(r"^RJS-(\d{6})$")


def parse_member_sequence(member_code: str | None) -> int | None:
    if not member_code:
        return None
    match = MEMBER_CODE_PATTERN.match(member_code.strip().upper())
    if not match:
        return None
    return int(match.group(1))


def format_member_code(sequence: int) -> str:
    return f"{MEMBER_CODE_PREFIX}-{sequence:06d}"


def next_member_sequence(db: Session) -> int:
    """Return the next available sequence number based on existing RJS-XXXXXX codes."""
    codes = (
        db.query(GymMember.member_code)
        .filter(GymMember.member_code.ilike(f"{MEMBER_CODE_PREFIX}-%"))
        .all()
    )
    max_seq = 0
    for (code,) in codes:
        seq = parse_member_sequence(code)
        if seq is not None:
            max_seq = max(max_seq, seq)
    return max_seq + 1


def generate_member_code(db: Session) -> str:
    """
    Generate the next sequential member code.
    Retries on unique-constraint conflicts for concurrent creates.
    """
    for _ in range(10):
        seq = next_member_sequence(db)
        code = format_member_code(seq)
        exists = db.query(GymMember.id).filter(GymMember.member_code == code).first()
        if not exists:
            return code
    raise RuntimeError("Unable to generate a unique member code")


def assign_member_code(db: Session, member: GymMember) -> str:
    """Assign a member code to a member record and persist it."""
    if member.member_code and parse_member_sequence(member.member_code):
        return member.member_code

    for _ in range(10):
        code = generate_member_code(db)
        member.member_code = code
        member.barcode = member.barcode or code
        member.qr_code = member.qr_code or code
        try:
            with db.begin_nested():
                db.flush()
            return code
        except IntegrityError:
            db.expire(member)
            member.member_code = None
    raise RuntimeError("Unable to assign a unique member code")
