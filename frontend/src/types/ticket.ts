// @spec FR-TICK-01: Canonical 15-Column Job Log Type Specifications, Two-Way Chat & Saved Repair Checklists
// @spec SR-03: Five Star 15-Column Schema Preservation

export type SupportMode = 'REM' | 'SITE';

export type TicketStatus = 'OPEN' | 'PROG' | 'RESL' | 'CLSD';

export type TaskCategoryCode =
  | 'NET-CFG'
  | 'PC-ASSESS'
  | 'SRV-ASSESS'
  | 'PRN-TS'
  | 'SW-ASST'
  | 'PRN-NET'
  | 'PC-HW-REP'
  | 'PERIPH-REP'
  | 'PC-TS'
  | 'PC-PMS'
  | 'PC-SETUP'
  | 'PRN-PMS'
  | 'PRN-SETUP';

export interface TicketChatMessage {
  id: string;
  senderRole: 'employee' | 'it';
  senderName: string;
  message: string;
  timestamp: string;
  isInternal?: boolean;
}

export interface ChecklistStep {
  id: string;
  text: string;
  completed: boolean;
}

export interface TicketChecklistStep {
  id: string;
  checklistId?: string;
  position: number;
  text: string;
  completed: boolean;
  completedAt?: string | null;
  completedById?: string | null;
  completedByName?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface TicketChecklist {
  id?: string;
  ticketId: string;
  sourceRepairNoteId?: string | null;
  sourceRevision?: number | null;
  guideTitleSnapshot?: string | null;
  guideTaskCodeSnapshot?: string | null;
  guideTaskNameSnapshot?: string | null;
  guideBody?: string | null;
  appliedById?: string | null;
  appliedByName?: string | null;
  appliedAt?: string | null;
  createdById?: string | null;
  updatedById?: string | null;
  revision: number;
  createdAt?: string | null;
  updatedAt?: string | null;
  steps: TicketChecklistStep[];
}

export interface SavedRepairNote {
  id: string;
  title: string;
  taskCode: TaskCategoryCode;
  taskName: string;
  symptomAndFixNote: string;
  checklistSteps: string[];
  author: string;
  authorId?: string;
  updatedBy?: string;
  updatedById?: string;
  sourceTicketId?: string;
  sourceTicketCode?: string;
  revision: number;
  createdAt?: string;
  updatedAt: string;
  canEdit?: boolean;
}

export interface Ticket {
  id: string; // UUID
  ticketCode: string; // e.g. T-261042

  // 15 Canonical Columns
  company: string; // 1. Company (e.g. Pangasinan Five Star Bus Co.)
  companyCode: string; // FS, LCTI, BTCI, etc.
  mode: SupportMode; // 2. Mode (REM vs SITE)
  department: string; // 3. Department (Operations, Cash, Accounting, etc.)
  departmentCode: string; // OPS, CASH, ACCT, etc.
  requestor: string; // 4. Requestor
  employeeId?: string; // e.g. FS-1042
  task: string; // 5. Task (Task Name)
  taskCode: TaskCategoryCode; // 5. Task Code
  description: string; // 6. Description
  month: string; // 7. Month (Auto-computed, e.g. October 2026)
  dateStarted: string; // 8. Date started (YYYY-MM-DD)
  timeStarted: string; // 9. Time Started (HH:MM:SS)
  timeFinished?: string; // 10. Time Finished (HH:MM:SS)
  duration?: number; // 11. Duration (Hours, auto-derived)
  dateFinished?: string; // 12. Date finished (YYYY-MM-DD)
  status: TicketStatus; // 13. Status (OPEN, PROG, RESL, CLSD)
  location: string; // 14. Location (Terminal Name)
  locationCode: string; // AVN, BTM, CAL, PSY, CMA, etc.
  workedBy?: string; // 15. Worked by (Technician name)
  workedById?: string; // Assigned tech UUID
  assigned_tech_id?: string; // Backend direct assignee UUID

  // Additional metadata, Closure Verification, Two-Way Chat & Editable Checklist
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  intakeSource?: 'PC Kiosk' | 'Employee ID' | 'Walk-in / Viber';
  closureTokenHash?: string;
  closureUrl?: string; // Viber / direct verification link returned by backend
  userConfirmedAt?: string;
  validationRequested?: boolean;
  validationRequestedAt?: string;
  createdAt: string;
  messages?: TicketChatMessage[];
  checklist?: ChecklistStep[];
  ticketChecklist?: TicketChecklist;
}

export interface NewTicketInput {
  company: string;
  companyCode: string;
  location: string;
  locationCode: string;
  department: string;
  departmentCode: string;
  requestor: string;
  employeeId?: string;
  taskCode: TaskCategoryCode;
  description: string;
  mode: SupportMode;
  intakeSource?: 'PC Kiosk' | 'Employee ID' | 'Walk-in / Viber';
}
