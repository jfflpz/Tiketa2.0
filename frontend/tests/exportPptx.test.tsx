import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { ExportPptxModal } from '../src/features/reports/components/ExportPptxModal';
import { executePptxExport } from '../src/features/reports/export/exportPptx';
import { validatePmsDateRange, formatPeriodDisplay } from '../src/features/reports/export/pmsDateValidation';
import { generateExplanation } from '../src/features/reports/export/explanationGenerator';
import { validateSlideElementBounds, SLIDE_GEOMETRY } from '../src/features/reports/export/pptxSlideBuilder';
import { captureChartImage } from '../src/features/reports/export/chartCapture';
import { reportsApi } from '../src/api/client';
import { useAppStore } from '../src/store/useAppStore';
import {
  mapMonthlySlaRows,
  mapHardwareVulnerabilityRows,
  mapPmsComplianceRows,
  mapChronicRequestorRows,
} from '../src/features/reports/utils/reportMappers';

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
      getReport: vi.fn(),
      downloadReportCSV: vi.fn(),
    },
  };
});

// Mock chartCapture to avoid DOM canvas in headless JSDOM
vi.mock('../src/features/reports/export/chartCapture', () => ({
  captureChartImage: vi.fn().mockResolvedValue('data:image/png;base64,mockPng'),
}));

// Mock pptxgenjs to avoid binary file writes in unit tests
vi.mock('pptxgenjs', () => {
  return {
    default: vi.fn().mockImplementation(() => {
      const slides: any[] = [];
      return {
        layout: 'LAYOUT_WIDE',
        title: '',
        defineLayout: vi.fn(),
        addSlide: vi.fn().mockImplementation(() => {
          const s = {
            background: {},
            addText: vi.fn(),
            addImage: vi.fn(),
          };
          slides.push(s);
          return s;
        }),
        write: vi.fn().mockResolvedValue(new ArrayBuffer(100)),
        writeFile: vi.fn().mockResolvedValue('Tiketa-Executive-Report.pptx'),
        slides,
      };
    }),
  };
});

describe('PPTX Export Suite — Tiketa Executive Standards', () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  describe('1. PMS Complete-Month Validation', () => {
    it('rejects partial calendar months when PMS is selected', () => {
      const res = validatePmsDateRange('2026-10-01', '2026-10-27');
      expect(res.isValid).toBe(false);
      expect(res.suggestedFrom).toBe('2026-10-01');
      expect(res.suggestedTo).toBe('2026-10-31');
    });

    it('accepts complete calendar months', () => {
      const res = validatePmsDateRange('2026-10-01', '2026-10-31');
      expect(res.isValid).toBe(true);
    });

    it('rejects ranges starting after the 1st of the month', () => {
      const res = validatePmsDateRange('2026-10-05', '2026-10-31');
      expect(res.isValid).toBe(false);
      expect(res.suggestedFrom).toBe('2026-10-01');
      expect(res.suggestedTo).toBe('2026-10-31');
    });
  });

  describe('2. Period Display Formatting', () => {
    it('formats partial month ranges cleanly', () => {
      expect(formatPeriodDisplay('2026-10-01', '2026-10-27')).toBe('Oct 1 – 27, 2026');
    });

    it('formats full single month ranges cleanly', () => {
      expect(formatPeriodDisplay('2026-10-01', '2026-10-31')).toBe('Oct 2026');
    });

    it('formats cross-month ranges cleanly', () => {
      expect(formatPeriodDisplay('2026-09-01', '2026-10-31')).toBe('Sep 1 – Oct 31, 2026');
    });
  });

  describe('3. Data Mappers & Null Preservation', () => {
    it('preserves null SLA rates and averages without manufacturing zero', () => {
      const mapped = mapMonthlySlaRows([
        {
          month: '2026-10',
          total_tickets: 10,
          completed: 0,
          active_tickets: 10,
          completion_rate_pct: 0,
          avg_labor_hours: null,
          same_day_resolution_pct: null,
          sla_compliance_pct: null,
        },
      ]);
      expect(mapped[0].avgResolutionHours).toBeNull();
      expect(mapped[0].sameDayResolutionRate).toBeNull();
      expect(mapped[0].slaComplianceRate).toBeNull();
    });

    it('labels repair labor hours accurately, not downtime', () => {
      const mapped = mapHardwareVulnerabilityRows([
        {
          location: 'Pasay',
          company: 'Five Star',
          task: 'PRN-TS',
          incidents: 5,
          labor_hours: 12.5,
          severity_score: 6.2,
          risk: 'Medium',
        },
      ]);
      expect(mapped[0].laborHours).toBe(12.5);
      expect((mapped[0] as any).totalDownTimeHours).toBeUndefined();
    });

    it('faithfully preserves canonical PMS statuses and expected services without fabricated fallbacks', () => {
      const mapped = mapPmsComplianceRows([
        {
          location_id: 'PSY',
          department_id: 'OPS',
          expected_services: 25,
          completed_services: 20,
          coverage_pct: 80,
          status: 'overdue',
          last_completed: null,
          serviced_by: null,
        },
        {
          location_id: 'CBA',
          department_id: 'CASH',
          expected_services: null,
          completed_services: 3,
          coverage_pct: null,
          status: 'unplanned',
        },
      ]);

      expect(mapped[0].status).toBe('overdue'); // NOT coerced to 'compliant' just because >=80%
      expect(mapped[0].expectedServices).toBe(25);
      expect(mapped[0].lastCompletedDate).toBeNull(); // NO fabricated '2026-10-22'
      expect(mapped[0].servicedBy).toBeNull(); // NO fabricated 'IT Specialist'

      expect(mapped[1].status).toBe('unplanned');
      expect(mapped[1].expectedServices).toBeNull();
    });

    it('maps chronic requestor repeat_incidents as total_tickets - 1', () => {
      const mapped = mapChronicRequestorRows([
        {
          requester: 'Juan Dela Cruz',
          department: 'Operations',
          location: 'Pasay',
          total_tickets: 6,
          repeat_incidents: 5,
          dominant_task: 'PRN-TS',
          remote_resolution_pct: null,
          training_suggestion: 'Printer handling',
        },
      ]);

      expect(mapped[0].repeatIncidents).toBe(5);
      expect(mapped[0].remoteResolutionRate).toBeNull(); // NO fabricated 50%
      expect(mapped[0].sopTrainingTarget).toBe('Printer handling');
    });
  });

  describe('4. Factual Explanation Generator', () => {
    it('produces factual explanation for Monthly SLA with bold highlights', () => {
      const explanation = generateExplanation(1, [
        {
          month: '2026-10',
          totalRequests: 50,
          completed: 45,
          pending: 5,
          completionRate: 90,
          remoteMode: 30,
          siteMode: 15,
          avgResolutionHours: 2.4,
          sameDayResolutionRate: 65,
          slaComplianceRate: 92.5,
        },
      ], { dateFrom: '2026-10-01', dateTo: '2026-10-31' });

      expect(explanation.text).toContain('**50 requests**');
      expect(explanation.text).toContain('**45 completed**');
      expect(explanation.text).toContain('**48-hour SLA resolution compliance stands at 92.5%**');
      expect(explanation.text).not.toContain('software renewal');
    });

    it('discloses summarization when categories exceed 10', () => {
      const dummyStaff = Array.from({ length: 15 }, (_, i) => ({
        technician: `Technician ${i + 1}`,
        totalAssigned: 10,
        completed: 8,
        pending: 2,
        totalHoursLogged: 20,
        avgTimePerTask: 2.5,
        primaryLocation: 'Pasay',
        mostFrequentTask: 'PRN-TS',
      }));

      const explanation = generateExplanation(2, dummyStaff, { dateFrom: '2026-10-01', dateTo: '2026-10-31' });
      expect(explanation.isSummarized).toBe(true);
      expect(explanation.text).toContain('Showing top 10 of 15 technicians');
    });
  });

  describe('5. Orchestrator Execution, Modes, and Slide Counts', () => {
    it('executes 1-slide export for "Current report"', async () => {
      vi.mocked(reportsApi.getReport).mockResolvedValueOnce({
        date_from: '2026-10-01',
        date_to: '2026-10-27',
        rows: [{ month: '2026-10', total_tickets: 10, completed: 8, active_tickets: 2 }],
      });

      const res = await executePptxExport({
        selectedReportIds: [1],
        dateRange: { dateFrom: '2026-10-01', dateTo: '2026-10-27' },
      });

      expect(res.slideCount).toBe(1);
      expect(reportsApi.getReport).toHaveBeenCalledTimes(1);
      expect(reportsApi.getReport).toHaveBeenCalledWith(
        'monthly-sla',
        expect.objectContaining({ date_from: '2026-10-01', date_to: '2026-10-27' }),
        undefined
      );
    });

    it('executes 8-slide export for "All reports" with complete calendar months', async () => {
      vi.mocked(reportsApi.getReport).mockResolvedValue({
        date_from: '2026-10-01',
        date_to: '2026-10-31',
        rows: [],
      });

      const allIds = [1, 2, 3, 4, 5, 6, 7, 8];
      const res = await executePptxExport({
        selectedReportIds: allIds,
        dateRange: { dateFrom: '2026-10-01', dateTo: '2026-10-31' },
      });

      expect(res.slideCount).toBe(8);
      expect(reportsApi.getReport).toHaveBeenCalledTimes(8);
    });

    it('throws when PMS is included with a partial month', async () => {
      await expect(
        executePptxExport({
          selectedReportIds: [7],
          dateRange: { dateFrom: '2026-10-01', dateTo: '2026-10-27' },
        })
      ).rejects.toThrow(/PMS compliance reports require complete calendar months/);
    });

    it('honors AbortSignal and aborts immediately', async () => {
      const controller = new AbortController();
      controller.abort();

      await expect(
        executePptxExport({
          selectedReportIds: [1],
          dateRange: { dateFrom: '2026-10-01', dateTo: '2026-10-27' },
          signal: controller.signal,
        })
      ).rejects.toThrow(/Export cancelled/);
    });
  });

  describe('6. ExportPptxModal UI Workflow', () => {
    it('defaults to "Current report" with exactly 1 slide', () => {
      render(
        <ExportPptxModal
          isOpen={true}
          onClose={vi.fn()}
          initialReportId={2}
          initialDateRange={{ dateFrom: '2026-10-01', dateTo: '2026-10-27' }}
        />
      );

      expect(screen.getByText('1 Slide')).toBeDefined();
      const exportBtn = screen.getByRole('button', { name: /Generate 1-Slide PPTX/i });
      expect(exportBtn).toBeDefined();
    });

    it('shows complete-month warning and actionable fix when PMS is selected with partial month', () => {
      render(
        <ExportPptxModal
          isOpen={true}
          onClose={vi.fn()}
          initialReportId={7} // PMS
          initialDateRange={{ dateFrom: '2026-10-01', dateTo: '2026-10-27' }}
        />
      );

      // Warning alert visible
      expect(screen.getByText(/Complete Month Required for PMS/i)).toBeDefined();
      const fixBtn = screen.getByRole('button', { name: /Use complete months/i });
      expect(fixBtn).toBeDefined();

      // Export button is disabled
      const exportBtn = screen.getByRole('button', { name: /Generate 1-Slide PPTX/i }) as HTMLButtonElement;
      expect(exportBtn.disabled).toBe(true);

      // Click "Use complete months"
      fireEvent.click(fixBtn);

      // Warning disappears, date updated to Oct 2026
      expect(screen.queryByText(/Complete Month Required for PMS/i)).toBeNull();
      expect(exportBtn.disabled).toBe(false);
    });
  });

  describe('7. Cancellation, Session Invalidation & Error Handling', () => {
    it('aborts export and prevents download if session is invalidated before packaging completes', async () => {
      vi.mocked(reportsApi.getReport).mockResolvedValueOnce({
        date_from: '2026-10-01',
        date_to: '2026-10-27',
        rows: [{ month: '2026-10', total_requests: 10, completed: 8 }],
      });

      // Session check fails (e.g. user logged out)
      await expect(
        executePptxExport({
          selectedReportIds: [1],
          dateRange: { dateFrom: '2026-10-01', dateTo: '2026-10-27' },
          checkSession: () => false,
        })
      ).rejects.toThrow(/user session expired or logged out/);
    });

    it('propagates chart capture failure and prevents slide download', async () => {
      vi.mocked(reportsApi.getReport).mockResolvedValueOnce({
        date_from: '2026-10-01',
        date_to: '2026-10-27',
        rows: [{ month: '2026-10', total_requests: 10, completed: 8 }],
      });

      vi.mocked(captureChartImage).mockRejectedValueOnce(new Error('Canvas rasterization error'));

      await expect(
        executePptxExport({
          selectedReportIds: [1],
          dateRange: { dateFrom: '2026-10-01', dateTo: '2026-10-27' },
        })
      ).rejects.toThrow(/Canvas rasterization error/);
    });

    it('isolates operations so an aborted export does not clobber a subsequent export', async () => {
      useAppStore.setState({
        currentUser: {
          id: 'admin-1',
          name: 'Admin User',
          email: 'admin@fivestarbus.com',
          role: 'admin',
          title: 'IT Admin',
          avatar: 'AD',
        },
      });

      vi.mocked(reportsApi.getReport).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ date_from: '2026-10-01', date_to: '2026-10-27', rows: [] }), 50))
      );

      render(
        <ExportPptxModal
          isOpen={true}
          onClose={vi.fn()}
          initialReportId={1}
          initialDateRange={{ dateFrom: '2026-10-01', dateTo: '2026-10-27' }}
        />
      );

      const exportBtn = screen.getByRole('button', { name: /Generate 1-Slide PPTX/i });
      fireEvent.click(exportBtn);

      // Cancel immediately
      const cancelBtn = screen.getByRole('button', { name: /Cancel Export/i });
      fireEvent.click(cancelBtn);

      // Start new export immediately
      fireEvent.click(screen.getByRole('button', { name: /Generate 1-Slide PPTX/i }));

      // Wait a moment: second export controller should remain active and not be cleared by the first
      await waitFor(() => {
        expect(useAppStore.getState().activeExportController).not.toBeNull();
      });
    });
  });

  describe('8. Slide Geometry & Content Bounds (13.333" x 7.5")', () => {
    it('verifies that title, chart container, and explanation fit within 13.333" x 7.5" slide space', () => {
      const bounds = validateSlideElementBounds();
      expect(bounds.fits).toBe(true);
      expect(bounds.maxRight).toBeLessThanOrEqual(SLIDE_GEOMETRY.slideWidth);
      expect(bounds.maxBottom).toBeLessThanOrEqual(SLIDE_GEOMETRY.slideHeight);

      // Symmetrical margins check
      const leftMargin = SLIDE_GEOMETRY.chartX;
      const rightMargin = SLIDE_GEOMETRY.slideWidth - (SLIDE_GEOMETRY.chartX + SLIDE_GEOMETRY.chartW);
      expect(Math.abs(leftMargin - rightMargin)).toBeLessThan(0.05); // Within 0.05" symmetry
    });
  });

  describe('9. PMS Planned, Unplanned, Null Denominators, and Excess Calculations', () => {
    it('caps planned coverage at 100% and reports excess separately', () => {
      const pmsData = [
        {
          terminalLocation: 'Pasay',
          department: 'Ticketing',
          pmsTask: 'PRN-PMS',
          expectedServices: 10,
          pmsConducted: 14, // 4 excess
          coveragePct: 100,
          status: 'compliant' as const,
        },
      ];

      const expl = generateExplanation(7, pmsData, { dateFrom: '2026-10-01', dateTo: '2026-10-31' });
      expect(expl.text).toContain('Service-plan coverage is **100.0%**');
      expect(expl.text).toContain('Excess planned services conducted: **4**');
    });

    it('does not count unplanned completions toward planned coverage', () => {
      const pmsData = [
        {
          terminalLocation: 'Cubao',
          department: 'Cashier',
          pmsTask: 'PC-PMS',
          expectedServices: 20,
          pmsConducted: 15,
          coveragePct: 75,
          status: 'due' as const,
        },
        {
          terminalLocation: 'Dagupan',
          department: 'Dispatch',
          pmsTask: 'PC-PMS',
          expectedServices: null,
          pmsConducted: 8,
          coveragePct: null,
          status: 'unplanned' as const,
        },
      ];

      const expl = generateExplanation(7, pmsData, { dateFrom: '2026-10-01', dateTo: '2026-10-31' });
      expect(expl.text).toContain('Service-plan coverage is **75.0%**');
      expect(expl.text).toContain('Additional unplanned services: **8**');
    });

    it('reports unavailable denominators cleanly when filtering by company', () => {
      const companyFilteredData = [
        {
          terminalLocation: 'Pasay',
          department: 'Ticketing',
          pmsTask: 'PRN-PMS',
          expectedServices: null,
          pmsConducted: 12,
          coveragePct: null,
          status: 'company-filtered' as const,
        },
      ];

      const expl = generateExplanation(7, companyFilteredData, { dateFrom: '2026-10-01', dateTo: '2026-10-31' });
      expect(expl.text).toContain('Planned service denominators are unavailable when filtering by company');
      expect(expl.text).toContain('Completed activity records **12 total services conducted**');
    });
  });

  describe('10. Multi-Month SLA and Transit-Lag Heuristic Explanations', () => {
    it('labels multi-month SLA periods accurately without attributing single month to entire range', () => {
      const multiMonthData = [
        {
          month: '2026-08',
          totalRequests: 40,
          completed: 35,
          pending: 5,
          completionRate: 87.5,
          remoteMode: 20,
          siteMode: 15,
          avgResolutionHours: 3.2,
          sameDayResolutionRate: 50,
          slaComplianceRate: 88.0,
        },
        {
          month: '2026-09',
          totalRequests: 50,
          completed: 46,
          pending: 4,
          completionRate: 92.0,
          remoteMode: 25,
          siteMode: 21,
          avgResolutionHours: 2.8,
          sameDayResolutionRate: 60,
          slaComplianceRate: 94.0,
        },
      ];

      const expl = generateExplanation(1, multiMonthData, { dateFrom: '2026-08-01', dateTo: '2026-09-30' });
      expect(expl.text).toContain('Across **2 months** (2026-08 to 2026-09)');
      expect(expl.text).toContain('For the latest month (**2026-09**), **48-hour SLA resolution compliance is 94.0%**');
    });

    it('produces mode-specific heuristic recommendations and retains negative lag review flags', () => {
      const transitData = [
        {
          location: 'Pasay Terminal',
          supportMode: 'SITE',
          completedTickets: 10,
          meanLaborMinutes: 120,
          meanTurnaroundDays: 4.5,
          meanTransitLagDays: 4.2,
          lagToLaborRatio: 50.4, // >= 24, SITE -> review travel scheduling
          dataReviewRequired: false,
        },
        {
          location: 'Cubao Hub',
          supportMode: 'REM',
          completedTickets: 8,
          meanLaborMinutes: 90,
          meanTurnaroundDays: 3.0,
          meanTransitLagDays: 2.8,
          lagToLaborRatio: 44.8, // >= 24, REM -> review queue wait
          dataReviewRequired: false,
        },
        {
          location: 'Dagupan Depot',
          supportMode: 'REM',
          completedTickets: 5,
          meanLaborMinutes: 600,
          meanTurnaroundDays: 1.0,
          meanTransitLagDays: -0.25,
          lagToLaborRatio: -6.0,
          dataReviewRequired: true, // Negative lag flagged
        },
      ];

      const expl = generateExplanation(5, transitData, { dateFrom: '2026-10-01', dateTo: '2026-10-27' });
      expect(expl.text).toContain('operational advice, not an SLA target');
      expect(expl.text).toContain('review travel scheduling for **1 on-site routes** (ratio >= 24)');
      expect(expl.text).toContain('review queue wait for **1 remote routes** (ratio >= 24)');
      expect(expl.text).toContain('Note: **1 record(s) flagged for data review** due to negative lag calculation');
    });
  });
});
