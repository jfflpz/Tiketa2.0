import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { useAppStore } from '../src/store/useAppStore';
import { ticketsApi } from '../src/api/client';
import { JobLogDrawerRecordForm } from '../src/components/tickets/drawer/JobLogDrawerRecordForm';
import { JobLogDrawer } from '../src/components/tickets/JobLogDrawer';
import { JobLogDrawerChat } from '../src/components/tickets/drawer/JobLogDrawerChat';
import { JobLogSheetView } from '../src/features/joblogs/JobLogSheetView';
import { ITStaffTable } from '../src/features/team/components/ITStaffTable';
import { EditITStaffModal } from '../src/features/team/components/EditITStaffModal';
import type { Ticket } from '../src/types/ticket';
import type { TeamMember } from '../src/types/team';

vi.mock('../src/api/client', async () => {
  const actual = await vi.importActual<typeof import('../src/api/client')>('../src/api/client');
  return {
    ...actual,
    ticketsApi: {
      ...actual.ticketsApi,
      pauseTicketWork: vi.fn(),
      resumeTicketWork: vi.fn(),
      getHistory: vi.fn(),
      getTicketActivity: vi.fn().mockResolvedValue({ items: [], total: 0, page: 1, page_size: 20 }),
    },
  };
});

const makeTicket = (overrides: Partial<Ticket> = {}): Ticket => ({
  id: 'ticket-1',
  ticketCode: 'T-260101',
  company: 'Pangasinan Five Star Bus Co.',
  companyCode: 'FS',
  mode: 'SITE',
  department: 'Operations',
  departmentCode: 'OPS',
  requestor: 'Juan Dela Cruz',
  task: 'PC Troubleshooting',
  taskCode: 'PC-TS',
  description: 'Terminal POS frozen',
  month: 'November 2026',
  dateStarted: '2026-11-14',
  timeStarted: '09:00:00',
  status: 'PROG',
  location: 'Pasay Terminal',
  locationCode: 'PSY',
  workedBy: 'Tech One',
  workedById: 'tech-1',
  assigned_tech_id: 'tech-1',
  priority: 'Medium',
  createdAt: '2026-11-14T09:00:00Z',
  activeMinutes: 35,
  elapsedMinutes: 50,
  isPaused: false,
  ...overrides,
});

describe('Phase 3 Revisions (F-C2, F-C3, F-D1, F-D2)', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    useAppStore.setState({
      currentUser: {
        id: 'tech-1',
        name: 'Tech One',
        username: 'tech1',
        email: 'tech1@fivestar.com.ph',
        role: 'it',
        title: 'IT Specialist',
        avatar: '',
      },
      tickets: [],
      selectedTicketId: null,
      inspectedTicket: null,
      teamError: null,
      itTeamMembers: [],
      serverDictionaries: null,
      fetchDictionaries: vi.fn().mockResolvedValue(undefined),
      fetchTicketCommentsApi: vi.fn().mockResolvedValue(undefined),
    });
  });

  it('F-C2: renders separate active vs elapsed labor time and guards double-click / failed pause', async () => {
    const ticket = makeTicket({ isPaused: false, activeMinutes: 35, elapsedMinutes: 50 });
    useAppStore.setState({ tickets: [ticket] });

    let resolvePause!: (value: any) => void;
    vi.mocked(ticketsApi.pauseTicketWork).mockImplementationOnce(
      () =>
        new Promise((res) => {
          resolvePause = res;
        })
    );

    render(
      <JobLogDrawerRecordForm
        ticket={ticket}
        isAdmin={false}
        itTeamMembers={[]}
        onAssignTicket={vi.fn()}
      />
    );

    expect(screen.getByTestId('labor-state-badge').textContent).toContain('Active');
    expect(screen.getByTestId('active-labor-time').textContent).toContain('35m');
    expect(screen.getByTestId('elapsed-labor-time').textContent).toContain('50m');

    const pauseBtn = screen.getByRole('button', { name: /Pause Work/i });
    fireEvent.click(pauseBtn);
    fireEvent.click(pauseBtn);

    expect(ticketsApi.pauseTicketWork).toHaveBeenCalledTimes(1);

    resolvePause({
      id: 'ticket-1',
      ticket_code: 'T-260101',
      company_id: 'c1',
      location_id: 'l1',
      department_id: 'd1',
      requester_name: 'Juan Dela Cruz',
      task_code: 'PC-TS',
      description: 'Terminal POS frozen',
      mode: 'SITE',
      month: 'November 2026',
      date_started: '2026-11-14',
      date_finished: null,
      time_started: '09:00:00',
      time_finished: null,
      duration: null,
      status: 'PROG',
      assigned_tech_id: 'tech-1',
      user_confirmed_at: null,
      created_at: '2026-11-14T09:00:00Z',
      is_paused: true,
      active_minutes: 35,
      elapsed_minutes: 55,
    });

    await waitFor(() => {
      expect(useAppStore.getState().tickets[0].isPaused).toBe(true);
    });
  });

  it('F-C3: displays server deadline on RESL and never shows requester-approved on auto-closed CLSD', () => {
    const reslTicket = makeTicket({
      id: 'ticket-resl',
      status: 'RESL',
      closureDeadlineAt: '2026-11-14T12:00:00Z',
    });
    const autoClosedTicket = makeTicket({
      id: 'ticket-clsd',
      status: 'CLSD',
      closureReason: 'auto_closed',
      autoClosedAt: '2026-11-14T12:01:00Z',
      userConfirmedAt: undefined,
    });

    useAppStore.setState({
      tickets: [reslTicket, autoClosedTicket],
      selectedTicketId: 'ticket-resl',
    });

    const { rerender } = render(<JobLogDrawer />);
    expect(screen.getByTestId('closure-deadline-banner').textContent).toMatch(/Auto-close/i);

    useAppStore.setState({ selectedTicketId: 'ticket-clsd' });
    rerender(<JobLogDrawer />);
    const outcome = screen.getByTestId('closure-outcome-banner');
    expect(outcome.textContent).toContain('Auto-Closed (Deadline Elapsed)');
    expect(outcome.textContent).not.toContain('Confirmed by Requester');
  });

  it('F-D1: renders Supervisor active-ticket pagination and read-only conversation distinguishing internal notes', async () => {
    useAppStore.setState({
      currentUser: {
        id: 'sup-1',
        name: 'Supervisor One',
        username: 'sup1',
        email: 'sup1@fivestar.com.ph',
        role: 'supervisor',
        title: 'IT Supervisor',
        avatar: '',
      },
      fetchTicketCommentsApi: vi.fn().mockRejectedValue({ response: { status: 403 } }),
    });

    const manyTickets = Array.from({ length: 28 }, (_, idx) => ({
      id: `t-${idx + 1}`,
      ticket_code: `T-260${String(idx + 1).padStart(3, '0')}`,
      company_id: 'c1',
      location_id: 'l1',
      department_id: 'd1',
      requester_name: `Requester ${idx + 1}`,
      task_code: 'PC-TS',
      description: 'Active issue',
      mode: 'SITE' as const,
      month: 'November 2026',
      date_started: '2026-11-14',
      date_finished: null,
      time_started: '09:00:00',
      time_finished: null,
      duration: null,
      status: 'PROG' as const,
      assigned_tech_id: 'tech-1',
      user_confirmed_at: null,
      created_at: '2026-11-14T09:00:00Z',
    }));
    vi.mocked(ticketsApi.getHistory).mockResolvedValueOnce(manyTickets);

    render(<JobLogSheetView />);

    await waitFor(() => {
      expect(screen.getByText(/Page 1 of 2/i)).toBeTruthy();
    });

    const chatTicket = makeTicket({
      messages: [
        {
          id: 'm1',
          senderRole: 'employee',
          senderName: 'Juan Dela Cruz',
          message: 'Requester visible message',
          timestamp: '09:05 AM',
          isInternal: false,
        },
        {
          id: 'm2',
          senderRole: 'it',
          senderName: 'Tech One',
          message: 'Confidential IT internal note',
          timestamp: '09:06 AM',
          isInternal: true,
        },
      ],
    });

    render(
      <JobLogDrawerChat
        ticket={chatTicket}
        techSenderName="Tech One"
        readOnly
        onSendMessage={vi.fn()}
      />
    );

    expect(screen.getByTestId('supervisor-chat-readonly')).toBeTruthy();
    expect(screen.getByText('Internal Note')).toBeTruthy();
    expect(screen.getByText('Confidential IT internal note')).toBeTruthy();
    expect(screen.queryByPlaceholderText(/Message Juan Dela Cruz/i)).toBeNull();

    await waitFor(() => {
      expect(screen.getByText(/Access denied for ticket conversation/i)).toBeTruthy();
    });
  });

  it('F-D2: distinguishes manual availability/leave from online presence and submits manual availability edits', async () => {
    const staffMember: TeamMember = {
      id: 'staff-1',
      name: 'Maria Santos',
      username: 'msantos',
      email: 'msantos@fivestar.com.ph',
      systemRole: 'it',
      avatar: '',
      department: 'Operations',
      status: 'on_leave',
      availabilityStatus: 'on_leave',
      availabilityNote: 'Medical leave until Nov 20',
      isOnline: true,
      primaryLocation: 'Pasay (PSY)',
      ticketsClosed: 4,
      activeTickets: 1,
      flameScore: 0,
      is_active: true,
    };

    render(
      <ITStaffTable
        staff={[staffMember]}
        onEditMember={vi.fn()}
        onDeleteMember={vi.fn()}
      />
    );

    expect(screen.getByTestId('availability-badge-staff-1').textContent).toContain('On Leave');
    expect(screen.getByTestId('online-presence-staff-1').textContent).toContain('Online');
    expect(screen.getByText('Medical leave until Nov 20')).toBeTruthy();

    const mockSubmit = vi.fn().mockResolvedValue(true);
    render(
      <EditITStaffModal
        isOpen
        onClose={vi.fn()}
        member={staffMember}
        onSubmit={mockSubmit}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /^Busy$/i }));
    fireEvent.change(screen.getByPlaceholderText(/Optional availability or leave note/i), {
      target: { value: 'Field dispatch at Caloocan' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Save Account Changes/i }));
    fireEvent.change(screen.getByPlaceholderText(/Enter your current admin password/i), {
      target: { value: 'AdminPass123!' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Authorize & Save/i }));

    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledWith(
        'staff-1',
        expect.objectContaining({
          availability_status: 'busy',
          availability_note: 'Field dispatch at Caloocan',
        })
      );
    });
  });
});
