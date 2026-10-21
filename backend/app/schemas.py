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


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class EmployeeInput(Input):
    employee_id: str = Field(min_length=1, max_length=50)
    full_name: str = Field(min_length=2, max_length=150)
    email: EmailStr = Field(max_length=150)
    company_id: UUID
    location_id: UUID
    department_id: UUID
    is_active: bool = True


class ScopeInput(Input):
    location_id: UUID
    department_id: UUID


class TicketInput(Input):
    employee_id: str = Field(min_length=1, max_length=150)
    task_code: str = Field(min_length=1, max_length=50)
    description: str = Field(min_length=10, max_length=20000)


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
    task_code: str
    description: str
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
    updated_at: datetime
    user_confirmed_at: datetime | None
    transit_lag_days: float | None


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
