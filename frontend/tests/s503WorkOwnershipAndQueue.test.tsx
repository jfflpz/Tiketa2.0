// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { ITWorkbenchBoardView } from '../src/features/workbench/ITWorkbenchBoardView';
import { TicketQueueTable, formatManilaTimestamp } from '../src/features/tickets/components/TicketQueueTable';
import { TicketQueueKanbanBoard } from '../src/features/tickets/components/TicketQueueKanbanBoard';
import { useAppStore } from '../src/store/useAppStore';
import { canEditTicket } from '../src/store/slices/ticketOperationsSlice';
import { sortTicketsSprint5 } from '../src/store/slices/ticketQueueSlice';
import type { Ticket } from '../src/types/ticket';
import type { TeamMember } from '../src/types/team';
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
        id: 'c-1',
        ticket_id: 't-1',
        user_id: 'u-1',
        author_name: 'Tech',
        author_role: 'it',
        body: 'ok',
        is_internal: false,
        created_at: new Date().toISOString(),
      }),
    },
  };
});

const ownerTech: AuthenticatedUser = {
  id: 'tech-uuid-1',
  name: 'Nathaniel D. Esguerra',
  email: 'nathaniel@tiketa.ph',
  role: 'it',
  title: 'Field Technician',
  avatar: 'NE',
};

const otherTech: AuthenticatedUser = {
  id: 'tech-uuid-2',
  name: 'Juan Dela Cruz',
  email: 'juan@tiketa.ph',
  role: 'it',
  title: 'Network Specialist',
  avatar: 'JD',
};

const adminUser: AuthenticatedUser = {
  id: 'admin-uuid-99',
  name: 'Admin Supervisor',
  email: 'admin@tiketa.ph',
  role: 'admin',
  title: 'IT Administrator',
  avatar: 'AS',
};

const sampleTeamMembers: TeamMember[] = [
  {
    id: 'tech-uuid-1',
    name: 'Nathaniel D. Esguerra',
    role: 'Field Technician',
    systemRole: 'it',
    email: 'nathaniel@tiketa.ph',
    avatar: '',
    department: 'IT',
    status: 'active',
    primaryLocation: 'Pasay',
    ticketsClosed: 12,
    activeTickets: 2,
    flameScore: 95,
  },
  {
    id: 'tech-uuid-2',
    name: 'Juan Dela Cruz',
    role: 'Network Engineer',
    systemRole: 'it',
    email: 'juan@tiketa.ph',
    avatar: '',
    department: 'IT',
    status: 'active',
    primaryLocation: 'Cubao',
    ticketsClosed: 8,
    activeTickets: 1,
    flameScore: 88,
  },
];

const assignedTicket: Ticket = {
  id: 'ticket-owned-1',
  ticketCode: 'T-2610-OWN1',
  company: 'Five Star Bus',
  companyCode: 'P5STAR',
  department: 'Cash Management',
  departmentCode: 'CASH',
  requestor: 'Maria Santos',
  employeeId: 'EMP-1001',
  task: 'Printer Troubleshoot',
  taskCode: 'PRN-TS',
  description: 'Cutter blade jammed',
  month: 'November',
  dateStarted: '2026-11-04',
  timeStarted: '08:30',
  status: 'PROG',
  mode: 'SITE',
  location: 'Pasay Terminal',
  locationCode: 'MNL-PASAY',
  workedBy: 'Nathaniel D. Esguerra',
  workedById: 'tech-uuid-1',
  assigned_tech_id: 'tech-uuid-1',
  priority: 'High',
  createdAt: '2026-11-04T08:30:00Z',
  technicianDiagnosis: 'Cutter gear serviced',
  messages: [],
};

describe('F-03: Work Assignment Ownership & Priority Queue Sorting (s503)', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    useAppStore.setState({
      currentUser: ownerTech,
      tickets: [assignedTicket],
      activeWorkbenchTicketId: null,
      selectedTicketId: null,
      inspectedTicket: null,
      itTeamMembers: sampleTeamMembers,
      toasts: [],
      serverDictionaries: {
        companies: [{ id: 'comp-1', code: 'P5STAR', name: 'Five Star Bus' }],
        locations: [{ id: 'loc-1', code: 'MNL-PASAY', name: 'Pasay Terminal' }],
        departments: [{ id: 'dept-1', code: 'CASH', name: 'Cash Management' }],
        tasks: [{ id: 'task-1', code: 'PRN-TS', name: 'Printer Troubleshoot' }],
        location_departments: [],
      },
    });
  });

  it('1. Strict Ownership Invariant: canEditTicket authorizes only assigned technician, rejects other tech and admin', () => {
    // Assigned technician owns the ticket
    expect(canEditTicket(ownerTech, assignedTicket)).toBe(true);

    // Another technician does NOT own the ticket
    expect(canEditTicket(otherTech, assignedTicket)).toBe(false);

    // Admin user does NOT own the ticket directly (must reassign first)
    expect(canEditTicket(adminUser, assignedTicket)).toBe(false);

    // Unauthenticated user does NOT own the ticket
    expect(canEditTicket(null, assignedTicket)).toBe(false);

    // Unassigned ticket (OPEN with no tech assigned) can be claimed
    const openTicket: Ticket = { ...assignedTicket, status: 'OPEN', workedById: undefined, assigned_tech_id: undefined, workedBy: undefined };
    expect(canEditTicket(ownerTech, openTicket)).toBe(true);
    expect(canEditTicket(otherTech, openTicket)).toBe(true);
  });

  it('2. Non-Owner Read-Only Enforcement in Workbench: displays Assigned to [Name] badge and locks controls', () => {
    // Current user is other technician
    useAppStore.setState({
      currentUser: otherTech,
      activeWorkbenchTicketId: assignedTicket.id,
    });

    render(<ITWorkbenchBoardView />);

    // Assert read-only badge "Assigned to Nathaniel D. Esguerra" appears
    expect(screen.getAllByText(/Assigned to Nathaniel D. Esguerra/i).length).toBeGreaterThanOrEqual(1);

    // "Mark Repair Resolved" button is hidden/replaced by read-only badge
    expect(screen.queryByRole('button', { name: /Mark Repair Resolved/i })).toBeNull();

    // Notes textarea is readOnly and disabled
    const notesTextarea = screen.getByPlaceholderText(/Assigned to Nathaniel D. Esguerra \(Read-Only\)/i) as HTMLTextAreaElement;
    expect(notesTextarea.readOnly).toBe(true);
    expect(notesTextarea.disabled).toBe(true);

    // Save Note button is hidden
    expect(screen.queryByRole('button', { name: /Save Note/i })).toBeNull();

    // Chat quick replies and send button are disabled
    const sendBtn = screen.getByRole('button', { name: /Send Message/i });
    expect(sendBtn.hasAttribute('disabled')).toBe(true);
  });

  it('3. Admin Reassignment Gate: Admin viewing another technician ticket sees read-only controls until reassigned', () => {
    useAppStore.setState({
      currentUser: adminUser,
      activeWorkbenchTicketId: assignedTicket.id,
    });

    render(<ITWorkbenchBoardView />);

    // Admin sees read-only badge
    expect(screen.getAllByText(/Assigned to Nathaniel D. Esguerra/i).length).toBeGreaterThanOrEqual(1);

    // Mode toggle buttons are disabled with title explaining reassignment requirement
    const remBtn = screen.getByRole('button', { name: /Remote \(REM\)/i });
    expect(remBtn.hasAttribute('disabled')).toBe(true);

    // Notes textarea is readOnly and disabled
    const notesTextarea = screen.getByPlaceholderText(/Assigned to Nathaniel D. Esguerra \(Read-Only\)/i) as HTMLTextAreaElement;
    expect(notesTextarea.readOnly).toBe(true);
  });

  it('4. Deterministic Multi-Key Queue Ordering: sorts Priority DESC > Oldest Created ASC > Ticket ID tie-breaker', () => {
    const ticketCritNew: Ticket = {
      ...assignedTicket,
      id: 't-crit-new',
      ticketCode: 'T-CRIT-NEW',
      priority: 'Critical',
      createdAt: '2026-11-04T10:00:00Z',
    };
    const ticketCritOld: Ticket = {
      ...assignedTicket,
      id: 't-crit-old',
      ticketCode: 'T-CRIT-OLD',
      priority: 'Critical',
      createdAt: '2026-11-04T08:00:00Z',
    };
    const ticketHigh: Ticket = {
      ...assignedTicket,
      id: 't-high',
      ticketCode: 'T-HIGH',
      priority: 'High',
      createdAt: '2026-11-04T07:00:00Z',
    };
    const ticketLowA: Ticket = {
      ...assignedTicket,
      id: 't-low-a',
      ticketCode: 'T-LOW-A',
      priority: 'Low',
      createdAt: '2026-11-04T12:00:00Z',
    };
    const ticketLowB: Ticket = {
      ...assignedTicket,
      id: 't-low-b',
      ticketCode: 'T-LOW-B',
      priority: 'Low',
      createdAt: '2026-11-04T12:00:00Z',
    };

    const unsorted = [ticketLowB, ticketHigh, ticketCritNew, ticketLowA, ticketCritOld];
    const sorted = sortTicketsSprint5(unsorted);

    // 1. Critical tickets first, ordered oldest to newest: t-crit-old (08:00) before t-crit-new (10:00)
    expect(sorted[0].id).toBe('t-crit-old');
    expect(sorted[1].id).toBe('t-crit-new');

    // 2. High priority next
    expect(sorted[2].id).toBe('t-high');

    // 3. Low priority tickets, tie-broken by ID ascending: t-low-a before t-low-b
    expect(sorted[3].id).toBe('t-low-a');
    expect(sorted[4].id).toBe('t-low-b');
  });

  it('5. Philippine Creation Timestamp Formatting (Asia/Manila)', () => {
    // 2026-11-04T08:30:00Z is 4:30 PM in Asia/Manila (UTC+8)
    const formatted = formatManilaTimestamp('2026-11-04T08:30:00Z');
    expect(formatted).toContain('Nov 4, 2026');
    expect(formatted).toContain('04:30 PM');

    // Empty input returns dash
    expect(formatManilaTimestamp(undefined)).toBe('—');
  });

  it('6. TicketQueueTable: displays Date Created column and suppresses Resolve button for non-owners', () => {
    useAppStore.setState({ currentUser: otherTech });

    render(
      <TicketQueueTable
        tickets={[assignedTicket]}
        isAdmin={false}
        itTeamMembers={sampleTeamMembers}
        copiedCode={null}
        onSelectTicket={vi.fn()}
        onClaimAndWork={vi.fn()}
        onFocusWorkbench={vi.fn()}
        onResolveTicket={vi.fn()}
        onCopyVerification={vi.fn()}
        onAssignTicket={vi.fn()}
      />
    );

    // Header has Date Created
    expect(screen.getByText('Date Created')).toBeTruthy();

    // Row displays Philippine timestamp
    expect(screen.getByText(/Nov 4, 2026/i)).toBeTruthy();
    expect(screen.getByText(/04:30 PM/i)).toBeTruthy();

    // Workbench button is visible
    expect(screen.getByRole('button', { name: /Workbench/i })).toBeTruthy();

    // Resolve button is SUPPRESSED for non-owner, showing Assigned to [Name]
    expect(screen.queryByRole('button', { name: /^Resolve$/i })).toBeNull();
    expect(screen.getByText(/Assigned to Nathaniel D. Esguerra/i)).toBeTruthy();
  });

  it('7. TicketQueueKanbanBoard: renders Philippine timestamps and suppresses Resolve button for non-owners', () => {
    useAppStore.setState({ currentUser: otherTech });

    render(
      <TicketQueueKanbanBoard
        openTickets={[]}
        progTickets={[assignedTicket]}
        reslTickets={[]}
        isAdmin={false}
        itTeamMembers={sampleTeamMembers}
        copiedCode={null}
        onSelectTicket={vi.fn()}
        onClaimAndWork={vi.fn()}
        onFocusWorkbench={vi.fn()}
        onResolveTicket={vi.fn()}
        onCopyVerification={vi.fn()}
        onAssignTicket={vi.fn()}
      />
    );

    // Card displays Philippine timestamp
    expect(screen.getByText(/Nov 4, 2026/i)).toBeTruthy();

    // Workbench button is available
    expect(screen.getByRole('button', { name: /Workbench/i })).toBeTruthy();

    // Resolve button is SUPPRESSED for non-owner in Kanban Column 2, displaying Assigned to [Name]
    expect(screen.queryByRole('button', { name: /^Resolve$/i })).toBeNull();
    expect(screen.getByText(/Assigned to Nathaniel D. Esguerra/i)).toBeTruthy();
  });

  it('8. Queue Ordering Resilience: tickets with invalid or missing date strings sort deterministically by UUID tie-breaker without NaN disruption', () => {
    const ticketInvalid1: Ticket = {
      ...assignedTicket,
      id: 'ticket-uuid-b',
      ticketCode: 'T-INV-B',
      priority: 'High',
      createdAt: 'invalid-date-string',
    };
    const ticketInvalid2: Ticket = {
      ...assignedTicket,
      id: 'ticket-uuid-a',
      ticketCode: 'T-INV-A',
      priority: 'High',
      createdAt: 'None',
    };
    const ticketMissingDate: Ticket = {
      ...assignedTicket,
      id: 'ticket-uuid-c',
      ticketCode: 'T-INV-C',
      priority: 'High',
      createdAt: '' as any,
    };

    // Shuffled permutations must all resolve strictly to [ticket-uuid-a, ticket-uuid-b, ticket-uuid-c]
    const perm1 = [ticketInvalid1, ticketInvalid2, ticketMissingDate];
    const perm2 = [ticketMissingDate, ticketInvalid1, ticketInvalid2];
    const perm3 = [ticketInvalid2, ticketMissingDate, ticketInvalid1];

    const sorted1 = sortTicketsSprint5(perm1);
    const sorted2 = sortTicketsSprint5(perm2);
    const sorted3 = sortTicketsSprint5(perm3);

    expect(sorted1.map((t) => t.id)).toEqual(['ticket-uuid-a', 'ticket-uuid-b', 'ticket-uuid-c']);
    expect(sorted2.map((t) => t.id)).toEqual(['ticket-uuid-a', 'ticket-uuid-b', 'ticket-uuid-c']);
    expect(sorted3.map((t) => t.id)).toEqual(['ticket-uuid-a', 'ticket-uuid-b', 'ticket-uuid-c']);

    // Ensure priority ordering is still respected even with invalid dates
    const ticketCritInvalid: Ticket = {
      ...assignedTicket,
      id: 'ticket-uuid-z-crit',
      ticketCode: 'T-CRIT-INV',
      priority: 'Critical',
      createdAt: 'invalid-timestamp',
    };
    const mixed = sortTicketsSprint5([ticketInvalid1, ticketCritInvalid, ticketInvalid2]);
    expect(mixed[0].id).toBe('ticket-uuid-z-crit');
    expect(mixed[1].id).toBe('ticket-uuid-a');
    expect(mixed[2].id).toBe('ticket-uuid-b');
  });
});

