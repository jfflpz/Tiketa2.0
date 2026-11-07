// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { ITWorkbenchBoardView } from '../src/features/workbench/ITWorkbenchBoardView';
import { JobLogDrawer } from '../src/components/tickets/JobLogDrawer';
import { useAppStore } from '../src/store/useAppStore';
import { ticketsApi } from '../src/api/client';
import type { Ticket } from '../src/types/ticket';
import type { AuthenticatedUser } from '../src/store/slices/uiSlice';

// Global ResizeObserver mock for JSDOM
global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as any;

vi.mock('../src/api/client', async () => {
  const actual = await vi.importActual<typeof import('../src/api/client')>('../src/api/client');
  return {
    ...actual,
    ticketsApi: {
      ...actual.ticketsApi,
      getQueue: vi.fn().mockResolvedValue([]),
      getTicket: vi.fn(),
      getComments: vi.fn().mockResolvedValue([]),
      updateStatus: vi.fn().mockResolvedValue({}),
      updateServiceRecord: vi.fn().mockResolvedValue({}),
      addComment: vi.fn().mockResolvedValue({
        id: 'c-new',
        ticket_id: 't-1',
        user_id: 'tech-1',
        author_name: 'Nathaniel D. Esguerra',
        author_role: 'it',
        body: 'Note saved',
        is_internal: false,
        created_at: new Date().toISOString(),
      }),
    },
  };
});

const mockTechUser: AuthenticatedUser = {
  id: 'tech-1',
  name: 'Nathaniel D. Esguerra',
  email: 'tech@tiketa.ph',
  role: 'it',
  title: 'Field Technician',
  avatar: 'NE',
};

const ticketA: Ticket = {
  id: 'ticket-uuid-001',
  ticketCode: 'T-2610-001',
  company: 'Five Star Bus',
  companyCode: 'P5STAR',
  department: 'Cash Management',
  departmentCode: 'CASH',
  requestor: 'Maria Santos',
  employeeId: 'EMP-1001',
  task: 'Printer Troubleshoot',
  taskCode: 'PRN-TS',
  description: 'Receipt printer thermal head jammed',
  month: 'November',
  dateStarted: '2026-11-04',
  timeStarted: '08:30',
  status: 'PROG',
  mode: 'SITE',
  location: 'Pasay Terminal',
  locationCode: 'MNL-PASAY',
  workedBy: 'Nathaniel D. Esguerra',
  workedById: 'tech-1',
  assigned_tech_id: 'tech-1',
  priority: 'High',
  createdAt: '2026-11-04T08:30:00Z',
  technicianDiagnosis: 'Initial diagnosis: gears aligned, awaiting final check',
  messages: [],
};

const ticketB: Ticket = {
  id: 'ticket-uuid-002',
  ticketCode: 'T-2610-002',
  company: 'Five Star Bus',
  companyCode: 'P5STAR',
  department: 'Operations',
  departmentCode: 'OPS',
  requestor: 'Carlos Reyes',
  employeeId: 'EMP-1002',
  task: 'Network Setup',
  taskCode: 'NET-CFG',
  description: 'Booth LAN port lost connectivity',
  month: 'November',
  dateStarted: '2026-11-04',
  timeStarted: '09:00',
  status: 'PROG',
  mode: 'REM',
  location: 'Cubao Terminal',
  locationCode: 'QC-CUBAO',
  workedBy: 'Nathaniel D. Esguerra',
  workedById: 'tech-1',
  assigned_tech_id: 'tech-1',
  priority: 'Critical',
  createdAt: '2026-11-04T09:00:00Z',
  technicianDiagnosis: 'Switch port 4 rebooted remotely',
  messages: [],
};

const ticketResolved: Ticket = {
  id: 'ticket-uuid-003',
  ticketCode: 'T-2610-003',
  company: 'Five Star Bus',
  companyCode: 'P5STAR',
  department: 'Dispatch',
  departmentCode: 'DISP',
  requestor: 'Elena Cruz',
  employeeId: 'EMP-1003',
  task: 'PC Hardware Repair',
  taskCode: 'PC-HW-REP',
  description: 'VGA cable connector loose',
  month: 'November',
  dateStarted: '2026-11-04',
  timeStarted: '09:30',
  dateFinished: '2026-11-04',
  timeFinished: '10:00',
  duration: 0.5,
  status: 'RESL',
  mode: 'SITE',
  location: 'Pasay Terminal',
  locationCode: 'MNL-PASAY',
  workedBy: 'Nathaniel D. Esguerra',
  workedById: 'tech-1',
  assigned_tech_id: 'tech-1',
  priority: 'Medium',
  createdAt: '2026-11-04T09:30:00Z',
  technicianDiagnosis: 'Replaced VGA cable with HDMI adapter',
  messages: [],
};

describe('F-02: Ticket Details Unification & Work Controls Cleanup (s502)', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    useAppStore.setState({
      currentUser: mockTechUser,
      tickets: [ticketA, ticketB, ticketResolved],
      activeWorkbenchTicketId: null,
      selectedTicketId: null,
      inspectedTicket: null,
      toasts: [],
      serverDictionaries: {
        companies: [{ id: 'comp-1', code: 'P5STAR', name: 'Five Star Bus' }],
        locations: [
          { id: 'loc-1', code: 'MNL-PASAY', name: 'Pasay Terminal' },
          { id: 'loc-2', code: 'QC-CUBAO', name: 'Cubao Terminal' },
        ],
        departments: [
          { id: 'dept-1', code: 'CASH', name: 'Cash Management' },
          { id: 'dept-2', code: 'OPS', name: 'Operations' },
        ],
        tasks: [
          { id: 'task-1', code: 'PRN-TS', name: 'Printer Troubleshoot' },
          { id: 'task-2', code: 'NET-CON', name: 'Network Outage' },
        ],
        location_departments: [],
      },
    });

    vi.mocked(ticketsApi.getQueue).mockResolvedValue([
      {
        id: ticketA.id,
        ticket_code: ticketA.ticketCode,
        company_id: 'comp-1',
        location_id: 'loc-1',
        department_id: 'dept-1',
        requester_name: ticketA.requestor,
        employee_id_number: ticketA.employeeId,
        task_code: ticketA.taskCode,
        description: ticketA.description,
        mode: ticketA.mode,
        month: ticketA.month,
        date_started: ticketA.dateStarted,
        time_started: ticketA.timeStarted,
        status: ticketA.status,
        assigned_tech_id: ticketA.assigned_tech_id,
        technician_name: ticketA.workedBy,
        technician_diagnosis: ticketA.technicianDiagnosis,
        created_at: ticketA.createdAt,
      } as any,
      {
        id: ticketB.id,
        ticket_code: ticketB.ticketCode,
        company_id: 'comp-1',
        location_id: 'loc-2',
        department_id: 'dept-2',
        requester_name: ticketB.requestor,
        employee_id_number: ticketB.employeeId,
        task_code: ticketB.taskCode,
        description: ticketB.description,
        mode: ticketB.mode,
        month: ticketB.month,
        date_started: ticketB.dateStarted,
        time_started: ticketB.timeStarted,
        status: ticketB.status,
        assigned_tech_id: ticketB.assigned_tech_id,
        technician_name: ticketB.workedBy,
        technician_diagnosis: ticketB.technicianDiagnosis,
        created_at: ticketB.createdAt,
      } as any,
    ]);

    vi.mocked(ticketsApi.getTicket).mockImplementation((id: string) => {
      const match = [ticketA, ticketB, ticketResolved].find((t) => t.id === id);
      if (!match) return Promise.reject(new Error('Not found'));
      return Promise.resolve({
        id: match.id,
        ticket_code: match.ticketCode,
        company_id: 'comp-1',
        location_id: 'loc-1',
        department_id: 'dept-1',
        requester_name: match.requestor,
        employee_id_number: match.employeeId,
        task_code: match.taskCode,
        description: match.description,
        mode: match.mode,
        month: match.month,
        date_started: match.dateStarted,
        time_started: match.timeStarted,
        status: match.status,
        assigned_tech_id: match.assigned_tech_id,
        technician_name: match.workedBy,
        technician_diagnosis: match.technicianDiagnosis,
        created_at: match.createdAt,
      } as any);
    });
  });

  it('1. Canonical Metadata Hierarchy: Workbench renders ticket metadata cleanly without duplicate stacked details card', async () => {
    useAppStore.setState({ activeWorkbenchTicketId: ticketA.id });

    render(<ITWorkbenchBoardView />);

    // Assert ticket code and task category appear in canonical header
    expect(screen.getAllByText('T-2610-001').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Printer Troubleshoot/i).length).toBeGreaterThanOrEqual(1);

    // Assert location and requestor context are present
    expect(screen.getAllByText(/Pasay Terminal/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Maria Santos/i).length).toBeGreaterThanOrEqual(1);

    // Verify duplicate stacked "Ticket Details" card is absent (only single canonical console hierarchy)
    expect(screen.queryByText('Duplicate Details Card')).toBeNull();
    expect(screen.queryByText(/Legacy Details Summary/i)).toBeNull();
  });

  it('2. Decommission "Technician Work Controls" Card: legacy dummy timer/work controls card is excised from DOM', async () => {
    useAppStore.setState({ selectedTicketId: ticketA.id, inspectedTicket: ticketA });

    render(<JobLogDrawer />);

    // Assert 15-column drawer record form renders
    expect(screen.getByText(/15-Column Job Log Record/i)).toBeTruthy();

    // Assert the excised "Technician Work Controls" card does NOT exist in the DOM
    expect(screen.queryByText(/Technician Work Controls/i)).toBeNull();
    expect(screen.queryByText(/Simulated Work Timer/i)).toBeNull();
    expect(screen.queryByText(/Stop Repair Timer/i)).toBeNull();
  });

  it('3. Mode Selector Relocation: Remote (REM) vs On-Site (SITE) toggle is embedded in active repair console header and interactive for owner', async () => {
    useAppStore.setState({ activeWorkbenchTicketId: ticketA.id });

    render(<ITWorkbenchBoardView />);

    // Mode toggle buttons exist in the console header
    const siteBtn = screen.getByRole('button', { name: /On-Site \(SITE\)/i });
    const remBtn = screen.getByRole('button', { name: /Remote \(REM\)/i });
    expect(siteBtn).toBeTruthy();
    expect(remBtn).toBeTruthy();

    // Owner can interact with mode toggle
    fireEvent.click(remBtn);

    // Verify state was updated to REM
    const updatedTicket = useAppStore.getState().tickets.find((t) => t.id === ticketA.id);
    expect(updatedTicket?.mode).toBe('REM');
  });

  it('4. Technician Notes Persistence: notes persist across saves and do NOT leak between tickets', async () => {
    useAppStore.setState({ activeWorkbenchTicketId: ticketA.id });

    const { unmount } = render(<ITWorkbenchBoardView />);

    // Notes textarea for ticketA should display its own technicianDiagnosis
    const textareaA = screen.getByPlaceholderText(/Leave technician notes here/i) as HTMLTextAreaElement;
    expect(textareaA.value).toBe(ticketA.technicianDiagnosis);

    // Edit notes for Ticket A
    fireEvent.change(textareaA, { target: { value: 'Updated Ticket A: Swapped roller gear' } });
    const saveBtn = screen.getByRole('button', { name: /Save Note/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      const storedA = useAppStore.getState().tickets.find((t) => t.id === ticketA.id);
      expect(storedA?.technicianDiagnosis).toBe('Updated Ticket A: Swapped roller gear');
    });

    unmount();

    // Now switch to Ticket B
    useAppStore.setState({ activeWorkbenchTicketId: ticketB.id });
    render(<ITWorkbenchBoardView />);

    // Notes textarea for ticketB must show Ticket B's diagnosis, NOT Ticket A's notes
    const textareaB = screen.getByPlaceholderText(/Leave technician notes here/i) as HTMLTextAreaElement;
    expect(textareaB.value).toBe(ticketB.technicianDiagnosis);
    expect(textareaB.value).not.toContain('Roller gear');
  });

  it('5. Compact Requester Approval State: RESL status renders "Waiting for requester approval" banner and excises staff closure sign-off button', async () => {
    useAppStore.setState({
      selectedTicketId: ticketResolved.id,
      inspectedTicket: ticketResolved,
    });

    render(<JobLogDrawer />);

    // Compact banner must be present
    expect(screen.getByText(/Waiting for requester approval/i)).toBeTruthy();

    // Excised button "Confirm Closure Sign-Off" for staff MUST NOT be present
    expect(screen.queryByText(/Confirm Closure Sign-Off/i)).toBeNull();
    expect(screen.queryByRole('button', { name: /Confirm Closure Sign-Off/i })).toBeNull();

    // Reopen Ticket button and Copy Viber Link button are retained
    expect(screen.getByRole('button', { name: /Reopen Ticket/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Copy Viber Link/i })).toBeTruthy();
  });
});
