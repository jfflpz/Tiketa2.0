"""complete operational schema"""

import sqlalchemy as sa
from alembic import op

revision = "0002_operations"
down_revision = "0001_employee_directory"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "task_categories",
        sa.Column("code", sa.String(length=50), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.PrimaryKeyConstraint("code"),
        sa.UniqueConstraint("name"),
    )
    op.create_table(
        "ticket_counters",
        sa.Column("month", sa.String(length=4), nullable=False),
        sa.Column("value", sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint("month"),
    )
    op.create_table(
        "location_departments",
        sa.Column("location_id", sa.UUID(), nullable=False),
        sa.Column("department_id", sa.UUID(), nullable=False),
        sa.Column("is_default", sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(
            ["department_id"],
            ["departments.id"],
        ),
        sa.ForeignKeyConstraint(
            ["location_id"],
            ["locations.id"],
        ),
        sa.PrimaryKeyConstraint("location_id", "department_id"),
    )
    op.create_table(
        "users",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("username", sa.String(length=50), nullable=False),
        sa.Column("email", sa.String(length=150), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("full_name", sa.String(length=150), nullable=False),
        sa.Column("role", sa.String(length=20), nullable=False),
        sa.Column("location_id", sa.UUID(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("token_version", sa.Integer(), server_default="0", nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint("role IN ('it', 'admin')", name="ck_users_role"),
        sa.ForeignKeyConstraint(
            ["location_id"],
            ["locations.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)
    op.create_index(op.f("ix_users_username"), "users", ["username"], unique=True)
    op.create_table(
        "maintenance_plans",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("location_id", sa.UUID(), nullable=False),
        sa.Column("department_id", sa.UUID(), nullable=False),
        sa.Column("task_code", sa.String(length=50), nullable=False),
        sa.Column("month_start", sa.Date(), nullable=False),
        sa.Column("due_date", sa.Date(), nullable=False),
        sa.Column("expected_services", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "task_code IN ('PC-PMS','PRN-PMS')", name="ck_maintenance_task"
        ),
        sa.CheckConstraint("due_date >= month_start", name="ck_maintenance_due"),
        sa.CheckConstraint("expected_services > 0", name="ck_maintenance_expected"),
        sa.ForeignKeyConstraint(
            ["department_id"],
            ["departments.id"],
        ),
        sa.ForeignKeyConstraint(
            ["location_id", "department_id"],
            ["location_departments.location_id", "location_departments.department_id"],
        ),
        sa.ForeignKeyConstraint(
            ["location_id"],
            ["locations.id"],
        ),
        sa.ForeignKeyConstraint(
            ["task_code"],
            ["task_categories.code"],
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "location_id",
            "department_id",
            "task_code",
            "month_start",
            name="uq_maintenance_scope",
        ),
    )
    op.create_table(
        "tickets",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("ticket_code", sa.String(length=30), nullable=False),
        sa.Column("employee_id", sa.UUID(), nullable=True),
        sa.Column("creator_id", sa.UUID(), nullable=True),
        sa.Column("company_id", sa.UUID(), nullable=False),
        sa.Column("location_id", sa.UUID(), nullable=False),
        sa.Column("department_id", sa.UUID(), nullable=False),
        sa.Column("requester_name", sa.String(length=150), nullable=False),
        sa.Column("requester_contact_enc", sa.Text(), nullable=True),
        sa.Column("task_code", sa.String(length=50), nullable=False),
        sa.Column("description_enc", sa.Text(), nullable=False),
        sa.Column("mode", sa.String(length=20), nullable=True),
        sa.Column("month", sa.String(length=30), nullable=False),
        sa.Column("date_started", sa.Date(), nullable=False),
        sa.Column("date_finished", sa.Date(), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("duration", sa.Numeric(precision=10, scale=4), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("assigned_tech_id", sa.UUID(), nullable=True),
        sa.Column("closure_token_hash", sa.String(length=64), nullable=True),
        sa.Column("user_confirmed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("historical_hash", sa.String(length=64), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "mode IS NULL OR mode IN ('REM','SITE')", name="ck_tickets_mode"
        ),
        sa.CheckConstraint(
            "status = 'OPEN' OR (started_at IS NOT NULL AND assigned_tech_id IS NOT NULL)",
            name="ck_tickets_started",
        ),
        sa.CheckConstraint(
            "status IN ('OPEN','PROG','RESL','CLSD')", name="ck_tickets_status"
        ),
        sa.CheckConstraint(
            "status NOT IN ('RESL','CLSD') OR (resolved_at IS NOT NULL AND duration IS NOT NULL AND mode IS NOT NULL AND date_finished IS NOT NULL)",
            name="ck_tickets_resolved",
        ),
        sa.CheckConstraint(
            "date_finished IS NULL OR date_finished >= date_started",
            name="ck_tickets_dates",
        ),
        sa.CheckConstraint(
            "duration IS NULL OR duration >= 0", name="ck_tickets_duration"
        ),
        sa.CheckConstraint(
            "resolved_at IS NULL OR resolved_at >= started_at",
            name="ck_tickets_time_order",
        ),
        sa.ForeignKeyConstraint(
            ["assigned_tech_id"],
            ["users.id"],
        ),
        sa.ForeignKeyConstraint(
            ["company_id"],
            ["companies.id"],
        ),
        sa.ForeignKeyConstraint(
            ["creator_id"],
            ["users.id"],
        ),
        sa.ForeignKeyConstraint(
            ["department_id"],
            ["departments.id"],
        ),
        sa.ForeignKeyConstraint(
            ["employee_id"],
            ["employees.id"],
        ),
        sa.ForeignKeyConstraint(
            ["location_id", "department_id"],
            ["location_departments.location_id", "location_departments.department_id"],
        ),
        sa.ForeignKeyConstraint(
            ["location_id"],
            ["locations.id"],
        ),
        sa.ForeignKeyConstraint(
            ["task_code"],
            ["task_categories.code"],
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("historical_hash"),
        sa.UniqueConstraint("ticket_code"),
    )
    op.create_index(
        "ix_tickets_date_scope",
        "tickets",
        ["date_started", "company_id", "location_id"],
        unique=False,
    )
    op.create_index(
        "ix_tickets_status_created", "tickets", ["status", "created_at"], unique=False
    )
    op.create_table(
        "ticket_attachments",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("ticket_id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("file_name", sa.String(length=150), nullable=False),
        sa.Column("mime_type", sa.String(length=100), nullable=False),
        sa.Column("file_size", sa.Integer(), nullable=False),
        sa.Column("content_enc", sa.LargeBinary(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["ticket_id"],
            ["tickets.id"],
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_ticket_attachments_ticket_id"),
        "ticket_attachments",
        ["ticket_id"],
        unique=False,
    )
    op.create_table(
        "ticket_comments",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("ticket_id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("body_enc", sa.Text(), nullable=False),
        sa.Column("is_internal", sa.Boolean(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["ticket_id"],
            ["tickets.id"],
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_ticket_comments_ticket_id"),
        "ticket_comments",
        ["ticket_id"],
        unique=False,
    )
    op.create_table(
        "ticket_technicians",
        sa.Column("ticket_id", sa.Uuid(), nullable=False),
        sa.Column("technician_id", sa.UUID(), nullable=False),
        sa.Column("assigned_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("is_primary", sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(
            ["technician_id"],
            ["users.id"],
        ),
        sa.ForeignKeyConstraint(
            ["ticket_id"],
            ["tickets.id"],
        ),
        sa.PrimaryKeyConstraint("ticket_id", "technician_id"),
    )
    op.create_foreign_key(
        "fk_employees_scope",
        "employees",
        "location_departments",
        ["location_id", "department_id"],
        ["location_id", "department_id"],
    )


def downgrade():
    op.drop_constraint("fk_employees_scope", "employees", type_="foreignkey")
    op.drop_table("ticket_technicians")
    op.drop_index(op.f("ix_ticket_comments_ticket_id"), table_name="ticket_comments")
    op.drop_table("ticket_comments")
    op.drop_index(
        op.f("ix_ticket_attachments_ticket_id"), table_name="ticket_attachments"
    )
    op.drop_table("ticket_attachments")
    op.drop_index("ix_tickets_status_created", table_name="tickets")
    op.drop_index("ix_tickets_date_scope", table_name="tickets")
    op.drop_table("tickets")
    op.drop_table("maintenance_plans")
    op.drop_index(op.f("ix_users_username"), table_name="users")
    op.drop_index(op.f("ix_users_email"), table_name="users")
    op.drop_table("users")
    op.drop_table("location_departments")
    op.drop_table("ticket_counters")
    op.drop_table("task_categories")
