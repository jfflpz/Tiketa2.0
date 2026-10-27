"""create repair_notes and ticket_checklists tables

Revision ID: 0007_repair_notes_and_checklists
Revises: 0006_location_observations
"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0007_repair_notes_and_checklists"
down_revision = "0006_location_observations"
branch_labels = None
depends_on = None


def upgrade():
    # 1. repair_notes
    op.create_table(
        "repair_notes",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column(
            "task_code",
            sa.String(50),
            sa.ForeignKey("task_categories.code", ondelete="RESTRICT"),
            nullable=False,
            index=True,
        ),
        sa.Column("symptom_and_fix_enc", sa.Text(), nullable=False),
        sa.Column(
            "author_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="RESTRICT"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "updated_by_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column(
            "source_ticket_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("tickets.id", ondelete="SET NULL"),
            nullable=True,
            index=True,
        ),
        sa.Column("revision", sa.Integer(), nullable=False, server_default="1"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.CheckConstraint("revision > 0", name="ck_repair_notes_revision"),
        sa.CheckConstraint(
            "length(trim(title)) > 0", name="ck_repair_notes_title_nonblank"
        ),
    )
    op.create_index(
        "ix_repair_notes_updated_id",
        "repair_notes",
        ["updated_at", "id"],
    )

    # 2. repair_note_steps
    op.create_table(
        "repair_note_steps",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "repair_note_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("repair_notes.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("text_enc", sa.Text(), nullable=False),
        sa.CheckConstraint("position >= 0", name="ck_repair_note_steps_position"),
        sa.UniqueConstraint(
            "repair_note_id", "position", name="uq_repair_note_steps_pos"
        ),
    )

    # 3. ticket_checklists
    op.create_table(
        "ticket_checklists",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "ticket_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("tickets.id", ondelete="CASCADE"),
            nullable=False,
            unique=True,
        ),
        sa.Column(
            "source_repair_note_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("repair_notes.id", ondelete="SET NULL"),
            nullable=True,
            index=True,
        ),
        sa.Column("source_revision", sa.Integer(), nullable=True),
        sa.Column("guide_title_snapshot", sa.String(200), nullable=True),
        sa.Column("guide_task_code_snapshot", sa.String(50), nullable=True),
        sa.Column("guide_body_enc", sa.Text(), nullable=True),
        sa.Column(
            "applied_by_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="RESTRICT"),
            nullable=True,
        ),
        sa.Column("applied_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_by_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column(
            "updated_by_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("revision", sa.Integer(), nullable=False, server_default="1"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.CheckConstraint("revision > 0", name="ck_ticket_checklists_revision"),
        sa.UniqueConstraint("ticket_id", name="uq_ticket_checklists_ticket"),
    )

    # 4. ticket_checklist_steps
    op.create_table(
        "ticket_checklist_steps",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "checklist_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("ticket_checklists.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("text_enc", sa.Text(), nullable=False),
        sa.Column(
            "completed", sa.Boolean(), nullable=False, server_default=sa.false()
        ),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "completed_by_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="RESTRICT"),
            nullable=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.CheckConstraint(
            "position >= 0", name="ck_ticket_checklist_steps_position"
        ),
        sa.CheckConstraint(
            "(completed = false AND completed_at IS NULL AND completed_by_id IS NULL) "
            "OR (completed = true AND completed_at IS NOT NULL AND completed_by_id IS NOT NULL)",
            name="ck_ticket_checklist_steps_completion",
        ),
        sa.UniqueConstraint(
            "checklist_id", "position", name="uq_ticket_checklist_steps_pos"
        ),
    )


def downgrade():
    op.drop_table("ticket_checklist_steps")
    op.drop_table("ticket_checklists")
    op.drop_table("repair_note_steps")
    op.drop_index("ix_repair_notes_updated_id", table_name="repair_notes")
    op.drop_table("repair_notes")
