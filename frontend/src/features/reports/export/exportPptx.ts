import { reportsApi } from '../../../api/client';
import { REPORT_SLUGS, REPORT_TABS } from '../types/reportSchemas';
import {
  mapMonthlySlaRows,
  mapStaffUtilizationRows,
  mapDeptDemandRows,
  mapAgingBacklogRows,
  mapTransitLagRows,
  mapHardwareVulnerabilityRows,
  mapPmsComplianceRows,
  mapChronicRequestorRows,
} from '../utils/reportMappers';
import { captureChartImage } from './chartCapture';
import { generateExplanation } from './explanationGenerator';
import { addExecutiveReportSlide, createPresentationInstance } from './pptxSlideBuilder';
import { validatePmsDateRange, formatPeriodDisplay } from './pmsDateValidation';
import type { ExportProgress, ReportFilterParams } from './types';

export interface ExecuteExportOptions {
  selectedReportIds: number[];
  dateRange: { dateFrom: string; dateTo: string };
  filterParams?: ReportFilterParams;
  onProgress?: (progress: ExportProgress) => void;
  signal?: AbortSignal;
  checkSession?: () => boolean;
}

export interface ExportResult {
  success: boolean;
  slideCount: number;
  fileName: string;
}

function mapReportData(reportId: number, rawRows: any[]): any[] {
  switch (reportId) {
    case 1:
      return mapMonthlySlaRows(rawRows);
    case 2:
      return mapStaffUtilizationRows(rawRows);
    case 3:
      return mapDeptDemandRows(rawRows);
    case 4:
      return mapAgingBacklogRows(rawRows);
    case 5:
      return mapTransitLagRows(rawRows);
    case 6:
      return mapHardwareVulnerabilityRows(rawRows);
    case 7:
      return mapPmsComplianceRows(rawRows);
    case 8:
      return mapChronicRequestorRows(rawRows);
    default:
      return rawRows;
  }
}

/**
 * Executes the complete executive PPTX generation and download pipeline.
 *
 * Guaranteed Invariants:
 * 1. Exactly one slide per selected report.
 * 2. Independent fetch for each report using a consistent filter snapshot.
 * 3. Strict PMS calendar month validation prior to fetching.
 * 4. Cancellation checking before fetch, during render, and immediately before saving.
 * 5. No decorative cover or closing slides.
 */
export async function executePptxExport(options: ExecuteExportOptions): Promise<ExportResult> {
  const { selectedReportIds, dateRange, filterParams = {}, onProgress, signal } = options;

  if (!selectedReportIds || selectedReportIds.length === 0) {
    throw new Error('No reports selected for export.');
  }

  // Pre-fetch validation: If PMS is included, ensure complete calendar months
  if (selectedReportIds.includes(7)) {
    const pmsVal = validatePmsDateRange(dateRange.dateFrom, dateRange.dateTo);
    if (!pmsVal.isValid) {
      throw new Error(
        pmsVal.message ||
          'PMS compliance reports require complete calendar months (beginning on the 1st and ending on the last day of the month).'
      );
    }
  }

  // Snapshot the exact filters to ensure zero multi-report drift
  const filterSnapshot = {
    ...filterParams,
    date_from: dateRange.dateFrom,
    date_to: dateRange.dateTo,
  };

  const pres = createPresentationInstance();
  const totalReports = selectedReportIds.length;
  const formattedPeriod = formatPeriodDisplay(dateRange.dateFrom, dateRange.dateTo);

  for (let i = 0; i < totalReports; i++) {
    if (signal?.aborted) {
      throw new DOMException('Export cancelled by user', 'AbortError');
    }

    const reportId = selectedReportIds[i];
    const meta = REPORT_TABS.find((t) => t.id === reportId) || REPORT_TABS[0];
    const slug = REPORT_SLUGS[reportId];

    onProgress?.({
      currentStep: i + 1,
      totalSteps: totalReports,
      currentReportName: meta.title,
      phase: 'fetching',
    });

    // 1. Independent fetch using snapshot filters
    const reportResponse = await reportsApi.getReport(slug, filterSnapshot, signal);

    if (signal?.aborted) {
      throw new DOMException('Export cancelled by user', 'AbortError');
    }

    const rawRows = reportResponse?.rows || [];
    const mappedRows = mapReportData(reportId, rawRows);

    onProgress?.({
      currentStep: i + 1,
      totalSteps: totalReports,
      currentReportName: meta.title,
      phase: 'rendering',
    });

    // 2. Capture high-res chart image at exact 2.96:1 proportion
    const chartPngBase64 = await captureChartImage(reportId, mappedRows);

    if (signal?.aborted) {
      throw new DOMException('Export cancelled by user', 'AbortError');
    }

    onProgress?.({
      currentStep: i + 1,
      totalSteps: totalReports,
      currentReportName: meta.title,
      phase: 'assembling',
    });

    // 3. Generate factual explanation from verified data
    const explanationResult = generateExplanation(reportId, mappedRows, dateRange);

    // 4. Construct exact 16:9 slide
    addExecutiveReportSlide(pres, {
      title: meta.title,
      reportingPeriod: formattedPeriod,
      chartImageBase64: chartPngBase64,
      explanationMarkdown: explanationResult.text,
    });
  }

  // Pre-packaging cancellation check
  if (signal?.aborted) {
    throw new DOMException('Export cancelled by user', 'AbortError');
  }

  if (options.checkSession && !options.checkSession()) {
    throw new Error('Export cancelled: user session expired or logged out.');
  }

  onProgress?.({
    currentStep: totalReports,
    totalSteps: totalReports,
    currentReportName: 'Slide Deck',
    phase: 'saving',
  });

  // 5. Generate binary presentation data first
  const fileData = await pres.write({ outputType: 'arraybuffer' });

  // Post-packaging cancellation & session verification immediately before initiating download
  if (signal?.aborted) {
    throw new DOMException('Export cancelled by user', 'AbortError');
  }

  if (options.checkSession && !options.checkSession()) {
    throw new Error('Export cancelled: user session expired or logged out.');
  }

  const fileName = `Tiketa-Executive-Report-${dateRange.dateFrom}_to_${dateRange.dateTo}.pptx`;

  // Safely initiate download only when not aborted and session is verified
  if (
    typeof window !== 'undefined' &&
    typeof document !== 'undefined' &&
    window.URL &&
    typeof window.URL.createObjectURL === 'function'
  ) {
    const blob = new Blob([fileData as any], {
      type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    });
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  }

  return {
    success: true,
    slideCount: totalReports,
    fileName,
  };
}
