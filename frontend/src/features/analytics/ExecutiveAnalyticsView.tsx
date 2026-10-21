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
import { Download, FileSpreadsheet, Layers, ShieldAlert, CheckCircle2 } from 'lucide-react';
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
import { MetricCard } from '../../components/common/MetricCard';
import { BarcodeDivider } from '../../components/common/TickMeter';
import { useAppStore } from '../../store/useAppStore';

export const ExecutiveAnalyticsView: React.FC = () => {
  const { addToast } = useAppStore();
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

      {/* Top 5 KPI Cards (FR-DASH-01) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <MetricCard label="Total Tickets (Q3-Q4)" value="391" subLabel="11 Companies" />
        <MetricCard label="Same-Day Resolution" value="84.8%" subLabel="Target >80%" />
        <MetricCard label="Mean Hands-On Labor" value="41 mins" subLabel="Excludes transit" />
        <MetricCard label="Remote vs On-Site" value="69% / 31%" subLabel="REM vs SITE" />
        <MetricCard label="PMS Compliance" value="87.5%" subLabel="15 Terminal Hubs" />
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
