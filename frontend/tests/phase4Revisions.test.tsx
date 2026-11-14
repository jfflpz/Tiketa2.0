import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { useAppStore } from '../src/store/useAppStore';
import { scheduleApi, nonemployeeApi, repeatRequesterApi } from '../src/api/client';
import { SharedScheduleCalendar } from '../src/features/schedule/SharedScheduleCalendar';
import { QuickIntakeModal } from '../src/components/tickets/QuickIntakeModal';
import { KioskTrackLookupTab } from '../src/features/kiosk/components/KioskTrackLookupTab';
import { ChronicRequestorTable } from '../src/features/reports/components/tables/ChronicRequestorTable';

vi.mock('../src/api/client', async () => {
  const actual = await vi.importActual<typeof import('../src/api/client')>('../src/api/client');
  return {
    ...actual,
    scheduleApi: {
      getCalendarAssignments: vi.fn(),
      submitRescheduleRequest: vi.fn(),
      decideRescheduleRequest: vi.fn(),
    },
    nonemployeeApi: {
      search: vi.fn(),
      create: vi.fn(),
      trackDelegated: vi.fn(),
      confirmDelegatedClosure: vi.fn(),
    },
    repeatRequesterApi: {
      getDrilldown: vi.fn(),
    },
  };
});

describe('Phase 4 Revisions (F-D3, F-E1, F-E2, F-E3)', () => {
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
      isQuickIntakeOpen: false,
      serverDictionaries: {
        companies: [{ id: 'c1', code: 'FS', name: 'Five Star' }],
        locations: [{ id: 'l1', code: 'PSY', name: 'Pasay' }],
        departments: [{ id: 'd1', code: 'OPS', name: 'Operations' }],
        tasks: [{ id: 't1', code: 'PRN-TS', name: 'Printer Troubleshooting' }],
        location_departments: [{ location_id: 'l1', department_id: 'd1' }],
      },
      fetchDictionaries: vi.fn().mockResolvedValue(undefined),
      quickIntakeApi: vi.fn(),
      trackTicketApi: vi.fn(),
      copyTicketShareLink: vi.fn(),
      setSelectedTicketId: vi.fn(),
    });
  });

  it('F-D3: shows calendar to IT, submits pending reschedule retaining confirmed date, and lets Supervisor approve', async () => {
    const todayMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    const confirmedDate = `${todayMonth}-10`;
    const proposedDate = `${todayMonth}-15`;

    vi.mocked(scheduleApi.getCalendarAssignments).mockResolvedValue({
      assignments: [
        {
          id: 'assign-1',
          ticket_id: 't-1',
          ticket_code: 'T-260101',
          task_name: 'POS Repair',
          staff_id: 'tech-1',
          staff_name: 'Tech One',
          staff_role: 'it',
          scheduled_date: confirmedDate,
          status: 'PROG',
        },
        {
          id: 'assign-2',
          ticket_id: 't-2',
          ticket_code: 'T-260102',
          task_name: 'Printer Fix',
          staff_id: 'tech-2',
          staff_name: 'Tech Two',
          staff_role: 'it',
          scheduled_date: confirmedDate,
          status: 'PROG',
        },
      ],
      reschedule_requests: [],
      undated_tickets_count: 3,
    });

    vi.mocked(scheduleApi.submitRescheduleRequest).mockResolvedValueOnce({
      applied_directly: false,
      request: {
        id: 'req-1',
        assignment_id: 'assign-1',
        ticket_id: 't-1',
        ticket_code: 'T-260101',
        requester_id: 'tech-1',
        requester_name: 'Tech One',
        original_date: confirmedDate,
        proposed_date: proposedDate,
        status: 'pending',
      },
    });

    const { rerender } = render(<SharedScheduleCalendar onViewUndated={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('T-260101')).toBeTruthy();
    });

    // Only own profile has Reschedule button
    const rescheduleButtons = screen.getAllByRole('button', { name: /Reschedule/i });
    expect(rescheduleButtons).toHaveLength(1);

    // Clicking other staff's assignment restricts ticket detail button for IT
    fireEvent.click(screen.getByText('T-260102'));
    expect(screen.queryByRole('button', { name: /Open Ticket Details/i })).toBeNull();

    // Submit keyboard/mobile reschedule for own assignment
    fireEvent.click(rescheduleButtons[0]);
    fireEvent.change(screen.getByLabelText(/Proposed Date/i), {
      target: { value: proposedDate },
    });
    fireEvent.click(screen.getByRole('button', { name: /Submit Move/i }));

    await waitFor(() => {
      expect(screen.getByText(new RegExp(`Pending → ${proposedDate}`))).toBeTruthy();
    });

    // Supervisor sees Approve / Reject controls and saves decision
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
    });
    vi.mocked(scheduleApi.decideRescheduleRequest).mockResolvedValueOnce({
      id: 'req-1',
      assignment_id: 'assign-1',
      ticket_id: 't-1',
      ticket_code: 'T-260101',
      requester_id: 'tech-1',
      requester_name: 'Tech One',
      original_date: confirmedDate,
      proposed_date: proposedDate,
      status: 'approved',
      decided_by_name: 'Supervisor One',
    });

    rerender(<SharedScheduleCalendar />);
    fireEvent.click(screen.getByRole('button', { name: /^Approve$/i }));

    await waitFor(() => {
      expect(scheduleApi.decideRescheduleRequest).toHaveBeenCalledWith('req-1', {
        decision: 'approved',
      });
    });
  });

  it('F-E1: distinguishes same-name nonemployees by context and submits separate reporter identity', async () => {
    const mockQuickIntake = vi.fn().mockResolvedValue({
      id: 't-new',
      ticketCode: 'T-260999',
      requestor: 'Maria Reyes',
      task: 'Printer Troubleshooting',
      mode: 'REM',
      description: 'Printer offline at gate 2',
    });
    useAppStore.setState({
      isQuickIntakeOpen: true,
      quickIntakeApi: mockQuickIntake,
    });

    vi.mocked(nonemployeeApi.search).mockResolvedValueOnce([
      {
        id: 'ne-1',
        full_name: 'Maria Reyes',
        company_id: 'c1',
        company_name: 'Five Star',
        location_id: 'l1',
        location_name: 'Pasay',
        department_id: 'd1',
        department_name: 'Operations',
        contact_hint: 'Gate 2 Booth',
        is_active: true,
      },
      {
        id: 'ne-2',
        full_name: 'Maria Reyes',
        company_id: 'c1',
        company_name: 'Five Star',
        location_id: 'l2',
        location_name: 'Caloocan',
        department_id: 'd2',
        department_name: 'Cash',
        contact_hint: 'Window 4',
        is_active: true,
      },
    ]);

    render(<QuickIntakeModal />);

    fireEvent.click(screen.getByRole('button', { name: /Nonemployee \/ Focal/i }));
    fireEvent.change(screen.getByPlaceholderText(/Search by full name/i), {
      target: { value: 'Maria Reyes' },
    });

    await waitFor(() => {
      expect(screen.getByText(/Pasay · Operations · Gate 2 Booth/i)).toBeTruthy();
      expect(screen.getByText(/Caloocan · Cash · Window 4/i)).toBeTruthy();
    });

    fireEvent.click(screen.getByText(/Pasay · Operations · Gate 2 Booth/i));
    fireEvent.change(screen.getByPlaceholderText(/Dispatch Focal Person/i), {
      target: { value: 'Focal Officer Cruz' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Describe the issue/i), {
      target: { value: 'Printer offline at gate 2 booth' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Add Ticket to Queue/i }));

    await waitFor(() => {
      expect(mockQuickIntake).toHaveBeenCalledWith(
        expect.objectContaining({
          requesterType: 'nonemployee',
          nonemployeeId: 'ne-1',
          reporterName: 'Focal Officer Cruz',
        })
      );
    });
  });

  it('F-E2: tracks delegated ticket with represented person and handles revoked delegation', async () => {
    vi.mocked(nonemployeeApi.trackDelegated).mockResolvedValueOnce({
      id: 't-del-1',
      ticket_code: 'T-260500',
      company_id: 'c1',
      location_id: 'l1',
      department_id: 'd1',
      requester_name: 'Maria Reyes',
      task_code: 'PRN-TS',
      description: 'Printer fixed',
      mode: 'SITE',
      month: 'November 2026',
      date_started: '2026-11-14',
      date_finished: null,
      time_started: '09:00:00',
      time_finished: null,
      duration: null,
      status: 'RESL',
      assigned_tech_id: 'tech-1',
      user_confirmed_at: null,
      created_at: '2026-11-14T09:00:00Z',
      represented_person: 'Maria Reyes (Pasay Ops)',
      delegation_status: 'active',
    });

    vi.mocked(nonemployeeApi.confirmDelegatedClosure).mockRejectedValueOnce({
      response: { status: 403, data: { detail: 'Delegation was revoked by supervisor.' } },
    });

    render(<KioskTrackLookupTab />);

    fireEvent.change(screen.getByPlaceholderText('T-2610-0101'), {
      target: { value: 'T-260500' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Paste scoped delegation token/i), {
      target: { value: 'del-tok-123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Lookup Ticket Status/i }));

    await waitFor(() => {
      expect(screen.getByTestId('delegation-banner').textContent).toContain(
        'Representing: Maria Reyes (Pasay Ops)'
      );
    });

    fireEvent.click(screen.getByRole('button', { name: /Confirm Closure for Maria Reyes/i }));

    await waitFor(() => {
      expect(screen.getByText(/Delegation was revoked by supervisor/i)).toBeTruthy();
    });
  });

  it('F-E3: opens repeat-requester drilldown with reconciled totals, uncertain legacy flag, and pagination', async () => {
    vi.mocked(repeatRequesterApi.getDrilldown).mockResolvedValueOnce({
      requestor_name: 'Legacy Name',
      total_count: 4,
      is_uncertain_legacy: true,
      groups: [
        { location_name: 'Pasay', department_name: 'Operations', count: 3 },
        { location_name: 'Caloocan', department_name: 'Cash', count: 1 },
      ],
      items: [
        {
          id: 't-10',
          ticket_code: 'T-260010',
          task_name: 'PC Troubleshooting',
          status: 'CLSD',
          location_name: 'Pasay',
          department_name: 'Operations',
          date_started: '2026-11-10',
        },
        // Duplicate row id should be deduplicated
        {
          id: 't-10',
          ticket_code: 'T-260010',
          task_name: 'PC Troubleshooting',
          status: 'CLSD',
          location_name: 'Pasay',
          department_name: 'Operations',
          date_started: '2026-11-10',
        },
      ],
      page: 1,
      page_size: 10,
      has_more: true,
    });

    render(
      <ChronicRequestorTable
        data={[
          {
            requestorName: 'Legacy Name',
            department: 'Operations',
            location: 'Pasay',
            repeatIncidents: 4,
            dominantTask: 'PC Troubleshooting',
            remoteResolutionRate: 50,
            sopTrainingTarget: 'Basic PC Check',
          },
        ]}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /4 tickets/i }));

    await waitFor(() => {
      const panel = screen.getByTestId('repeat-requester-drilldown');
      expect(panel.textContent).toContain('Reconciled Total: 4');
      expect(panel.textContent).toContain('Uncertain Legacy Name Group (Unmerged)');
      expect(screen.getAllByText('T-260010')).toHaveLength(1);
    });
  });
});
