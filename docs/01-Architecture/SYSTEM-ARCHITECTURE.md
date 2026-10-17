# System Architecture & Identity Governance

**System**: Tiketa 2.0  
**Status**: Approved Specification  
**Reference**: [[ARCH/01-Projects/Tiketa/SRS.md|SRS v2.1.0]] & [[ARCH/01-Projects/Tiketa/Tiketa-Employee-Access-Decision-Report.pdf|Employee Access Decision Report]]

---

## 1. High-Level Architectural Topology

```mermaid
flowchart TD
    subgraph ClientLayer ["Client Layer"]
        Kiosk["Terminal Employee Web Kiosk (/report)<br/>• 6 Big Category Buttons<br/>• Zero passwords, zero accounts, zero tokens<br/>• Employee ID Auto-Binding (e.g. FS-1042)"]
        Queue["IT Operations Queue (/queue)<br/>• Hotkey 'c' (Claim)<br/>• Hotkey 'v' (Fallback Quick Intake)"]
        Reports["Admin Analytics Dashboard (/reports)<br/>• 8 Executive Reports<br/>• 4 Recharts Widgets"]
    end

    subgraph Gateway ["Nginx / Reverse Proxy (:80 / :443)"]
        Proxy["SSL Termination & Ingress Routing"]
    end

    subgraph BackendAPI ["FastAPI REST Engine (:8000)"]
        AuthModule["Argon2id & Dual JWT Engine"]
        TicketEngine["Ticket State Machine (OPEN->PROG->RESL->CLSD)"]
        EmpLookup["Employee Directory Gateway"]
        AnalyticsEngine["Pandas Turnaround & Lag Metrics"]
    end

    subgraph DataLayer ["Data & Cache Layer"]
        Postgres[("PostgreSQL 16 (tiketa-postgres)<br/>Normalized Relational Tables")]
        RedisDB[("Redis 7 (tiketa-redis)<br/>Token Blacklist & Rate Limiting")]
    end

    Kiosk --> Proxy
    Queue --> Proxy
    Reports --> Proxy
    Proxy --> BackendAPI
    BackendAPI --> Postgres
    BackendAPI --> RedisDB
```

---

## 2. The 3 Account & Intake Pillars

### Pillar 1: Zero Workforce Accounts (`/report`)
- Field employees (cashiers, mechanics, conductors, dispatchers) **never log in**.
- Entering an **Employee ID No.** (e.g., `FS-1042`) triggers an auto-lookup against PostgreSQL.
- Verified records **hard-lock Location and Department** as read-only fields, preventing 100% of human dropdown routing mistakes.

### Pillar 2: Simplified 2-Tier RBAC
The authenticated `users` table is restricted to two roles:
1. `it` (**IT Technician**): Access to `/queue`, one-click ticket claiming (`c`), status/labor updates, and fallback quick intake (`v`).
2. `admin` (**IT Head / System Admin**): Access to all 8 executive analytics reports, employee directory management, and system administration.

### Pillar 3: IT Fallback Quick Intake (Hotkey `v`)
- Technicians on the IT Queue tap **`v`** to open a quick modal for walk-in or Viber requests.
- Entering the Employee ID auto-populates the staff profile in <1 second, allowing logging in <4 seconds before troubleshooting.
