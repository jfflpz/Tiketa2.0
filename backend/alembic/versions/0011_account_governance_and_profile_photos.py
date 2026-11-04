"""account_governance_and_profile_photos

Revision ID: 0011_account_governance
Revises: 0010_four_tier_rbac
Create Date: 2026-11-03 13:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0011_account_governance"
down_revision: Union[str, None] = "0010_four_tier_rbac"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Update account_requests table
    op.add_column(
        "account_requests",
        sa.Column(
            "request_type",
            sa.String(length=20),
            nullable=False,
            server_default="create",
        ),
    )
    op.add_column(
        "account_requests",
        sa.Column("target_user_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_foreign_key(
        "fk_account_requests_target_user",
        "account_requests",
        "users",
        ["target_user_id"],
        ["id"],
        ondelete="SET NULL",
    )

    # Update role check constraint on account_requests to include supervisor
    op.drop_constraint("ck_account_requests_role", "account_requests", type_="check")
    op.create_check_constraint(
        "ck_account_requests_role",
        "account_requests",
        "role IN ('intern', 'it', 'supervisor')",
    )
    op.create_check_constraint(
        "ck_account_requests_type",
        "account_requests",
        "request_type IN ('create', 'deactivate')",
    )

    # Partial unique indexes for pending requests
    op.create_index(
        "uq_pending_create_username",
        "account_requests",
        [sa.text("lower(username)")],
        unique=True,
        postgresql_where=sa.text("status = 'pending' AND request_type = 'create'"),
    )
    op.create_index(
        "uq_pending_create_email",
        "account_requests",
        [sa.text("lower(email)")],
        unique=True,
        postgresql_where=sa.text("status = 'pending' AND request_type = 'create'"),
    )
    op.create_index(
        "uq_pending_deactivate_target",
        "account_requests",
        ["target_user_id"],
        unique=True,
        postgresql_where=sa.text("status = 'pending' AND request_type = 'deactivate'"),
    )

    # 2. Create user_profile_photos table
    op.create_table(
        "user_profile_photos",
        sa.Column("user_id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("photo_enc", sa.Text(), nullable=False),
        sa.Column("mime_type", sa.String(length=50), nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
    )


def downgrade() -> None:
    op.drop_table("user_profile_photos")
    op.drop_index("uq_pending_deactivate_target", table_name="account_requests")
    op.drop_index("uq_pending_create_email", table_name="account_requests")
    op.drop_index("uq_pending_create_username", table_name="account_requests")
    op.drop_constraint("ck_account_requests_type", "account_requests", type_="check")
    op.drop_constraint("ck_account_requests_role", "account_requests", type_="check")
    op.create_check_constraint(
        "ck_account_requests_role",
        "account_requests",
        "role IN ('intern', 'it')",
    )
    op.drop_constraint(
        "fk_account_requests_target_user", "account_requests", type_="foreignkey"
    )
    op.drop_column("account_requests", "target_user_id")
    op.drop_column("account_requests", "request_type")