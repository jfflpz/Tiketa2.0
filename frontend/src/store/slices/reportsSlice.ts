import type { AppSliceCreator } from '../types';
import { reportsApi, type ReportKPIs } from '../../api/client';

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
  resetReportsState: () => void;
}

export const createReportsSlice: AppSliceCreator<ReportsSlice> = (set, get) => {
  // Request sequence counters kept in store instance closure
  let activeReportRequestId = 0;
  let activeKpisRequestId = 0;

  return {
    kpis: null,
    isFetchingKPIs: false,
    fetchKPIsApi: async () => {
      const requestId = ++activeKpisRequestId;
      set({ isFetchingKPIs: true });
      try {
        const data = await reportsApi.getKPIs();
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
      set({
        kpis: null,
        isFetchingKPIs: false,
        activeReportId: 1,
        activeReportData: null,
        isFetchingReport: false,
      });
    },

    activeReportId: 1,
    setActiveReportId: (id: number) => {
      // Invalidate any inflight requests and clear stale rows while loading
      activeReportRequestId++;
      set({ activeReportId: id, activeReportData: null, isFetchingReport: true });
    },

    activeReportData: null,
    isFetchingReport: false,
    fetchReportApi: async (reportName: string) => {
      const requestId = ++activeReportRequestId;
      set({ isFetchingReport: true });
      try {
        const data = await reportsApi.getReport(reportName);
        if (requestId === activeReportRequestId) {
          set({ activeReportData: data?.rows || [], isFetchingReport: false });
        }
      } catch {
        if (requestId === activeReportRequestId) {
          set({ isFetchingReport: false });
        }
      }
    },

    downloadReportCSVApi: async (reportName: string) => {
      try {
        const blob = await reportsApi.downloadReportCSV(reportName);
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
