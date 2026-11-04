"""convert employee identifiers to numeric only and enforce ck_employees_numeric_id"""

import re

import sqlalchemy as sa
from alembic import op

revision = "0005_numeric_employee_ids"
down_revision = "0004_reported_issue_diagnosis"
branch_labels = None
depends_on = None

DIGITS_PATTERN = re.compile(r"^[0-9]{1,50}$")


def upgrade():
    bind = op.get_bind()
    bind.execute(sa.text("LOCK TABLE employees IN EXCLUSIVE MODE"))

    rows = bind.execute(sa.text("SELECT id, employee_id FROM employees")).fetchall()

    candidates = {}
    seen_targets = {}

    for emp_id, raw_code in rows:
        if raw_code.startswith("FS-"):
            candidate = raw_code[3:]
        else:
            candidate = raw_code

        if not DIGITS_PATTERN.match(candidate):
            raise ValueError(
                f"Preflight migration failed: Employee {emp_id} has invalid non-numeric ID '{raw_code}' "
                f"(candidate '{candidate}') which violates ^[0-9]{{1,50}}$"
            )

        if candidate in seen_targets:
            conflict_emp_id = seen_targets[candidate]
            raise ValueError(
                f"Preflight migration collision: Target numeric ID '{candidate}' conflicts between "
                f"employee {conflict_emp_id} and employee {emp_id}"
            )

        seen_targets[candidate] = emp_id
        candidates[emp_id] = candidate

    for emp_id, candidate in candidates.items():
        bind.execute(
            sa.text(
                "UPDATE employees SET employee_id = :cid WHERE id = :eid AND employee_id != :cid"
            ),
            {"cid": candidate, "eid": emp_id},
        )

    op.create_check_constraint(
        "ck_employees_numeric_id",
        "employees",
        "employee_id ~ '^[0-9]{1,50}$'",
    )


def downgrade():
    op.drop_constraint("ck_employees_numeric_id", "employees", type_="check")
