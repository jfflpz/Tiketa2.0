import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { JobLogDrawerChat } from '../src/components/tickets/drawer/JobLogDrawerChat';
import { JobLogSheetView } from '../src/features/joblogs/JobLogSheetView';
import { ticketsApi } from '../src/api/client';
import { sanitizeCsvCell } from '../src/features/joblogs/utils/csvSanitizer';
import { useAppStore } from '../src/store/useAppStore';
import type { Ticket } from '../src/types/ticket';

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
      getComments: vi.fn().mockResolvedValue([]),
      addComment: vi.fn().mockResolvedValue({ id: 'srv-comment-1', body: 'ok' }),
      getHistory: vi.fn().mockResolvedValue([]),
      getQueue: vi.fn().mockResolvedValue([]),
    },
  };
});

const sampleTicket: Ticket = {
  id: 'ticket-uuid-101',
  ticketCode: 'T-100101',
  company: 'Five Star',
  companyCode: 'P5STAR',
  department: 'Operations',
  departmentCode: 'OPS',
  requestor: 'Maria Santos',
  task: 'Printer Troubleshooting',
  taskCode: 'PRN-TS',
  description: 'Workstation touchscreen unresponsive after boot',
  month: 'November',
  dateStarted: '2026-11-04',
  timeStarted: '08:30',
  status: 'PROG',
  mode: 'SITE',
  location: 'Pasay Terminal',
  locationCode: 'MNL-PASAY',
  workedBy: 'Juan Dela Cruz',
  workedById: 'tech-uuid-1',
  assigned_tech_id: 'tech-uuid-1',
  priority: 'Medium',
  createdAt: '2026-11-04T08:30:00Z',
  messages: [
    {
      id: 'msg-1',
      senderRole: 'employee',
      senderName: 'Maria Santos',
      message: 'The screen is stuck on the login loading bar.',
      timestamp: '08:32 AM',
      isInternal: false,
    },
    {
      id: 'msg-2',
      senderRole: 'it',
      senderName: 'Juan Dela Cruz',
      message: 'On my way to check your workstation cables.',
      timestamp: '08:35 AM',
      isInternal: false,
    },
    {
      id: 'msg-3',
      senderRole: 'it',
      senderName: '🔒 Internal IT Note',
      message: 'Needs possible RAM module replacement.',
      timestamp: '08:36 AM',
      isInternal: true,
    },
  ],
};

describe('F-07 & F-08 Chat & History Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAppStore.setState({
      currentUser: {
        id: 'tech-uuid-1',
        name: 'Juan Dela Cruz',
        username: 'jdelacruz',
        email: 'juan@ph.omnitick.com',
        role: 'it',
        title: 'IT Specialist',
        avatar: '',
      },
      authSessionId: 123,
      tickets: [sampleTicket],
      serverDictionaries: {
        companies: [{ id: 'comp-1', code: 'P5STAR', name: 'Five Star' }],
        locations: [{ id: 'loc-1', code: 'MNL-PASAY', name: 'Pasay Terminal' }],
        departments: [{ id: 'dept-1', code: 'OPS', name: 'Operations' }],
        tasks: [{ id: 'task-1', code: 'PRN-TS', name: 'Printer Troubleshooting' }],
        location_departments: [],
      },
      itTeamMembers: [],
    });
  });

  afterEach(() => {
    cleanup();
  });

  describe('F-07 Bounded 3-Second Two-Way Chat', () => {
    it('1. JobLogDrawerChat maps canonical author roles and distinct badges (Employee, IT Support, Internal Note)', () => {
      render(
        <JobLogDrawerChat
          ticket={sampleTicket}
          techSenderName="Juan Dela Cruz"
          onSendMessage={vi.fn()}
        />
      );

      // Verify Maria Santos is identified as Employee, NOT IT Support
      expect(screen.getByText('The screen is stuck on the login loading bar.')).toBeDefined();
      expect(screen.getByText('Employee')).toBeDefined();

      // Verify Juan Dela Cruz is identified as IT Support
      expect(screen.getByText('On my way to check your workstation cables.')).toBeDefined();
      expect(screen.getByText('IT Support')).toBeDefined();

      // Verify Internal Note is clearly badged
      expect(screen.getByText('Needs possible RAM module replacement.')).toBeDefined();
      expect(screen.getAllByText(/Internal Note/i).length).toBeGreaterThanOrEqual(1);
    });

    it('2. JobLogDrawerChat toggles between Send to Employee and Internal Note composer modes', () => {
      render(
        <JobLogDrawerChat
          ticket={sampleTicket}
          techSenderName="Juan Dela Cruz"
          onSendMessage={vi.fn()}
        />
      );

      const toEmployeeBtn = screen.getByRole('button', { name: /send to employee/i });
      const internalNoteBtn = screen.getByRole('button', { name: /internal note \(hidden\)/i });

      expect(toEmployeeBtn).toBeDefined();
      expect(internalNoteBtn).toBeDefined();

      // Default is Send to Employee
      expect(screen.getByPlaceholderText(/message maria santos as juan dela cruz/i)).toBeDefined();

      // Switch to Internal Note
      fireEvent.click(internalNoteBtn);
      expect(screen.getByPlaceholderText(/add confidential note visible only to it staff/i)).toBeDefined();
      expect(screen.getByRole('button', { name: /save note/i })).toBeDefined();
    });

    it('3. JobLogDrawerChat preserves draft text on delivery failure and displays alert', async () => {
      const onSendMessage = vi.fn().mockResolvedValue(false);

      render(
        <JobLogDrawerChat
          ticket={sampleTicket}
          techSenderName="Juan Dela Cruz"
          onSendMessage={onSendMessage}
        />
      );

      const input = screen.getByPlaceholderText(/message maria santos/i) as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'Draft reply to employee' } });
      expect(input.value).toBe('Draft reply to employee');

      const sendBtn = screen.getByRole('button', { name: /^send$/i });
      fireEvent.click(sendBtn);

      await waitFor(() => {
        expect(onSendMessage).toHaveBeenCalledWith('Draft reply to employee', false);
        // Draft must be preserved in the input box on failure
        expect(input.value).toBe('Draft reply to employee');
        expect(screen.getByRole('alert')).toBeDefined();
        expect(screen.getByText(/message delivery failed\. draft preserved\./i)).toBeDefined();
      });
    });

    it('4. Gated 3-second polling stops when document is hidden and resumes when visible', async () => {
      vi.useFakeTimers();

      const fetchCommentsSpy = vi.spyOn(useAppStore.getState(), 'fetchTicketCommentsApi').mockResolvedValue(undefined);

      render(
        <JobLogDrawerChat
          ticket={sampleTicket}
          techSenderName="Juan Dela Cruz"
          onSendMessage={vi.fn()}
        />
      );

      // Initial call on mount
      expect(fetchCommentsSpy).toHaveBeenCalledTimes(1);

      // Advance by 3 seconds while document is visible
      await vi.advanceTimersByTimeAsync(3000);
      expect(fetchCommentsSpy).toHaveBeenCalledTimes(2);

      // Simulate tab hidden (document.visibilityState = 'hidden')
      Object.defineProperty(document, 'visibilityState', {
        value: 'hidden',
        configurable: true,
      });

      await vi.advanceTimersByTimeAsync(6000);
      // No extra fetches while document is hidden!
      expect(fetchCommentsSpy).toHaveBeenCalledTimes(2);

      // Simulate tab returning to visible
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        configurable: true,
      });
      fireEvent(document, new Event('visibilitychange'));

      expect(fetchCommentsSpy).toHaveBeenCalledTimes(3);

      vi.useRealTimers();
    });

    it('4b. [F-03] Conversation messages survive background fetchQueueApi polling refreshes', async () => {
      useAppStore.setState({
        tickets: [sampleTicket],
      });

      // Verify initial messages exist on the ticket in store
      expect(useAppStore.getState().tickets[0].messages).toHaveLength(3);

      // Simulate background queue refresh returning new raw metadata without comments
      vi.mocked(ticketsApi.getQueue).mockResolvedValueOnce([
        {
          id: 'ticket-uuid-101',
          ticket_code: 'T-100101',
          company_code: 'P5STAR',
          location_code: 'MNL-PASAY',
          department_code: 'OPS',
          task_code: 'PRN-TS',
          status: 'PROG',
          assigned_tech_id: 'tech-uuid-1',
          created_at: '2026-11-04T08:30:00Z',
          description: 'Refreshed queue metadata',
        } as any,
      ]);

      const success = await useAppStore.getState().fetchQueueApi();
      expect(success).toBe(true);

      // F-03: Messages MUST be preserved and not wiped out by queue sync
      const refreshedTicket = useAppStore.getState().tickets.find((t) => t.id === 'ticket-uuid-101');
      expect(refreshedTicket).toBeDefined();
      expect(refreshedTicket?.messages).toHaveLength(3);
      expect(refreshedTicket?.messages?.[0].id).toBe('msg-1');
      expect(refreshedTicket?.messages?.[1].id).toBe('msg-2');
      expect(refreshedTicket?.messages?.[2].id).toBe('msg-3');
    });
  });

  describe('F-08 Complete Job History & Safe CSV Export', () => {
    it('5. sanitizeCsvCell neutralizes formula injection (=, +, -, @, tab, cr) and escapes double quotes', () => {
      // Formula triggers
      expect(sanitizeCsvCell('=SUM(A1:A10)')).toBe('"\'=SUM(A1:A10)"');
      expect(sanitizeCsvCell('+12345')).toBe('"\' +12345"'.replace(' ', ''));
      expect(sanitizeCsvCell('-cmd|calc')).toBe('"\' -cmd|calc"'.replace(' ', ''));
      expect(sanitizeCsvCell('@IMPORTXML("url")')).toBe('"\'@IMPORTXML(""url"")"');
      expect(sanitizeCsvCell('   =CMD("malicious")')).toBe('"\'   =CMD(""malicious"")"');
      expect(sanitizeCsvCell('\tmaliciousTab')).toBe('"\'\tmaliciousTab"');
      expect(sanitizeCsvCell('\rmaliciousCR')).toBe('"\'\rmaliciousCR"');

      // Regular values
      expect(sanitizeCsvCell('Pasay Terminal')).toBe('"Pasay Terminal"');
      expect(sanitizeCsvCell('Workstation "POS" display')).toBe('"Workstation ""POS"" display"');
      expect(sanitizeCsvCell(null)).toBe('""');
      expect(sanitizeCsvCell(undefined)).toBe('""');
    });

    it('6. JobLogSheetView scopes personal history strictly to logged-in technician UUID', async () => {
      // Add a ticket worked by someone else with a similar first name
      const myTicketRow: any = {
        id: 'ticket-uuid-101',
        ticket_code: 'T-100101',
        company_id: 'comp-1',
        department_id: 'dept-1',
        location_id: 'loc-1',
        task_code: 'PRN-TS',
        reported_issue: 'Workstation touchscreen unresponsive after boot',
        requestor_name: 'Maria Santos',
        status: 'PROG',
        mode: 'SITE',
        assigned_tech_id: 'tech-uuid-1',
        created_at: '2026-11-04T08:30:00Z',
      };
      const otherTechTicketRow: any = {
        id: 'ticket-uuid-202',
        ticket_code: 'T-100202',
        company_id: 'comp-1',
        department_id: 'dept-1',
        location_id: 'loc-1',
        task_code: 'PRN-TS',
        reported_issue: 'Workstation touchscreen unresponsive after boot',
        requestor_name: 'Maria Santos',
        status: 'PROG',
        mode: 'SITE',
        assigned_tech_id: 'tech-uuid-999',
        created_at: '2026-11-04T08:30:00Z',
      };

      vi.mocked(ticketsApi.getHistory).mockResolvedValueOnce([myTicketRow, otherTechTicketRow]);

      render(<JobLogSheetView />);

      // Juan Dela Cruz's ticket MUST be visible
      await waitFor(() => {
        expect(screen.getByText('T-100101')).toBeDefined();
      });

      // Other technician's ticket with similar first name MUST NOT leak into personal ledger
      expect(screen.queryByText('T-100202')).toBeNull();
    });

    it('7. JobLogSheetView renders each row actual worker and does not overwrite with admin name', async () => {
      // Switch user to Admin
      useAppStore.setState({
        currentUser: {
          id: 'admin-uuid-1',
          name: 'System Administrator',
          username: 'admin',
          email: 'admin@ph.omnitick.com',
          role: 'admin',
          title: 'IT Director',
          avatar: '',
        },
        itTeamMembers: [
          { id: 'tech-uuid-1', name: 'Juan Dela Cruz', email: 'juan@ph.omnitick.com', role: 'it' as any, status: 'active', is_active: true, avatar: '', department: 'IT', primaryLocation: 'Pasay', ticketsClosed: 0, activeTickets: 0, flameScore: 0 },
          { id: 'tech-uuid-2', name: 'Pedro Penduko', email: 'pedro@ph.omnitick.com', role: 'it' as any, status: 'active', is_active: true, avatar: '', department: 'IT', primaryLocation: 'Pasay', ticketsClosed: 0, activeTickets: 0, flameScore: 0 },
        ],
      });

      const ticketRow1: any = {
        id: 'ticket-uuid-101',
        ticket_code: 'T-100101',
        company_id: 'comp-1',
        department_id: 'dept-1',
        location_id: 'loc-1',
        task_code: 'PRN-TS',
        reported_issue: 'Workstation touchscreen unresponsive after boot',
        requestor_name: 'Maria Santos',
        status: 'PROG',
        mode: 'SITE',
        assigned_tech_id: 'tech-uuid-1',
        created_at: '2026-11-04T08:30:00Z',
      };
      const ticketRow2: any = {
        id: 'ticket-uuid-303',
        ticket_code: 'T-100303',
        company_id: 'comp-1',
        department_id: 'dept-1',
        location_id: 'loc-1',
        task_code: 'PRN-TS',
        reported_issue: 'Workstation touchscreen unresponsive after boot',
        requestor_name: 'Maria Santos',
        status: 'PROG',
        mode: 'SITE',
        assigned_tech_id: 'tech-uuid-2',
        created_at: '2026-11-04T08:30:00Z',
      };

      vi.mocked(ticketsApi.getHistory).mockResolvedValueOnce([ticketRow1, ticketRow2]);

      render(<JobLogSheetView />);

      await waitFor(() => {
        expect(screen.getByText('T-100101')).toBeDefined();
        expect(screen.getByText('Juan Dela Cruz')).toBeDefined();
        expect(screen.getByText('T-100303')).toBeDefined();
        expect(screen.getByText('Pedro Penduko')).toBeDefined();
      });

      // Admin's own name is NOT stamped as the worker for other technicians' tickets
      expect(screen.queryByText('System Administrator')).toBeNull();
    });
  });
});
