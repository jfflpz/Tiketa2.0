# OpenAPI REST Contracts & Endpoint Specifications

**System**: Tiketa 2.0  
**Status**: Specification Baseline  
**Base URL**: `/api/v1`

---

## 1. Public & Intake Endpoints

### `GET /api/v1/employees/lookup`
- **Access**: Public / Intranet (Rate limited: 60 req/min)
- **Query Params**: `q` (Employee ID No. or email address)
- **Response `200 OK`**:
```json
{
  "id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  "employee_id": "FS-1042",
  "full_name": "Maria Santos",
  "email": "maria.santos@fivestarbus.com",
  "company_id": "b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22",
  "company_name": "Pangasinan Five Star Bus Co.",
  "location_id": "c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33",
  "location_name": "Pasay",
  "department_id": "d3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44",
  "department_name": "Cash Management"
}
```

### `POST /api/v1/tickets/submit`
- **Access**: Public / Intranet
- **Payload**:
```json
{
  "employee_id": "FS-1042",
  "task_code": "PRN-TS",
  "description": "Terminal ticket printer head jammed during dispatch peak."
}
```
- **Response `201 Created`**:
```json
{
  "ticket_code": "T-2610-0001",
  "status": "OPEN",
  "created_at": "2026-10-16T16:15:00Z"
}
```

---

## 2. Authenticated IT Operations Endpoints

### `POST /api/v1/auth/login`
- **Access**: Public
- **Payload**: `{ "username": "tech1", "password": "..." }`
- **Response `200 OK`**: Returns short-lived access JWT in body, sets HTTP-Only refresh cookie.

### `PATCH /api/v1/tickets/{id}/claim`
- **Access**: Protected (`role: 'it' | 'admin'`)
- **Hotkey**: Triggered via `c` on the IT Queue.
- **Effect**: Sets `assigned_tech_id` to current user and transitions `status` from `OPEN` to `PROG`.

### `POST /api/v1/tickets/quick-intake`
- **Access**: Protected (`role: 'it' | 'admin'`)
- **Hotkey**: Triggered via `v` on the IT Queue.
- **Payload**: Fast employee ID lookup + task categorization for walk-ins/Viber chats.
