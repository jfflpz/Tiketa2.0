from datetime import date, datetime, time
from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator


class Input(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class Login(Input):
    username: str = Field(min_length=1, max_length=150)
    password: str = Field(min_length=1, max_length=1024)


class UserCreate(Input):
    username: str = Field(min_length=3, max_length=50, pattern=r"^[a-zA-Z0-9_.-]+$")
    email: EmailStr = Field(max_length=150)
    full_name: str = Field(min_length=2, max_length=150)
    role: Literal["it", "admin"]
    password: str = Field(min_length=12, max_length=128)


class UserUpdate(Input):
    full_name: str | None = Field(default=None, min_length=2, max_length=150)
    role: Literal["it", "admin"] | None = None
    is_active: bool | None = None
    password: str | None = Field(default=None, min_length=12, max_length=128)


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    username: str
    email: str
    full_name: str
    role: Literal["it", "admin"]
    is_active: bool
    closed_repairs: int = 0
    active_bench: int = 0


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class EmployeeInput(Input):
    employee_id: str = Field(min_length=1, max_length=50, pattern=r"^[0-9]{1,50}$")
    full_name: str = Field(min_length=2, max_length=150)
    email: EmailStr = Field(max_length=150)
    company_id: UUID
    location_id: UUID
    department_id: UUID
    is_active: bool = True


class EmployeeMatchInput(Input):
    employee_id: str = Field(min_length=1, max_length=50, pattern=r"^[0-9]{1,50}$")
    email: EmailStr = Field(max_length=150)


class EmployeeScopeOut(BaseModel):
    full_name: str
    company_name: str
    location_name: str
    department_name: str


class EmployeeMatchOut(BaseModel):
    matched: bool = True
    match_token: str
    employee: EmployeeScopeOut


class LocationObservationInput(Input):
    session_id: str = Field(min_length=1, max_length=64)
    latitude: float = Field(ge=-90.0, le=90.0)
    longitude: float = Field(ge=-180.0, le=180.0)
    accuracy: float = Field(ge=0.0)
    captured_at: datetime | None = None


class LocationObservationOut(BaseModel):
    observation_id: UUID
    status: str = "recorded"


class ScopeInput(Input):
    location_id: UUID
    department_id: UUID


class TicketInput(Input):
    employee_id: str | None = Field(default=None, max_length=50, pattern=r"^[0-9]{1,50}$")
    match_token: str | None = Field(default=None, max_length=1000)
    task_code: str = Field(min_length=1, max_length=50)
    reported_issue_code: str | None = Field(default=None, max_length=50)
    description: str = Field(min_length=10, max_length=20000)
    observation_id: UUID | None = Field(default=None)


class QuickIntakeInput(TicketInput):
    mode: Literal["REM", "SITE"] | None = None


class ServiceRecordUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    task_code: str | None = Field(default=None, max_length=50)
    diagnosis: str | None = Field(default=None, max_length=20000)
    resolution_notes: str | None = Field(default=None, max_length=20000)

    @model_validator(mode="after")
    def check_at_least_one_field_present(self):
        if not self.model_fields_set:
            raise ValueError("At least one service record field must be provided")
        if "task_code" in self.model_fields_set:
            if self.task_code is None or not self.task_code.strip():
                raise ValueError("task_code cannot be null or empty")
            self.task_code = self.task_code.strip()
        if "diagnosis" in self.model_fields_set:
            if self.diagnosis is not None:
                cleaned = self.diagnosis.strip()
                self.diagnosis = cleaned if cleaned else None
        if "resolution_notes" in self.model_fields_set:
            if self.resolution_notes is not None:
                cleaned = self.resolution_notes.strip()
                self.resolution_notes = cleaned if cleaned else None
        return self


class AssignInput(Input):
    technician_id: UUID


class StatusInput(Input):
    status: Literal["PROG", "RESL", "CLSD"]
    mode: Literal["REM", "SITE"] | None = None
    task_code: str | None = None


class ClosureInput(Input):
    token: str = Field(min_length=40, max_length=100)


class CommentInput(Input):
    body: str = Field(min_length=1, max_length=20000)
    is_internal: bool = True


class PublicTicket(BaseModel):
    ticket_code: str
    status: str
    created_at: datetime


class TicketOut(PublicTicket):
    id: UUID
    employee_id: UUID | None
    creator_id: UUID | None
    company_id: UUID
    location_id: UUID
    department_id: UUID
    requester_name: str
    reported_issue_code: str | None = None
    task_code: str
    description: str
    diagnosis: str | None = None
    resolution_notes: str | None = None
    mode: Literal["REM", "SITE"] | None
    month: str
    date_started: date
    date_finished: date | None
    started_at: datetime | None
    resolved_at: datetime | None
    time_started: time | None
    time_finished: time | None
    duration: Decimal | None
    assigned_tech_id: UUID | None
    technician_name: str | None = None
    updated_at: datetime
    user_confirmed_at: datetime | None
    transit_lag_days: float | None
    closure_url: str | None = None


class PlanInput(ScopeInput):
    task_code: Literal["PC-PMS", "PRN-PMS"]
    month_start: date
    due_date: date
    expected_services: int = Field(ge=1, le=100000)

    @model_validator(mode="after")
    def dates(self):
        if (
            self.month_start.day != 1
            or self.due_date < self.month_start
            or self.due_date.strftime("%Y-%m") != self.month_start.strftime("%Y-%m")
        ):
            raise ValueError(
                "month_start must be first day; due_date must be in that month"
            )
        return self
