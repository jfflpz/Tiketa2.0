import type { AppSliceCreator } from '../types';
import { reportsApi, type ReportKPIs } from '../../api/client';
import type { ReportFilterParams } from '../../features/reports/export/types';

export interface ReportsSlice {
  kpis: ReportKPIs | null;
  isFetchingKPIs: boolean;
  fetchKPIsApi: () => Promise<void>;
  activeReportId: number;
  setActiveReportId: (id: number) => void;
  activeReportData: any[] | null;
  isFetchingReport: boolean;
  fetchReportApi: (reportName: string) => Promise<void>;
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
  let activeExportControllerInstance: AbortController | null = null;

  return {
    kpis: null,
    isFetchingKPIs: false,
    reportFilters: {},
    reportDateRange: null,
    isExportPptxModalOpen: false,
    activeExportController: null,

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

    resetReportsState: () => {
      activeReportRequestId++;
      activeKpisRequestId++;
      if (activeExportControllerInstance) {
        activeExportControllerInstance.abort();
        activeExportControllerInstance = null;
      }
      set({
        kpis: null,
        isFetchingKPIs: false,
        activeReportId: 1,
        activeReportData: null,
        isFetchingReport: false,
        reportFilters: {},
        reportDateRange: null,
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
        const blob = await reportsApi.downloadReportCSV(reportName, filters);
        const url = window.URL.createObjectURL(new Blob([blob]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${reportName}-${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        get().addToast('Export Complete', `Downloaded ${reportName}.csv`, 'success');
      } catch (err: any) {
        get().addToast('Export Failed', err.response?.data?.detail || 'Failed to download CSV', 'warning');
      }
    },
  };
};
