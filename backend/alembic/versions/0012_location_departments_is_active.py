"""Add is_active to location_departments for soft configuration

Revision ID: 0012_location_dept_active
Revises: 0011_account_governance
Create Date: 2026-11-03 14:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0012_location_dept_active"
down_revision: str | None = "0011_account_governance"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "location_departments",
        sa.Column(
            "is_active",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
    )


def downgrade() -> None:
    op.drop_column("location_departments", "is_active")