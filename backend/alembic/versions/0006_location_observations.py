"""create location_observations table for optional telemetry

Revision ID: 0006_location_observations
Revises: 0005_numeric_employee_ids
"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0006_location_observations"
down_revision = "0005_numeric_employee_ids"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "location_observations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("session_id", sa.String(64), nullable=False, index=True),
        sa.Column("latitude", sa.Float(), nullable=False),
        sa.Column("longitude", sa.Float(), nullable=False),
        sa.Column("accuracy", sa.Float(), nullable=False),
        sa.Column("captured_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ip_digest", sa.String(64), nullable=False),
        sa.Column(
            "ticket_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("tickets.id", ondelete="SET NULL"),
            nullable=True,
            index=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_check_constraint(
        "ck_location_lat_range",
        "location_observations",
        "latitude >= -90.0 AND latitude <= 90.0",
    )
    op.create_check_constraint(
        "ck_location_lng_range",
        "location_observations",
        "longitude >= -180.0 AND longitude <= 180.0",
    )


def downgrade():
    op.drop_table("location_observations")
