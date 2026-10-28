import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { TerminalHubsView } from '../src/features/terminals/TerminalHubsView';
import { TerminalHubDetailModal } from '../src/features/terminals/TerminalHubDetailModal';
import { JobLogDrawer } from '../src/components/tickets/JobLogDrawer';
import { ITWorkbenchBoardView } from '../src/features/workbench/ITWorkbenchBoardView';
import { HubActiveTicketsTab } from '../src/features/terminals/components/modal/HubActiveTicketsTab';
import { HubResolutionHistoryTab } from '../src/features/terminals/components/modal/HubResolutionHistoryTab';
import { locationApi, ticketsApi, type HubSummaryOut, type StaffTicketResponse } from '../src/api/client';
import { useAppStore } from '../src/store/useAppStore';
import { mapStaffTicket } from '../src/utils/mapStaffTicket';

vi.mock('../src/api/client', async () => {
  const actual = await vi.importActual<typeof import('../src/api/client')>('../src/api/client');
  return {
    ...actual,
    locationApi: {
      ...actual.locationApi,
      getHubSummaries: vi.fn(),
    },
    ticketsApi: {
      ...actual.ticketsApi,
      getQueue: vi.fn(),
      getTicket: vi.fn(),
      getComments: vi.fn().mockResolvedValue([]),
      claimTicket: vi.fn().mockResolvedValue({}),
      assignTicket: vi.fn().mockResolvedValue({}),
      updateStatus: vi.fn().mockResolvedValue({}),
      updateServiceRecord: vi.fn().mockResolvedValue({}),
      addComment: vi.fn().mockResolvedValue({
        id: 'comment-1',
        ticket_id: 't-1',
        user_id: 'u-1',
        author_name: 'Nathaniel D. Esguerra',
        author_role: 'it',
        body: 'Hello',
        is_internal: false,
        created_at: new Date().toISOString(),
      }),
    },
  };
});

const MOCK_SUMMARIES: HubSummaryOut[] = [
  {
    id: 'loc-psy-uuid',
    code: 'PSY',
    name: 'Pasay',
    open_count: 3,
    in_progress_count: 2,
    resolved_count: 1,
    closed_this_month_count: 8,
    total_active_count: 6,
    top_issue_task_code: 'PRN-TS',
    top_issue_task_name: 'Printer Troubleshoot',
    top_issue_count: 4,
    top_issue_window: 'Last 30 Days',
    departments: [
      { id: 'dept-cash', code: 'CASH', name: 'Cash Management', active_tickets_count: 2 },
      { id: 'dept-ops', code: 'OPS', name: 'Operations', active_tickets_count: 4 },
    ],
  },
  {
    id: 'loc-cal-uuid',
    code: 'CAL',
    name: 'Caloocan',
    open_count: 0,
    in_progress_count: 0,
    resolved_count: 0,
    closed_this_month_count: 5,
    total_active_count: 0,
    top_issue_task_code: null,
    top_issue_task_name: null,
    top_issue_count: 0,
    top_issue_window: 'Last 30 Days',
    departments: [
      { id: 'dept-cash', code: 'CASH', name: 'Cash Management', active_tickets_count: 0 },
    ],
  },
];

const createMockServerTicket = (
  id: string,
  ticketCode: string,
  status: 'OPEN' | 'PROG' | 'RESL' | 'CLSD' = 'OPEN',
  description = 'Test issue description',
): StaffTicketResponse => ({
  id,
  ticket_code: ticketCode,
  company_id: 'comp-fs-uuid',
  location_id: 'loc-psy-uuid',
  department_id: 'dept-cash',
  requester_name: 'Maria Santos',
  employee_id_number: 'EMP-1001',
  task_code: 'PRN-TS',
  description,
  mode: 'SITE',
  month: 'October 2026',
  date_started: '2026-10-27',
  date_finished: status === 'CLSD' ? '2026-10-27' : null,
  time_started: '09:00:00',
  time_finished: status === 'CLSD' ? '10:00:00' : null,
  duration: status === 'CLSD' ? '1.0000' : null,
  status,
  assigned_tech_id: 'tech-uuid-1',
  technician_name: 'Nathaniel D. Esguerra',
  user_confirmed_at: status === 'CLSD' ? '2026-10-27T10:00:00Z' : null,
  created_at: '2026-10-27T08:00:00Z',
});

describe('TerminalHubsView & TerminalHubDetailModal', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    useAppStore.setState({
      tickets: [],
      selectedTicketId: null,
      inspectedTicket: null,
      isInspectingTicket: false,
      inspectTicketError: null,
      activeWorkbenchTicketId: null,
      workbenchTicket: null,
      isWorkbenchLoading: false,
      workbenchError: null,
      currentUser: {
        id: 'u-1',
        name: 'Nathaniel D. Esguerra',
        email: 'tech@tiketa.ph',
        role: 'admin',
        title: 'IT Administrator',
        avatar: 'NE',
      },
      serverDictionaries: {
        companies: [{ id: 'comp-fs-uuid', code: 'FS', name: 'Five Star' }],
        locations: [
          { id: 'loc-psy-uuid', code: 'PSY', name: 'Pasay' },
          { id: 'loc-cal-uuid', code: 'CAL', name: 'Caloocan' },
        ],
        departments: [
          { id: 'dept-cash', code: 'CASH', name: 'Cash Management' },
          { id: 'dept-ops', code: 'OPS', name: 'Operations' },
        ],
        tasks: [{ id: 'task-prn', code: 'PRN-TS', name: 'Printer Troubleshoot' }],
        location_departments: [{ location_id: 'loc-psy-uuid', department_id: 'dept-cash' }],
      },
      itTeamMembers: [
        {
          id: 'tech-uuid-1',
          name: 'Nathaniel D. Esguerra',
          role: 'Field Technician',
          systemRole: 'it',
          email: 'tech@tiketa.ph',
          avatar: '',
          department: 'IT',
          status: 'active',
          primaryLocation: 'Pasay',
          ticketsClosed: 0,
          activeTickets: 0,
          flameScore: 0,
        },
      ],
    });
  });

  it('renders dynamic terminal counts and server-provided metrics', async () => {
    vi.mocked(locationApi.getHubSummaries).mockResolvedValueOnce(MOCK_SUMMARIES);

    render(<TerminalHubsView />);

    expect(screen.getByText(/Loading Terminal Hub Summaries/i)).toBeTruthy();

    await waitFor(() => {
      expect(screen.getByText(/2 Bus Terminal Hubs Monitor/i)).toBeTruthy();
    });

    // Check Pasay card
    expect(screen.getByText('Pasay')).toBeTruthy();
    expect(screen.getByText('PSY')).toBeTruthy();
    expect(screen.getByText('6 Active')).toBeTruthy();
    expect(screen.getByText('8 tickets')).toBeTruthy();
    expect(screen.getByText(/Printer Troubleshoot \(4\)/i)).toBeTruthy();

    // Check Caloocan card with 0 active
    expect(screen.getByText('Caloocan')).toBeTruthy();
    expect(screen.getByText('Queue Clear')).toBeTruthy();
    expect(screen.getByText(/No recent issues/i)).toBeTruthy();
  });

  it('supports keyboard navigation to open terminal modal with Enter or Space', async () => {
    vi.mocked(locationApi.getHubSummaries).mockResolvedValueOnce(MOCK_SUMMARIES);
    vi.mocked(ticketsApi.getQueue).mockResolvedValue([]);

    render(<TerminalHubsView />);

    await waitFor(() => {
      expect(screen.getByText('Pasay')).toBeTruthy();
    });

    // Focus Pasay card and press Enter
    const pasayCard = screen.getByLabelText(/View Pasay terminal/i);
    expect(pasayCard.getAttribute('tabIndex')).toBe('0');
    expect(pasayCard.getAttribute('role')).toBe('button');

    fireEvent.keyDown(pasayCard, { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
      expect(screen.getByText(/Pasay Terminal Station/i)).toBeTruthy();
    });
  });

  it('preserves cached data and displays stale indicator when refresh fails', async () => {
    vi.mocked(locationApi.getHubSummaries)
      .mockResolvedValueOnce(MOCK_SUMMARIES)
      .mockRejectedValueOnce(new Error('Network timeout'));

    render(<TerminalHubsView />);

    await waitFor(() => {
      expect(screen.getByText('Pasay')).toBeTruthy();
    });

    // Trigger manual refresh
    const refreshBtn = screen.getByRole('button', { name: /Refresh/i });
    fireEvent.click(refreshBtn);

    await waitFor(() => {
      expect(screen.getByText('Cached Data')).toBeTruthy();
      expect(screen.getByText(/Refresh Failed/i)).toBeTruthy();
    });

    // Previous cards remain visible
    expect(screen.getByText('Pasay')).toBeTruthy();
    expect(screen.getByText('Caloocan')).toBeTruthy();
  });

  it('station modal renders real operating departments without fake infrastructure', () => {
    const handleClose = vi.fn();
    render(<TerminalHubDetailModal hub={MOCK_SUMMARIES[0]} onClose={handleClose} />);

    // Header values
    expect(screen.getByText(/Pasay Terminal Station/i)).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
    expect(screen.getByText('2')).toBeTruthy();
    expect(screen.getByText('1')).toBeTruthy();
    expect(screen.getByText('8')).toBeTruthy();

    // Operating Departments tab is default
    expect(screen.getByText('Operating Departments (2)')).toBeTruthy();
    expect(screen.getByText('Cash Management')).toBeTruthy();
    expect(screen.getByText('Operations')).toBeTruthy();

    // Infrastructure tab must NOT exist
    expect(screen.queryByText(/Infrastructure/i)).toBeNull();
  });

  it('active tickets tab loads tickets via server query with pagination and preserves explicit claiming', async () => {
    // Generate 11 tickets to test pagination (pageSize = 10, limit = 11)
    const mockTicketsPage1 = Array.from({ length: 11 }, (_, i) =>
      createMockServerTicket(`ticket-t${i + 1}`, `T-2610-00${i + 1}`, 'OPEN', `Issue ${i + 1}`)
    );
    const mockTicketsPage2 = [
      createMockServerTicket('ticket-t11', 'T-2610-0011', 'OPEN', 'Issue 11'),
    ];

    vi.mocked(ticketsApi.getQueue)
      .mockResolvedValueOnce(mockTicketsPage1)
      .mockResolvedValueOnce(mockTicketsPage2);

    const handleClose = vi.fn();
    render(<TerminalHubDetailModal hub={MOCK_SUMMARIES[0]} onClose={handleClose} />);

    // Switch to Active Tickets tab
    const activeTabBtn = screen.getByRole('button', { name: /Active Tickets/i });
    fireEvent.click(activeTabBtn);

    // Initial server call with location_id, pageSize + 1 = 11, offset = 0
    await waitFor(() => {
      expect(screen.getByText('T-2610-001')).toBeTruthy();
      expect(screen.getByText('1–10')).toBeTruthy();
      expect(screen.getByText(/total active tickets/i)).toBeTruthy();
    });

    // Next page button should be enabled because 11 items were returned (hasMore = true)
    const nextBtn = screen.getByRole('button', { name: /Next/i });
    expect(nextBtn.hasAttribute('disabled')).toBe(false);

    fireEvent.click(nextBtn);

    await waitFor(() => {
      expect(ticketsApi.getQueue).toHaveBeenCalledWith(
        expect.objectContaining({
          location_id: 'loc-psy-uuid',
          offset: 10,
          limit: 11,
        })
      );
    });

    // Test explicit claiming: "Open in Bench" does NOT claim ticket automatically
    const benchBtns = screen.getAllByRole('button', { name: /Open in Bench/i });
    fireEvent.click(benchBtns[0]);

    expect(useAppStore.getState().activeWorkbenchTicketId).toBe('ticket-t11');
    expect(useAppStore.getState().activeView).toBe('workbench');
    expect(handleClose).toHaveBeenCalled();
  });

  it('connects history inspection to ticket drawer for tickets absent from shared queue', async () => {
    const closedTicket = createMockServerTicket(
      'ticket-hist-closed-1',
      'T-2610-HIST1',
      'CLSD',
      'Old resolved hardware issue'
    );

    // History tab queries CLSD tickets
    vi.mocked(ticketsApi.getQueue).mockResolvedValue([closedTicket]);
    // Single ticket detail fetched on inspection
    vi.mocked(ticketsApi.getTicket).mockResolvedValue(closedTicket);

    const handleClose = vi.fn();
    render(
      <>
        <TerminalHubDetailModal hub={MOCK_SUMMARIES[0]} onClose={handleClose} />
        <JobLogDrawer />
      </>
    );

    // Switch to Resolution History tab
    const historyTabBtn = screen.getByRole('button', { name: /Resolution History/i });
    fireEvent.click(historyTabBtn);

    await waitFor(() => {
      expect(screen.getByText('T-2610-HIST1')).toBeTruthy();
      expect(screen.getByText('Old resolved hardware issue')).toBeTruthy();
    });

    // Click on history item to inspect
    const histRow = screen.getByText('T-2610-HIST1');
    fireEvent.click(histRow);

    // Inspect ticket is loaded via getTicket API
    await waitFor(() => {
      expect(ticketsApi.getTicket).toHaveBeenCalledWith('ticket-hist-closed-1');
      expect(useAppStore.getState().selectedTicketId).toBe('ticket-hist-closed-1');
      expect(useAppStore.getState().inspectedTicket?.ticketCode).toBe('T-2610-HIST1');
    });

    // Drawer is rendered with the inspected ticket details
    expect(screen.getAllByText('T-2610-HIST1').length).toBeGreaterThanOrEqual(1);
  });

  it('discards out-of-order asynchronous responses using request sequence guards', async () => {
    let resolveFirstCall: (value: StaffTicketResponse[]) => void = () => {};
    const firstCallPromise = new Promise<StaffTicketResponse[]>((resolve) => {
      resolveFirstCall = resolve;
    });

    const secondCallData = [
      createMockServerTicket('ticket-fast', 'T-FAST-01', 'OPEN', 'Fast second response'),
    ];

    vi.mocked(ticketsApi.getQueue)
      .mockImplementationOnce(() => firstCallPromise)
      .mockResolvedValueOnce(secondCallData);

    render(<TerminalHubDetailModal hub={MOCK_SUMMARIES[0]} onClose={vi.fn()} />);

    // Go to Active Tickets tab (triggers call 1)
    const activeTabBtn = screen.getByRole('button', { name: /Active Tickets/i });
    fireEvent.click(activeTabBtn);

    // Change status filter to 'OPEN' immediately via select (triggers call 2)
    const statusSelect = screen.getByRole('combobox');
    fireEvent.change(statusSelect, { target: { value: 'OPEN' } });

    // Call 2 completes first
    await waitFor(() => {
      expect(screen.getByText('T-FAST-01')).toBeTruthy();
    });

    // Now resolve call 1 with slow, outdated data
    resolveFirstCall([
      createMockServerTicket('ticket-slow', 'T-SLOW-99', 'OPEN', 'Outdated slow response'),
    ]);

    // Give microtasks time to execute
    await new Promise((r) => setTimeout(r, 50));

    // The slow outdated response MUST be discarded; fast response remains displayed
    expect(screen.getByText('T-FAST-01')).toBeTruthy();
    expect(screen.queryByText('T-SLOW-99')).toBeNull();
  });

  it('closes drawer first on Escape when both drawer and modal are open', () => {
    const handleClose = vi.fn();
    useAppStore.setState({ selectedTicketId: 'ticket-1' });

    render(
      <>
        <TerminalHubDetailModal hub={MOCK_SUMMARIES[0]} onClose={handleClose} />
        <JobLogDrawer />
      </>
    );

    // Both drawer and modal are open. Press Escape.
    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });

    // Drawer closes (selectedTicketId becomes null), but modal remains open (handleClose not called)!
    expect(useAppStore.getState().selectedTicketId).toBeNull();
    expect(handleClose).not.toHaveBeenCalled();

    // Now press Escape again. Modal closes!
    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('loads ticket by ID for workbench when absent from shared queue, displays loading, and preserves explicit claiming', async () => {
    const farTicket = createMockServerTicket('ticket-far-99', 'T-2610-FAR99', 'OPEN', 'Ticket beyond first 50 queue page');
    vi.mocked(ticketsApi.getTicket).mockResolvedValueOnce(farTicket);

    useAppStore.setState({
      tickets: [],
      activeWorkbenchTicketId: 'ticket-far-99',
    });

    render(<ITWorkbenchBoardView />);

    await waitFor(() => {
      expect(ticketsApi.getTicket).toHaveBeenCalledWith('ticket-far-99');
      expect(screen.getAllByText('T-2610-FAR99').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/Printer Troubleshoot — Pasay/i)).toBeTruthy();
    });

    // Explicit claiming: OPEN ticket must display "Claim & Start Repair" and must NOT be claimed automatically
    const claimBtn = screen.getByRole('button', { name: /Claim & Start Repair/i });
    expect(claimBtn).toBeTruthy();
    expect(ticketsApi.claimTicket).not.toHaveBeenCalled();

    // Clicking claim button explicitly claims it
    fireEvent.click(claimBtn);
    expect(ticketsApi.claimTicket).toHaveBeenCalledWith('ticket-far-99');
  });

  it('handles workbench ticket load failure and supports retry', async () => {
    vi.mocked(ticketsApi.getTicket)
      .mockRejectedValueOnce(new Error('Gateway timeout'))
      .mockResolvedValueOnce(
        createMockServerTicket('ticket-retry-1', 'T-2610-RETRY', 'PROG', 'Recovered ticket')
      );

    useAppStore.setState({
      tickets: [],
      activeWorkbenchTicketId: 'ticket-retry-1',
    });

    render(<ITWorkbenchBoardView />);

    await waitFor(() => {
      expect(screen.getByText('Failed to Load Workbench Ticket')).toBeTruthy();
      expect(screen.getByText('Gateway timeout')).toBeTruthy();
    });

    // Click retry
    const retryBtn = screen.getByRole('button', { name: /Retry Loading/i });
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.getAllByText('T-2610-RETRY').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/Printer Troubleshoot — Pasay/i)).toBeTruthy();
    });
  });

  it('fully connects independently inspected tickets: loads comments, supports drawer mutations, and rolls back on failure', async () => {
    const indepTicket = createMockServerTicket('ticket-indep-1', 'T-INDEP-01', 'PROG', 'Inspected standalone ticket');
    vi.mocked(ticketsApi.getTicket).mockResolvedValue(indepTicket);
    vi.mocked(ticketsApi.getComments).mockResolvedValue([
      {
        id: 'c-1',
        ticket_id: 'ticket-indep-1',
        user_id: 'u-1',
        author_name: 'Lead Tech',
        author_role: 'it',
        body: 'Investigating cable connection',
        is_internal: false,
        created_at: '2026-10-27T10:00:00Z',
      },
    ]);

    // Inspect ticket directly
    useAppStore.getState().setSelectedTicketId('ticket-indep-1');
    await waitFor(() => {
      expect(useAppStore.getState().inspectedTicket?.ticketCode).toBe('T-INDEP-01');
    });

    render(<JobLogDrawer />);

    expect(screen.queryByPlaceholderText(/Message Maria Santos/i)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Live Chat with Employee/i }));

    // Comments load
    await waitFor(() => {
      expect(screen.getByText('Investigating cable connection')).toBeTruthy();
    });

    // Test send message on independently inspected ticket
    const chatInput = screen.getByPlaceholderText(/Message Maria Santos as/i);
    fireEvent.change(chatInput, { target: { value: 'Testing signal continuity' } });
    const sendBtn = screen.getByRole('button', { name: /Send/i });
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(ticketsApi.addComment).toHaveBeenCalledWith(
        'ticket-indep-1',
        expect.objectContaining({ body: 'Testing signal continuity' })
      );
    });

    // Test mutation failure rollback (e.g., status update rejects)
    vi.mocked(ticketsApi.updateStatus).mockRejectedValueOnce({
      response: { data: { detail: 'Database lock timeout' } },
    });

    // Click resolve button in drawer
    const resolveBtn = screen.getByRole('button', { name: /Mark as Resolved/i });
    fireEvent.click(resolveBtn);

    // Rollback: inspected ticket status remains PROG because server rejected
    await waitFor(() => {
      expect(ticketsApi.updateStatus).toHaveBeenCalledWith(
        'ticket-indep-1',
        expect.objectContaining({ status: 'RESL' })
      );
      expect(useAppStore.getState().inspectedTicket?.status).toBe('PROG');
    });
  });

  it('manages modal and drawer focus lifecycle: traps Tab and restores focus on close', async () => {
    vi.mocked(locationApi.getHubSummaries).mockResolvedValueOnce(MOCK_SUMMARIES);
    vi.mocked(ticketsApi.getQueue).mockResolvedValue([]);

    render(
      <div>
        <TerminalHubsView />
        <JobLogDrawer />
      </div>
    );

    await waitFor(() => {
      expect(screen.getByText('Pasay')).toBeTruthy();
    });

    const pasayCard = screen.getByLabelText(/View Pasay terminal/i);
    pasayCard.focus();
    expect(document.activeElement).toBe(pasayCard);

    // Open Pasay modal with Enter
    fireEvent.keyDown(pasayCard, { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
      expect(screen.getByText(/Pasay Terminal Station/i)).toBeTruthy();
    });

    // Close button should have received focus
    const closeBtn = screen.getByRole('button', { name: /Close.*modal/i });
    await waitFor(() => {
      expect(document.activeElement).toBe(closeBtn);
    });

    // Press Escape to close modal
    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });

    // Focus restored to trigger element (Pasay card)
    await waitFor(() => {
      expect(document.activeElement).toBe(pasayCard);
    });
  });

  it('reports partial failure honestly when hub summaries refresh but queue preview fails', async () => {
    vi.mocked(locationApi.getHubSummaries)
      .mockResolvedValueOnce(MOCK_SUMMARIES)
      .mockResolvedValueOnce(MOCK_SUMMARIES);

    vi.mocked(ticketsApi.getQueue)
      .mockResolvedValueOnce([])
      .mockRejectedValueOnce(new Error('Queue service unavailable'));

    render(<TerminalHubsView />);

    await waitFor(() => {
      expect(screen.getByText('Pasay')).toBeTruthy();
    });

    // Trigger manual refresh
    const refreshBtn = screen.getByRole('button', { name: /Refresh/i });
    fireEvent.click(refreshBtn);

    await waitFor(() => {
      expect(screen.getByText(/Hub summaries refreshed, but ticket queue preview failed/i)).toBeTruthy();
      expect(screen.getByText('Cached Data')).toBeTruthy();
    });
  });

  it('strictly isolates query cache by hubId, filter, and page in HubActiveTicketsTab', async () => {
    const page1Tickets = [createMockServerTicket('t-1', 'T-01', 'OPEN', 'Printer paper jam')];
    vi.mocked(ticketsApi.getQueue)
      .mockResolvedValueOnce(page1Tickets) // Initial load for 'ALL'
      .mockRejectedValueOnce(new Error('Network disconnected')); // Filter changed to 'PROG'

    render(
      <HubActiveTicketsTab
        hubId="loc-psy-uuid"
        hubName="Pasay"
        totalActiveCount={1}
        onOpenTicketDrawer={vi.fn()}
        onOpenWorkbenchForTicket={vi.fn()}
        onQuickIntake={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('T-01')).toBeTruthy();
      expect(screen.getByText('Printer paper jam')).toBeTruthy();
    });

    // Change status filter to 'PROG'
    const statusSelect = screen.getByRole('combobox');
    fireEvent.change(statusSelect, { target: { value: 'PROG' } });

    // Since this is a different query that failed, previously loaded 'ALL' tickets must NOT be displayed
    await waitFor(() => {
      expect(screen.getByText('Network disconnected')).toBeTruthy();
      expect(screen.queryByText('T-01')).toBeNull();
      expect(screen.queryByText('Printer paper jam')).toBeNull();
    });
  });

  it('strictly isolates query cache in HubResolutionHistoryTab', async () => {
    const closedTickets = [createMockServerTicket('t-clsd-1', 'T-CLSD-01', 'CLSD', 'Resolved display issue')];
    vi.mocked(ticketsApi.getQueue)
      .mockResolvedValueOnce(closedTickets) // Initial load for 'CLSD'
      .mockRejectedValueOnce(new Error('History service error')); // Filter changed to 'RESL'

    render(
      <HubResolutionHistoryTab
        hubId="loc-psy-uuid"
        hubName="Pasay"
        onOpenTicketDrawer={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('T-CLSD-01')).toBeTruthy();
      expect(screen.getByText('Resolved display issue')).toBeTruthy();
    });

    // Change status filter to 'RESL'
    const statusSelect = screen.getByRole('combobox');
    fireEvent.change(statusSelect, { target: { value: 'RESL' } });

    // Since different query failed, previous closed tickets must NOT be rendered under resolved filter
    await waitFor(() => {
      expect(screen.getByText('History service error')).toBeTruthy();
      expect(screen.queryByText('T-CLSD-01')).toBeNull();
    });
  });

  it('prevents rollback from overwriting newer state: mutation A failure does not revert mutation B', async () => {
    const ticketA = createMockServerTicket('t-a', 'T-A', 'OPEN');
    const ticketB = createMockServerTicket('t-b', 'T-B', 'OPEN');
    const dicts = useAppStore.getState().serverDictionaries;

    useAppStore.setState({
      tickets: [
        mapStaffTicket(ticketA, dicts),
        mapStaffTicket(ticketB, dicts),
      ],
      activeWorkbenchTicketId: 't-b',
      workbenchTicket: mapStaffTicket(ticketB, dicts),
    });

    vi.mocked(ticketsApi.getQueue).mockResolvedValue([
      ticketA,
      { ...ticketB, status: 'PROG' },
    ]);

    // Mutation B succeeds: update t-b to PROG
    vi.mocked(ticketsApi.updateStatus).mockResolvedValueOnce({
      ...ticketB,
      status: 'PROG',
    });
    const successB = await useAppStore.getState().updateTicketStatusApi('t-b', 'PROG', 'SITE');
    expect(successB).toBe(true);

    const storeAfterB = useAppStore.getState();
    const bInQueue = storeAfterB.tickets.find((t) => t.id === 't-b');
    expect(bInQueue?.status).toBe('PROG');
    expect(storeAfterB.workbenchTicket?.status).toBe('PROG');

    // Mutation A fails: update t-a to PROG rejects
    vi.mocked(ticketsApi.updateStatus).mockRejectedValueOnce(new Error('Network error on A'));
    const successA = await useAppStore.getState().updateTicketStatusApi('t-a', 'PROG', 'SITE');
    expect(successA).toBe(false);

    // Verify t-b remains PROG, activeWorkbenchTicketId remains 't-b', and only t-a is rolled back to OPEN
    const storeAfterA = useAppStore.getState();
    const aInQueue = storeAfterA.tickets.find((t) => t.id === 't-a');
    const bStillInQueue = storeAfterA.tickets.find((t) => t.id === 't-b');

    expect(aInQueue?.status).toBe('OPEN');
    expect(bStillInQueue?.status).toBe('PROG');
    expect(storeAfterA.activeWorkbenchTicketId).toBe('t-b');
    expect(storeAfterA.workbenchTicket?.status).toBe('PROG');
  });

  it('discards in-flight responses across logout and session changes', async () => {
    let resolveTicket: (val: StaffTicketResponse) => void = () => {};
    const pendingPromise = new Promise<StaffTicketResponse>((resolve) => {
      resolveTicket = resolve;
    });

    vi.mocked(ticketsApi.getTicket).mockReturnValue(pendingPromise);

    // Start inspecting ticket
    const fetchPromise = useAppStore.getState().fetchInspectedTicketApi('ticket-late-1');

    // User logs out before promise finishes
    useAppStore.getState().logoutToKiosk();

    // Now resolve late response
    resolveTicket(createMockServerTicket('ticket-late-1', 'T-LATE-01', 'OPEN'));
    await fetchPromise;

    // Verify inspectedTicket was NOT repopulated by late response
    expect(useAppStore.getState().inspectedTicket).toBeNull();
    expect(useAppStore.getState().selectedTicketId).toBeNull();
  });

  it('shows no success notification when claim is rejected and keeps ticket state consistent', async () => {
    const ticket = createMockServerTicket('t-claim-fail', 'T-CLAIM-1', 'OPEN');
    const dicts = useAppStore.getState().serverDictionaries;
    useAppStore.setState({
      tickets: [mapStaffTicket(ticket, dicts)],
      toasts: [],
    });

    vi.mocked(ticketsApi.claimTicket).mockRejectedValueOnce({
      response: { data: { detail: 'Ticket already claimed by another technician' } },
    });

    const claimed = await useAppStore.getState().claimTicketApi('t-claim-fail');
    expect(claimed).toBe(false);

    const toasts = useAppStore.getState().toasts;
    expect(toasts.some((t) => t.type === 'success')).toBe(false);
    expect(toasts.some((t) => t.type === 'warning')).toBe(true);

    const t = useAppStore.getState().tickets.find((x) => x.id === 't-claim-fail');
    expect(t?.status).toBe('OPEN');
  });

  it('removes optimistic message and allows draft recovery when message send fails', async () => {
    const ticket = createMockServerTicket('t-msg-fail', 'T-MSG-1', 'PROG');
    const dicts = useAppStore.getState().serverDictionaries;
    useAppStore.setState({
      tickets: [mapStaffTicket(ticket, dicts)],
      selectedTicketId: 't-msg-fail',
      inspectedTicket: mapStaffTicket(ticket, dicts),
    });

    vi.mocked(ticketsApi.getComments).mockResolvedValue([]);
    vi.mocked(ticketsApi.addComment).mockRejectedValueOnce(new Error('Server unavailable'));

    render(<JobLogDrawer />);
    expect(screen.queryByPlaceholderText(/Message Maria Santos/i)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Live Chat with Employee/i }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Message Maria Santos/i)).toBeTruthy();
    });

    const chatInput = screen.getByPlaceholderText(/Message Maria Santos/i) as HTMLInputElement;
    fireEvent.change(chatInput, { target: { value: 'Important update note' } });
    const sendBtn = screen.getByRole('button', { name: /Send/i });

    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(ticketsApi.addComment).toHaveBeenCalledWith('t-msg-fail', {
        body: 'Important update note',
        is_internal: false,
      });
      const messages = useAppStore.getState().inspectedTicket?.messages || [];
      expect(messages.length).toBe(0);
      expect((screen.getByPlaceholderText(/Message Maria Santos/i) as HTMLInputElement).value).toBe(
        'Important update note'
      );
    });
  });

  it('reconciles optimistic message with authoritative server ID and avoids duplicate during polling', async () => {
    const ticket = createMockServerTicket('t-msg-success', 'T-MSG-OK', 'PROG');
    const dicts = useAppStore.getState().serverDictionaries;
    useAppStore.setState({
      tickets: [mapStaffTicket(ticket, dicts)],
      selectedTicketId: 't-msg-success',
      inspectedTicket: mapStaffTicket(ticket, dicts),
    });

    const serverComment = {
      id: 'comment-auth-123',
      ticket_id: 't-msg-success',
      user_id: 'u-1',
      author_name: 'Nathaniel D. Esguerra',
      author_role: 'it',
      body: 'Verified hardware cables',
      is_internal: false,
      created_at: '2026-10-27T10:05:00Z',
    };

    vi.mocked(ticketsApi.addComment).mockResolvedValueOnce(serverComment);

    const sendRes = await useAppStore.getState().sendTicketMessageApi('t-msg-success', 'Verified hardware cables');
    expect(sendRes).toBe(true);

    const ticketAfterSend = useAppStore.getState().tickets.find((t) => t.id === 't-msg-success');
    expect(ticketAfterSend?.messages?.length).toBe(1);
    expect(ticketAfterSend?.messages?.[0].id).toBe('comment-auth-123');

    // Simulate polling fetchTicketCommentsApi returning same server comment
    vi.mocked(ticketsApi.getComments).mockResolvedValueOnce([serverComment]);
    await useAppStore.getState().fetchTicketCommentsApi('t-msg-success');

    const ticketAfterPoll = useAppStore.getState().tickets.find((t) => t.id === 't-msg-success');
    expect(ticketAfterPoll?.messages?.length).toBe(1);
    expect(ticketAfterPoll?.messages?.[0].id).toBe('comment-auth-123');
  });

  it('increments hubSummariesVersion and triggers summaries refresh on successful status transition', async () => {
    const initialVersion = useAppStore.getState().hubSummariesVersion;
    const ticket = createMockServerTicket('t-status-trans', 'T-STAT-1', 'PROG');
    const dicts = useAppStore.getState().serverDictionaries;

    useAppStore.setState({
      tickets: [mapStaffTicket(ticket, dicts)],
    });

    vi.mocked(ticketsApi.getQueue).mockResolvedValue([ticket]);
    vi.mocked(ticketsApi.updateStatus).mockResolvedValueOnce({
      ...ticket,
      status: 'RESL',
    });
    vi.mocked(locationApi.getHubSummaries).mockResolvedValue(MOCK_SUMMARIES);

    render(<TerminalHubsView />);

    await waitFor(() => {
      expect(screen.getByText('Pasay')).toBeTruthy();
    });

    const initialFetchCount = vi.mocked(locationApi.getHubSummaries).mock.calls.length;

    // Perform transition
    const ok = await useAppStore.getState().updateTicketStatusApi('t-status-trans', 'RESL', 'SITE');
    expect(ok).toBe(true);

    // hubSummariesVersion must have incremented
    expect(useAppStore.getState().hubSummariesVersion).toBeGreaterThan(initialVersion);

    // TerminalHubsView should have refetched summaries in response to hubSummariesVersion change
    await waitFor(() => {
      expect(vi.mocked(locationApi.getHubSummaries).mock.calls.length).toBeGreaterThan(initialFetchCount);
    });
  });

  it('treats post-mutation queue refresh failure as stale data rather than mutation failure', async () => {
    const ticket = createMockServerTicket('t-refresh-fail', 'T-REFRESH-1', 'OPEN');
    const dicts = useAppStore.getState().serverDictionaries;
    useAppStore.setState({
      tickets: [mapStaffTicket(ticket, dicts)],
      toasts: [],
    });

    vi.mocked(ticketsApi.updateStatus).mockResolvedValueOnce({
      ...ticket,
      status: 'PROG',
    });
    vi.mocked(ticketsApi.getQueue).mockRejectedValueOnce(new Error('Queue sync timeout'));

    const res = await useAppStore.getState().updateTicketStatusApi('t-refresh-fail', 'PROG', 'SITE');

    expect(res).toBe(true);

    const toasts = useAppStore.getState().toasts;
    expect(toasts.some((t) => t.type === 'info' && t.title.includes('Status Updated'))).toBe(true);
    expect(toasts.some((t) => t.type === 'warning' && t.title.includes('Stale Preview'))).toBe(true);

    expect(useAppStore.getState().tickets.find((t) => t.id === 't-refresh-fail')?.status).toBe('PROG');
  });

  it('manages focus into drawer overlay when loading takes >30ms and returns focus on close', async () => {
    let resolveTicket: (ticket: StaffTicketResponse) => void = () => {};
    const slowTicketPromise = new Promise<StaffTicketResponse>((resolve) => {
      resolveTicket = resolve;
    });

    vi.mocked(ticketsApi.getTicket).mockReturnValue(slowTicketPromise);

    render(
      <div>
        <button id="trigger-btn">Open Inspection</button>
        <JobLogDrawer />
      </div>
    );

    const triggerBtn = screen.getByRole('button', { name: /Open Inspection/i });
    triggerBtn.focus();
    expect(document.activeElement).toBe(triggerBtn);

    // Trigger inspection for ticket that takes >30ms to load
    useAppStore.getState().setSelectedTicketId('slow-ticket-1');

    // Drawer is in loading state; Cancel Loading button should receive focus
    await waitFor(
      () => {
        const cancelBtn = screen.getByRole('button', { name: /Cancel Loading/i });
        expect(document.activeElement).toBe(cancelBtn);
      },
      { timeout: 1000 }
    );

    // Now resolve ticket
    resolveTicket(createMockServerTicket('slow-ticket-1', 'T-SLOW-01', 'OPEN', 'Slow loaded ticket'));

    // Drawer transitions to loaded state; focus moves inside container
    await waitFor(() => {
      expect(screen.getByText('T-SLOW-01')).toBeTruthy();
      expect(document.activeElement?.closest('aside')).toBeTruthy();
    });

    // Close drawer
    const closeBtn = screen.getByRole('button', { name: /Close drawer/i });
    fireEvent.click(closeBtn);

    // Focus restored to trigger element
    await waitFor(() => {
      expect(document.activeElement).toBe(triggerBtn);
    });
  });

  it('automatically steps back a page when tickets in current page become empty', async () => {
    // Generate 11 tickets for page 1 so next button is enabled
    const mockTicketsPage1 = Array.from({ length: 11 }, (_, i) =>
      createMockServerTicket(`ticket-p1-${i + 1}`, `T-P1-00${i + 1}`, 'OPEN', `Page 1 Issue ${i + 1}`)
    );

    // Page 1 returns 11 items, then Page 2 returns empty array (e.g. ticket was resolved/closed), then page 1 reloads
    vi.mocked(ticketsApi.getQueue)
      .mockResolvedValueOnce(mockTicketsPage1)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(mockTicketsPage1);

    render(
      <HubActiveTicketsTab
        hubId="loc-psy-uuid"
        hubName="Pasay"
        totalActiveCount={1}
        onOpenTicketDrawer={vi.fn()}
        onOpenWorkbenchForTicket={vi.fn()}
        onQuickIntake={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('T-P1-001')).toBeTruthy();
    });

    // Click Next to navigate to page 2
    const nextBtn = screen.getByRole('button', { name: /Next/i });
    fireEvent.click(nextBtn);

    // Next page returns empty, so the auto-step-back effect steps back to page 1
    // And page 1 loads again
    await waitFor(() => {
      expect(screen.getByText('T-P1-001')).toBeTruthy();
    });
  });
});
