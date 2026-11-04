"""add reported_issue_code, diagnosis_enc and resolution_notes_enc to tickets"""

import sqlalchemy as sa
from alembic import op

revision = "0004_reported_issue_diagnosis"
down_revision = "0003_report_index"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "tickets", sa.Column("reported_issue_code", sa.String(50), nullable=True)
    )
    op.create_foreign_key(
        "fk_tickets_reported_issue_code_task_categories",
        "tickets",
        "task_categories",
        ["reported_issue_code"],
        ["code"],
    )
    op.add_column("tickets", sa.Column("diagnosis_enc", sa.Text(), nullable=True))
    op.add_column(
        "tickets", sa.Column("resolution_notes_enc", sa.Text(), nullable=True)
    )


def downgrade():
    op.drop_column("tickets", "resolution_notes_enc")
    op.drop_column("tickets", "diagnosis_enc")
    op.drop_constraint(
        "fk_tickets_reported_issue_code_task_categories", "tickets", type_="foreignkey"
    )
    op.drop_column("tickets", "reported_issue_code")
