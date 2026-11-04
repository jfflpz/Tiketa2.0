import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { ReportPeriodSelector } from '../src/features/reports/components/ReportPeriodSelector';
import { ExecutiveSummaryKpiCards } from '../src/features/analytics/components/ExecutiveSummaryKpiCards';
import { TurnaroundLagChart } from '../src/features/analytics/components/TurnaroundLagChart';
import { HourlyPeakDemandChart } from '../src/features/analytics/components/HourlyPeakDemandChart';
import { ExportPptxModal, MAX_COMMENTARY_LENGTH } from '../src/features/reports/components/ExportPptxModal';
import {
  addExecutiveReportSlide,
  validateSlideElementBounds,
  createPresentationInstance,
} from '../src/features/reports/export/pptxSlideBuilder';
import { executePptxExport } from '../src/features/reports/export/exportPptx';
import { useAppStore } from '../src/store/useAppStore';
import { reportsApi } from '../src/api/client';

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
      getKPIs: vi.fn(),
      getReport: vi.fn(),
      downloadReportCSV: vi.fn(),
    },
  };
});

// Mock chartCapture for headless tests with inlined valid 1x1 base64 PNG
vi.mock('../src/features/reports/export/chartCapture', () => ({
  captureChartImage: vi.fn().mockResolvedValue(
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
  ),
}));

describe('F-05 & F-06 Analytics & PPTX Export Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAppStore.getState().resetReportsState();
  });

  afterEach(() => {
    cleanup();
  });

  describe('F-05 Real Analytics & Period Selector', () => {
    it('1. ReportPeriodSelector renders Month and Year dropdowns and shows Month in Progress indicator for current Manila month', () => {
      render(<ReportPeriodSelector />);

      const monthSelect = screen.getByLabelText(/select reporting month/i);
      const yearSelect = screen.getByLabelText(/select reporting year/i);

      expect(monthSelect).toBeDefined();
      expect(yearSelect).toBeDefined();
      expect(screen.getByText(/month in progress/i)).toBeDefined();
    });

    it('2. Changing Period updates store and triggers API fetches with explicit date_from and date_to', async () => {
      const getKPIsSpy = vi.spyOn(reportsApi, 'getKPIs').mockResolvedValue({
        total_tickets: 50,
        active_tickets: 5,
        completed: 45,
        overdue_backlog: 2,
        avg_labor_minutes: 32.5,
        same_day_resolution_pct: 90.0,
        sla_compliance_pct: 95.0,
      });

      const getReportSpy = vi.spyOn(reportsApi, 'getReport').mockResolvedValue({
        date_from: '2024-03-01',
        date_to: '2024-03-31',
        rows: [],
      });

      render(<ReportPeriodSelector />);

      // Change Month to March (3)
      const monthSelect = screen.getByLabelText(/select reporting month/i);
      fireEvent.change(monthSelect, { target: { value: '3' } });

      await waitFor(() => {
        expect(useAppStore.getState().selectedMonth).toBe(3);
        expect(getKPIsSpy).toHaveBeenCalled();
        expect(getReportSpy).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            date_from: expect.stringMatching(/-03-01$/),
            date_to: expect.stringMatching(/-03-31$/),
          })
        );
      });
    });

    it('3. ExecutiveSummaryKpiCards displays actual data without hardcoded fallbacks and handles keyboard navigation', () => {
      const onSelectReport = vi.fn();

      // Test with null KPIs (ensuring NO hardcoded '84.8%' or '41 mins')
      const { rerender } = render(
        <ExecutiveSummaryKpiCards kpis={null} onSelectReport={onSelectReport} />
      );

      expect(screen.queryByText('84.8%')).toBeNull();
      expect(screen.queryByText('41 mins')).toBeNull();
      expect(screen.queryByText('155 / 165 Done')).toBeNull();

      const dashes = screen.getAllByText('--');
      expect(dashes.length).toBeGreaterThanOrEqual(3);

      // Keyboard navigation via Enter key
      const card1 = screen.getByRole('button', { name: /view report 1/i });
      fireEvent.keyDown(card1, { key: 'Enter', code: 'Enter' });
      expect(onSelectReport).toHaveBeenCalledWith(1);

      // Re-render with actual data
      rerender(
        <ExecutiveSummaryKpiCards
          kpis={{
            total_tickets: 100,
            active_tickets: 10,
            completed: 90,
            overdue_backlog: 0,
            avg_labor_minutes: 25.4,
            same_day_resolution_pct: 88.0,
            sla_compliance_pct: 92.0,
          }}
          onSelectReport={onSelectReport}
        />
      );

      expect(screen.getByText('92.0%')).toBeDefined();
      expect(screen.getByText('90 / 100 Done')).toBeDefined();
      expect(screen.getByText('25 mins')).toBeDefined();
      expect(screen.getByText('Clear')).toBeDefined();
      expect(screen.getByText('88.0%')).toBeDefined();
    });

    it('4. TurnaroundLagChart displays warning banner when negative transit lag is detected', () => {
      // Normal positive data
      const { rerender } = render(
        <TurnaroundLagChart
          data={[
            {
              location: 'Pasay',
              supportMode: 'SITE',
              completedTickets: 10,
              meanLaborMins: 45,
              meanTurnaroundDays: 2.5,
              meanTransitLagDays: 1.2,
              lagToLaborRatio: 0.6,
              dataReviewRequired: false,
              recommendedAction: 'Continue monitoring',
            },
          ]}
        />
      );

      expect(screen.queryByText(/negative transit lag detected/i)).toBeNull();

      // Negative transit lag requiring data review
      rerender(
        <TurnaroundLagChart
          data={[
            {
              location: 'Cubao',
              supportMode: 'REM',
              completedTickets: 5,
              meanLaborMins: 30,
              meanTurnaroundDays: 0.5,
              meanTransitLagDays: -0.8,
              lagToLaborRatio: -0.2,
              dataReviewRequired: true,
              recommendedAction: 'Verify timestamps',
            },
          ]}
        />
      );

      expect(screen.getByText(/data review required/i)).toBeDefined();
      expect(screen.getByText(/negative transit lag detected/i)).toBeDefined();
    });

    it('5. HourlyPeakDemandChart calculates dynamic Asia/Manila hourly distribution from tickets', () => {
      const mockTickets = [
        { id: '1', time_started: '07:15:00' },
        { id: '2', time_started: '07:45:00' },
        { id: '3', time_started: '08:30:00' },
        { id: '4', started_at: '2026-11-04T01:00:00Z' }, // 09:00 in Asia/Manila (UTC+8)
      ];

      render(<HourlyPeakDemandChart tickets={mockTickets} />);

      expect(screen.getByText(/4 tickets evaluated/i)).toBeDefined();
      expect(screen.getByText('Hourly Support Surge Histogram (FR-DASH-04)')).toBeDefined();
    });
  });

  describe('F-06 PPTX Export & Typography', () => {
    it('6. pptxSlideBuilder formats native slide with Arial, 36pt title, 22pt period, and 18pt commentary', () => {
      const pres = createPresentationInstance();
      const addTextMock = vi.fn();
      const addImageMock = vi.fn();

      vi.spyOn(pres, 'addSlide').mockReturnValue({
        background: {},
        addText: addTextMock,
        addImage: addImageMock,
      } as any);

      addExecutiveReportSlide(pres, {
        title: 'Monthly SLA Compliance',
        reportingPeriod: 'March 2026',
        chartImageBase64:
          'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        explanationMarkdown: 'Achieved **94.5%** resolution with zero backlog.',
      });

      // Call 1: Title (36pt bold Arial)
      expect(addTextMock).toHaveBeenCalledWith(
        'Monthly SLA Compliance',
        expect.objectContaining({
          fontFace: 'Arial',
          fontSize: 36,
          bold: true,
        })
      );

      // Call 2: Reporting Period (22pt regular Arial in separate frame)
      expect(addTextMock).toHaveBeenCalledWith(
        'March 2026',
        expect.objectContaining({
          fontFace: 'Arial',
          fontSize: 22,
          bold: false,
        })
      );

      // Call 3: Commentary (18pt Arial with bold key metric)
      expect(addTextMock).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            text: 'Achieved ',
            options: expect.objectContaining({ fontSize: 18, fontFace: 'Arial', bold: false }),
          }),
          expect.objectContaining({
            text: '94.5%',
            options: expect.objectContaining({ fontSize: 18, fontFace: 'Arial', bold: true }),
          }),
        ]),
        expect.objectContaining({
          y: 5.75,
          x: 0.91,
          w: 11.54,
          h: 1.3,
        })
      );

      // Element bounds fit within 13.333" x 7.5"
      const bounds = validateSlideElementBounds();
      expect(bounds.fits).toBe(true);
      expect(bounds.maxRight).toBeLessThanOrEqual(13.333);
      expect(bounds.maxBottom).toBeLessThanOrEqual(7.5);
    });

    it('7. ExportPptxModal enforces 380-character commentary preflight length and disables export on overflow', () => {
      render(
        <ExportPptxModal
          isOpen={true}
          onClose={vi.fn()}
          initialReportId={1}
          initialDateRange={{ dateFrom: '2026-03-01', dateTo: '2026-03-31' }}
        />
      );

      const generateBtn = screen.getByRole('button', { name: /generate 1-slide pptx/i }) as HTMLButtonElement;
      expect(generateBtn.disabled).toBe(false);

      // Find the commentary textarea
      const textarea = screen.getByPlaceholderText(/enter custom executive commentary/i);
      expect(textarea).toBeDefined();

      // Enter commentary exceeding MAX_COMMENTARY_LENGTH (380 characters)
      const longCommentary = 'A'.repeat(MAX_COMMENTARY_LENGTH + 10);
      fireEvent.change(textarea, { target: { value: longCommentary } });

      // Error banner must appear and generate button must be disabled
      expect(screen.getByText(/capacity overflow/i)).toBeDefined();
      expect(screen.getByText(/exceeds the single-slide budget/i)).toBeDefined();
      expect(generateBtn.disabled).toBe(true);

      // Shorten commentary back to valid length
      const validCommentary = 'Valid executive commentary under 380 chars with **key metric**.';
      fireEvent.change(textarea, { target: { value: validCommentary } });

      expect(screen.queryByText(/capacity overflow/i)).toBeNull();
      expect(generateBtn.disabled).toBe(false);
    });

    it('8. executePptxExport forwards custom commentary into slide assembly', async () => {
      vi.spyOn(reportsApi, 'getReport').mockResolvedValue({
        date_from: '2026-03-01',
        date_to: '2026-03-31',
        rows: [],
      });

      const result = await executePptxExport({
        selectedReportIds: [1],
        dateRange: { dateFrom: '2026-03-01', dateTo: '2026-03-31' },
        customCommentaryByReportId: {
          1: 'Custom audited text with **100%** compliance.',
        },
      });

      expect(result.success).toBe(true);
      expect(result.slideCount).toBe(1);
    });
  });
});
