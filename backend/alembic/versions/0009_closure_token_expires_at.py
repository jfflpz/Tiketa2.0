"""add closure_token_expires_at to tickets

Revision ID: 0009_closure_token_expires_at
Revises: 0008_employee_verification
"""
import sqlalchemy as sa
from alembic import op

revision = "0009_closure_token_expires_at"
down_revision = "0008_employee_verification"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = inspector.get_table_names()
    if "tickets" in tables:
        columns = [c["name"] for c in inspector.get_columns("tickets")]
        if "closure_token_expires_at" not in columns:
            op.add_column(
                "tickets",
                sa.Column("closure_token_expires_at", sa.DateTime(timezone=True), nullable=True),
            )


def downgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = inspector.get_table_names()
    if "tickets" in tables:
        columns = [c["name"] for c in inspector.get_columns("tickets")]
        if "closure_token_expires_at" in columns:
            op.drop_column("tickets", "closure_token_expires_at")
