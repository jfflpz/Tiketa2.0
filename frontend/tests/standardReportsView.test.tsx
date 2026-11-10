// @vitest-environment jsdom
// @spec SR-02: Consolidated Standard Reports (Combining Executive Analytics 4 Top Cards & 8 Standard Reports)
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { StandardizedReportsView } from '../src/features/reports/StandardizedReportsView';
import { Sidebar } from '../src/components/layout/Sidebar';
import { useAppStore } from '../src/store/useAppStore';
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
    reportsApi: {
      ...actual.reportsApi,
      getKPIs: vi.fn().mockResolvedValue({
        total_tickets: 100,
        completed: 80,
        active_tickets: 20,
        avg_labor_minutes: 45,
        overdue_backlog: 3,
        sla_compliance_pct: 94.5,
        same_day_resolution_pct: 88.0,
      }),
      getReport: vi.fn().mockResolvedValue({
        date_from: '2026-11-01',
        date_to: '2026-11-30',
        rows: [],
      }),
      downloadReportCSV: vi.fn().mockResolvedValue(new Blob([])),
    },
  };
});

const adminUser: AuthenticatedUser = {
  id: 'admin-1',
  name: 'Admin User',
  email: 'admin@tiketa.ph',
  role: 'admin',
  title: 'IT Administrator',
  avatar: 'AU',
};

const supervisorUser: AuthenticatedUser = {
  id: 'sup-1',
  name: 'Supervisor User',
  email: 'sup@tiketa.ph',
  role: 'supervisor',
  title: 'IT Operations Supervisor',
  avatar: 'SU',
};

describe('Consolidated Standard Reports Suite (SR-02)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAppStore.getState().resetReportsState();
    useAppStore.setState({
      currentUser: adminUser,
      activeView: 'reports',
      activeReportId: 1,
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('1. StandardizedReportsView renders "Standard Reports" title and 4 KPI cards at top', async () => {
    render(<StandardizedReportsView />);

    // Header title
    expect(screen.getByRole('heading', { level: 1, name: /Standard Reports/i })).toBeTruthy();

    // 4 Executive Summary KPI Cards are present
    expect(screen.getByRole('button', { name: /View Monthly SLA & Resolution Summary/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /View Staff Labor & Bench Utilization/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /View Critical Aging Backlog/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /View Fleet PMS Compliance/i })).toBeTruthy();
  });

  it('2. Clicking on an Executive Summary KPI Card switches the active report tab', async () => {
    render(<StandardizedReportsView />);

    // Click card 4 (Aging Backlog)
    const card4 = screen.getByRole('button', { name: /View Critical Aging Backlog/i });
    fireEvent.click(card4);

    await waitFor(() => {
      expect(useAppStore.getState().activeReportId).toBe(4);
    });

    // Click card 7 (PMS Compliance)
    const card7 = screen.getByRole('button', { name: /View Fleet PMS Compliance/i });
    fireEvent.click(card7);

    await waitFor(() => {
      expect(useAppStore.getState().activeReportId).toBe(7);
    });
  });

  it('3. Sidebar renders single consolidated "Standard Reports" button for supervisor and admin', () => {
    // 3a. Admin sidebar
    useAppStore.setState({ currentUser: adminUser });
    const { rerender } = render(<Sidebar />);

    const adminBtn = screen.getByRole('button', { name: /Standard Reports/i });
    expect(adminBtn).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Executive Analytics/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /8 Standard Reports/i })).toBeNull();

    // 3b. Supervisor sidebar
    useAppStore.setState({ currentUser: supervisorUser });
    rerender(<Sidebar />);

    const supBtn = screen.getByRole('button', { name: /Standard Reports/i });
    expect(supBtn).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Executive Analytics/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /8 Standard Reports/i })).toBeNull();
  });
});
