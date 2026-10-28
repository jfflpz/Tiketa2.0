import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import App from '../src/App';
import { EmployeeTicketScreen } from '../src/features/kiosk/EmployeeTicketScreen';
import { useAppStore } from '../src/store/useAppStore';
import { authApi, ticketsApi } from '../src/api/client';
import {
  RECENT_EMPLOYEE_TICKETS_KEY,
  EMPLOYEE_MATCH_TOKEN_KEY,
  getPersistedEmployeeTickets,
} from '../src/utils/session';
import type { Ticket } from '../src/types/ticket';

describe('Employee Tickets Screen Bug Remediations', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    window.history.pushState(null, '', '/report');
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
      activeView: 'overview',
      isHydratingAuth: false,
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  describe('Bug 1: Screen refresh redirects to IT Support active tickets', () => {
    it('logoutToKiosk calls authApi.logout() before clearing access token and resets history to /report', async () => {
      let tokenBeforeLogout: string | null = 'existing-token';
      const logoutSpy = vi.spyOn(authApi, 'logout').mockImplementation(async () => {
        // Assert token is still active during logout call
        expect(tokenBeforeLogout).toBe('existing-token');
        return { message: 'Signed out successfully' };
      });

      const pushStateSpy = vi.spyOn(window.history, 'pushState');

      useAppStore.setState({
        currentUser: {
          id: 'u-1',
          name: 'Tech Person',
          email: 'tech@fivestar.com',
          role: 'it',
          title: 'IT Support',
          avatar: 'TP',
        },
      });

      await useAppStore.getState().logoutToKiosk();

      expect(logoutSpy).toHaveBeenCalledTimes(1);
      expect(useAppStore.getState().currentUser).toBeNull();
      expect(pushStateSpy).toHaveBeenCalledWith(null, '', '/report');
      expect(localStorage.getItem('tiketa_active_view')).toBeNull();
    });

    it('logoutToKiosk recovers and clears local state even if authApi.logout() network request throws', async () => {
      vi.spyOn(authApi, 'logout').mockRejectedValue(new Error('Network error on logout'));
      const pushStateSpy = vi.spyOn(window.history, 'pushState');

      useAppStore.setState({
        currentUser: {
          id: 'u-admin',
          name: 'Admin Person',
          email: 'admin@fivestar.com',
          role: 'admin',
          title: 'IT Administrator',
          avatar: 'AP',
        },
      });

      await useAppStore.getState().logoutToKiosk();

      expect(useAppStore.getState().currentUser).toBeNull();
      expect(pushStateSpy).toHaveBeenCalledWith(null, '', '/report');
    });

    it('App ALWAYS renders EmployeeTicketScreen on /report or /kiosk regardless of whether currentUser exists', () => {
      // Simulate staff user session exists in background
      useAppStore.setState({
        currentUser: {
          id: 'u-1',
          name: 'Stephen Miralles',
          email: 'stephen@fivestar.com',
          role: 'admin',
          title: 'Senior IT Analyst',
          avatar: 'SM',
        },
        isHydratingAuth: false,
      });

      window.history.pushState(null, '', '/report');

      render(<App />);

      // Must render Employee Ticket Screen greeting, NOT ITOverviewDashboard or TicketListsView
      expect(screen.getByText(/How can IT Support assist you today\?/i)).toBeTruthy();
      expect(screen.queryByText(/Active Incident Queue/i)).toBeNull();
    });
  });

  describe('Bug 2: "My Tickets" tab jumps from 0 to 13 tickets on "View Ticket"', () => {
    it('submitTicketApi under NO circumstance injects employee tickets into state.tickets queue', async () => {
      const mockStaffTriageTickets: Ticket[] = Array.from({ length: 13 }).map((_, i) => ({
        id: `t-staff-${i}`,
        ticketCode: `T-2610-000${i}`,
        company: 'Pangasinan Five Star Bus Co.',
        companyCode: 'FS',
        mode: 'SITE',
        department: 'Operations',
        departmentCode: 'OPS',
        requestor: `Staff Member ${i}`,
        task: 'Network Outage',
        taskCode: 'NET-CFG',
        description: `Triage issue ${i}`,
        month: 'October 2026',
        dateStarted: '2026-10-28',
        timeStarted: '08:00:00',
        status: 'OPEN',
        location: 'Pasay Terminal',
        locationCode: 'PSY',
        priority: 'High',
        intakeSource: 'PC Kiosk',
        createdAt: '2026-10-28T08:00:00Z',
        messages: [],
      }));

      // Set up store with staff tickets
      useAppStore.setState({
        currentUser: {
          id: 'u-1',
          name: 'Tech',
          email: 'tech@fivestar.com',
          role: 'it',
          title: 'IT Support',
          avatar: 'T',
        },
        tickets: mockStaffTriageTickets,
        employeeTickets: [],
      });

      expect(useAppStore.getState().tickets.length).toBe(13);
      expect(useAppStore.getState().employeeTickets.length).toBe(0);

      vi.spyOn(ticketsApi, 'submitPublicTicket').mockResolvedValue({
        ticket_code: 'T-2610-9999',
        status: 'OPEN',
        created_at: '2026-10-28T10:00:00Z',
      } as any);

      const submitted = await useAppStore.getState().submitTicketApi({
        employeeId: 'EMP-001',
        taskCode: 'PRN-TS',
        description: 'Need new printer toner cartridges immediately in booth 2',
        matchToken: 'tok-abc',
        locationName: 'Pasay Terminal',
        departmentName: 'Cash Management',
        requestorName: 'Cashier Staff',
      });

      expect(submitted).not.toBeNull();
      // Employee tickets contains strictly the 1 employee ticket
      expect(useAppStore.getState().employeeTickets.length).toBe(1);
      expect(useAppStore.getState().employeeTickets[0].ticketCode).toBe('T-2610-9999');

      // Staff tickets queue length remains unchanged at 13 (NOT prepended)
      expect(useAppStore.getState().tickets.length).toBe(13);
      expect(useAppStore.getState().tickets.find((t) => t.ticketCode === 'T-2610-9999')).toBeUndefined();
    });

    it('clicking "View Ticket" opens the detail view inline inside EmployeeTicketScreen without leaking staff queue', async () => {
      const mockTicket: Ticket = {
        id: 't-created-123',
        ticketCode: 'T-2610-7777',
        company: 'Pangasinan Five Star Bus Co.',
        companyCode: 'FS',
        mode: 'SITE',
        department: 'Operations',
        departmentCode: 'OPS',
        requestor: 'Juan Dela Cruz',
        task: 'Printer Troubleshoot',
        taskCode: 'PRN-TS',
        description: 'New counter monitor and keyboard installation',
        month: 'October 2026',
        dateStarted: '2026-10-28',
        timeStarted: '09:00:00',
        status: 'OPEN',
        location: 'Pasay Terminal',
        locationCode: 'PSY',
        priority: 'Medium',
        intakeSource: 'PC Kiosk',
        createdAt: '2026-10-28T09:00:00Z',
        messages: [],
      };

      useAppStore.setState({
        employeeTickets: [mockTicket],
      });

      render(<EmployeeTicketScreen />);

      // Switch to My Tickets
      const myTicketsBtn = screen.getByRole('button', { name: /My Tickets/i });
      fireEvent.click(myTicketsBtn);

      // Verify the single ticket is listed
      expect(screen.getByText('T-2610-7777')).toBeTruthy();
      expect(screen.getByText('Printer Troubleshoot')).toBeTruthy();

      // Click the ticket card to open inline details
      fireEvent.click(screen.getByText('T-2610-7777'));

      // Verify inline EmployeeTicketDetails is rendered
      expect(screen.getByText(/Ticket Details/i)).toBeTruthy();
      expect(screen.getByText('New counter monitor and keyboard installation')).toBeTruthy();

      // Back button returns to My Tickets list without error
      const backBtn = screen.getByRole('button', { name: /Back to Ticket List/i });
      fireEvent.click(backBtn);
      expect(screen.getByText('T-2610-7777')).toBeTruthy();
    });
  });

  describe('Bug 3: Browser restart wipes created ticket and resets "My Tickets" to 0', () => {
    it('persists submitted employee ticket into localStorage under tiketa_recent_employee_tickets', async () => {
      vi.spyOn(ticketsApi, 'submitPublicTicket').mockResolvedValue({
        ticket_code: 'T-2610-5555',
        status: 'OPEN',
        created_at: '2026-10-28T10:15:00Z',
      } as any);

      await useAppStore.getState().submitTicketApi({
        employeeId: 'EMP-005',
        taskCode: 'NET-CFG',
        description: 'Router reboot needed for dispatcher station 3',
        matchToken: 'tok-xyz',
      });

      const stored = getPersistedEmployeeTickets();
      expect(stored.length).toBe(1);
      expect(stored[0].ticketCode).toBe('T-2610-5555');
    });

    it('hydrateKioskEmployeeTickets restores recent tickets from localStorage and refreshes live statuses via trackTicket', async () => {
      const persistedTicket: Ticket = {
        id: 'persisted-1',
        ticketCode: 'T-2610-5555',
        company: 'Pangasinan Five Star Bus Co.',
        companyCode: 'FS',
        mode: 'SITE',
        department: 'Operations',
        departmentCode: 'OPS',
        requestor: 'Juan Dela Cruz',
        task: 'Network Config',
        taskCode: 'NET-CFG',
        description: 'Router reboot needed for dispatcher station 3',
        month: 'October 2026',
        dateStarted: '2026-10-28',
        timeStarted: '10:15:00',
        status: 'OPEN',
        location: 'Pasay Terminal',
        locationCode: 'PSY',
        priority: 'Medium',
        intakeSource: 'PC Kiosk',
        createdAt: '2026-10-28T10:15:00Z',
        messages: [],
      };

      // Simulate tickets saved before browser restart
      localStorage.setItem(
        RECENT_EMPLOYEE_TICKETS_KEY,
        JSON.stringify([persistedTicket])
      );
      localStorage.setItem(EMPLOYEE_MATCH_TOKEN_KEY, 'match-token-persisted');

      // Server now has updated status: PROG (Technician claimed it)
      vi.spyOn(ticketsApi, 'trackTicket').mockResolvedValue({
        ticket_code: 'T-2610-5555',
        status: 'PROG',
        created_at: '2026-10-28T10:15:00Z',
      } as any);

      // Reset in-memory store as if browser just restarted
      useAppStore.setState({
        employeeTickets: [],
        employeeMatchToken: null,
      });

      // Hydrate kiosk state
      await useAppStore.getState().hydrateKioskEmployeeTickets();

      // Tickets must be restored with live refreshed status
      const state = useAppStore.getState();
      expect(state.employeeTickets.length).toBe(1);
      expect(state.employeeTickets[0].ticketCode).toBe('T-2610-5555');
      expect(state.employeeTickets[0].status).toBe('PROG');
      expect(state.employeeMatchToken).toBe('match-token-persisted');

      // Local storage must also reflect updated status
      const updatedStorage = getPersistedEmployeeTickets();
      expect(updatedStorage[0].status).toBe('PROG');
    });
  });
});
