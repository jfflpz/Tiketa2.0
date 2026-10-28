import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { KioskTrackLookupTab } from '../src/features/kiosk/components/KioskTrackLookupTab';
import { EmployeeTicketScreen } from '../src/features/kiosk/EmployeeTicketScreen';
import { useAppStore } from '../src/store/useAppStore';
import { ticketsApi, directoryApi, type EmployeeMatchOut } from '../src/api/client';
import { mapStaffTicket } from '../src/utils/mapStaffTicket';

describe('Employee Intake & Public Tracking Experience', () => {
  beforeEach(() => {
    sessionStorage.clear();
    useAppStore.setState({
      currentUser: null,
      tickets: [],
      employeeTickets: [],
      trackedTicket: null,
      publicReceipt: null,
      employeeMatchToken: null,
      employeeProfile: null,
      toasts: [],
      verifyTicketCode: null,
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  describe('KioskTrackLookupTab (Track Code Experience)', () => {
    it('renders ticket status, tracking code, category, creation date, and status stepper inline', async () => {
      const mockTrackedTicket = {
        ticket_code: 'T-2610-0999',
        status: 'PROG',
        created_at: '2026-10-28T09:30:00Z',
        task_name: 'Printer Troubleshoot',
        task_code: 'PRN-TS',
        location_name: 'Pasay Terminal',
        department_name: 'Cash Management',
        description: 'Booth 2 thermal printer ribbon jammed.',
      };

      vi.spyOn(ticketsApi, 'trackTicket').mockResolvedValue(mockTrackedTicket as any);

      render(<KioskTrackLookupTab />);

      // Search input is rendered
      const input = screen.getByPlaceholderText('T-2610-0101');
      expect(input).toBeTruthy();

      fireEvent.change(input, { target: { value: 'T-2610-0999' } });
      const submitBtn = screen.getByRole('button', { name: /Lookup Ticket Status/i });
      fireEvent.click(submitBtn);

      // Verify inline render
      await screen.findByText('T-2610-0999');
      expect(screen.getByText(/Live Ticket Status/i)).toBeTruthy();

      // Verify Status Stepper (1. Registered, 2. In Progress, 3. Resolved, 4. Closed)
      expect(screen.getByText('1. Registered')).toBeTruthy();
      expect(screen.getByText('2. In Progress')).toBeTruthy();
      expect(screen.getByText('3. Resolved')).toBeTruthy();
      expect(screen.getByText('4. Closed')).toBeTruthy();

      // Verify Details
      expect(screen.getByText('Printer Troubleshoot')).toBeTruthy();
      expect(screen.getByText(/Pasay Terminal • Cash Management/i)).toBeTruthy();
      expect(screen.getByText('Booth 2 thermal printer ribbon jammed.')).toBeTruthy();
    });

    it('does NOT navigate to the empty staff My Tickets queue on track lookup', async () => {
      const mockTrackedTicket = {
        ticket_code: 'T-2610-0888',
        status: 'OPEN',
        created_at: '2026-10-28T08:15:00Z',
      };

      vi.spyOn(ticketsApi, 'trackTicket').mockResolvedValue(mockTrackedTicket as any);

      render(<EmployeeTicketScreen />);

      // Navigate to Track Code tab
      const trackCodeTabBtn = screen.getByRole('button', { name: /Track Code/i });
      fireEvent.click(trackCodeTabBtn);

      const input = screen.getByPlaceholderText('T-2610-0101');
      fireEvent.change(input, { target: { value: 'T-2610-0888' } });
      fireEvent.click(screen.getByRole('button', { name: /Lookup Ticket Status/i }));

      // Ticket is displayed on screen
      await screen.findByText('T-2610-0888');

      // Crucial verification: Screen remains on Track Code, NOT navigated to empty "My Tickets"
      expect(screen.queryByText(/No Tickets Found/i)).toBeNull();
      const activeTabBtn = screen.getByRole('button', { name: /Track Code/i });
      expect(activeTabBtn.className).toContain('bg-zinc-900');
    });

    it('shows clear not found error and allows retrying search', async () => {
      vi.spyOn(ticketsApi, 'trackTicket').mockResolvedValue(null as any);

      render(<KioskTrackLookupTab />);

      const input = screen.getByPlaceholderText('T-2610-0101');
      fireEvent.change(input, { target: { value: 'T-0000-0000' } });
      fireEvent.click(screen.getByRole('button', { name: /Lookup Ticket Status/i }));

      await screen.findByText(/Ticket "T-0000-0000" was not found on the server/i);
    });

    it('allows resetting search to lookup another ticket', async () => {
      vi.spyOn(ticketsApi, 'trackTicket').mockResolvedValue({
        ticket_code: 'T-2610-0101',
        status: 'CLSD',
        created_at: '2026-10-27T10:00:00Z',
      } as any);

      render(<KioskTrackLookupTab />);

      fireEvent.change(screen.getByPlaceholderText('T-2610-0101'), {
        target: { value: 'T-2610-0101' },
      });
      fireEvent.click(screen.getByRole('button', { name: /Lookup Ticket Status/i }));

      await screen.findByText('T-2610-0101');

      // Click "Track Another Ticket"
      const resetBtn = screen.getAllByRole('button', { name: /Track Another Ticket/i })[0];
      fireEvent.click(resetBtn);

      // Search input is visible again
      expect(screen.getByPlaceholderText('T-2610-0101')).toBeTruthy();
    });
  });

  describe('publicIntakeSlice state isolation', () => {
    it('trackTicketApi does NOT mutate state.tickets (reserved for staff queue)', async () => {
      vi.spyOn(ticketsApi, 'trackTicket').mockResolvedValue({
        ticket_code: 'T-2610-0777',
        status: 'OPEN',
        created_at: '2026-10-28T10:00:00Z',
      } as any);

      expect(useAppStore.getState().tickets).toHaveLength(0);

      const res = await useAppStore.getState().trackTicketApi('T-2610-0777');

      expect(res).toBeTruthy();
      expect(res?.ticketCode).toBe('T-2610-0777');

      // Dedicated fields populated
      expect(useAppStore.getState().trackedTicket?.ticketCode).toBe('T-2610-0777');
      expect(useAppStore.getState().publicReceipt?.ticketCode).toBe('T-2610-0777');

      // Staff queue MUST remain empty (isolated from public track queries)
      expect(useAppStore.getState().tickets).toHaveLength(0);
    });

    it('matchEmployeeApi stores employeeMatchToken and employeeProfile', async () => {
      const mockMatchOut: EmployeeMatchOut = {
        status: 'matched',
        match_token: 'match-token-secret-jwt',
        employee: {
          employee_id: '1042',
          full_name: 'Maria Santos',
          company_id: 'comp-1',
          company_name: 'Pangasinan Five Star Bus Co.',
          location_id: 'loc-1',
          location_name: 'Pasay Terminal',
          department_id: 'dept-1',
          department_name: 'Operations',
        },
      };

      vi.spyOn(directoryApi, 'matchEmployee').mockResolvedValue(mockMatchOut);
      vi.spyOn(ticketsApi, 'getMyTickets').mockResolvedValue([]);

      const result = await useAppStore.getState().matchEmployeeApi('1042', 'maria@fivestarbus.com');

      expect(result.match_token).toBe('match-token-secret-jwt');
      expect(useAppStore.getState().employeeMatchToken).toBe('match-token-secret-jwt');
      expect(useAppStore.getState().employeeProfile?.fullName).toBe('Maria Santos');
      expect(useAppStore.getState().employeeProfile?.location).toBe('Pasay Terminal');
    });

    it('submitTicketApi puts new ticket into publicReceipt and employeeTickets without leaking to unauthenticated staff queue', async () => {
      vi.spyOn(ticketsApi, 'submitPublicTicket').mockResolvedValue({
        ticket_code: 'T-2610-0555',
        status: 'OPEN',
        created_at: '2026-10-28T11:00:00Z',
      });

      const newTicket = await useAppStore.getState().submitTicketApi({
        employeeId: '1042',
        taskCode: 'PRN-TS',
        description: 'Printer roller needs cleaning',
        matchToken: 'mock-match-token',
        companyName: 'Pangasinan Five Star Bus Co.',
        locationName: 'Pasay Terminal',
        departmentName: 'Operations',
        requestorName: 'Maria Santos',
      });

      expect(newTicket?.ticketCode).toBe('T-2610-0555');
      expect(useAppStore.getState().publicReceipt?.ticketCode).toBe('T-2610-0555');
      expect(useAppStore.getState().employeeTickets).toHaveLength(1);
      expect(useAppStore.getState().employeeTickets[0].ticketCode).toBe('T-2610-0555');
      // Unauthenticated visitor -> staff queue is NOT polluted
      expect(useAppStore.getState().tickets).toHaveLength(0);
    });
  });

  describe('mapStaffTicket safe UUID fallbacks', () => {
    it('falls back to human-readable names when location_id and department_id are UUIDs and dictionaries are absent', () => {
      const mockRawTicket = {
        id: 'ticket-uuid-1',
        ticket_code: 'T-2610-0101',
        company_id: 'c1234567-89ab-cdef-0123-456789abcdef',
        location_id: 'l1234567-89ab-cdef-0123-456789abcdef',
        department_id: 'd1234567-89ab-cdef-0123-456789abcdef',
        requester_name: 'Juan Dela Cruz',
        task_code: 'NET-CFG',
        description: 'No internet access at terminal counter',
        mode: 'SITE' as const,
        month: 'October 2026',
        date_started: '2026-10-28',
        time_started: '08:00:00',
        date_finished: null,
        time_finished: null,
        duration: null,
        status: 'OPEN' as const,
        assigned_tech_id: null,
        user_confirmed_at: null,
        created_at: '2026-10-28T08:00:00Z',
      };

      const mapped = mapStaffTicket(mockRawTicket as any, null);

      // Must NOT display raw UUIDs
      expect(mapped.company).toBe('Pangasinan Five Star Bus Co.');
      expect(mapped.location).toBe('Terminal Station');
      expect(mapped.department).toBe('Operations');
      expect(mapped.task).toBe('Network Configuration');
    });

    it('uses server dictionaries when available', () => {
      const mockRawTicket = {
        id: 'ticket-uuid-2',
        ticket_code: 'T-2610-0102',
        company_id: 'comp-uuid-2',
        location_id: 'loc-uuid-2',
        department_id: 'dept-uuid-2',
        requester_name: 'Maria Santos',
        task_code: 'PRN-TS',
        description: 'Printer roller needs replacement',
        mode: 'SITE' as const,
        month: 'October 2026',
        date_started: '2026-10-28',
        time_started: '08:00:00',
        date_finished: null,
        time_finished: null,
        duration: null,
        status: 'PROG' as const,
        assigned_tech_id: 'tech-uuid',
        technician_name: 'Nathaniel Esguerra',
        user_confirmed_at: null,
        created_at: '2026-10-28T08:00:00Z',
      };

      const dicts = {
        companies: [{ id: 'comp-uuid-2', code: 'FS', name: 'Five Star Transit Corp' }],
        locations: [{ id: 'loc-uuid-2', code: 'PSY', name: 'Pasay Grand Terminal' }],
        departments: [{ id: 'dept-uuid-2', code: 'CASH', name: 'Cash Treasury' }],
        tasks: [{ id: 'PRN-TS', code: 'PRN-TS', name: 'Thermal Printer Repair' }],
        location_departments: [],
      };

      const mapped = mapStaffTicket(mockRawTicket as any, dicts);

      expect(mapped.company).toBe('Five Star Transit Corp');
      expect(mapped.location).toBe('Pasay Grand Terminal');
      expect(mapped.department).toBe('Cash Treasury');
      expect(mapped.task).toBe('Thermal Printer Repair');
    });
  });

  describe('Description minimum 10 characters guard', () => {
    it('auto-supplements short description under 10 chars to prevent 422', async () => {
      vi.spyOn(directoryApi, 'matchEmployee').mockResolvedValue({
        status: 'matched',
        match_token: 'valid-match-token',
        employee: {
          employee_id: '1042',
          full_name: 'Maria Santos',
          company_id: 'comp-uuid',
          company_name: 'Pangasinan Five Star Bus Co.',
          location_id: 'loc-uuid',
          location_name: 'Pasay Terminal',
          department_id: 'dept-uuid',
          department_name: 'Operations',
        },
      });

      const submitSpy = vi.spyOn(ticketsApi, 'submitPublicTicket').mockResolvedValue({
        ticket_code: 'T-2610-0333',
        status: 'OPEN',
        created_at: '2026-10-28T10:00:00Z',
      });

      render(<EmployeeTicketScreen />);

      // Match employee
      fireEvent.change(screen.getByPlaceholderText('e.g. 1042'), { target: { value: '1042' } });
      fireEvent.change(screen.getByPlaceholderText('e.g. employee@fivestarbus.com'), {
        target: { value: 'maria@fivestarbus.com' },
      });
      fireEvent.click(screen.getByRole('button', { name: /Continue/i }));

      await screen.findByText('Employee details matched.');

      // Provide short 4-character description: "Jam"
      const descInput = screen.getByPlaceholderText(/Briefly describe what happened/i);
      fireEvent.change(descInput, { target: { value: 'Jam' } });

      const submitBtn = screen.getByRole('button', { name: /Submit Help Request/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(submitSpy).toHaveBeenCalled();
        const callArgs = submitSpy.mock.calls[0][0];
        // Must be at least 10 chars so Pydantic never 422s
        expect(callArgs.description.length).toBeGreaterThanOrEqual(10);
        expect(callArgs.description).toContain('Jam');
      });
    });
  });
});
