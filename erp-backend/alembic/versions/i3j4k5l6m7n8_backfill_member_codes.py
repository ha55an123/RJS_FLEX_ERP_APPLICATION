"""backfill member codes to RJS-XXXXXX format

Revision ID: i3j4k5l6m7n8
Revises: h2i3j4k5l6m7
Create Date: 2026-09-16 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
import re

revision = 'i3j4k5l6m7n8'
down_revision = 'h2i3j4k5l6m7'
branch_labels = None
depends_on = None

RJS_PATTERN = re.compile(r"^RJS-(\d{6})$", re.IGNORECASE)


def _format_code(seq: int) -> str:
    return f"RJS-{seq:06d}"


def upgrade():
    conn = op.get_bind()
    rows = conn.execute(
        sa.text(
            "SELECT id, member_code FROM gym_members ORDER BY id ASC"
        )
    ).fetchall()

    used_codes = set()
    max_seq = 0
    needs_backfill = []

    for row in rows:
        code = (row.member_code or "").strip().upper()
        match = RJS_PATTERN.match(code)
        if match:
            used_codes.add(code)
            max_seq = max(max_seq, int(match.group(1)))
        else:
            needs_backfill.append(row.id)

    next_seq = max_seq + 1
    for member_id in needs_backfill:
        while _format_code(next_seq) in used_codes:
            next_seq += 1
        new_code = _format_code(next_seq)
        used_codes.add(new_code)
        conn.execute(
            sa.text(
                "UPDATE gym_members SET member_code = :code, "
                "barcode = COALESCE(barcode, :code), "
                "qr_code = COALESCE(qr_code, :code) "
                "WHERE id = :id"
            ),
            {"code": new_code, "id": member_id},
        )
        next_seq += 1


def downgrade():
    # Data migration — member codes are not reverted.
    pass
