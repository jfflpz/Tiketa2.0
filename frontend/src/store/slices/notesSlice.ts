import type { AppSliceCreator } from '../types';
import type { SavedRepairNote, ChecklistStep } from '../../types/ticket';

export const DEFAULT_SOP_STEPS: ChecklistStep[] = [
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

export const INITIAL_SAVED_REPAIR_NOTES: SavedRepairNote[] = [
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

export interface NotesSlice {
  savedRepairNotes: SavedRepairNote[];
  saveRepairNoteAndChecklist: (
    note: Omit<SavedRepairNote, 'id' | 'updatedAt'>
  ) => void;
  updateSavedRepairNote: (id: string, updates: Partial<SavedRepairNote>) => void;
  deleteSavedRepairNote: (id: string) => void;
  applySavedNoteToTicket: (ticketId: string, noteId: string) => void;
  getTicketChecklist: (ticketId: string) => ChecklistStep[];
  toggleTicketChecklistStep: (ticketId: string, stepId: string) => void;
  addTicketChecklistStep: (ticketId: string, text: string) => void;
  removeTicketChecklistStep: (ticketId: string, stepId: string) => void;
  editTicketChecklistStep: (ticketId: string, stepId: string, newText: string) => void;
}

export const createNotesSlice: AppSliceCreator<NotesSlice> = (set, get) => ({
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
});
