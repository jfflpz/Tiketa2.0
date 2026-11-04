import type { ReportMeta } from '../types/reportSchemas';

export type ExportMode = 'current' | 'all' | 'custom';

export interface ReportFilterParams {
  date_from?: string; // YYYY-MM-DD
  date_to?: string;   // YYYY-MM-DD
  company_id?: string;
  location_id?: string;
  department_id?: string;
}

export interface ExportProgress {
  currentStep: number;
  totalSteps: number;
  currentReportName: string;
  phase: 'fetching' | 'rendering' | 'assembling' | 'saving';
}

export interface ReportSlideContext {
  reportId: number;
  slug: string;
  meta: ReportMeta;
  title: string;
  dateRange: { dateFrom: string; dateTo: string };
  rawRows: any[];
  chartDataUrl: string;
  explanation: {
    summaryText: string;
    highlights: string[];
    isSummarized?: boolean;
    summarizedCount?: number;
    totalCategories?: number;
  };
}

export interface PmsDateValidationResult {
  isValid: boolean;
  message?: string;
  suggestedFrom?: string;
  suggestedTo?: string;
}
