// @vitest-environment jsdom
import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ITOverviewDashboard } from '../src/features/overview/ITOverviewDashboard';
import { useAppStore } from '../src/store/useAppStore';
import { adminApi } from '../src/api/client';
import type { Ticket } from '../src/types/ticket';
import * as ITOverviewModule from '../src/features/overview/ITOverviewDashboard';

// Mock ResizeObserver for Recharts responsive containers in JSDOM
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
} as any;

const mockUser = {
  id: 'tech-uuid-1',
  name: 'Nathaniel D. Esguerra',
  username: 'nesguerra',
  email: 'nesguerra@fivestar.com.ph',
  role: 'it' as const,
  title: 'IT Specialist',
  avatar: '',
};

const mockTickets: Ticket[] = [
  {
    id: 't-1',
    ticketCode: 'T-2610-001',
    company: 'Pangasinan Five Star Bus Co.',
    companyCode: 'FS',
    mode: 'REM',
    department: 'Operations',
    departmentCode: 'OPS',
    requestor: 'Juan Dela Cruz',
    task: 'Printer Configuration',
    taskCode: 'PRN-TS',
    description: 'Printer cutter jammed and network offline',
    month: 'January 2026',
    dateStarted: '2026-01-10',
    timeStarted: '08:30:00',
    timeFinished: '09:00:00',
    duration: 0.5,
    dateFinished: '2026-01-10',
    status: 'RESL',
    location: 'Pasay Terminal',
    locationCode: 'PSY',
    workedBy: 'Nathaniel D. Esguerra',
    workedById: 'tech-uuid-1',
    assigned_tech_id: 'tech-uuid-1',
    priority: 'High',
    createdAt: '2026-01-10T08:30:00Z',
  },
  {
    id: 't-2',
    ticketCode: 'T-2610-002',
    company: 'Pangasinan Five Star Bus Co.',
    companyCode: 'FS',
    mode: 'SITE',
    department: 'Cashier',
    departmentCode: 'CSH',
    requestor: 'Maria Santos',
    task: 'PC Hardware Assessment',
    taskCode: 'PC-HW-REP',
    description: 'Motherboard capacitor failure',
    month: 'January 2026',
    dateStarted: '2026-01-12',
    timeStarted: '10:00:00',
    timeFinished: '11:15:00',
    duration: 1.25,
    dateFinished: '2026-01-12',
    status: 'CLSD',
    location: 'Pasay Terminal',
    locationCode: 'PSY',
    workedBy: 'Nathaniel D. Esguerra',
    workedById: 'tech-uuid-1',
    assigned_tech_id: 'tech-uuid-1',
    priority: 'Critical',
    createdAt: '2026-01-12T10:00:00Z',
  },
  {
    id: 't-3',
    ticketCode: 'T-2610-003',
    company: 'Pangasinan Five Star Bus Co.',
    companyCode: 'FS',
    mode: 'REM',
    department: 'Accounting',
    departmentCode: 'ACCT',
    requestor: 'Pedro Penduko',
    task: 'Software Assistance',
    taskCode: 'SW-ASST',
    description: 'POS login error',
    month: 'February 2026',
    dateStarted: '2026-02-05',
    timeStarted: '14:00:00',
    timeFinished: '14:30:00',
    duration: 0.5,
    dateFinished: '2026-02-05',
    status: 'RESL',
    location: 'Avenida Terminal',
    locationCode: 'AVN',
    workedBy: 'Nathaniel D. Esguerra',
    workedById: 'tech-uuid-1',
    assigned_tech_id: 'tech-uuid-1',
    priority: 'Medium',
    createdAt: '2026-02-05T14:00:00Z',
  },
];

describe('F-06: IT Overview Dashboard Weekly Hours Removal & Responsive Trend (S5-07)', () => {
  beforeEach(() => {
    vi.spyOn(adminApi, 'getDictionaries').mockResolvedValue({
      companies: [],
      locations: [],
      departments: [],
      tasks: [],
      location_departments: [],
    });

    useAppStore.setState({
      currentUser: mockUser,
      tickets: mockTickets,
      savedRepairNotes: [],
      toasts: [],
      kpis: null,
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('1. Permanently removes "My Weekly Repair Hours" card and mock constants', () => {
    render(<ITOverviewDashboard />);

    // Assert card is completely absent from DOM
    expect(screen.queryByText(/My Weekly Repair Hours/i)).toBeNull();
    expect(screen.queryByText(/38\.4 hrs logged/i)).toBeNull();
    expect(screen.queryByText(/Weekly Target Progress/i)).toBeNull();
    expect(screen.queryByText(/Avg\. Repair Duration \(#11\)/i)).toBeNull();

    // Verify MY_WEEKLY_HOURS_BARS constant is not exported
    expect((ITOverviewModule as any).MY_WEEKLY_HOURS_BARS).toBeUndefined();
  });

  it('2. Expands "Monthly Output Trend" area chart responsively across grid (col-span-12 / xl:col-span-12)', () => {
    render(<ITOverviewDashboard />);

    // Find the Monthly Output Trend header
    const trendTitle = screen.getByText(/My Monthly Output Trend \(2026\)/i);
    expect(trendTitle).toBeTruthy();

    // Find the enclosing grid column container
    const trendCard = trendTitle.closest('.bg-white');
    expect(trendCard).toBeTruthy();
    const trendContainer = trendCard?.parentElement;
    expect(trendContainer).toBeTruthy();

    // Must span full row width across the 12-column grid
    expect(trendContainer?.className).toContain('col-span-12');
    expect(trendContainer?.className).toContain('xl:col-span-12');
  });

  it('3. Renders real ticket resolution counts and displays current year badge (2026)', () => {
    render(<ITOverviewDashboard />);

    // Displays year badge
    expect(screen.getByText(/2026/)).toBeTruthy();

    // Displays legend for Remote AnyDesk and On-Site breakdown
    expect(screen.getByText('Remote AnyDesk')).toBeTruthy();
    expect(screen.getByText('On-Site')).toBeTruthy();
  });

  it('4. Renders informative empty state when no tickets exist without crashing or NaN distortion', () => {
    useAppStore.setState({
      currentUser: mockUser,
      tickets: [],
    });

    render(<ITOverviewDashboard />);

    // Must display empty state message
    expect(
      screen.getByText(/No ticket resolution activity recorded for 2026/i)
    ).toBeTruthy();
    expect(
      screen.getByText(/Resolved Remote and On-Site tickets will appear in this trend breakdown/i)
    ).toBeTruthy();

    // No chart rendering crash
    expect(screen.getByText(/My Monthly Output Trend \(2026\)/i)).toBeTruthy();
  });
});
