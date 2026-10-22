// @spec SR-02: Executive Analytics Dashboard with 8 Standardized Reports & Recharts Widgets
import React, { useState, useMemo, useEffect } from 'react';
import { Download, FileSpreadsheet, Layers, ArrowRight } from 'lucide-react';
import { BarcodeDivider } from '../../components/common/TickMeter';
import { useAppStore } from '../../store/useAppStore';
import { REPORT_SLUGS, REPORT_TABS } from '../reports/types/reportSchemas';
import {
  mapMonthlySlaRows,
  mapStaffUtilizationRows,
  mapDeptDemandRows,
  mapAgingBacklogRows,
  mapTransitLagRows,
  mapHardwareVulnerabilityRows,
  mapPmsComplianceRows,
  mapChronicRequestorRows,
} from '../reports/utils/reportMappers';
import { ReportTabSelector } from '../reports/components/ReportTabSelector';
import { MonthlySlaTable } from '../reports/components/tables/MonthlySlaTable';
import { StaffUtilizationTable } from '../reports/components/tables/StaffUtilizationTable';
import { DeptDemandTable } from '../reports/components/tables/DeptDemandTable';
import { AgingBacklogTable } from '../reports/components/tables/AgingBacklogTable';
import { TransitLagTable } from '../reports/components/tables/TransitLagTable';
import { HardwareVulnerabilityTable } from '../reports/components/tables/HardwareVulnerabilityTable';
import { PmsComplianceTable } from '../reports/components/tables/PmsComplianceTable';
import { ChronicRequestorTable } from '../reports/components/tables/ChronicRequestorTable';
import { ExecutiveSummaryKpiCards } from './components/ExecutiveSummaryKpiCards';
import { TurnaroundLagChart } from './components/TurnaroundLagChart';
import { HourlyPeakDemandChart } from './components/HourlyPeakDemandChart';

export const ExecutiveAnalyticsView: React.FC = () => {
  const addToast = useAppStore((state) => state.addToast);
  const setActiveView = useAppStore((state) => state.setActiveView);
  const setActiveReportId = useAppStore((state) => state.setActiveReportId);
  const kpis = useAppStore((state) => state.kpis);
  const fetchKPIsApi = useAppStore((state) => state.fetchKPIsApi);
  const downloadReportCSVApi = useAppStore((state) => state.downloadReportCSVApi);
  const activeReportData = useAppStore((state) => state.activeReportData);

  const [activeReport, setActiveReport] = useState<number>(1);

  useEffect(() => {
    fetchKPIsApi();
  }, [fetchKPIsApi]);

  const rawRows = activeReportData || [];

  const report1Data = useMemo(() => mapMonthlySlaRows(rawRows), [rawRows]);
  const report2Data = useMemo(() => mapStaffUtilizationRows(rawRows), [rawRows]);
  const report3Data = useMemo(() => mapDeptDemandRows(rawRows), [rawRows]);
  const report4Data = useMemo(() => mapAgingBacklogRows(rawRows), [rawRows]);
  const report5Data = useMemo(() => mapTransitLagRows(rawRows), [rawRows]);
  const report6Data = useMemo(() => mapHardwareVulnerabilityRows(rawRows), [rawRows]);
  const report7Data = useMemo(() => mapPmsComplianceRows(rawRows), [rawRows]);
  const report8Data = useMemo(() => mapChronicRequestorRows(rawRows), [rawRows]);

  const currentTabMeta = REPORT_TABS.find((r) => r.id === activeReport);

  const handleSelectReportKpi = (reportId: number) => {
    setActiveReportId(reportId);
    setActiveView('reports');
  };

  return (
    <div className="space-y-4 pb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink">
            Executive Analytics &amp; 8 Standardized Reports
          </h1>
          <p className="text-xs text-ink-subtle mt-0.5">
            Synchronized with Sir Stephen Miralles, Sir Nathaniel Esguerra, and Sir Raefael KPIs (SR-02).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => downloadReportCSVApi(REPORT_SLUGS[activeReport] || 'monthly-sla')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface border border-line text-xs font-semibold text-ink shadow-card hover:bg-zinc-50 transition-colors press-fx"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() =>
              addToast(
                'Executive Slide Deck (.pptx)',
                'Generated 8-Report Management Presentation Summary',
                'success'
              )
            }
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold shadow-sm transition-colors press-fx"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Executive PPTX</span>
          </button>
        </div>
      </div>

      {/* 4 Executive Summary Cards (FR-DASH-01: Synchronized with the 8 Standard Reports) */}
      <ExecutiveSummaryKpiCards
        kpis={kpis}
        onSelectReport={handleSelectReportKpi}
      />

      {/* Direct Link Banner to Dedicated 8 Reports Suite */}
      <div className="bg-gradient-to-r from-orange-500 to-amber-600 rounded-3xl p-5 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg shadow-orange-950/20">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-bold uppercase tracking-wider">
              Audit Standard Suite
            </span>
            <span className="text-xs text-white/80 font-medium">8 Tailored Visual Reports</span>
          </div>
          <h3 className="text-base font-bold">
            Dedicated 8 Standardized Operational &amp; Strategic Reports Suite
          </h3>
          <p className="text-xs text-white/90">
            Inspect individual departmental charts, staff labor distributions, aging backlogs, and hardware vulnerability matrices.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setActiveView('reports')}
          className="py-2.5 px-5 rounded-xl bg-white text-orange-700 hover:bg-orange-50 font-bold text-xs shrink-0 shadow-md transition-all press-fx inline-flex items-center gap-1.5"
        >
          <span>Open 8 Standard Reports</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Visual Recharts Widgets Row (FR-DASH-02..04) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Widget 1: Turnaround Lag vs Active Labor */}
        <TurnaroundLagChart data={report5Data} />

        {/* Widget 2: Hourly Peak Demand Histogram */}
        <HourlyPeakDemandChart />
      </div>

      {/* 8 Standardized Reports Multi-Tab Viewer */}
      <div className="bg-surface border border-line rounded-3xl p-5 shadow-card space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-brand" />
            <h2 className="text-sm font-bold text-ink">
              8 Standardized Operational &amp; Strategic Reports Suite
            </h2>
          </div>
          <span className="text-xs font-mono text-ink-subtle">
            {currentTabMeta?.code}
          </span>
        </div>

        {/* Report Selector Pills */}
        <ReportTabSelector
          activeReportId={activeReport}
          onSelectReportId={setActiveReport}
          variant="pills"
        />

        <BarcodeDivider count={85} />

        {activeReport === 1 && <MonthlySlaTable data={report1Data} />}
        {activeReport === 2 && <StaffUtilizationTable data={report2Data} />}
        {activeReport === 3 && <DeptDemandTable data={report3Data} />}
        {activeReport === 4 && <AgingBacklogTable data={report4Data} />}
        {activeReport === 5 && <TransitLagTable data={report5Data} />}
        {activeReport === 6 && <HardwareVulnerabilityTable data={report6Data} />}
        {activeReport === 7 && <PmsComplianceTable data={report7Data} />}
        {activeReport === 8 && <ChronicRequestorTable data={report8Data} />}
      </div>
    </div>
  );
};
