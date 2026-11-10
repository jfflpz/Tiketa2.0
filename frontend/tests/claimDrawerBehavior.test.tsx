// @vitest-environment jsdom
// @spec FR-QUEUE-02: Claim ticket opens right drawer for inspection instead of redirecting to workbench
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { TicketListsView } from '../src/features/tickets/TicketListsView';
import { TicketQueueTable } from '../src/features/tickets/components/TicketQueueTable';
import { TicketQueueKanbanBoard } from '../src/features/tickets/components/TicketQueueKanbanBoard';
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
      claimTicket: vi.fn().mockResolvedValue({}),
      assignTicket: vi.fn().mockResolvedValue({}),
      updateStatus: vi.fn().mockResolvedValue({}),
      updateServiceRecord: vi.fn().mockResolvedValue({}),
    },
  };
});

const sampleUser: AuthenticatedUser = {
  id: 'tech-1',
  name: 'Nathaniel D. Esguerra',
  email: 'nathaniel@tiketa.ph',
  role: 'it',
  title: 'Field Technician',
  avatar: 'NE',
};

const sampleOpenTicket: Ticket = {
  id: 'ticket-claim-test-1',
  ticketCode: 'T-990001',
  employeeId: '1042',
  company: 'Nexora Corp',
  companyCode: 'NEXORA',
  department: 'Finance',
  departmentCode: 'FIN',
  requestor: 'Juan Dela Cruz',
  task: 'Printer Troubleshoot',
  taskCode: 'PRN-TS',
  description: 'Router reboot needed',
  month: 'November',
  dateStarted: '2026-11-10',
  timeStarted: '08:00',
  priority: 'Medium',
  status: 'OPEN',
  createdAt: '2026-11-10T08:00:00Z',
  location: 'Cebu Hub',
  locationCode: 'CEB',
  mode: 'SITE',
  messages: [],
};

const originalClaimTicketApi = useAppStore.getState().claimTicketApi;

describe('Claim Ticket Drawer Behavior (FR-QUEUE-02)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAppStore.setState({
      currentUser: sampleUser,
      tickets: [sampleOpenTicket],
      activeView: 'tickets',
      selectedTicketId: null,
      activeWorkbenchTicketId: null,
      searchQuery: '',
      queueFilter: 'ALL',
      locationFilter: 'ALL',
      claimTicketApi: originalClaimTicketApi,
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('1. TicketQueueTable renders "Claim Ticket" button for OPEN tickets', () => {
    const handleClaim = vi.fn();
    render(
      <TicketQueueTable
        tickets={[sampleOpenTicket]}
        isAdmin={false}
        itTeamMembers={[]}
        copiedCode={null}
        onSelectTicket={vi.fn()}
        onClaimAndWork={handleClaim}
        onFocusWorkbench={vi.fn()}
        onResolveTicket={vi.fn()}
        onCopyVerification={vi.fn()}
        onAssignTicket={vi.fn()}
      />
    );

    const claimBtn = screen.getByRole('button', { name: /Claim Ticket/i });
    expect(claimBtn).toBeTruthy();

    fireEvent.click(claimBtn);
    expect(handleClaim).toHaveBeenCalledWith(expect.anything(), sampleOpenTicket);
  });

  it('2. TicketQueueKanbanBoard renders "Claim Ticket" button for OPEN tickets', () => {
    const handleClaim = vi.fn();
    render(
      <TicketQueueKanbanBoard
        openTickets={[sampleOpenTicket]}
        progTickets={[]}
        reslTickets={[]}
        isAdmin={false}
        itTeamMembers={[]}
        copiedCode={null}
        onSelectTicket={vi.fn()}
        onClaimAndWork={handleClaim}
        onFocusWorkbench={vi.fn()}
        onResolveTicket={vi.fn()}
        onCopyVerification={vi.fn()}
        onAssignTicket={vi.fn()}
      />
    );

    const claimBtn = screen.getByRole('button', { name: /Claim Ticket/i });
    expect(claimBtn).toBeTruthy();

    fireEvent.click(claimBtn);
    expect(handleClaim).toHaveBeenCalledWith(expect.anything(), sampleOpenTicket);
  });

  it('3. TicketListsView: claiming a ticket opens right drawer (selectedTicketId) and does NOT redirect to workbench', async () => {
    const mockClaimApi = vi.fn().mockResolvedValue(true);
    useAppStore.setState({
      claimTicketApi: mockClaimApi,
      fetchQueueApi: vi.fn().mockResolvedValue(true),
      fetchDictionaries: vi.fn(),
      fetchITMembers: vi.fn(),
    });

    render(<TicketListsView />);

    const claimBtn = screen.getByRole('button', { name: /Claim Ticket/i });
    expect(claimBtn).toBeTruthy();

    fireEvent.click(claimBtn);

    await waitFor(() => {
      expect(mockClaimApi).toHaveBeenCalledWith('ticket-claim-test-1');
    });

    // CRITICAL: activeView MUST remain 'tickets', NOT redirect to 'workbench'
    expect(useAppStore.getState().activeView).toBe('tickets');

    // CRITICAL: selectedTicketId MUST be set to ticket ID to open the right drawer
    expect(useAppStore.getState().selectedTicketId).toBe('ticket-claim-test-1');

    // Active workbench ticket ID should also be initialized
    expect(useAppStore.getState().activeWorkbenchTicketId).toBe('ticket-claim-test-1');
  });

  it('4. Admin claiming binds ticket to admin and enables ownership permissions', async () => {
    const adminUser: AuthenticatedUser = {
      id: 'admin-uuid-1',
      name: 'Sarah Connor',
      email: 'sarah@tiketa.ph',
      role: 'admin',
      title: 'IT Systems Administrator',
      avatar: 'SC',
    };

    useAppStore.setState({
      currentUser: adminUser,
      tickets: [sampleOpenTicket],
    });

    vi.mocked(ticketsApi.claimTicket).mockResolvedValueOnce({
      id: 'ticket-claim-test-1',
      technician_name: 'Sarah Connor',
      assigned_tech_id: 'admin-uuid-1',
    } as any);

    const claimed = await useAppStore.getState().claimTicketApi('ticket-claim-test-1');
    expect(claimed).toBe(true);

    const updated = useAppStore.getState().tickets.find((t) => t.id === 'ticket-claim-test-1');
    expect(updated?.status).toBe('PROG');
    expect(updated?.workedBy).toBe('Sarah Connor');
    expect(updated?.workedById).toBe('admin-uuid-1');
    expect(updated?.assigned_tech_id).toBe('admin-uuid-1');
  });

  it('5. TicketQueueTable: Admin can only assign unclaimed tickets; once claimed, shows technician and hides assign selector', () => {
    const sampleTechs = [
      {
        id: 'tech-1',
        name: 'Nathaniel D. Esguerra',
        role: 'Field Technician' as const,
        systemRole: 'it' as const,
        email: 'nathaniel@tiketa.ph',
        avatar: '',
        department: 'IT',
        status: 'active' as const,
        primaryLocation: 'Pasay',
        ticketsClosed: 5,
        activeTickets: 1,
        flameScore: 90,
      },
    ];

    const claimedTicket: Ticket = {
      ...sampleOpenTicket,
      id: 'ticket-claimed-1',
      ticketCode: 'T-990002',
      status: 'PROG',
      workedBy: 'Sarah Connor',
      workedById: 'admin-uuid-1',
      assigned_tech_id: 'admin-uuid-1',
    };

    const handleAssign = vi.fn();

    // 5a: Unclaimed OPEN ticket renders Assign Tech... select for admin
    const { unmount } = render(
      <TicketQueueTable
        tickets={[sampleOpenTicket]}
        isAdmin={true}
        itTeamMembers={sampleTechs}
        copiedCode={null}
        onSelectTicket={vi.fn()}
        onClaimAndWork={vi.fn()}
        onFocusWorkbench={vi.fn()}
        onResolveTicket={vi.fn()}
        onCopyVerification={vi.fn()}
        onAssignTicket={handleAssign}
      />
    );

    expect(screen.getByRole('combobox')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Claim Ticket/i })).toBeTruthy();
    unmount();

    // 5b: Claimed ticket (PROG) displays technician name and NO assign select
    render(
      <TicketQueueTable
        tickets={[claimedTicket]}
        isAdmin={true}
        itTeamMembers={sampleTechs}
        copiedCode={null}
        onSelectTicket={vi.fn()}
        onClaimAndWork={vi.fn()}
        onFocusWorkbench={vi.fn()}
        onResolveTicket={vi.fn()}
        onCopyVerification={vi.fn()}
        onAssignTicket={handleAssign}
      />
    );

    expect(screen.queryByRole('combobox')).toBeNull();
    expect(screen.getByText('Sarah Connor')).toBeTruthy();
  });

  it('6. TicketQueueKanbanBoard: Column 1 allows admin to Claim or Assign; Column 2 removes Reassign dropdown', () => {
    const sampleTechs = [
      {
        id: 'tech-1',
        name: 'Nathaniel D. Esguerra',
        role: 'Field Technician' as const,
        systemRole: 'it' as const,
        email: 'nathaniel@tiketa.ph',
        avatar: '',
        department: 'IT',
        status: 'active' as const,
        primaryLocation: 'Pasay',
        ticketsClosed: 5,
        activeTickets: 1,
        flameScore: 90,
      },
    ];

    const claimedTicket: Ticket = {
      ...sampleOpenTicket,
      id: 'ticket-claimed-2',
      ticketCode: 'T-990003',
      status: 'PROG',
      workedBy: 'Sarah Connor',
      workedById: 'admin-uuid-1',
      assigned_tech_id: 'admin-uuid-1',
    };

    render(
      <TicketQueueKanbanBoard
        openTickets={[sampleOpenTicket]}
        progTickets={[claimedTicket]}
        reslTickets={[]}
        isAdmin={true}
        itTeamMembers={sampleTechs}
        copiedCode={null}
        onSelectTicket={vi.fn()}
        onClaimAndWork={vi.fn()}
        onFocusWorkbench={vi.fn()}
        onResolveTicket={vi.fn()}
        onCopyVerification={vi.fn()}
        onAssignTicket={vi.fn()}
      />
    );

    // Column 1 has Claim Ticket button for admin
    expect(screen.getByRole('button', { name: /Claim Ticket/i })).toBeTruthy();
    // Column 1 has Assign IT Specialist select
    expect(screen.getByRole('combobox')).toBeTruthy();

    // Column 2 (PROG) does NOT have "Reassign Tech..." select
    expect(screen.queryByText(/Reassign Tech\.\.\./i)).toBeNull();
  });

  it('7. assignTicket blocks assigning a ticket that is already claimed', async () => {
    const claimedTicket: Ticket = {
      ...sampleOpenTicket,
      id: 'ticket-already-claimed',
      status: 'PROG',
      workedBy: 'Juan Tech',
      workedById: 'tech-9',
      assigned_tech_id: 'tech-9',
    };

    useAppStore.setState({
      tickets: [claimedTicket],
    });

    const result = await useAppStore.getState().assignTicket('ticket-already-claimed', 'Another Tech', 'tech-10');
    expect(result).toBe(false);

    // Verify ticket unchanged
    const t = useAppStore.getState().tickets.find((x) => x.id === 'ticket-already-claimed');
    expect(t?.workedBy).toBe('Juan Tech');
    expect(t?.workedById).toBe('tech-9');
  });
});
