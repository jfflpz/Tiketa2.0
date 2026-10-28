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


class LocationDepartmentSummary(BaseModel):
    id: UUID
    code: str
    name: str
    active_tickets_count: int = 0


class HubSummaryOut(BaseModel):
    id: UUID
    code: str
    name: str
    open_count: int = 0
    in_progress_count: int = 0
    resolved_count: int = 0
    closed_this_month_count: int = 0
    total_active_count: int = 0
    top_issue_task_code: str | None = None
    top_issue_task_name: str | None = None
    top_issue_count: int = 0
    top_issue_window: str = "Last 30 Days"
    departments: list[LocationDepartmentSummary] = []


class ScopeInput(Input):
    location_id: UUID
    department_id: UUID


class TicketInput(Input):
    employee_id: str | None = Field(
        default=None, max_length=50, pattern=r"^[0-9]{1,50}$"
    )
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
    token: str | None = Field(default=None, max_length=100)
    remarks: str | None = Field(default=None, max_length=2000)


class ReopenInput(Input):
    reason: str = Field(min_length=5, max_length=2000)
    token: str | None = Field(default=None, max_length=100)


class TicketVerifyAccessInput(Input):
    ticket_code: str | None = Field(default=None, max_length=50)
    employee_id: str | None = Field(default=None, max_length=50)
    token: str | None = Field(default=None, max_length=100)
    match_token: str | None = Field(default=None, max_length=1000)


class CommentInput(Input):
    body: str = Field(min_length=1, max_length=20000)
    is_internal: bool = True


class CommentOut(BaseModel):
    id: UUID
    body: str
    is_internal: bool
    user_id: UUID | None = None
    author_name: str | None = None
    author_role: str | None = None
    created_at: datetime


class PublicTicket(BaseModel):
    ticket_code: str
    status: str
    created_at: datetime


class TicketOut(PublicTicket):
    id: UUID
    employee_id: UUID | None
    employee_id_number: str | None = None
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


class TicketVerifyAccessOut(BaseModel):
    authorized: bool
    access_token: str
    ticket: TicketOut
    can_close: bool = False
    can_reopen: bool = False


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


class RepairNoteStepCreate(Input):
    position: int = Field(ge=0)
    text: str = Field(min_length=1, max_length=1000)


class RepairNoteStepOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    position: int
    text: str


class RepairNoteCreate(Input):
    title: str = Field(min_length=1, max_length=200)
    task_code: str = Field(min_length=1, max_length=50)
    symptom_and_fix: str = Field(min_length=1, max_length=10000)
    steps: list[str] = Field(default_factory=list, max_length=100)
    source_ticket_id: UUID | None = None


class RepairNoteUpdate(Input):
    expected_revision: int = Field(gt=0)
    title: str | None = Field(default=None, min_length=1, max_length=200)
    task_code: str | None = Field(default=None, min_length=1, max_length=50)
    symptom_and_fix: str | None = Field(default=None, min_length=1, max_length=10000)
    steps: list[str] | None = Field(default=None, max_length=100)


class RepairNoteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    title: str
    task_code: str
    task_name: str
    symptom_and_fix: str
    author_id: UUID
    author_name: str
    updated_by_id: UUID
    updated_by_name: str
    source_ticket_id: UUID | None = None
    source_ticket_code: str | None = None
    revision: int
    created_at: datetime
    updated_at: datetime
    steps: list[RepairNoteStepOut] = []
    can_edit: bool = False


class RepairNoteListResponse(BaseModel):
    items: list[RepairNoteOut]
    total: int
    offset: int
    limit: int


class TicketChecklistStepCreate(Input):
    expected_checklist_revision: int = Field(gt=0)
    text: str = Field(min_length=1, max_length=1000)


class TicketChecklistStepUpdate(Input):
    expected_checklist_revision: int = Field(gt=0)
    text: str | None = Field(default=None, min_length=1, max_length=1000)
    completed: bool | None = None


class TicketChecklistStepOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    checklist_id: UUID
    position: int
    text: str
    completed: bool
    completed_at: datetime | None = None
    completed_by_id: UUID | None = None
    completed_by_name: str | None = None
    created_at: datetime
    updated_at: datetime


class TicketChecklistApplyRequest(Input):
    repair_note_id: UUID
    expected_note_revision: int = Field(gt=0)
    expected_checklist_revision: int | None = Field(default=None, gt=0)
    replace_existing: bool = False


class TicketChecklistOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID | None = None
    ticket_id: UUID
    source_repair_note_id: UUID | None = None
    source_revision: int | None = None
    guide_title_snapshot: str | None = None
    guide_task_code_snapshot: str | None = None
    guide_task_name_snapshot: str | None = None
    guide_body: str | None = None
    applied_by_id: UUID | None = None
    applied_by_name: str | None = None
    applied_at: datetime | None = None
    created_by_id: UUID | None = None
    updated_by_id: UUID | None = None
    revision: int = 0
    created_at: datetime | None = None
    updated_at: datetime | None = None
    steps: list[TicketChecklistStepOut] = []
