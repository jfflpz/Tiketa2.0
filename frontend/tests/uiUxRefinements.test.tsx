import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TerminalHubDetailModal } from '../src/features/terminals/TerminalHubDetailModal';
import { HeaderNotificationsPopover } from '../src/components/layout/header/HeaderNotificationsPopover';
import { ITOverviewDashboard } from '../src/features/overview/ITOverviewDashboard';
import { useAppStore } from '../src/store/useAppStore';
import type { HubSummaryOut } from '../src/api/client';
import type { Ticket } from '../src/types/ticket';

beforeAll(() => {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

const MOCK_HUB: HubSummaryOut = {
  id: 'hub-avn',
  code: 'AVN',
  name: 'Avenida',
  open_count: 1,
  in_progress_count: 1,
  resolved_count: 0,
  closed_this_month_count: 1,
  total_active_count: 2,
  top_issue_task_code: 'TASK-PRN',
  top_issue_task_name: 'Printer Troubleshoot',
  top_issue_count: 2,
  top_issue_window: '30d',
  departments: [
    {
      id: 'dept-ops',
      code: 'OPS',
      name: 'Operations',
      active_tickets_count: 2,
    } as any,
    {
      id: 'dept-cash',
      code: 'CASH',
      name: 'Cash Management',
      active_tickets_count: 0,
    } as any,
  ],
};

const MOCK_TICKETS: Ticket[] = [
  {
    id: 'ticket-1',
    ticketCode: 'T-2610-0109',
    company: 'Five Star',
    companyCode: 'FS',
    location: 'Pasay',
    locationCode: 'PSY',
    department: 'Cash Management',
    departmentCode: 'CASH',
    task: 'PC/Laptop Hardware Replacement',
    taskCode: 'PC-HW-REP',
    description: 'PC wont turn on',
    month: 'October 2026',
    status: 'RESL',
    priority: 'High',
    mode: 'SITE',
    requestor: 'Maria Santos',
    employeeId: 'EMP-001',
    timeStarted: '09:00',
    dateStarted: '2026-10-29',
    dateFinished: '2026-10-29',
    workedBy: 'Nathaniel D. Esguerra',
    duration: 1.5,
    createdAt: '2026-10-29T09:00:00Z',
    messages: [],
  },
  {
    id: 'ticket-2',
    ticketCode: 'T-2610-0163',
    company: 'Five Star',
    companyCode: 'FS',
    location: 'Pasay',
    locationCode: 'PSY',
    department: 'Cash Management',
    departmentCode: 'CASH',
    task: 'Network Configuration',
    taskCode: 'NET-CFG',
    description: 'Slow wifi connection',
    month: 'October 2026',
    status: 'PROG',
    priority: 'High',
    mode: 'REM',
    requestor: 'Maria Santos',
    employeeId: 'EMP-001',
    timeStarted: '10:00',
    dateStarted: '2026-10-29',
    workedBy: 'Nathaniel D. Esguerra',
    createdAt: '2026-10-29T10:00:00Z',
    messages: [],
  },
];

describe('UI/UX Refinements Suite', () => {
  it('1. TerminalHubDetailModal enforces bounded viewport with min-h-0 and overflow containment', () => {
    const handleClose = vi.fn();
    const { container } = render(
      <TerminalHubDetailModal hub={MOCK_HUB} onClose={handleClose} />
    );

    // Backdrop has overflow-y-auto to allow scrolling on small/short screens
    const backdrop = container.firstChild as HTMLElement;
    expect(backdrop.className).toContain('overflow-y-auto');

    // Inner dialog container enforces max-h-[88vh] and my-auto
    const dialog = container.querySelector('[role="dialog"] > div') as HTMLElement;
    expect(dialog.className).toContain('max-h-[88vh]');
    expect(dialog.className).toContain('flex-col');

    // Scrollable body has min-h-0 and overflow-y-auto
    const scrollBody = container.querySelector('.overflow-y-auto.flex-1') as HTMLElement;
    expect(scrollBody).toBeTruthy();
    expect(scrollBody.className).toContain('min-h-0');

    // Close button and tabs remain reachable
    expect(screen.getByRole('button', { name: /close station modal/i })).toBeTruthy();
    expect(screen.getAllByText(/Operating Departments/i).length).toBeGreaterThan(0);
  });

  it('2. HeaderNotificationsPopover applies shrink-0 whitespace-nowrap to prevent ticket code wrapping', () => {
    const handleSelect = vi.fn();
    const handleCopy = vi.fn().mockResolvedValue(undefined);
    const handleViewAll = vi.fn();

    render(
      <HeaderNotificationsPopover
        tickets={MOCK_TICKETS}
        onSelectTicket={handleSelect}
        onCopyShareLink={handleCopy}
        onViewAllInQueue={handleViewAll}
      />
    );

    // Click bell to open
    const bellBtn = screen.getByTitle(/notifications/i);
    fireEvent.click(bellBtn);

    // Check ticket code badge in notifications popover
    const codeBadge = screen.getByText('T-2610-0109');
    expect(codeBadge.className).toContain('shrink-0');
    expect(codeBadge.className).toContain('whitespace-nowrap');
  });

  it('3. ITOverviewDashboard separates ticket code into its own badge and displays task without premature cutoff', () => {
    useAppStore.setState({
      tickets: MOCK_TICKETS,
      currentUser: {
        id: 'u-1',
        name: 'Nathaniel D. Esguerra',
        username: 'nesguerra',
        email: 'nesguerra@example.com',
        role: 'it',
        title: 'IT Specialist',
        avatar: '',
      },
    });

    render(<ITOverviewDashboard />);

    // In "My Claimed Tickets", ticket code badge has whitespace-nowrap & shrink-0
    const codeBadges = screen.getAllByText('T-2610-0163');
    expect(codeBadges.length).toBeGreaterThan(0);
    const badge = codeBadges[0];
    expect(badge.className).toContain('whitespace-nowrap');
    expect(badge.className).toContain('shrink-0');

    // Full task title is rendered
    expect(screen.getAllByText('Network Configuration').length).toBeGreaterThan(0);
  });
});
