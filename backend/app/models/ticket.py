import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    Integer,
    LargeBinary,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class LocationDepartment(Base):
    __tablename__ = "location_departments"
    location_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("locations.id"), primary_key=True
    )
    department_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("departments.id"), primary_key=True
    )
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)


class TaskCategory(Base):
    __tablename__ = "task_categories"
    code: Mapped[str] = mapped_column(String(50), primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True)


class TicketCounter(Base):
    __tablename__ = "ticket_counters"
    month: Mapped[str] = mapped_column(String(4), primary_key=True)
    value: Mapped[int] = mapped_column(Integer)


class Ticket(Base, TimestampMixin):
    __tablename__ = "tickets"
    __mapper_args__ = {"eager_defaults": True}
    __table_args__ = (
        CheckConstraint(
            "status IN ('OPEN','PROG','RESL','CLSD')", name="ck_tickets_status"
        ),
        CheckConstraint(
            "mode IS NULL OR mode IN ('REM','SITE')", name="ck_tickets_mode"
        ),
        CheckConstraint(
            "duration IS NULL OR duration >= 0", name="ck_tickets_duration"
        ),
        CheckConstraint(
            "resolved_at IS NULL OR resolved_at >= started_at",
            name="ck_tickets_time_order",
        ),
        CheckConstraint(
            "date_finished IS NULL OR date_finished >= date_started",
            name="ck_tickets_dates",
        ),
        CheckConstraint(
            "status = 'OPEN' OR (started_at IS NOT NULL AND assigned_tech_id IS NOT NULL)",
            name="ck_tickets_started",
        ),
        CheckConstraint(
            "status NOT IN ('RESL','CLSD') OR (resolved_at IS NOT NULL AND duration IS NOT NULL AND mode IS NOT NULL AND date_finished IS NOT NULL)",
            name="ck_tickets_resolved",
        ),
        ForeignKeyConstraint(
            ["location_id", "department_id"],
            ["location_departments.location_id", "location_departments.department_id"],
        ),
        Index("ix_tickets_status_created", "status", "created_at"),
        Index("ix_tickets_date_scope", "date_started", "company_id", "location_id"),
        Index("ix_tickets_task_finished", "task_code", "date_finished"),
    )
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    ticket_code: Mapped[str] = mapped_column(String(30), unique=True)
    employee_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("employees.id"))
    creator_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"))
    company_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("companies.id"))
    location_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("locations.id"))
    department_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("departments.id"))
    requester_name: Mapped[str] = mapped_column(String(150))
    requester_contact_enc: Mapped[str | None] = mapped_column(Text)
    task_code: Mapped[str] = mapped_column(ForeignKey("task_categories.code"))
    description_enc: Mapped[str] = mapped_column(Text)
    mode: Mapped[str | None] = mapped_column(String(20))
    month: Mapped[str] = mapped_column(String(30))
    date_started: Mapped[date] = mapped_column(Date)
    date_finished: Mapped[date | None] = mapped_column(Date)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    duration: Mapped[Decimal | None] = mapped_column(Numeric(10, 4))
    status: Mapped[str] = mapped_column(String(20), default="OPEN")
    assigned_tech_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"))
    closure_token_hash: Mapped[str | None] = mapped_column(String(64))
    user_confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    historical_hash: Mapped[str | None] = mapped_column(String(64), unique=True)


class TicketTechnician(Base):
    __tablename__ = "ticket_technicians"
    ticket_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tickets.id"), primary_key=True
    )
    technician_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id"), primary_key=True
    )
    assigned_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False)


class TicketComment(Base, TimestampMixin):
    __tablename__ = "ticket_comments"
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    ticket_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tickets.id"), index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    body_enc: Mapped[str] = mapped_column(Text)
    is_internal: Mapped[bool] = mapped_column(Boolean, default=True)


class TicketAttachment(Base, TimestampMixin):
    __tablename__ = "ticket_attachments"
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    ticket_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tickets.id"), index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    file_name: Mapped[str] = mapped_column(String(150))
    mime_type: Mapped[str] = mapped_column(String(100))
    file_size: Mapped[int] = mapped_column(Integer)
    content_enc: Mapped[bytes] = mapped_column(LargeBinary)


class MaintenancePlan(Base, TimestampMixin):
    __tablename__ = "maintenance_plans"
    __table_args__ = (
        UniqueConstraint(
            "location_id",
            "department_id",
            "task_code",
            "month_start",
            name="uq_maintenance_scope",
        ),
        CheckConstraint("expected_services > 0", name="ck_maintenance_expected"),
        CheckConstraint(
            "task_code IN ('PC-PMS','PRN-PMS')", name="ck_maintenance_task"
        ),
        CheckConstraint("due_date >= month_start", name="ck_maintenance_due"),
        ForeignKeyConstraint(
            ["location_id", "department_id"],
            ["location_departments.location_id", "location_departments.department_id"],
        ),
    )
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    location_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("locations.id"))
    department_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("departments.id"))
    task_code: Mapped[str] = mapped_column(ForeignKey("task_categories.code"))
    month_start: Mapped[date] = mapped_column(Date)
    due_date: Mapped[date] = mapped_column(Date)
    expected_services: Mapped[int] = mapped_column(Integer)
