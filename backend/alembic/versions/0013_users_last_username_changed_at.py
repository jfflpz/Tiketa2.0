"""Add last_username_changed_at to users for 168h cooldown

Revision ID: 0013_username_cooldown
Revises: 0012_location_dept_active
Create Date: 2026-11-05 14:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0013_username_cooldown"
down_revision: str | None = "0012_location_dept_active"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "last_username_changed_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )


def downgrade() -> None:
    op.drop_column("users", "last_username_changed_at")
