import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { ticketsApi, type StaffTicketResponse, type TicketCommentItem } from '../src/api/client';
import { useAppStore } from '../src/store/useAppStore';
import { EmployeeTicketScreen } from '../src/features/kiosk/EmployeeTicketScreen';
import { TicketVerificationModal } from '../src/components/tickets/TicketVerificationModal';
import { TicketConversation } from '../src/features/kiosk/components/TicketConversation';
import type { Ticket } from '../src/types/ticket';

vi.mock('../src/api/client', async () => {
  const actual = await vi.importActual<typeof import('../src/api/client')>('../src/api/client');
  return {
    ...actual,
    ticketsApi: {
      ...actual.ticketsApi,
      verifyAccess: vi.fn(),
      getMyTickets: vi.fn(),
      reissueVerification: vi.fn(),
      confirmClosure: vi.fn(),
      reopenTicket: vi.fn(),
      getComments: vi.fn(),
      addComment: vi.fn(),
    },
  };
});

const MOCK_TICKET_1: Ticket = {
  id: 'ticket-1-uuid',
  ticketCode: 'T-2610-0115',
  company: 'Five Star',
  companyCode: 'FS',
  location: 'Caloocan',
  locationCode: 'CAL',
  department: 'Cash Management',
  departmentCode: 'CASH',
  requestor: 'Ricardo Ramos',
  employeeId: '2015',
  task: 'Network Configuration',
  taskCode: 'NET-CFG',
  description: 'Corroded RJ45 keystone jack in Cash booth 1.',
  month: 'October 2026',
  dateStarted: '2026-10-27',
  timeStarted: '08:00:00',
  mode: 'SITE',
  status: 'RESL',
  workedBy: 'Nathaniel D. Esguerra',
  priority: 'High',
  createdAt: '2026-10-27T08:00:00Z',
  messages: [],
};

const MOCK_TICKET_2: Ticket = {
  id: 'ticket-2-uuid',
  ticketCode: 'T-2610-0116',
  company: 'Five Star',
  companyCode: 'FS',
  location: 'Pasay',
  locationCode: 'PSY',
  department: 'Operations',
  departmentCode: 'OPS',
  requestor: 'Maria Santos',
  employeeId: '1042',
  task: 'Printer Troubleshoot',
  taskCode: 'PRN-TS',
  description: 'Paper feed roller skipping.',
  month: 'October 2026',
  dateStarted: '2026-10-27',
  timeStarted: '09:00:00',
  mode: 'SITE',
  status: 'RESL',
  workedBy: 'Nathaniel D. Esguerra',
  priority: 'Medium',
  createdAt: '2026-10-27T09:00:00Z',
  messages: [],
};

const MOCK_SERVER_TICKET_1: StaffTicketResponse = {
  id: 'ticket-1-uuid',
  ticket_code: 'T-2610-0115',
  company_id: 'co-fs',
  location_id: 'loc-cal',
  department_id: 'dept-cash',
  requester_name: 'Ricardo Ramos',
  employee_id_number: '2015',
  task_code: 'NET-CFG',
  description: 'Corroded RJ45 keystone jack in Cash booth 1.',
  mode: 'SITE',
  month: '2026-10',
  date_started: '2026-10-27',
  date_finished: '2026-10-27',
  time_started: '08:00:00',
  time_finished: '10:00:00',
  duration: 2.0,
  status: 'RESL',
  assigned_tech_id: 'tech-1',
  technician_name: 'Nathaniel D. Esguerra',
  user_confirmed_at: null,
  created_at: '2026-10-27T08:00:00Z',
};

describe('Employee Ticket Verification Flow', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    useAppStore.setState({
      tickets: [MOCK_TICKET_1, MOCK_TICKET_2],
      employeeTickets: [],
      verifiedTicket: null,
      verifyTicketCode: null,
      verifyToken: null,
      verificationStatus: 'idle',
      verificationErrorMessage: null,
      verificationModalTicketId: null,
      currentUser: null,
    });
  });

  it('1. produces distinct links for two different tickets and respects reissue tokens', async () => {
    vi.mocked(ticketsApi.reissueVerification).mockImplementation(async (id: string) => {
      if (id === 'ticket-1-uuid') {
        return {
          closure_token: 'tok-111',
          closure_url: 'http://localhost:5173/?verifyTicket=T-2610-0115&token=tok-111',
          expires_in_hours: 72,
        };
      }
      return {
        closure_token: 'tok-222',
        closure_url: 'http://localhost:5173/?verifyTicket=T-2610-0116&token=tok-222',
        expires_in_hours: 72,
      };
    });

    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText: writeTextMock },
    });

    const store = useAppStore.getState();
    const link1 = await store.copyTicketShareLink('T-2610-0115', 'ticket-1-uuid');
    const link2 = await store.copyTicketShareLink('T-2610-0116', 'ticket-2-uuid');

    expect(link1.success).toBe(true);
    expect(link2.success).toBe(true);
    expect(link1.link).not.toBe(link2.link);
    expect(link1.link).toContain('T-2610-0115');
    expect(link1.link).toContain('token=tok-111');
    expect(link2.link).toContain('T-2610-0116');
    expect(link2.link).toContain('token=tok-222');
  });

  it('2. handles clipboard failure gracefully with fallback without claiming false success', async () => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockRejectedValue(new Error('Permission denied')),
      },
    });

    const store = useAppStore.getState();
    const res = await store.copyTicketShareLink('T-2610-0115');

    expect(res.success).toBe(false);
    expect(res.link).toContain('verifyTicket=T-2610-0115');
    // Verify toast warned rather than claiming success
    const toast = useAppStore.getState().toasts.find((t) => t.type === 'warning');
    expect(toast).toBeTruthy();
    expect(toast?.title).toBe('Copy Failed');
  });

  it('3. scopes My Tickets count to verified employee and isolates from shared queue', async () => {
    // Unauthenticated fresh employee session starts with 0 verified tickets
    useAppStore.setState({
      tickets: [MOCK_TICKET_1, MOCK_TICKET_2], // global 2 items
      employeeTickets: [], // employee has 0 verified tickets
      verifyTicketCode: null,
    });

    render(<EmployeeTicketScreen />);

    // Top greeting 3-tab selector has "My Tickets"
    // Badge must be 0, NOT 2 (the global queue length)
    const myTicketsBtn = screen.getByRole('button', { name: /My Tickets/i });
    expect(myTicketsBtn.textContent).toContain('0');
    expect(myTicketsBtn.textContent).not.toContain('2');
  });

  it('4. enforces server-side identity gate: prompts for ID and rejects mismatched employee ID', async () => {
    vi.mocked(ticketsApi.verifyAccess)
      .mockRejectedValueOnce({
        response: { status: 403, data: { detail: 'Employee verification required' } },
      })
      .mockRejectedValueOnce({
        response: {
          status: 403,
          data: { detail: 'Employee ID "9999" does not match requestor on this ticket' },
        },
      });

    useAppStore.setState({
      verifyTicketCode: 'T-2610-0115',
      verificationStatus: 'idle',
    });

    render(<EmployeeTicketScreen />);

    await waitFor(() => {
      expect(screen.getByText(/Verify Identity to Access Ticket/i)).toBeTruthy();
    });

    const input = screen.getByPlaceholderText(/e\.g\. 2015/i);
    const unlockBtn = screen.getByRole('button', { name: /Unlock & View Ticket/i });

    fireEvent.change(input, { target: { value: '9999' } });
    fireEvent.click(unlockBtn);

    await waitFor(() => {
      expect(screen.getByText(/does not match requestor on this ticket/i)).toBeTruthy();
    });
  });

  it('5. starts checkboxes unchecked in verification modal and requires explicit confirmation', async () => {
    useAppStore.setState({
      verifiedTicket: MOCK_TICKET_1,
      tickets: [MOCK_TICKET_1],
      verificationModalTicketId: MOCK_TICKET_1.id,
    });

    render(<TicketVerificationModal />);

    const checkboxes = screen.getAllByRole('checkbox') as HTMLInputElement[];
    expect(checkboxes.length).toBe(2);
    expect(checkboxes[0].checked).toBe(false);
    expect(checkboxes[1].checked).toBe(false);

    // Confirm button is disabled while unchecked
    const confirmBtn = screen.getByRole('button', { name: /Confirm Closure & Sign-Off/i });
    expect(confirmBtn.hasAttribute('disabled')).toBe(true);

    // Check only one
    fireEvent.click(checkboxes[0]);
    expect(confirmBtn.hasAttribute('disabled')).toBe(true);

    // Check second
    fireEvent.click(checkboxes[1]);
    expect(confirmBtn.hasAttribute('disabled')).toBe(false);
  });

  it('6. persists closure to backend and handles failure without claiming false success', async () => {
    vi.mocked(ticketsApi.confirmClosure).mockRejectedValueOnce({
      response: { status: 400, data: { detail: 'Ticket is already closed or invalid token' } },
    });

    useAppStore.setState({
      verifiedTicket: MOCK_TICKET_1,
      tickets: [MOCK_TICKET_1],
      verificationModalTicketId: MOCK_TICKET_1.id,
    });

    render(<TicketVerificationModal />);

    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);
    fireEvent.click(checkboxes[1]);

    const confirmBtn = screen.getByRole('button', { name: /Confirm Closure & Sign-Off/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(screen.getByText(/Failed to confirm ticket closure on the server/i)).toBeTruthy();
    });

    // Ticket status remains RESL, never changed to CLSD falsely
    expect(useAppStore.getState().verifiedTicket?.status).toBe('RESL');
  });

  it('7. persists reopening and reason through authorized backend flow', async () => {
    vi.mocked(ticketsApi.reopenTicket).mockResolvedValueOnce({
      ...MOCK_SERVER_TICKET_1,
      status: 'PROG',
    });

    useAppStore.setState({
      verifiedTicket: MOCK_TICKET_1,
      tickets: [MOCK_TICKET_1],
      verificationModalTicketId: MOCK_TICKET_1.id,
    });

    render(<TicketVerificationModal />);

    // Click "Still Broken? Reopen"
    const reopenToggleBtn = screen.getByRole('button', { name: /Still Broken\? Reopen/i });
    fireEvent.click(reopenToggleBtn);

    const textarea = screen.getByPlaceholderText(/Describe what error is still happening/i);
    const confirmReopenBtn = screen.getByRole('button', { name: /Confirm Ticket Reopening/i });

    fireEvent.change(textarea, { target: { value: 'Switch port link dropped again during bus loading.' } });
    fireEvent.click(confirmReopenBtn);

    await waitFor(() => {
      expect(ticketsApi.reopenTicket).toHaveBeenCalledWith(
        'ticket-1-uuid',
        expect.objectContaining({
          reason: 'Switch port link dropped again during bus loading.',
        })
      );
    });

    // Verification modal closed and ticket updated to PROG
    expect(useAppStore.getState().verificationModalTicketId).toBeNull();
    expect(useAppStore.getState().verifiedTicket?.status).toBe('PROG');
  });

  it('8. handles token expiration and token reuse correctly', async () => {
    useAppStore.setState({
      verifyTicketCode: 'T-2610-0115',
      verificationStatus: 'expired',
      verificationErrorMessage: 'This verification link has expired (72-hour window).',
    });

    render(<EmployeeTicketScreen />);

    expect(screen.getByText(/Verification Link Expired/i)).toBeTruthy();
    expect(screen.getByText(/72-hour window/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Return to Kiosk Intake/i })).toBeTruthy();
  });

  it('9. enforces chat persistence and hides internal IT notes from employees', async () => {
    const mockComments: TicketCommentItem[] = [
      {
        id: 'c-1',
        author_name: 'Tech Specialist',
        author_role: 'it',
        body: 'Please test the new RJ45 keystone.',
        is_internal: false,
        created_at: '2026-10-27T09:30:00Z',
      },
      {
        id: 'c-2',
        author_name: 'Tech Specialist',
        author_role: 'it',
        body: 'INTERNAL NOTE: Suspect moisture in booth conduits.',
        is_internal: true, // Internal note
        created_at: '2026-10-27T09:31:00Z',
      },
    ];

    vi.mocked(ticketsApi.getComments).mockResolvedValueOnce(mockComments);

    render(<TicketConversation ticket={MOCK_TICKET_1} />);

    await waitFor(() => {
      expect(screen.getByText('Please test the new RJ45 keystone.')).toBeTruthy();
    });

    // Internal note must NEVER be rendered to the employee
    expect(screen.queryByText(/Suspect moisture in booth conduits/i)).toBeNull();
  });

  it('10. renders network failure error and provides retry capability without labeling not-found', async () => {
    useAppStore.setState({
      verifyTicketCode: 'T-2610-0115',
      verificationStatus: 'network_error',
      verificationErrorMessage: 'Unable to connect to server. Please check your network connection.',
    });

    render(<EmployeeTicketScreen />);

    expect(screen.getByText(/Network Connection Error/i)).toBeTruthy();
    expect(screen.getByText(/Unable to connect to server/i)).toBeTruthy();
    expect(screen.queryByText(/Ticket Not Found/i)).toBeNull();

    const retryBtn = screen.getByRole('button', { name: /Retry Connection/i });
    expect(retryBtn).toBeTruthy();
  });

  it('11. ignores stale out-of-order verification responses', async () => {
    let resolveFirst!: (val: any) => void;
    const firstPromise = new Promise((resolve) => {
      resolveFirst = resolve;
    });

    vi.mocked(ticketsApi.getMyTickets).mockResolvedValue([]);
    vi.mocked(ticketsApi.verifyAccess).mockImplementation(async (code) => {
      if (code === 'T-2610-0115') {
        return firstPromise as any;
      }
      return {
        access_token: 'token-second',
        ticket: { ...MOCK_SERVER_TICKET_1, ticket_code: 'T-2610-0116' },
        can_close: true,
        can_reopen: false,
      };
    });

    const store = useAppStore.getState();

    // Trigger ticket 1 verification (slow)
    const p1 = store.initiateVerificationFlow('T-2610-0115');

    // Trigger ticket 2 verification (fast)
    const p2 = store.initiateVerificationFlow('T-2610-0116');

    await p2;
    expect(useAppStore.getState().verifiedTicket?.ticketCode).toBe('T-2610-0116');

    // Now resolve first request late
    resolveFirst({
      access_token: 'token-first',
      ticket: { ...MOCK_SERVER_TICKET_1, ticket_code: 'T-2610-0115' },
      can_close: true,
      can_reopen: false,
    });
    await p1;

    // Must still remain ticket 2! Stale ticket 1 was discarded
    expect(useAppStore.getState().verifiedTicket?.ticketCode).toBe('T-2610-0116');
  });

  it('12. clears verification context cleanly on back navigation', async () => {
    useAppStore.setState({
      verifyTicketCode: 'T-2610-0115',
      verificationStatus: 'verified',
      verifiedTicket: MOCK_TICKET_1,
    });

    render(<EmployeeTicketScreen />);

    const backBtn = screen.getByRole('button', { name: /Back to Ticket List/i });
    fireEvent.click(backBtn);

    expect(useAppStore.getState().verifyTicketCode).toBeNull();
    expect(useAppStore.getState().verifiedTicket).toBeNull();
    expect(useAppStore.getState().verificationStatus).toBe('idle');
  });

  it('13. invalidates in-flight requests and clears employeeTickets, unlocked state, and credentials when clearing context', async () => {
    let resolveVerification!: (val: any) => void;
    const pendingPromise = new Promise((resolve) => {
      resolveVerification = resolve;
    });

    vi.mocked(ticketsApi.verifyAccess).mockReturnValue(pendingPromise as any);
    vi.mocked(ticketsApi.getMyTickets).mockResolvedValue([MOCK_SERVER_TICKET_1]);

    const store = useAppStore.getState();
    useAppStore.setState({
      verifyTicketCode: 'T-2610-0115',
      employeeTickets: [MOCK_TICKET_1],
      unlockedTicketCodes: { 'T-2610-0115': true },
      verificationModalTicketId: 'ticket-1-uuid',
    });

    // Start verification while user is on page
    const verifyPromise = store.verifyEmployeeIdentity('2015');

    // User navigates away or clears context while request is in flight
    store.clearVerificationContext();

    expect(useAppStore.getState().employeeTickets).toEqual([]);
    expect(useAppStore.getState().unlockedTicketCodes).toEqual({});
    expect(useAppStore.getState().verificationModalTicketId).toBeNull();
    expect(useAppStore.getState().verifyTicketCode).toBeNull();

    // Now late response resolves
    resolveVerification({
      access_token: 'late-token',
      ticket: MOCK_SERVER_TICKET_1,
      can_close: true,
      can_reopen: false,
    });
    await verifyPromise;

    // Must NOT adopt the late response
    expect(useAppStore.getState().verifiedTicket).toBeNull();
    expect(useAppStore.getState().employeeTickets).toEqual([]);
    expect(useAppStore.getState().unlockedTicketCodes).toEqual({});
  });

  it('14. reconciles production delivery when closure_url is null (distinguishes verification email sent from confirmation credential)', async () => {
    vi.mocked(ticketsApi.reissueVerification).mockResolvedValueOnce({
      status: 'RESL',
      closure_url: null as any,
    } as any);

    // Mock clipboard API
    let copiedText = '';
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn(async (text: string) => {
          copiedText = text;
        }),
      },
    });

    const store = useAppStore.getState();
    const result = await store.copyTicketShareLink('T-2610-0115', 'ticket-1-uuid');

    expect(result.success).toBe(true);
    expect((result as any).type).toBe('email_sent');
    // Public tracking link is copied, but it does not claim to be a closure credential
    expect(copiedText).toContain('/?verifyTicket=T-2610-0115');
    expect(copiedText).not.toContain('token=');

    // Toast specifically indicates verification email sent
    const toasts = useAppStore.getState().toasts;
    expect(toasts.some((t) => t.title === 'Verification Email Sent')).toBe(true);
  });

  it('15. handles rotated credential rejection gracefully on closure attempt', async () => {
    vi.mocked(ticketsApi.confirmClosure).mockRejectedValueOnce({
      response: {
        status: 401,
        data: {
          detail: 'Closure credentials have been rotated; please use the newly reissued link',
        },
      },
    });

    const store = useAppStore.getState();
    const success = await store.confirmVerifiedClosure('ticket-1-uuid', 'Testing rotation rejection');

    expect(success).toBe(false);
    const toasts = useAppStore.getState().toasts;
    expect(
      toasts.some(
        (t) =>
          t.title === 'Closure Failed' &&
          (t.description || '').includes('Closure credentials have been rotated')
      )
    ).toBe(true);
  });

  it('16. successful closure and reopen retains ticket UUID and all displayed details using backend response shape', async () => {
    const store = useAppStore.getState();
    useAppStore.setState({
      verifiedTicket: MOCK_TICKET_1,
      tickets: [MOCK_TICKET_1],
      employeeTickets: [MOCK_TICKET_1],
    });

    // 1. Mock complete TicketOut backend response for confirmClosure
    const closedServerResponse: StaffTicketResponse = {
      ...MOCK_SERVER_TICKET_1,
      status: 'CLSD',
      user_confirmed_at: '2026-10-27T10:00:00Z',
    };
    vi.mocked(ticketsApi.confirmClosure).mockResolvedValueOnce(closedServerResponse);

    const closeSuccess = await store.confirmVerifiedClosure('ticket-1-uuid', 'Verified by user');
    expect(closeSuccess).toBe(true);

    const closedTicket = useAppStore.getState().verifiedTicket;
    expect(closedTicket).not.toBeNull();
    expect(closedTicket?.id).toBe('ticket-1-uuid');
    expect(closedTicket?.ticketCode).toBe('T-2610-0115');
    expect(closedTicket?.status).toBe('CLSD');
    expect(closedTicket?.requestor).toBe('Ricardo Ramos');
    expect(closedTicket?.workedBy).toBe('Nathaniel D. Esguerra');
    expect(closedTicket?.task).toBe('Network Configuration');

    // 2. Mock complete TicketOut backend response for reopenTicket
    const reopenedServerResponse: StaffTicketResponse = {
      ...MOCK_SERVER_TICKET_1,
      status: 'PROG',
      date_finished: null,
      time_finished: null,
      user_confirmed_at: null,
    };
    vi.mocked(ticketsApi.reopenTicket).mockResolvedValueOnce(reopenedServerResponse);

    const reopenSuccess = await store.reopenVerifiedTicket('ticket-1-uuid', 'Issue returned');
    expect(reopenSuccess).toBe(true);

    const reopenedTicket = useAppStore.getState().verifiedTicket;
    expect(reopenedTicket).not.toBeNull();
    expect(reopenedTicket?.id).toBe('ticket-1-uuid');
    expect(reopenedTicket?.ticketCode).toBe('T-2610-0115');
    expect(reopenedTicket?.status).toBe('PROG');
    expect(reopenedTicket?.requestor).toBe('Ricardo Ramos');
    expect(reopenedTicket?.workedBy).toBe('Nathaniel D. Esguerra');
    expect(reopenedTicket?.task).toBe('Network Configuration');
  });
});
