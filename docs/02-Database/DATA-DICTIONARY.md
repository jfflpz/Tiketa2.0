# Canonical Data Dictionary & Domain Standards

**System**: Tiketa 2.0  
**Status**: Canonical Specification  
**Reference**: [[ARCH/01-Projects/Tiketa/SRS.md|SRS v2.1.0 Section 3]]

---

## 1. Canonical 15-Field Operational Specification

| # | Field Name | Column Name | Type | Constraints / Rules | Description |
|---|---|---|---|---|---|
| 1 | **Company** | `company_id` | UUID | FK $\to$ `companies.id` | 11 transit fleets (`FS`, `LCTI`, `BTCI`...) |
| 2 | **Mode** | `mode` | VARCHAR(20) | `'REM'`, `'SITE'` | Remote vs. On-site technical support |
| 3 | **Department** | `department_id` | UUID | FK $\to$ `departments.id` | Auto-locked from Employee ID or workstation |
| 4 | **Requestor** | `requester_name` | VARCHAR(150) | Not null | Captured automatically via verified staff record |
| 5 | **Task** | `task_code` | VARCHAR(50) | 13 Task Categories | e.g., `PC-TS`, `NET-CFG`, `PRN-PMS` |
| 6 | **Description** | `description` | TEXT | Min 10 chars | Detailed technical symptom / failure notes |
| 7 | **Month** | `month` | VARCHAR(30) | Auto-derived | Computed from `Date started` (`%B %Y`) |
| 8 | **Date started** | `date_started` | DATE | ISO Date | Timestamp when ticket is created |
| 9 | **Time Started** | `time_started` | TIME | ISO Time | Timestamp when technician marks `In Progress` |
| 10 | **Time Finished** | `time_finished` | TIME | Nullable | Recorded upon hands-on repair completion |
| 11 | **Duration** | `duration` | NUMERIC(5,2) | Auto-derived | Hands-on repair time in hours |
| 12 | **Date finished** | `date_finished` | DATE | Nullable | Captured when ticket is marked `Resolved` |
| 13 | **Status** | `status` | VARCHAR(20) | `OPEN`, `PROG`, `RESL`, `CLSD` | Lifecycle state machine progression |
| 14 | **Location** | `location_id` | UUID | FK $\to$ `locations.id` | 15 Terminal Hubs (`AVN`, `CAL`, `PSY`...) |
| 15 | **Worked by** | `assigned_tech_id`| UUID | FK $\to$ `users.id` (`role='it'`) | Technician assigned / claiming the ticket |

---

## 2. Core Relational Entities

### `employees` Table
```sql
CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id VARCHAR(50) UNIQUE NOT NULL, -- e.g. FS-1042
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    company_id UUID NOT NULL REFERENCES companies(id),
    location_id UUID NOT NULL REFERENCES locations(id),
    department_id UUID NOT NULL REFERENCES departments(id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `devices` Table
```sql
CREATE TABLE devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    computer_name VARCHAR(100) UNIQUE NOT NULL, -- %COMPUTERNAME%
    device_token_hash VARCHAR(64) UNIQUE NOT NULL, -- SHA-256 enrollment token
    location_id UUID NOT NULL REFERENCES locations(id),
    department_id UUID NOT NULL REFERENCES departments(id),
    ip_address VARCHAR(45),
    is_active BOOLEAN DEFAULT TRUE,
    last_seen_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```
