"""employee verification & comments

Revision ID: 0008_employee_verification
Revises: 0007_repair_notes_and_checklists
"""

import sqlalchemy as sa
from alembic import op

revision = "0008_employee_verification"
down_revision = "0007_repair_notes_and_checklists"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = inspector.get_table_names()
    if "ticket_comments" in tables:
        columns = [c["name"] for c in inspector.get_columns("ticket_comments")]
        if "author_name" not in columns:
            op.add_column(
                "ticket_comments",
                sa.Column("author_name", sa.String(100), nullable=True),
            )
        if "author_role" not in columns:
            op.add_column(
                "ticket_comments",
                sa.Column(
                    "author_role", sa.String(20), nullable=True, server_default="it"
                ),
            )
        op.alter_column(
            "ticket_comments",
            "user_id",
            existing_type=sa.UUID(),
            nullable=True,
        )


def downgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = inspector.get_table_names()
    if "ticket_comments" in tables:
        columns = [c["name"] for c in inspector.get_columns("ticket_comments")]
        if "author_role" in columns:
            op.drop_column("ticket_comments", "author_role")
        if "author_name" in columns:
            op.drop_column("ticket_comments", "author_name")
        op.execute("DELETE FROM ticket_comments WHERE user_id IS NULL")
        op.alter_column(
            "ticket_comments",
            "user_id",
            existing_type=sa.UUID(),
            nullable=False,
        )
