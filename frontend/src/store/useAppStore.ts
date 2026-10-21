// @spec FR-AUTH-02: Dual-mode state separating Public Employee Intake from Authenticated Nexora IT/Admin Workspace
import { create } from 'zustand';

import {
  authApi,
  directoryApi,
  ticketsApi,
  setAccessToken,
  USE_MOCK,
  EmployeeLookupResult,
} from '../api/client';

import {
  Ticket,
  NewTicketInput,
  SupportMode,
  TicketChatMessage,
  ChecklistStep,
  SavedRepairNote,
  TaskCategoryCode,
} from '../types/ticket';
import { INITIAL_TICKETS, TASK_CATEGORIES, VERIFIED_EMPLOYEES } from '../data/mockTicketsData';
import { TeamMember, TeamRole, TeamMemberStatus } from '../types/team';
import { EmployeeProfile } from '../types';
import { TEAM_ROSTER } from '../data/mockTeamData';

export type ActiveView =
  | 'overview'    // IT Screen 1: Personal Technician KPI Overview
  | 'tickets'     // Screen 2: Active Ticket Lists (Table View & 3-Col Kanban Board)
  | 'workbench'   // IT Screen 3: My Active Workbench (Active Focus Repair & Live Chat)
  | 'notes'       // Screen 4: Saved Repair Notes Library
  | 'joblogs'     // Screen 5: 15-Column Master Job Log Spreadsheet & AI Importer
  | 'terminals'   // Screen 6: 15 Bus Terminal Hubs Monitor
  | 'team'        // Admin Screen: IT Team Roster & Governance
  | 'analytics'   // Admin Screen: Executive Analytics Overview
  | 'reports';    // Admin Screen: Dedicated 8 Standardized Reports Suite

export type StaffRole = 'it' | 'admin';
export type QueueFilterTab = 'ALL' | 'OPEN' | 'MY_ACTIVE' | 'RESL' | 'CLSD';

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
  title: string;
  avatar: string;
}

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  type: 'success' | 'info' | 'warning';
}

const DEFAULT_SOP_STEPS: ChecklistStep[] = [
  {
    id: 'step-1',
    text: 'Verify booth asset ID, power supply, and physical cabling',
    completed: true,
  },
  {
    id: 'step-2',
    text: 'Establish remote AnyDesk session or on-site bench inspection',
    completed: true,
  },
  {
    id: 'step-3',
    text: 'Apply hardware/software fix and run terminal test transaction',
    completed: false,
  },
  {
    id: 'step-4',
    text: 'Log resolution summary in 15-Column Job Log (#06 Description)',
    completed: false,
  },
];

const INITIAL_SAVED_REPAIR_NOTES: SavedRepairNote[] = [
  {
    id: 'note-1',
    title: 'Thermal Receipt Printer Cutter Jam & Red Error LED Fix',
    taskCode: 'PRN-TS',
    taskName: 'Printer Troubleshoot',
    symptomAndFixNote:
      'Epson TM-T82 / booth thermal printer red error LED blinking and auto-cutter blade stuck mid-cut. Clear paper path, rotate cutter gear knob manually, clean thermal head with isopropyl alcohol, and print Windows self-test page.',
    checklistSteps: [
      'Power off thermal printer and open top receipt cover release latch',
      'Manually rotate auto-cutter emergency gear wheel to retract stuck blade',
      'Clear shredded thermal paper from platen roller and optical sensor',
      'Clean thermal printhead with 99% isopropyl swab and reload 80mm roll',
      'Hold FEED button while powering on to verify hardware self-test print',
    ],
    author: 'Nathaniel D. Esguerra',
    updatedAt: '2026-10-17 09:30',
    sourceTicketCode: 'T-261042',
  },
  {
    id: 'note-2',
    title: 'POS Ticketing App SQLite Database Lock & Session Reset',
    taskCode: 'SW-ASST',
    taskName: 'Software Assistance',
    symptomAndFixNote:
      'Waybill & booth POS application frozen on "Database Locked (Error 5)" during peak dispatch. Connect via AnyDesk, terminate orphaned POS background process, clear stale .wal/.shm lock files, and verify SQL sync with central server.',
    checklistSteps: [
      'Connect to booth workstation via AnyDesk and inspect Task Manager',
      'End hung FiveStarPOS.exe background process tree',
      'Backup local C:\\FiveStarPOS\\data\\waybill.db before clearing .db-wal lock',
      'Relaunch POS as Administrator and test waybill sync to Pasay HQ',
    ],
    author: 'Christian (IT Specialist)',
    updatedAt: '2026-10-16 16:15',
    sourceTicketCode: 'T-261040',
  },
  {
    id: 'note-3',
    title: 'Fuel Telemetry VLAN Gateway & Terminal MikroTik Packet Drop',
    taskCode: 'NET-CFG',
    taskName: 'Network Configuration',
    symptomAndFixNote:
      'Fuel pump controller losing ping to central database server due to ARP table overflow or oxidized RJ45 port on terminal switch. Re-seat patch cord on VLAN 20 port, flush ARP cache on MikroTik router, and run 100-packet ping test.',
    checklistSteps: [
      'Ping terminal gateway (192.168.20.1) and fuel controller static IP',
      'Inspect physical CAT6 patch cable and switch port LEDs in server rack',
      'Log into MikroTik WinBox and flush stale ARP entry for pump controller',
      'Verify <2ms latency and 0% packet loss over 100 continuous pings',
    ],
    author: 'Ronnell (IT Specialist)',
    updatedAt: '2026-10-15 14:20',
    sourceTicketCode: 'T-261041',
  },
  {
    id: 'note-4',
    title: 'Cashier PC POST 3 Short Beeps — DDR3/DDR4 RAM & CMOS Swap',
    taskCode: 'PC-HW-REP',
    taskName: 'PC/Laptop Hardware Replacement',
    symptomAndFixNote:
      'Workstation fails to boot with 3 short AMI BIOS beeps (memory seated error) or CMOS date reset. Clean DIMM gold contacts with eraser, reseat in Channel A1, replace CR2032 battery, and configure BIOS AHCI boot order.',
    checklistSteps: [
      'Disconnect AC power from AVR/UPS and discharge motherboard flea power',
      'Remove RAM module, clean gold contacts, and reseat firmly into DIMM slot',
      'Replace motherboard CR2032 CMOS coin battery if voltage is below 2.8V',
      'Enter BIOS setup, set correct date/time, and verify SSD boot priority',
    ],
    author: 'Carlo Agan',
    updatedAt: '2026-10-14 11:45',
    sourceTicketCode: 'T-261039',
  },
  {
    id: 'note-5',
    title: 'Terminal NVR CCTV Offline & APC UPS Battery Replace SOP',
    taskCode: 'SRV-ASSESS',
    taskName: 'Server Assessment & Maintenance',
    symptomAndFixNote:
      'Hikvision 16-ch NVR beeping continuously or APC 1500VA UPS showing red Replace Battery LED. Check PoE switch uplink, inspect SATA surveillance HDD health in SMART menu, and hot-swap 12V 9Ah sealed lead-acid battery pack.',
    checklistSteps: [
      'Check Hikvision NVR local monitor for HDD S.M.A.R.T. error or IP conflict',
      'Verify PoE switch uplink port to terminal departure bay cameras',
      'Measure UPS battery terminal voltage under load and swap 12V 9Ah SLA pack',
      'Confirm all 16 camera feeds are recording with green status icons',
    ],
    author: 'Stephen I. Miralles',
    updatedAt: '2026-10-12 17:05',
  },
];

interface AppState {

    // Live API Integration
  isAuthenticating: boolean;
  authError: string | null;
  loginWithApi: (credentials: { username: string; password: string }) => Promise<boolean>;
  lookupEmployeeApi: (query: string) => Promise<EmployeeLookupResult | null>;
  submitTicketApi: (input: {
    employeeId: string;
    taskCode: TaskCategoryCode;
    description: string;
    companyName?: string;
    locationName?: string;
    departmentName?: string;
    requestorName?: string;
  }) => Promise<Ticket | null>;

  // Auth & Flow State: null = Public Employee Ticket Creation Screen
  currentUser: AuthenticatedUser | null;
  loginModalRole: StaffRole | null;
  openLoginModal: (role: StaffRole) => void;
  closeLoginModal: () => void;
  loginAsStaff: (role: StaffRole, customName?: string) => void;
  logoutToKiosk: () => void;

  // Distinct Screen Navigation
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;

  // Internal Table Filters
  queueFilter: QueueFilterTab;
  setQueueFilter: (filter: QueueFilterTab) => void;
  locationFilter: string;
  setLocationFilter: (loc: string) => void;

  sidebarCollapsed: boolean;
  toggleSidebar: () => void;

  tickets: Ticket[];
  selectedTicketId: string | null;
  setSelectedTicketId: (id: string | null) => void;
  activeWorkbenchTicketId: string | null;
  activeReportId: number;
  setActiveReportId: (id: number) => void;
  setActiveWorkbenchTicketId: (id: string | null) => void;

  isQuickIntakeOpen: boolean;
  setQuickIntakeOpen: (open: boolean) => void;

  searchQuery: string;
  setSearchQuery: (q: string) => void;

  activeOfficeLocationCode: string;
  setActiveOfficeLocationCode: (code: string) => void;

  toasts: ToastItem[];
  addToast: (title: string, description?: string, type?: 'success' | 'info' | 'warning') => void;
  removeToast: (id: string) => void;

  // Saved Repair Notes & Troubleshooting Checklists Library
  savedRepairNotes: SavedRepairNote[];
  saveRepairNoteAndChecklist: (
    note: Omit<SavedRepairNote, 'id' | 'updatedAt'>
  ) => void;
  updateSavedRepairNote: (id: string, updates: Partial<SavedRepairNote>) => void;
  deleteSavedRepairNote: (id: string) => void;
  applySavedNoteToTicket: (ticketId: string, noteId: string) => void;

  // Per-Ticket Editable Troubleshooting Checklist
  getTicketChecklist: (ticketId: string) => ChecklistStep[];
  toggleTicketChecklistStep: (ticketId: string, stepId: string) => void;
  addTicketChecklistStep: (ticketId: string, text: string) => void;
  removeTicketChecklistStep: (ticketId: string, stepId: string) => void;
  editTicketChecklistStep: (ticketId: string, stepId: string, newText: string) => void;

  // Ticket Actions & Two-Way Chat
  claimTicket: (ticketId: string, techName?: string, techId?: string) => void;
  updateTicketMode: (ticketId: string, mode: SupportMode) => void;
  updateTicketTask: (ticketId: string, taskCode: TaskCategoryCode) => void;
  updateTicketDescription: (ticketId: string, description: string) => void;
  sendTicketMessage: (
    ticketId: string,
    senderRole: 'employee' | 'it',
    senderName: string,
    message: string
  ) => void;
  resolveTicket: (ticketId: string) => void;
  requestValidation: (ticketId: string) => void;
  confirmClosure: (ticketId: string) => void;
  reopenTicket: (ticketId: string) => void;
  createTicket: (input: NewTicketInput) => Ticket;
  assignTicket: (ticketId: string, technicianName: string, technicianId: string) => void;

  // IT Team Specialist & Account Management
  itTeamMembers: TeamMember[];
  createITMember: (member: {
    name: string;
    email: string;
    role: TeamRole;
    department: string;
    status: TeamMemberStatus;
    primaryLocation: string;
  }) => void;
  deleteITMember: (id: string) => void;

  // Verified Employees Directory
  verifiedEmployeesList: EmployeeProfile[];
  createEmployee: (emp: {
    employee_id: string;
    full_name: string;
    email: string;
    company_id: string;
    company_name: string;
    location_id: string;
    location_name: string;
    department_id: string;
    department_name: string;
  }) => void;
  deleteEmployee: (employeeId: string) => void;

  // Direct Ticket Confirmation & Employee ID Verification Flow
  verifyTicketCode: string | null;
  setVerifyTicketCode: (code: string | null) => void;
  unlockedTicketCodes: Record<string, boolean>;
  unlockTicketVerification: (ticketCode: string) => void;
  copyTicketShareLink: (ticketCode: string) => Promise<string>;
}

const formatTimeAmPm = (date: Date) =>
  date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const getInitialVerifyCode = (): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get('verifyTicket') || params.get('ticket') || null;
  } catch {
    return null;
  }
};

export const useAppStore = create<AppState>((set, get) => ({
  isAuthenticating: false,
  authError: null,

  loginWithApi: async ({ username, password }) => {
    set({ isAuthenticating: true, authError: null });
    try {
      if (USE_MOCK) {
        get().loginAsStaff('admin');
        set({ isAuthenticating: false });
        return true;
      }

      const data = await authApi.login({ username, password });
      setAccessToken(data.access_token);

      const userRole: StaffRole = data.user.role === 'admin' ? 'admin' : 'it';
      set({
        currentUser: {
          id: data.user.id,
          name: data.user.full_name,
          email: data.user.email,
          role: userRole,
          title: userRole === 'admin' ? 'IT Administrator' : 'Senior IT Support Specialist',
          avatar: data.user.full_name
            .split(' ')
            .map((n: string) => n[0])
            .join('')
            .slice(0, 2)
            .toUpperCase(),
        },
        loginModalRole: null,
        activeView: userRole === 'admin' ? 'overview' : 'workbench',
        isAuthenticating: false,
      });

      get().addToast(
        `Welcome, ${data.user.full_name}!`,
        'Signed into IT Operations Workspace',
        'success'
      );
      return true;
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Invalid username or password';
      set({ authError: msg, isAuthenticating: false });
      get().addToast('Authentication Failed', msg, 'warning');
      return false;
    }
  },

  lookupEmployeeApi: async (query: string) => {
    try {
      if (USE_MOCK) {
        return null;
      }
      return await directoryApi.lookupEmployee(query);
    } catch {
      return null;
    }
  },

  submitTicketApi: async (input) => {
    const taskMeta = TASK_CATEGORIES.find((c) => c.code === input.taskCode);
    const now = new Date();

    if (USE_MOCK) {
      return get().createTicket({
        company: input.companyName ?? 'Five Star Bus Co.',
        companyCode: 'FS',
        location: input.locationName ?? 'Pasay Terminal',
        locationCode: 'PSY',
        department: input.departmentName ?? 'Operations',
        departmentCode: 'OPS',
        requestor: input.requestorName ?? 'Terminal Staff',
        employeeId: input.employeeId,
        taskCode: input.taskCode,
        description: input.description,
        mode: 'SITE',
        intakeSource: 'PC Kiosk',
      });
    }

    try {
      const res = await ticketsApi.submitPublicTicket({
        employee_id: input.employeeId,
        task_code: input.taskCode,
        description: input.description,
      });

      const newTicket: Ticket = {
        id: 't-' + Date.now(),
        ticketCode: res.ticket_code,
        company: input.companyName ?? 'Five Star Bus Co.',
        companyCode: 'FS',
        mode: 'SITE',
        department: input.departmentName ?? 'Operations',
        departmentCode: 'OPS',
        requestor: input.requestorName ?? 'Terminal Staff',
        employeeId: input.employeeId,
        task: taskMeta ? taskMeta.name : input.taskCode,
        taskCode: input.taskCode,
        description: input.description,
        month: now.toLocaleString('default', { month: 'long', year: 'numeric' }),
        dateStarted: now.toISOString().split('T')[0],
        timeStarted: now.toTimeString().split(' ')[0],
        status: 'OPEN',
        location: input.locationName ?? 'Pasay Terminal',
        locationCode: 'PSY',
        priority: taskMeta ? taskMeta.defaultPriority : 'Medium',
        intakeSource: 'PC Kiosk',
        createdAt: res.created_at || now.toISOString(),
        messages: [
          {
            id: 'msg-init-' + Date.now(),
            senderRole: 'employee',
            senderName: input.requestorName ?? 'Terminal Staff',
            message: input.description,
            timestamp: formatTimeAmPm(now),
          },
        ],
      };

      set((state) => ({
        tickets: [newTicket, ...state.tickets],
      }));

      get().addToast(
        `Ticket ${newTicket.ticketCode} Submitted!`,
        `Saved to central IT database (${newTicket.location})`,
        'success'
      );

      return newTicket;
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to submit ticket to server';
      get().addToast('Submission Error', msg, 'warning');
      return null;
    }
  },

  currentUser: null,
  loginModalRole: null,

  openLoginModal: (role) => set({ loginModalRole: role }),
  closeLoginModal: () => set({ loginModalRole: null }),

  loginAsStaff: (role, customName) => {
    const user: AuthenticatedUser =
      role === 'admin'
        ? {
            id: 'tm-1',
            name: customName || 'Stephen I. Miralles',
            email: 'stephen@fivestarbus.com',
            role: 'admin',
            title: 'Senior IT Analyst (Admin)',
            avatar:
              'https://api.dicebear.com/7.x/avataaars/svg?seed=William&backgroundColor=b6e3f4',
          }
        : {
            id: 'tm-2',
            name: customName || 'Nathaniel D. Esguerra',
            email: 'nathaniel@fivestarbus.com',
            role: 'it',
            title: 'IT Support Specialist',
            avatar:
              'https://api.dicebear.com/7.x/avataaars/svg?seed=Edward&backgroundColor=fed7aa',
          };

    set({
      currentUser: user,
      loginModalRole: null,
      activeView: role === 'admin' ? 'analytics' : 'overview',
      queueFilter: 'ALL',
      locationFilter: 'ALL',
    });

    get().addToast(
      `Welcome back, ${user.name}!`,
      `Logged in as ${user.title}`,
      'success'
    );
  },

  logoutToKiosk: () => {
    set({
      currentUser: null,
      selectedTicketId: null,
      activeWorkbenchTicketId: null,
      isQuickIntakeOpen: false,
    });
    get().addToast(
      'Returned to Employee Ticket Screen',
      'Staff session signed out cleanly',
      'info'
    );
  },

  activeView: 'overview',
  setActiveView: (view) => set({ activeView: view }),

  queueFilter: 'ALL',
  setQueueFilter: (filter) => set({ queueFilter: filter }),

  locationFilter: 'ALL',
  setLocationFilter: (loc) => set({ locationFilter: loc }),

  sidebarCollapsed: false,
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  tickets: INITIAL_TICKETS,
  selectedTicketId: null,
  setSelectedTicketId: (id) => set({ selectedTicketId: id }),
  activeWorkbenchTicketId: null,
  setActiveWorkbenchTicketId: (id) => set({ activeWorkbenchTicketId: id }),
  activeReportId: 1,
  setActiveReportId: (id) => set({ activeReportId: id }),

  isQuickIntakeOpen: false,
  setQuickIntakeOpen: (open) => set({ isQuickIntakeOpen: open }),

  searchQuery: '',
  setSearchQuery: (q) => set({ searchQuery: q }),

  activeOfficeLocationCode: 'CMA',
  setActiveOfficeLocationCode: (code) => set({ activeOfficeLocationCode: code }),

  toasts: [],
  addToast: (title, description, type = 'success') => {
    const id = 'toast-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
    set((state) => ({
      toasts: [...state.toasts, { id, title, description, type }],
    }));
    setTimeout(() => {
      get().removeToast(id);
    }, 3400);
  },
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),

  savedRepairNotes: INITIAL_SAVED_REPAIR_NOTES,

  saveRepairNoteAndChecklist: (note) => {
    const now = new Date();
    const updatedAt = `${now.toISOString().split('T')[0]} ${now
      .toTimeString()
      .slice(0, 5)}`;
    const newNote: SavedRepairNote = {
      ...note,
      id: 'note-' + Date.now(),
      updatedAt,
    };
    set((state) => ({
      savedRepairNotes: [newNote, ...state.savedRepairNotes],
    }));
    get().addToast(
      'Saved to Repair Notes Library',
      `"${newNote.title}" stored with ${newNote.checklistSteps.length} checklist steps.`,
      'success'
    );
  },

  updateSavedRepairNote: (id, updates) => {
    const now = new Date();
    const updatedAt = `${now.toISOString().split('T')[0]} ${now
      .toTimeString()
      .slice(0, 5)}`;
    set((state) => ({
      savedRepairNotes: state.savedRepairNotes.map((n) =>
        n.id === id ? { ...n, ...updates, updatedAt } : n
      ),
    }));
    get().addToast(
      'Repair Note Updated',
      'Saved troubleshooting checklist & repair note changes.',
      'success'
    );
  },

  deleteSavedRepairNote: (id) => {
    set((state) => ({
      savedRepairNotes: state.savedRepairNotes.filter((n) => n.id !== id),
    }));
    get().addToast('Repair Note Removed', 'Deleted from library', 'info');
  },

  applySavedNoteToTicket: (ticketId, noteId) => {
    const note = get().savedRepairNotes.find((n) => n.id === noteId);
    if (!note) return;
    const newChecklist: ChecklistStep[] = note.checklistSteps.map((text, idx) => ({
      id: `step-${Date.now()}-${idx}`,
      text,
      completed: false,
    }));
    set((state) => ({
      tickets: state.tickets.map((t) =>
        t.id === ticketId
          ? {
              ...t,
              checklist: newChecklist,
              description: note.symptomAndFixNote,
            }
          : t
      ),
    }));
    get().addToast(
      'Loaded Saved Repair Guide',
      `Applied "${note.title}" checklist & repair note to active ticket.`,
      'success'
    );
  },

  getTicketChecklist: (ticketId) => {
    const found = get().tickets.find((t) => t.id === ticketId);
    return found?.checklist ?? DEFAULT_SOP_STEPS;
  },

  toggleTicketChecklistStep: (ticketId, stepId) => {
    set((state) => ({
      tickets: state.tickets.map((t) => {
        if (t.id !== ticketId) return t;
        const currentList = t.checklist ?? DEFAULT_SOP_STEPS;
        return {
          ...t,
          checklist: currentList.map((s) =>
            s.id === stepId ? { ...s, completed: !s.completed } : s
          ),
        };
      }),
    }));
  },

  addTicketChecklistStep: (ticketId, text) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    set((state) => ({
      tickets: state.tickets.map((t) => {
        if (t.id !== ticketId) return t;
        const currentList = t.checklist ?? DEFAULT_SOP_STEPS;
        return {
          ...t,
          checklist: [
            ...currentList,
            {
              id: 'step-' + Date.now() + '-' + Math.random().toString(36).slice(2, 5),
              text: trimmed,
              completed: false,
            },
          ],
        };
      }),
    }));
  },

  removeTicketChecklistStep: (ticketId, stepId) => {
    set((state) => ({
      tickets: state.tickets.map((t) => {
        if (t.id !== ticketId) return t;
        const currentList = t.checklist ?? DEFAULT_SOP_STEPS;
        return {
          ...t,
          checklist: currentList.filter((s) => s.id !== stepId),
        };
      }),
    }));
  },

  editTicketChecklistStep: (ticketId, stepId, newText) => {
    const trimmed = newText.trim();
    if (!trimmed) return;
    set((state) => ({
      tickets: state.tickets.map((t) => {
        if (t.id !== ticketId) return t;
        const currentList = t.checklist ?? DEFAULT_SOP_STEPS;
        return {
          ...t,
          checklist: currentList.map((s) =>
            s.id === stepId ? { ...s, text: trimmed } : s
          ),
        };
      }),
    }));
  },

  claimTicket: (ticketId, techName, techId) => {
    const activeTechName = techName ?? get().currentUser?.name ?? 'Nathaniel D. Esguerra';
    const activeTechId = techId ?? get().currentUser?.id ?? 'tm-2';
    const target = get().tickets.find((t) => t.id === ticketId);

    const claimMsg: TicketChatMessage = {
      id: 'msg-' + Date.now(),
      senderRole: 'it',
      senderName: `${activeTechName} (IT Support)`,
      message: `Hi! I have claimed your ticket (${target?.ticketCode ?? ''}) and started working on it. Feel free to message me here if you have any questions.`,
      timestamp: formatTimeAmPm(new Date()),
    };

    set((state) => ({
      tickets: state.tickets.map((t) =>
        t.id === ticketId
          ? {
              ...t,
              status: 'PROG',
              workedBy: activeTechName,
              workedById: activeTechId,
              messages: [...(t.messages ?? []), claimMsg],
            }
          : t
      ),
    }));
    get().addToast(
      `Claimed ${target?.ticketCode ?? 'Ticket'}`,
      `Assigned to ${activeTechName} • Status → In Progress`,
      'success'
    );
  },

  updateTicketMode: (ticketId, mode) => {
    const target = get().tickets.find((t) => t.id === ticketId);
    set((state) => ({
      tickets: state.tickets.map((t) =>
        t.id === ticketId ? { ...t, mode } : t
      ),
    }));
    get().addToast(
      `Support Mode Updated`,
      `${target?.ticketCode ?? 'Ticket'} set to ${mode === 'SITE' ? 'On-Site (SITE)' : 'Remote (REM)'}`,
      'info'
    );
  },

  updateTicketTask: (ticketId, taskCode) => {
    const category = TASK_CATEGORIES.find((c) => c.code === taskCode);
    const target = get().tickets.find((t) => t.id === ticketId);
    if (!target) return;
    const taskName = category?.name ?? target.task;
    set((state) => ({
      tickets: state.tickets.map((t) =>
        t.id === ticketId ? { ...t, taskCode, task: taskName } : t
      ),
    }));
    get().addToast(
      'Diagnosed Task Updated',
      `Reclassified to ${taskName} (${taskCode})`,
      'success'
    );
  },

  updateTicketDescription: (ticketId, description) => {
    set((state) => ({
      tickets: state.tickets.map((t) =>
        t.id === ticketId ? { ...t, description } : t
      ),
    }));
    get().addToast(
      'Job Log Notes Saved',
      'Technical symptoms & repair summary updated',
      'success'
    );
  },

  sendTicketMessage: (ticketId, senderRole, senderName, message) => {
    const trimmed = message.trim();
    if (!trimmed) return;
    const newMsg: TicketChatMessage = {
      id: 'msg-' + Date.now() + '-' + Math.random().toString(36).slice(2, 5),
      senderRole,
      senderName,
      message: trimmed,
      timestamp: formatTimeAmPm(new Date()),
    };

    set((state) => ({
      tickets: state.tickets.map((t) =>
        t.id === ticketId
          ? { ...t, messages: [...(t.messages ?? []), newMsg] }
          : t
      ),
    }));
  },

  resolveTicket: (ticketId) => {
    const now = new Date();
    const timeFinished = now.toTimeString().split(' ')[0];
    const dateFinished = now.toISOString().split('T')[0];
    const target = get().tickets.find((t) => t.id === ticketId);
    const activeTechName =
      target?.workedBy ?? get().currentUser?.name ?? 'Nathaniel D. Esguerra';

    const resolveMsg: TicketChatMessage = {
      id: 'msg-val-' + Date.now(),
      senderRole: 'it',
      senderName: `${activeTechName} (IT Support)`,
      message:
        '🔔 VALIDATION REQUEST: Repair marked completed by IT Support. Please test your equipment and click "Yes, Confirm Closure" to validate and close this ticket.',
      timestamp: formatTimeAmPm(now),
    };

    set((state) => ({
      tickets: state.tickets.map((t) => {
        if (t.id !== ticketId) return t;
        return {
          ...t,
          status: 'RESL',
          validationRequested: true,
          validationRequestedAt: now.toISOString(),
          timeFinished,
          dateFinished,
          duration: t.duration ?? 0.65,
          closureTokenHash: 'sha256:' + Math.random().toString(16).substring(2, 18),
          messages: [...(t.messages ?? []), resolveMsg],
        };
      }),
    }));
    get().addToast(
      `Validation Request Sent for ${target?.ticketCode ?? 'Ticket'}`,
      `Sent to ${target?.requestor ?? 'requestor'} for closure validation.`,
      'info'
    );
  },

  requestValidation: (ticketId) => {
    const now = new Date();
    const target = get().tickets.find((t) => t.id === ticketId);
    const activeTechName =
      target?.workedBy ?? get().currentUser?.name ?? 'Nathaniel D. Esguerra';

    const valMsg: TicketChatMessage = {
      id: 'msg-val-req-' + Date.now(),
      senderRole: 'it',
      senderName: `${activeTechName} (IT Support)`,
      message:
        '🔔 VALIDATION REMINDER: IT Support is requesting your validation. Please test your equipment and confirm closure if working properly.',
      timestamp: formatTimeAmPm(now),
    };

    set((state) => ({
      tickets: state.tickets.map((t) =>
        t.id === ticketId
          ? {
              ...t,
              validationRequested: true,
              validationRequestedAt: now.toISOString(),
              messages: [...(t.messages ?? []), valMsg],
            }
          : t
      ),
    }));
    get().addToast(
      'Validation Request Sent',
      `Sent closure reminder to ${target?.requestor ?? 'requestor'}.`,
      'info'
    );
  },

  confirmClosure: (ticketId) => {
    const target = get().tickets.find((t) => t.id === ticketId);
    set((state) => ({
      tickets: state.tickets.map((t) =>
        t.id === ticketId
          ? {
              ...t,
              status: 'CLSD',
              userConfirmedAt: new Date().toISOString(),
            }
          : t
      ),
    }));
    get().addToast(
      `Verified & Closed ${target?.ticketCode ?? 'Ticket'}`,
      'Ticket closure confirmed and archived in 15-column Job Log.',
      'success'
    );
  },

  reopenTicket: (ticketId) => {
    const target = get().tickets.find((t) => t.id === ticketId);
    set((state) => ({
      tickets: state.tickets.map((t) =>
        t.id === ticketId
          ? {
              ...t,
              status: 'PROG',
              timeFinished: undefined,
              dateFinished: undefined,
            }
          : t
      ),
    }));
    get().addToast(
      `Reopened ${target?.ticketCode ?? 'Ticket'}`,
      'Returned to IT Support active repairs',
      'warning'
    );
  },

  createTicket: (input) => {
    const now = new Date();
    const randomNum = Math.floor(261050 + Math.random() * 900);
    const taskMeta = TASK_CATEGORIES.find((c) => c.code === input.taskCode);
    const newTicket: Ticket = {
      id: 't-' + Date.now(),
      ticketCode: `T-${randomNum}`,
      company: input.company,
      companyCode: input.companyCode,
      mode: input.mode,
      department: input.department,
      departmentCode: input.departmentCode,
      requestor: input.requestor,
      employeeId: input.employeeId,
      task: taskMeta ? taskMeta.name : input.taskCode,
      taskCode: input.taskCode,
      description: input.description,
      month: 'October 2026',
      dateStarted: now.toISOString().split('T')[0],
      timeStarted: now.toTimeString().split(' ')[0],
      status: 'OPEN',
      location: input.location,
      locationCode: input.locationCode,
      priority: taskMeta ? taskMeta.defaultPriority : 'Medium',
      intakeSource: input.intakeSource ?? 'PC Kiosk',
      createdAt: now.toISOString(),
      messages: [
        {
          id: 'msg-init-' + Date.now(),
          senderRole: 'employee',
          senderName: input.requestor,
          message: input.description,
          timestamp: formatTimeAmPm(now),
        },
      ],
    };

    set((state) => ({
      tickets: [newTicket, ...state.tickets],
    }));

    get().addToast(
      `Ticket ${newTicket.ticketCode} Submitted!`,
      `IT Support has been notified (${newTicket.location})`,
      'success'
    );

    return newTicket;
  },

  assignTicket: (ticketId, technicianName, technicianId) => {
    const target = get().tickets.find((t) => t.id === ticketId);
    const assignMsg: TicketChatMessage = {
      id: 'msg-' + Date.now(),
      senderRole: 'it',
      senderName: 'Dispatch Admin',
      message: `Ticket (${target?.ticketCode ?? ''}) has been assigned to ${technicianName} by Administrator.`,
      timestamp: formatTimeAmPm(new Date()),
    };
    set((state) => ({
      tickets: state.tickets.map((t) =>
        t.id === ticketId
          ? {
              ...t,
              status: t.status === 'OPEN' ? 'PROG' : t.status,
              workedBy: technicianName,
              workedById: technicianId,
              messages: [...(t.messages ?? []), assignMsg],
            }
          : t
      ),
    }));
    get().addToast(
      `Assigned ${target?.ticketCode ?? 'Ticket'} to ${technicianName}`,
      'Dispatch assignment updated successfully.',
      'success'
    );
  },

  // IT Team Specialist & Account Management
  itTeamMembers: TEAM_ROSTER,
  createITMember: (memberData) => {
    const newMember: TeamMember = {
      id: 'tm-' + Date.now(),
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
        memberData.name
      )}&backgroundColor=b6e3f4`,
      ticketsClosed: 0,
      activeTickets: 0,
      flameScore: 10,
      ...memberData,
    };
    set((state) => ({
      itTeamMembers: [newMember, ...state.itTeamMembers],
    }));
    get().addToast(
      'IT Specialist Account Created',
      `${newMember.name} added to Five Star IT staff.`,
      'success'
    );
  },
  deleteITMember: (id) => {
    const member = get().itTeamMembers.find((m) => m.id === id);
    set((state) => ({
      itTeamMembers: state.itTeamMembers.filter((m) => m.id !== id),
    }));
    get().addToast(
      'Account Removed',
      `${member?.name ?? 'Specialist'} removed from active IT staff.`,
      'info'
    );
  },

  // Verified Employees Directory
  verifiedEmployeesList: Object.values(VERIFIED_EMPLOYEES),
  createEmployee: (empData) => {
    const newEmp: EmployeeProfile = {
      id: 'emp-' + Date.now(),
      ...empData,
    };
    set((state) => ({
      verifiedEmployeesList: [newEmp, ...state.verifiedEmployeesList],
    }));
    get().addToast(
      'Employee Profile Created',
      `${newEmp.full_name} (${newEmp.employee_id}) added to company directory.`,
      'success'
    );
  },
  deleteEmployee: (employeeId) => {
    set((state) => ({
      verifiedEmployeesList: state.verifiedEmployeesList.filter(
        (e) => e.employee_id !== employeeId
      ),
    }));
    get().addToast(
      'Employee Removed',
      `Employee ID ${employeeId} removed from directory.`,
      'info'
    );
  },

  verifyTicketCode: getInitialVerifyCode(),
  setVerifyTicketCode: (code) => {
    set({ verifyTicketCode: code });
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (code) {
        url.searchParams.set('verifyTicket', code);
      } else {
        url.searchParams.delete('verifyTicket');
        url.searchParams.delete('ticket');
      }
      window.history.replaceState({}, '', url.toString());
    }
  },

  unlockedTicketCodes: {},
  unlockTicketVerification: (ticketCode) =>
    set((state) => ({
      unlockedTicketCodes: {
        ...state.unlockedTicketCodes,
        [ticketCode.trim().toUpperCase()]: true,
      },
    })),

  copyTicketShareLink: async (ticketCode) => {
    const origin =
      typeof window !== 'undefined' && window.location.origin
        ? window.location.origin
        : 'http://localhost:5173';
    const path =
      typeof window !== 'undefined' && window.location.pathname
        ? window.location.pathname
        : '/';
    const link = `${origin}${path}?verifyTicket=${ticketCode}`;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(link);
      }
    } catch (err) {
      console.warn('Clipboard write failed, fallback used', err);
    }
    get().addToast(
      'Confirmation Link Copied!',
      `Send to employee via Viber/Chat: ${link}`,
      'success'
    );
    return link;
  },
}));
