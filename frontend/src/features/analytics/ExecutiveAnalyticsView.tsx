// @spec SR-02: Executive Analytics Dashboard with 8 Standardized Reports & Recharts Widgets
import React, { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
} from 'recharts';
import { Download, FileSpreadsheet, Layers, ShieldAlert, CheckCircle2, ArrowRight, Clock, Building2 } from 'lucide-react';
import {
  REPORT_1_MONTHLY_SLA,
  REPORT_2_STAFF_UTILIZATION,
  REPORT_3_DEPT_DEMAND,
  REPORT_4_AGING_BACKLOG,
  REPORT_5_TRANSIT_LAG,
  REPORT_6_HARDWARE_HOTSPOTS,
  REPORT_7_PMS_COMPLIANCE,
  REPORT_8_CHRONIC_REQUESTORS,
  HOURLY_PEAK_DEMAND_DATA,
} from '../../data/mockAnalyticsData';
import { BarcodeDivider } from '../../components/common/TickMeter';
import { useAppStore } from '../../store/useAppStore';

export const ExecutiveAnalyticsView: React.FC = () => {
  const { addToast, setActiveView, setActiveReportId } = useAppStore();
  const [activeReport, setActiveReport] = useState<number>(1);

  const reportTabs = [
    { id: 1, code: 'FR-REPT-01', title: '1. Monthly SLA Summary' },
    { id: 2, code: 'FR-REPT-02', title: '2. Staff Utilization' },
    { id: 3, code: 'FR-REPT-03', title: '3. Dept & Fleet Demand' },
    { id: 4, code: 'FR-REPT-04', title: '4. Aging Backlog (>48h)' },
    { id: 5, code: 'FR-REPT-05', title: '5. Transit Lag Disaggregation' },
    { id: 6, code: 'FR-REPT-06', title: '6. Hardware Hotspots' },
    { id: 7, code: 'FR-REPT-07', title: '7. PMS Compliance Audit' },
    { id: 8, code: 'FR-REPT-08', title: '8. Repeat Requestor Index' },
  ];

  return (
    <div className="space-y-4 pb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink">
            Executive Analytics & 8 Standardized Reports
          </h1>
          <p className="text-xs text-ink-subtle mt-0.5">
            Synchronized with Sir Stephen Miralles, Sir Nathaniel Esguerra, and Sir Raefael KPIs (SR-02).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              addToast(
                'Exported Standardized Report',
                `Report #${activeReport} exported to CSV`,
                'success'
              )
            }
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Report 1 - Monthly SLA Compliance */}
        <div
          onClick={() => {
            setActiveReportId(1);
            setActiveView('reports');
          }}
          className="bg-surface border border-line rounded-2xl p-4 shadow-card hover:border-orange-500/50 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
          title="Click to view Report 1: Monthly SLA & Volume Summary"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200/60">
                Target: &gt;80%
              </span>
            </div>
            <p className="text-xs font-semibold text-ink-subtle uppercase tracking-wider">
              Fleet SLA Compliance
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold tracking-tight text-ink tabular-nums">
                84.8%
              </span>
              <span className="text-xs text-emerald-600 font-semibold">
                155 / 165 Done
              </span>
            </div>
            <p className="text-[11px] text-ink-subtle mt-1.5 line-clamp-2">
              Monthly resolution rate across 15 transit terminals. 71% remote-first delivery.
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-line/60 flex items-center justify-between">
            <span className="text-[11px] font-semibold text-zinc-500">
              Report 1: Monthly SLA
            </span>
            <span className="text-[11px] font-bold text-orange-600 group-hover:translate-x-0.5 transition-transform">
              View Report &rarr;
            </span>
          </div>
        </div>

        {/* Card 2: Report 2 & 5 - Mean Active Labor */}
        <div
          onClick={() => {
            setActiveReportId(2);
            setActiveView('reports');
          }}
          className="bg-surface border border-line rounded-2xl p-4 shadow-card hover:border-orange-500/50 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
          title="Click to view Report 2 & 5: Staff Labor & Transit Disaggregation"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-600 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
              <span className="px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 text-[10px] font-bold border border-sky-200/60">
                Avg Bench Labor
              </span>
            </div>
            <p className="text-xs font-semibold text-ink-subtle uppercase tracking-wider">
              Mean Active Labor Time
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold tracking-tight text-ink tabular-nums">
                41 mins
              </span>
              <span className="text-xs text-ink-subtle font-medium">
                Hands-on repair
              </span>
            </div>
            <p className="text-[11px] text-ink-subtle mt-1.5 line-clamp-2">
              Technician bench time per incident, disaggregated from inter-depot courier transit lag.
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-line/60 flex items-center justify-between">
            <span className="text-[11px] font-semibold text-zinc-500">
              Report 2 &amp; 5: Labor &amp; Transit
            </span>
            <span className="text-[11px] font-bold text-orange-600 group-hover:translate-x-0.5 transition-transform">
              View Report &rarr;
            </span>
          </div>
        </div>

        {/* Card 3: Report 4 - Critical Aging Backlog */}
        <div
          onClick={() => {
            setActiveReportId(4);
            setActiveView('reports');
          }}
          className="bg-surface border border-line rounded-2xl p-4 shadow-card hover:border-orange-500/50 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
          title="Click to view Report 4: Critical Aging Backlog Exception Report"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 flex items-center justify-center">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 text-[10px] font-bold border border-rose-200/60">
                SLA Breach &gt;48h
              </span>
            </div>
            <p className="text-xs font-semibold text-ink-subtle uppercase tracking-wider">
              Critical Aging Backlog
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold tracking-tight text-ink tabular-nums">
                4 Tickets
              </span>
              <span className="text-xs text-rose-600 font-semibold">
                Requires escalation
              </span>
            </div>
            <p className="text-[11px] text-ink-subtle mt-1.5 line-clamp-2">
              Stalled tickets exceeding 48-hour resolution threshold awaiting parts or supervisor sign-off.
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-line/60 flex items-center justify-between">
            <span className="text-[11px] font-semibold text-zinc-500">
              Report 4: Aging Exceptions
            </span>
            <span className="text-[11px] font-bold text-orange-600 group-hover:translate-x-0.5 transition-transform">
              View Report &rarr;
            </span>
          </div>
        </div>

        {/* Card 4: Report 7 - Fleet PMS Hardware Coverage */}
        <div
          onClick={() => {
            setActiveReportId(7);
            setActiveView('reports');
          }}
          className="bg-surface border border-line rounded-2xl p-4 shadow-card hover:border-orange-500/50 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
          title="Click to view Report 7: Fleet PMS Compliance Audit"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center">
                <Building2 className="w-4 h-4" />
              </div>
              <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-bold border border-amber-200/60">
                15 Hubs Audited
              </span>
            </div>
            <p className="text-xs font-semibold text-ink-subtle uppercase tracking-wider">
              Fleet PMS Compliance
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold tracking-tight text-ink tabular-nums">
                87.5%
              </span>
              <span className="text-xs text-amber-700 font-semibold">
                POS &amp; Printer PMS
              </span>
            </div>
            <p className="text-[11px] text-ink-subtle mt-1.5 line-clamp-2">
              Preventive maintenance audit compliance across terminal workstations ahead of peak rush.
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-line/60 flex items-center justify-between">
            <span className="text-[11px] font-semibold text-zinc-500">
              Report 7: PMS Compliance
            </span>
            <span className="text-[11px] font-bold text-orange-600 group-hover:translate-x-0.5 transition-transform">
              View Report &rarr;
            </span>
          </div>
        </div>
      </div>

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
        <div className="bg-surface border border-line rounded-3xl p-5 shadow-card">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-bold text-ink">
              Logistical Transit Lag vs. Active Labor (FR-DASH-02)
            </h2>
            <span className="text-[11px] font-mono text-ink-subtle">Sir Raefael Metric</span>
          </div>
          <p className="text-xs text-ink-subtle mb-4">
            Separates courier/travel turnaround days from active technician bench hours.
          </p>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={REPORT_5_TRANSIT_LAG}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ECEEF2" />
                <XAxis dataKey="location" tick={{ fontSize: 11, fill: '#6B7280' }} />
                <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#ECEEF2',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                />
                <Bar
                  dataKey="meanTurnaroundDays"
                  name="Total Turnaround (Days)"
                  fill="#18181B"
                  radius={[6, 6, 0, 0]}
                />
                <Bar
                  dataKey="meanTransitLagDays"
                  name="Transit Waiting Lag (Days)"
                  fill="#13784F"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Widget 2: Hourly Peak Demand Histogram */}
        <div className="bg-surface border border-line rounded-3xl p-5 shadow-card">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-bold text-ink">
              Hourly Support Surge Histogram (FR-DASH-04)
            </h2>
            <span className="text-[11px] font-mono text-ink-subtle">06:00–17:00 Window</span>
          </div>
          <p className="text-xs text-ink-subtle mb-4">
            Aggregates Time Started into 60-minute bins showing 07:00–09:00 dispatch rush.
          </p>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={HOURLY_PEAK_DEMAND_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ECEEF2" />
                <XAxis dataKey="hour" tick={{ fontSize: 11, fill: '#6B7280' }} />
                <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#ECEEF2',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="tickets"
                  name="Tickets Logged"
                  stroke="#13784F"
                  fill="#E8F5EE"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 8 Standardized Reports Multi-Tab Viewer */}
      <div className="bg-surface border border-line rounded-3xl p-5 shadow-card space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-brand" />
            <h2 className="text-sm font-bold text-ink">
              8 Standardized Operational & Strategic Reports Suite
            </h2>
          </div>
          <span className="text-xs font-mono text-ink-subtle">
            {reportTabs.find((r) => r.id === activeReport)?.code}
          </span>
        </div>

        {/* Report Selector Pills */}
        <div className="flex flex-wrap gap-1.5 bg-canvas p-1.5 rounded-2xl border border-line">
          {reportTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveReport(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs transition-all press-fx ${
                activeReport === tab.id
                  ? 'bg-zinc-900 text-white font-semibold shadow-sm'
                  : 'text-ink-subtle hover:text-ink font-medium'
              }`}
            >
              {tab.title}
            </button>
          ))}
        </div>

        <BarcodeDivider count={85} />

        {/* Report 1: Monthly SLA */}
        {activeReport === 1 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-canvas text-ink-subtle text-[11px] font-medium border-y border-line">
                  <th className="py-2.5 px-3">Month</th>
                  <th className="py-2.5 px-3">Total Requests</th>
                  <th className="py-2.5 px-3">Completed</th>
                  <th className="py-2.5 px-3">Pending</th>
                  <th className="py-2.5 px-3">Completion Rate</th>
                  <th className="py-2.5 px-3">Remote (REM)</th>
                  <th className="py-2.5 px-3">On-Site (SITE)</th>
                  <th className="py-2.5 px-3">Avg Resolution</th>
                  <th className="py-2.5 px-3">Same-Day SLA %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {REPORT_1_MONTHLY_SLA.map((r) => (
                  <tr key={r.month} className="hover:bg-canvas/60">
                    <td className="py-3 px-3 font-bold text-ink">{r.month}</td>
                    <td className="py-3 px-3 font-mono">{r.totalRequests}</td>
                    <td className="py-3 px-3 font-mono text-emerald-700 font-semibold">
                      {r.completed}
                    </td>
                    <td className="py-3 px-3 font-mono text-amber-700">{r.pending}</td>
                    <td className="py-3 px-3 font-mono font-bold text-emerald-600">
                      {r.completionRate}%
                    </td>
                    <td className="py-3 px-3 font-mono">{r.remoteMode}</td>
                    <td className="py-3 px-3 font-mono">{r.siteMode}</td>
                    <td className="py-3 px-3 font-mono">{r.avgResolutionHours} hrs</td>
                    <td className="py-3 px-3 font-mono font-semibold">
                      {r.sameDayResolutionRate}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Report 2: Staff Utilization */}
        {activeReport === 2 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-canvas text-ink-subtle text-[11px] font-medium border-y border-line">
                  <th className="py-2.5 px-3">Worked By (Technician)</th>
                  <th className="py-2.5 px-3">Total Assigned</th>
                  <th className="py-2.5 px-3">Completed</th>
                  <th className="py-2.5 px-3">Pending</th>
                  <th className="py-2.5 px-3">Total Hours Logged</th>
                  <th className="py-2.5 px-3">Avg Time / Task</th>
                  <th className="py-2.5 px-3">Primary Hub</th>
                  <th className="py-2.5 px-3">Dominant Task Specialization</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {REPORT_2_STAFF_UTILIZATION.map((r) => (
                  <tr key={r.technician} className="hover:bg-canvas/60">
                    <td className="py-3 px-3 font-bold text-ink">{r.technician}</td>
                    <td className="py-3 px-3 font-mono">{r.totalAssigned}</td>
                    <td className="py-3 px-3 font-mono text-emerald-700 font-semibold">
                      {r.completed}
                    </td>
                    <td className="py-3 px-3 font-mono">{r.pending}</td>
                    <td className="py-3 px-3 font-mono font-semibold">
                      {r.totalHoursLogged.toFixed(1)} hrs
                    </td>
                    <td className="py-3 px-3 font-mono">{r.avgTimePerTask} hrs</td>
                    <td className="py-3 px-3">{r.primaryLocation}</td>
                    <td className="py-3 px-3 font-medium text-ink-subtle">
                      {r.mostFrequentTask}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Report 3: Dept Demand */}
        {activeReport === 3 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-canvas text-ink-subtle text-[11px] font-medium border-y border-line">
                  <th className="py-2.5 px-3">Company</th>
                  <th className="py-2.5 px-3">Department</th>
                  <th className="py-2.5 px-3">Terminal Location</th>
                  <th className="py-2.5 px-3">Total Tickets</th>
                  <th className="py-2.5 px-3">Hours Consumed</th>
                  <th className="py-2.5 px-3">Top Requestor</th>
                  <th className="py-2.5 px-3">Primary Issue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {REPORT_3_DEPT_DEMAND.map((r, i) => (
                  <tr key={i} className="hover:bg-canvas/60">
                    <td className="py-3 px-3 font-bold text-ink">{r.company}</td>
                    <td className="py-3 px-3">{r.department}</td>
                    <td className="py-3 px-3">{r.location}</td>
                    <td className="py-3 px-3 font-mono font-semibold">{r.totalTickets}</td>
                    <td className="py-3 px-3 font-mono">{r.totalHoursConsumed} hrs</td>
                    <td className="py-3 px-3">{r.topRequestor}</td>
                    <td className="py-3 px-3 font-medium text-brand">{r.primaryTask}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Report 4: Aging Backlog */}
        {activeReport === 4 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-canvas text-ink-subtle text-[11px] font-medium border-y border-line">
                  <th className="py-2.5 px-3">Date Started</th>
                  <th className="py-2.5 px-3">Days Open</th>
                  <th className="py-2.5 px-3">Company / Dept</th>
                  <th className="py-2.5 px-3">Requestor</th>
                  <th className="py-2.5 px-3">Task & Exception Details</th>
                  <th className="py-2.5 px-3">Location</th>
                  <th className="py-2.5 px-3">Worked By</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {REPORT_4_AGING_BACKLOG.map((r, i) => (
                  <tr key={i} className="hover:bg-canvas/60">
                    <td className="py-3 px-3 font-mono">{r.dateStarted}</td>
                    <td className="py-3 px-3 font-mono font-bold text-rose-600">
                      {r.daysOpen} Days
                    </td>
                    <td className="py-3 px-3 font-semibold text-ink">{r.companyDept}</td>
                    <td className="py-3 px-3">{r.requestor}</td>
                    <td className="py-3 px-3 text-ink-subtle max-w-xs">{r.taskDescription}</td>
                    <td className="py-3 px-3">{r.location}</td>
                    <td className="py-3 px-3">{r.workedBy}</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-semibold text-[11px]">
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Report 5: Transit Lag Disaggregation */}
        {activeReport === 5 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-canvas text-ink-subtle text-[11px] font-medium border-y border-line">
                  <th className="py-2.5 px-3">Location (Station)</th>
                  <th className="py-2.5 px-3">Support Mode</th>
                  <th className="py-2.5 px-3">Completed</th>
                  <th className="py-2.5 px-3">Mean Active Labor</th>
                  <th className="py-2.5 px-3">Mean Turnaround</th>
                  <th className="py-2.5 px-3">Mean Transit Lag</th>
                  <th className="py-2.5 px-3">Lag-to-Labor Ratio</th>
                  <th className="py-2.5 px-3">Strategic Recommendation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {REPORT_5_TRANSIT_LAG.map((r) => (
                  <tr key={r.location} className="hover:bg-canvas/60">
                    <td className="py-3 px-3 font-bold text-ink">{r.location}</td>
                    <td className="py-3 px-3">{r.supportMode}</td>
                    <td className="py-3 px-3 font-mono">{r.completedTickets}</td>
                    <td className="py-3 px-3 font-mono text-emerald-700 font-semibold">
                      {r.meanLaborMins} mins
                    </td>
                    <td className="py-3 px-3 font-mono">{r.meanTurnaroundDays} days</td>
                    <td className="py-3 px-3 font-mono text-amber-700">
                      {r.meanTransitLagDays} days
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-ink">
                      {r.lagToLaborRatio}x
                    </td>
                    <td className="py-3 px-3 font-medium text-brand">
                      {r.recommendedAction}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Report 6: Hardware Vulnerability Matrix */}
        {activeReport === 6 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-canvas text-ink-subtle text-[11px] font-medium border-y border-line">
                  <th className="py-2.5 px-3">Terminal Location</th>
                  <th className="py-2.5 px-3">Company</th>
                  <th className="py-2.5 px-3">Top Failure Task</th>
                  <th className="py-2.5 px-3">Incidents Logged</th>
                  <th className="py-2.5 px-3">Total Downtime</th>
                  <th className="py-2.5 px-3">Risk Score</th>
                  <th className="py-2.5 px-3">Preventive Staging Recommendation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {REPORT_6_HARDWARE_HOTSPOTS.map((r) => (
                  <tr key={r.location} className="hover:bg-canvas/60">
                    <td className="py-3 px-3 font-bold text-ink">{r.location}</td>
                    <td className="py-3 px-3">{r.company}</td>
                    <td className="py-3 px-3 font-semibold">{r.topFailureTask}</td>
                    <td className="py-3 px-3 font-mono">{r.incidentsLogged}</td>
                    <td className="py-3 px-3 font-mono">{r.totalDownTimeHours} hrs</td>
                    <td className="py-3 px-3 font-mono font-bold text-rose-600">
                      {r.severityRiskScore} / 10
                    </td>
                    <td className="py-3 px-3 font-medium text-brand">
                      {r.stagingRecommendation}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Report 7: PMS Compliance */}
        {activeReport === 7 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-canvas text-ink-subtle text-[11px] font-medium border-y border-line">
                  <th className="py-2.5 px-3">Terminal Location</th>
                  <th className="py-2.5 px-3">Department</th>
                  <th className="py-2.5 px-3">Devices on File</th>
                  <th className="py-2.5 px-3">PMS Conducted</th>
                  <th className="py-2.5 px-3">Compliance %</th>
                  <th className="py-2.5 px-3">Last Completed</th>
                  <th className="py-2.5 px-3">Serviced By</th>
                  <th className="py-2.5 px-3">Audit Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {REPORT_7_PMS_COMPLIANCE.map((r) => (
                  <tr key={r.terminalLocation} className="hover:bg-canvas/60">
                    <td className="py-3 px-3 font-bold text-ink">{r.terminalLocation}</td>
                    <td className="py-3 px-3">{r.department}</td>
                    <td className="py-3 px-3 font-mono">{r.totalDevices}</td>
                    <td className="py-3 px-3 font-mono">{r.pmsConducted}</td>
                    <td className="py-3 px-3 font-mono font-bold text-ink">
                      {r.complianceRate.toFixed(1)}%
                    </td>
                    <td className="py-3 px-3 font-mono">{r.lastCompletedDate}</td>
                    <td className="py-3 px-3">{r.servicedBy}</td>
                    <td className="py-3 px-3">
                      {r.status === 'Compliant' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold text-[11px]">
                          <CheckCircle2 className="w-3 h-3" /> Compliant
                        </span>
                      )}
                      {r.status === 'Due' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 font-semibold text-[11px]">
                          Routine PMS Due
                        </span>
                      )}
                      {r.status === 'Critical Overdue' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-semibold text-[11px]">
                          <ShieldAlert className="w-3 h-3" /> 60+ Days Overdue
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Report 8: Chronic Repeat Requestors */}
        {activeReport === 8 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-canvas text-ink-subtle text-[11px] font-medium border-y border-line">
                  <th className="py-2.5 px-3">Requestor Name</th>
                  <th className="py-2.5 px-3">Department</th>
                  <th className="py-2.5 px-3">Terminal Location</th>
                  <th className="py-2.5 px-3">Repeat Incidents</th>
                  <th className="py-2.5 px-3">Dominant Issue</th>
                  <th className="py-2.5 px-3">Remote Fix %</th>
                  <th className="py-2.5 px-3">Recommended SOP Training Target</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {REPORT_8_CHRONIC_REQUESTORS.map((r) => (
                  <tr key={r.requestorName} className="hover:bg-canvas/60">
                    <td className="py-3 px-3 font-bold text-ink">{r.requestorName}</td>
                    <td className="py-3 px-3">{r.department}</td>
                    <td className="py-3 px-3">{r.location}</td>
                    <td className="py-3 px-3 font-mono font-bold text-amber-700">
                      {r.repeatIncidents} tickets
                    </td>
                    <td className="py-3 px-3">{r.dominantTask}</td>
                    <td className="py-3 px-3 font-mono">{r.remoteResolutionRate}%</td>
                    <td className="py-3 px-3 font-medium text-brand">
                      {r.sopTrainingTarget}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
