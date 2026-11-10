import type { AppSliceCreator } from '../types';
import { reportsApi, type ReportKPIs } from '../../api/client';
import type { ReportFilterParams } from '../../features/reports/export/types';
import {
  getCurrentManilaPeriod,
  getMonthDateRange,
} from '../../features/reports/utils/periodUtils';
import { REPORT_SLUGS } from '../../features/reports/types/reportSchemas';

export interface ReportsSlice {
  kpis: ReportKPIs | null;
  isFetchingKPIs: boolean;
  fetchKPIsApi: () => Promise<void>;
  selectedYear: number;
  selectedMonth: number;
  setSelectedPeriod: (year: number, month: number) => Promise<void>;
  setDateRangeApi: (dateFrom: string, dateTo: string) => Promise<void>;
  activeReportId: number;
  setActiveReportId: (id: number) => void;
  activeReportData: any[] | null;
  isFetchingReport: boolean;
  fetchReportApi: (reportName: string) => Promise<void>;
  transitLagData: any[] | null;
  isFetchingTransitLag: boolean;
  fetchTransitLagApi: () => Promise<void>;
  downloadReportCSVApi: (reportName: string) => Promise<void>;
  reportFilters: ReportFilterParams;
  setReportFilters: (filters: ReportFilterParams) => void;
  reportDateRange: { date_from: string; date_to: string } | null;
  isExportPptxModalOpen: boolean;
  setExportPptxModalOpen: (open: boolean) => void;
  activeExportController: AbortController | null;
  setActiveExportController: (controller: AbortController | null) => void;
  cancelActiveExport: () => void;
  resetReportsState: () => void;
}

export const createReportsSlice: AppSliceCreator<ReportsSlice> = (set, get) => {
  // Request sequence counters kept in store instance closure
  let activeReportRequestId = 0;
  let activeKpisRequestId = 0;
  let activeTransitLagRequestId = 0;
  let activeExportControllerInstance: AbortController | null = null;

  const initialPeriod = getCurrentManilaPeriod();
  const initialDateRange = getMonthDateRange(initialPeriod.year, initialPeriod.month);

  return {
    kpis: null,
    isFetchingKPIs: false,
    selectedYear: initialPeriod.year,
    selectedMonth: initialPeriod.month,
    reportFilters: {
      date_from: initialDateRange.date_from,
      date_to: initialDateRange.date_to,
    },
    reportDateRange: initialDateRange,
    isExportPptxModalOpen: false,
    activeExportController: null,
    transitLagData: null,
    isFetchingTransitLag: false,

    setSelectedPeriod: async (year: number, month: number) => {
      const dateRange = getMonthDateRange(year, month);
      const newFilters: ReportFilterParams = {
        ...get().reportFilters,
        date_from: dateRange.date_from,
        date_to: dateRange.date_to,
      };

      set({
        selectedYear: year,
        selectedMonth: month,
        reportFilters: newFilters,
        reportDateRange: dateRange,
      });

      // Refetch KPIs and active report simultaneously
      const currentReportId = get().activeReportId;
      const slug = REPORT_SLUGS[currentReportId] || 'monthly-sla';
      await Promise.allSettled([
        get().fetchKPIsApi(),
        get().fetchReportApi(slug),
        get().fetchTransitLagApi(),
      ]);
    },

    setDateRangeApi: async (dateFrom: string, dateTo: string) => {
      const newRange = { date_from: dateFrom, date_to: dateTo };
      const newFilters: ReportFilterParams = {
        ...get().reportFilters,
        date_from: dateFrom,
        date_to: dateTo,
      };

      set({
        reportFilters: newFilters,
        reportDateRange: newRange,
      });

      const rangeReportId = get().activeReportId;
      const rangeSlug = REPORT_SLUGS[rangeReportId] || 'monthly-sla';
      await Promise.allSettled([
        get().fetchKPIsApi(),
        get().fetchReportApi(rangeSlug),
        get().fetchTransitLagApi(),
      ]);
    },

    setActiveExportController: (controller: AbortController | null) => {
      activeExportControllerInstance = controller;
      set({ activeExportController: controller });
    },

    cancelActiveExport: () => {
      if (activeExportControllerInstance) {
        activeExportControllerInstance.abort();
        activeExportControllerInstance = null;
      }
      set({ activeExportController: null });
    },

    setReportFilters: (filters: ReportFilterParams) => {
      set({ reportFilters: filters });
    },

    setExportPptxModalOpen: (open: boolean) => {
      set({ isExportPptxModalOpen: open });
    },

    fetchKPIsApi: async () => {
      const requestId = ++activeKpisRequestId;
      set({ isFetchingKPIs: true });
      try {
        const filters = get().reportFilters;
        const data = await reportsApi.getKPIs(filters);
        if (requestId === activeKpisRequestId) {
          set({ kpis: data, isFetchingKPIs: false });
        }
      } catch {
        if (requestId === activeKpisRequestId) {
          set({ isFetchingKPIs: false });
        }
      }
    },

    fetchTransitLagApi: async () => {
      const requestId = ++activeTransitLagRequestId;
      set({ isFetchingTransitLag: true });
      try {
        const filters = get().reportFilters;
        const data = await reportsApi.getReport('transit-lag', filters);
        if (requestId === activeTransitLagRequestId) {
          set({
            transitLagData: data?.rows || [],
            isFetchingTransitLag: false,
          });
        }
      } catch {
        if (requestId === activeTransitLagRequestId) {
          set({ isFetchingTransitLag: false });
        }
      }
    },

    resetReportsState: () => {
      activeReportRequestId++;
      activeKpisRequestId++;
      activeTransitLagRequestId++;
      if (activeExportControllerInstance) {
        activeExportControllerInstance.abort();
        activeExportControllerInstance = null;
      }
      const p = getCurrentManilaPeriod();
      const r = getMonthDateRange(p.year, p.month);
      set({
        kpis: null,
        isFetchingKPIs: false,
        selectedYear: p.year,
        selectedMonth: p.month,
        activeReportId: 1,
        activeReportData: null,
        isFetchingReport: false,
        transitLagData: null,
        isFetchingTransitLag: false,
        reportFilters: { date_from: r.date_from, date_to: r.date_to },
        reportDateRange: r,
        isExportPptxModalOpen: false,
        activeExportController: null,
      });
    },

    activeReportId: 1,
    setActiveReportId: (id: number) => {
      activeReportRequestId++;
      set({ activeReportId: id, activeReportData: null, isFetchingReport: true });
    },

    activeReportData: null,
    isFetchingReport: false,
    fetchReportApi: async (reportName: string) => {
      const requestId = ++activeReportRequestId;
      set({ isFetchingReport: true });
      try {
        const filters = get().reportFilters;
        const data = await reportsApi.getReport(reportName, filters);
        if (requestId === activeReportRequestId) {
          set({
            activeReportData: data?.rows || [],
            reportDateRange: data ? { date_from: data.date_from, date_to: data.date_to } : null,
            isFetchingReport: false,
          });
        }
      } catch {
        if (requestId === activeReportRequestId) {
          set({ isFetchingReport: false });
        }
      }
    },

    downloadReportCSVApi: async (reportName: string) => {
      try {
        const filters = get().reportFilters;
        const blob = await reportsApi.downloadReportXLSX(reportName, filters);
        const url = window.URL.createObjectURL(new Blob([blob]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${reportName}-${new Date().toISOString().split('T')[0]}.xlsx`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        get().addToast('Export Complete', `Downloaded ${reportName}.xlsx`, 'success');
      } catch (err: any) {
        get().addToast('Export Failed', err.response?.data?.detail || 'Failed to download Excel report', 'warning');
      }
    },
  };
};
