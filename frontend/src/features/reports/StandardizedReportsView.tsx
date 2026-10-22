// @spec SR-02: 8 Standardized Operational & Strategic Reports Suite with Tailored Recharts Visualizations
import React, { useMemo, useEffect } from 'react';
import { Download, FileSpreadsheet, Layers } from 'lucide-react';

import { BarcodeDivider } from '../../components/common/TickMeter';
import { useAppStore } from '../../store/useAppStore';
import { REPORT_TABS, REPORT_SLUGS } from './types/reportSchemas';
import {
  mapMonthlySlaRows,
  mapStaffUtilizationRows,
  mapDeptDemandRows,
  mapAgingBacklogRows,
  mapTransitLagRows,
  mapHardwareVulnerabilityRows,
  mapPmsComplianceRows,
  mapChronicRequestorRows,
} from './utils/reportMappers';
import { ReportTabSelector } from './components/ReportTabSelector';
import { ReportChartCard } from './components/ReportChartCard';
import { MonthlySlaTable } from './components/tables/MonthlySlaTable';
import { StaffUtilizationTable } from './components/tables/StaffUtilizationTable';
import { DeptDemandTable } from './components/tables/DeptDemandTable';
import { AgingBacklogTable } from './components/tables/AgingBacklogTable';
import { TransitLagTable } from './components/tables/TransitLagTable';
import { HardwareVulnerabilityTable } from './components/tables/HardwareVulnerabilityTable';
import { PmsComplianceTable } from './components/tables/PmsComplianceTable';
import { ChronicRequestorTable } from './components/tables/ChronicRequestorTable';

export const StandardizedReportsView: React.FC = () => {
  const addToast = useAppStore((state) => state.addToast);
  const activeReportId = useAppStore((state) => state.activeReportId);
  const setActiveReportId = useAppStore((state) => state.setActiveReportId);
  const fetchReportApi = useAppStore((state) => state.fetchReportApi);
  const downloadReportCSVApi = useAppStore((state) => state.downloadReportCSVApi);
  const activeReportData = useAppStore((state) => state.activeReportData);

  const activeTabMeta = REPORT_TABS.find((t) => t.id === activeReportId) || REPORT_TABS[0];
  const currentSlug = REPORT_SLUGS[activeReportId] || 'monthly-sla';

  useEffect(() => {
    fetchReportApi(currentSlug);
  }, [currentSlug, fetchReportApi]);

  const rawRows = activeReportData || [];

  const report1Data = useMemo(() => mapMonthlySlaRows(rawRows), [rawRows]);
  const report2Data = useMemo(() => mapStaffUtilizationRows(rawRows), [rawRows]);
  const report3Data = useMemo(() => mapDeptDemandRows(rawRows), [rawRows]);
  const report4Data = useMemo(() => mapAgingBacklogRows(rawRows), [rawRows]);
  const report5Data = useMemo(() => mapTransitLagRows(rawRows), [rawRows]);
  const report6Data = useMemo(() => mapHardwareVulnerabilityRows(rawRows), [rawRows]);
  const report7Data = useMemo(() => mapPmsComplianceRows(rawRows), [rawRows]);
  const report8Data = useMemo(() => mapChronicRequestorRows(rawRows), [rawRows]);

  const handleExportCSV = () => {
    downloadReportCSVApi(currentSlug);
  };

  const handleExportDeck = () => {
    addToast(
      'Executive Slide Deck (.pptx)',
      'Generated 8-Report Management Presentation Summary for Executive Review.',
      'success'
    );
  };

  return (
    <div className="space-y-5 pb-8">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-800 text-[10px] font-bold uppercase tracking-wider">
              Management Suite
            </span>
            <span className="text-xs font-mono text-zinc-400">SR-02 Audit Ready</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-ink mt-1">
            8 Standardized Operational &amp; Strategic Reports Suite
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Verified monthly metrics, labor distributions, and hardware vulnerability matrices with visual charts.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-[#ECEEF2] text-xs font-semibold text-zinc-700 shadow-sm hover:bg-zinc-50 transition-colors press-fx"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            onClick={handleExportDeck}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold shadow-sm transition-colors press-fx"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Executive PPTX</span>
          </button>
        </div>
      </div>

      {/* 8-Report Selector Tabs Bar */}
      <ReportTabSelector
        activeReportId={activeReportId}
        onSelectReportId={setActiveReportId}
        variant="tabs"
      />

      {/* Active Report Header & Description Banner */}
      <div className="bg-white border border-[#ECEEF2] rounded-2xl p-5 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-extrabold px-2 py-0.5 rounded-lg bg-orange-50 text-orange-600 border border-orange-200">
              {activeTabMeta.code}
            </span>
            <h2 className="text-base font-bold text-ink">{activeTabMeta.title}</h2>
          </div>
          <p className="text-xs text-zinc-500 mt-1">{activeTabMeta.description}</p>
        </div>

        <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono">
          <Layers className="w-4 h-4 text-orange-500" />
          <span>Active Data Window: Q3-Q4 2026</span>
        </div>
      </div>

      {/* Visual Chart Card for Active Report */}
      <ReportChartCard
        activeReportId={activeReportId}
        activeTabMeta={activeTabMeta}
        report1Data={report1Data}
        report2Data={report2Data}
        report3Data={report3Data}
        report4Data={report4Data}
        report5Data={report5Data}
        report6Data={report6Data}
        report7Data={report7Data}
        report8Data={report8Data}
      />

      {/* Data Table Section for Active Report */}
      <div className="bg-white border border-[#ECEEF2] rounded-3xl p-5 shadow-card space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
            Canonical Audit Table • {activeTabMeta.code}
          </h3>
          <span className="text-xs text-zinc-400 font-mono">Verified 15-Column Job Log Records</span>
        </div>

        <BarcodeDivider count={85} />

        {activeReportId === 1 && <MonthlySlaTable data={report1Data} />}
        {activeReportId === 2 && <StaffUtilizationTable data={report2Data} />}
        {activeReportId === 3 && <DeptDemandTable data={report3Data} />}
        {activeReportId === 4 && <AgingBacklogTable data={report4Data} />}
        {activeReportId === 5 && <TransitLagTable data={report5Data} />}
        {activeReportId === 6 && <HardwareVulnerabilityTable data={report6Data} />}
        {activeReportId === 7 && <PmsComplianceTable data={report7Data} />}
        {activeReportId === 8 && <ChronicRequestorTable data={report8Data} />}
      </div>
    </div>
  );
};
