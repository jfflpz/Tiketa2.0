"""Create the existing employee directory schema."""

import sqlalchemy as sa
from alembic import op

revision = "0001_employee_directory"
down_revision = None
branch_labels = None
depends_on = None


def timestamps():
    return [
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
    ]


def upgrade():
    for table, name_length in [
        ("companies", 255),
        ("departments", 100),
        ("locations", 100),
    ]:
        columns = [
            sa.Column("id", sa.Uuid(), primary_key=True),
            sa.Column("code", sa.String(20), nullable=False),
            sa.Column("name", sa.String(name_length), nullable=False, unique=True),
            sa.Column("is_active", sa.Boolean(), nullable=False),
            *timestamps(),
        ]
        if table == "locations":
            columns.append(sa.Column("address", sa.String(255), nullable=True))
        op.create_table(table, *columns)
        op.create_index(f"ix_{table}_code", table, ["code"], unique=True)
    op.create_table(
        "employees",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("employee_id", sa.String(50), nullable=False),
        sa.Column("full_name", sa.String(150), nullable=False),
        sa.Column("email", sa.String(150), nullable=False),
        sa.Column(
            "company_id", sa.Uuid(), sa.ForeignKey("companies.id"), nullable=False
        ),
        sa.Column(
            "location_id", sa.Uuid(), sa.ForeignKey("locations.id"), nullable=False
        ),
        sa.Column(
            "department_id", sa.Uuid(), sa.ForeignKey("departments.id"), nullable=False
        ),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        *timestamps(),
    )
    op.create_index(
        "ix_employees_employee_id", "employees", ["employee_id"], unique=True
    )
    op.create_index("ix_employees_email", "employees", ["email"], unique=True)


def downgrade():
    op.drop_table("employees")
    for table in ["locations", "departments", "companies"]:
        op.drop_table(table)
