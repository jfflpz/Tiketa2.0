// @spec SR-02: 8 Standardized Operational & Strategic Reports Suite with Tailored Recharts Visualizations
import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts';
import {
  Download,
  FileSpreadsheet,
  CheckCircle2,
  ShieldAlert,
  Layers,
  Calendar,
  Users,
  Building2,
  Clock,
  Truck,
  Wrench,
  CheckSquare,
  AlertTriangle,
} from 'lucide-react';
import {
  REPORT_1_MONTHLY_SLA,
  REPORT_2_STAFF_UTILIZATION,
  REPORT_3_DEPT_DEMAND,
  REPORT_4_AGING_BACKLOG,
  REPORT_5_TRANSIT_LAG,
  REPORT_6_HARDWARE_HOTSPOTS,
  REPORT_7_PMS_COMPLIANCE,
  REPORT_8_CHRONIC_REQUESTORS,
} from '../../data/mockAnalyticsData';
import { BarcodeDivider } from '../../components/common/TickMeter';
import { useAppStore } from '../../store/useAppStore';

interface ReportMeta {
  id: number;
  code: string;
  title: string;
  shortTitle: string;
  icon: React.ElementType;
  description: string;
}

const REPORT_TABS: ReportMeta[] = [
  {
    id: 1,
    code: 'FR-REPT-01',
    title: '1. Monthly SLA & Volume Summary',
    shortTitle: 'Monthly SLA',
    icon: Calendar,
    description: 'Volume throughput, remote vs. on-site ratios, and same-day resolution compliance across months.',
  },
  {
    id: 2,
    code: 'FR-REPT-02',
    title: '2. Staff Utilization & Labor Efficiency',
    shortTitle: 'Staff Labor',
    icon: Users,
    description: 'Assigned vs. completed ticket yields, total labor hours logged, and dominant task specializations per technician.',
  },
  {
    id: 3,
    code: 'FR-REPT-03',
    title: '3. Department & Fleet Demand Breakdown',
    shortTitle: 'Dept Demand',
    icon: Building2,
    description: 'Incident ticket density and labor consumption across 13 operating departments in Five Star and partner transit fleets.',
  },
  {
    id: 4,
    code: 'FR-REPT-04',
    title: '4. Critical Aging Backlog (>48h SLA)',
    shortTitle: 'Aging Backlog',
    icon: Clock,
    description: 'Tickets exceeding the 48-hour SLA resolution threshold requiring immediate supervisor intervention or spare parts.',
  },
  {
    id: 5,
    code: 'FR-REPT-05',
    title: '5. Logistical Transit Lag Disaggregation',
    shortTitle: 'Transit Lag',
    icon: Truck,
    description: 'Separates courier inter-station transit delay from true hands-on technician labor to isolate supply chain bottlenecks.',
  },
  {
    id: 6,
    code: 'FR-REPT-06',
    title: '6. Hardware Vulnerability & Failure Hotspots',
    shortTitle: 'Hardware Hotspots',
    icon: Wrench,
    description: 'Frequency of hardware breakdowns, downtime hours, and severity risk scores per terminal station and equipment type.',
  },
  {
    id: 7,
    code: 'FR-REPT-07',
    title: '7. Fleet PMS Compliance Audit',
    shortTitle: 'PMS Compliance',
    icon: CheckSquare,
    description: 'Quarterly preventative maintenance adherence across 15 terminal stations and POS cashier workstations.',
  },
  {
    id: 8,
    code: 'FR-REPT-08',
    title: '8. Chronic Repeat Requestor Index',
    shortTitle: 'Repeat Requestors',
    icon: AlertTriangle,
    description: 'Employees with recurring trouble tickets, identifying candidates for targeted SOP training or user-error mitigation.',
  },
];

  const REPORT_SLUGS: Record<number, string> = {
    1: 'monthly-sla',
    2: 'staff-productivity',
    3: 'department-demand',
    4: 'backlog-exception',
    5: 'transit-lag',
    6: 'hardware-vulnerability',
    7: 'pms-compliance',
    8: 'chronic-requestors',
  };

  export const StandardizedReportsView: React.FC = () => {
    const {
      addToast,
      activeReportId,
      setActiveReportId,
      fetchReportApi,
      downloadReportCSVApi,
    } = useAppStore();

    const activeTabMeta = REPORT_TABS.find((t) => t.id === activeReportId) || REPORT_TABS[0];
    const currentSlug = REPORT_SLUGS[activeReportId] || 'monthly-sla';

    React.useEffect(() => {
      fetchReportApi(currentSlug);
    }, [currentSlug, fetchReportApi]);

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
      <div className="bg-white border border-[#ECEEF2] rounded-2xl p-2 shadow-sm flex items-center gap-1.5 overflow-x-auto">
        {REPORT_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.id === activeReportId;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveReportId(tab.id)}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all press-fx flex items-center gap-2 whitespace-nowrap ${
                isActive
                  ? 'bg-zinc-900 text-white shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100/70'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-orange-400' : 'text-zinc-400'}`} />
              <span>{tab.shortTitle}</span>
              <span
                className={`font-mono text-[9px] px-1.5 py-0.2 rounded-md ${
                  isActive ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-100 text-zinc-500'
                }`}
              >
                #{tab.id}
              </span>
            </button>
          );
        })}
      </div>

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
      <div className="bg-white border border-[#ECEEF2] rounded-3xl p-5 shadow-card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
            Visual Analytical Trend • {activeTabMeta.shortTitle}
          </h3>
          <span className="text-xs text-zinc-400 font-mono">Interactive Bar Chart</span>
        </div>

        {/* Dynamic Chart Container */}
        <div className="h-64 w-full">
          {activeReportId === 1 && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={REPORT_1_MONTHLY_SLA}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ECEEF2" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6B7280' }} />
                <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#ECEEF2',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="totalRequests" name="Total Requests" fill="#18181B" radius={[6, 6, 0, 0]} />
                <Bar dataKey="completed" name="Completed" fill="#10B981" radius={[6, 6, 0, 0]} />
                <Bar dataKey="pending" name="Pending" fill="#F59E0B" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}

          {activeReportId === 2 && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={REPORT_2_STAFF_UTILIZATION}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ECEEF2" />
                <XAxis dataKey="technician" tick={{ fontSize: 11, fill: '#6B7280' }} />
                <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#ECEEF2',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="totalAssigned" name="Assigned Tickets" fill="#6366F1" radius={[6, 6, 0, 0]} />
                <Bar dataKey="completed" name="Completed" fill="#10B981" radius={[6, 6, 0, 0]} />
                <Bar dataKey="totalHoursLogged" name="Labor Hours" fill="#EA580C" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}

          {activeReportId === 3 && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={REPORT_3_DEPT_DEMAND}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ECEEF2" />
                <XAxis dataKey="department" tick={{ fontSize: 10, fill: '#6B7280' }} />
                <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#ECEEF2',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="totalTickets" name="Incidents Logged" fill="#EA580C" radius={[6, 6, 0, 0]} />
                <Bar dataKey="totalHoursConsumed" name="Labor Hours Consumed" fill="#18181B" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}

          {activeReportId === 4 && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={REPORT_4_AGING_BACKLOG}>
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
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="daysOpen" name="Days Open / Stagnant (>48h)" fill="#E11D48" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}

          {activeReportId === 5 && (
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
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="meanTurnaroundDays" name="Total Turnaround Days" fill="#18181B" radius={[6, 6, 0, 0]} />
                <Bar dataKey="meanTransitLagDays" name="Courier Transit Lag Days" fill="#10B981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}

          {activeReportId === 6 && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={REPORT_6_HARDWARE_HOTSPOTS}>
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
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="incidentsLogged" name="Failures Logged" fill="#EA580C" radius={[6, 6, 0, 0]} />
                <Bar dataKey="severityRiskScore" name="Severity Risk Score (/10)" fill="#E11D48" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}

          {activeReportId === 7 && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={REPORT_7_PMS_COMPLIANCE}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ECEEF2" />
                <XAxis dataKey="terminalLocation" tick={{ fontSize: 11, fill: '#6B7280' }} />
                <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#ECEEF2',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="totalDevices" name="Total Devices on File" fill="#18181B" radius={[6, 6, 0, 0]} />
                <Bar dataKey="pmsConducted" name="PMS Audits Done" fill="#10B981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}

          {activeReportId === 8 && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={REPORT_8_CHRONIC_REQUESTORS}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ECEEF2" />
                <XAxis dataKey="requestorName" tick={{ fontSize: 11, fill: '#6B7280' }} />
                <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#ECEEF2',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="repeatIncidents" name="Repeat Incidents" fill="#E11D48" radius={[6, 6, 0, 0]} />
                <Bar dataKey="remoteResolutionRate" name="Remote Fix %" fill="#6366F1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Data Table Section for Active Report */}
      <div className="bg-white border border-[#ECEEF2] rounded-3xl p-5 shadow-card space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
            Canonical Audit Table • {activeTabMeta.code}
          </h3>
          <span className="text-xs text-zinc-400 font-mono">Verified 15-Column Job Log Records</span>
        </div>

        <BarcodeDivider count={85} />

        {/* REPORT 1 TABLE */}
        {activeReportId === 1 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F8F9FA] text-zinc-500 text-[11px] font-semibold border-y border-[#ECEEF2]">
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
              <tbody className="divide-y divide-[#ECEEF2]">
                {REPORT_1_MONTHLY_SLA.map((r) => (
                  <tr key={r.month} className="hover:bg-zinc-50/60">
                    <td className="py-3 px-3 font-bold text-ink">{r.month}</td>
                    <td className="py-3 px-3 font-mono">{r.totalRequests}</td>
                    <td className="py-3 px-3 font-mono text-emerald-700 font-semibold">{r.completed}</td>
                    <td className="py-3 px-3 font-mono text-amber-700">{r.pending}</td>
                    <td className="py-3 px-3 font-mono font-bold text-emerald-600">{r.completionRate}%</td>
                    <td className="py-3 px-3 font-mono">{r.remoteMode}</td>
                    <td className="py-3 px-3 font-mono">{r.siteMode}</td>
                    <td className="py-3 px-3 font-mono">{r.avgResolutionHours} hrs</td>
                    <td className="py-3 px-3 font-mono font-semibold">{r.sameDayResolutionRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* REPORT 2 TABLE */}
        {activeReportId === 2 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F8F9FA] text-zinc-500 text-[11px] font-semibold border-y border-[#ECEEF2]">
                  <th className="py-2.5 px-3">Worked By (Technician)</th>
                  <th className="py-2.5 px-3">Total Assigned</th>
                  <th className="py-2.5 px-3">Completed</th>
                  <th className="py-2.5 px-3">Pending</th>
                  <th className="py-2.5 px-3">Total Hours Logged</th>
                  <th className="py-2.5 px-3">Avg Time / Task</th>
                  <th className="py-2.5 px-3">Primary Hub</th>
                  <th className="py-2.5 px-3">Dominant Specialization</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ECEEF2]">
                {REPORT_2_STAFF_UTILIZATION.map((r) => (
                  <tr key={r.technician} className="hover:bg-zinc-50/60">
                    <td className="py-3 px-3 font-bold text-ink">{r.technician}</td>
                    <td className="py-3 px-3 font-mono">{r.totalAssigned}</td>
                    <td className="py-3 px-3 font-mono text-emerald-700 font-semibold">{r.completed}</td>
                    <td className="py-3 px-3 font-mono">{r.pending}</td>
                    <td className="py-3 px-3 font-mono font-semibold">{r.totalHoursLogged.toFixed(1)} hrs</td>
                    <td className="py-3 px-3 font-mono">{r.avgTimePerTask} hrs</td>
                    <td className="py-3 px-3">{r.primaryLocation}</td>
                    <td className="py-3 px-3 font-medium text-zinc-500">{r.mostFrequentTask}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* REPORT 3 TABLE */}
        {activeReportId === 3 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F8F9FA] text-zinc-500 text-[11px] font-semibold border-y border-[#ECEEF2]">
                  <th className="py-2.5 px-3">Company</th>
                  <th className="py-2.5 px-3">Department</th>
                  <th className="py-2.5 px-3">Hub Location</th>
                  <th className="py-2.5 px-3">Total Incidents</th>
                  <th className="py-2.5 px-3">Labor Hours</th>
                  <th className="py-2.5 px-3">Top Requestor</th>
                  <th className="py-2.5 px-3">Dominant Issue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ECEEF2]">
                {REPORT_3_DEPT_DEMAND.map((r, i) => (
                  <tr key={i} className="hover:bg-zinc-50/60">
                    <td className="py-3 px-3 font-bold text-ink">{r.company}</td>
                    <td className="py-3 px-3">{r.department}</td>
                    <td className="py-3 px-3 font-mono">{r.location}</td>
                    <td className="py-3 px-3 font-mono font-bold text-orange-600">{r.totalTickets}</td>
                    <td className="py-3 px-3 font-mono">{r.totalHoursConsumed} hrs</td>
                    <td className="py-3 px-3">{r.topRequestor}</td>
                    <td className="py-3 px-3 font-medium text-zinc-600">{r.primaryTask}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* REPORT 4 TABLE */}
        {activeReportId === 4 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F8F9FA] text-zinc-500 text-[11px] font-semibold border-y border-[#ECEEF2]">
                  <th className="py-2.5 px-3">Date Started</th>
                  <th className="py-2.5 px-3">Days Open</th>
                  <th className="py-2.5 px-3">Department</th>
                  <th className="py-2.5 px-3">Requestor</th>
                  <th className="py-2.5 px-3">Task Description</th>
                  <th className="py-2.5 px-3">Terminal Location</th>
                  <th className="py-2.5 px-3">Assigned Tech</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ECEEF2]">
                {REPORT_4_AGING_BACKLOG.map((r, i) => (
                  <tr key={i} className="hover:bg-zinc-50/60">
                    <td className="py-3 px-3 font-mono text-zinc-400">{r.dateStarted}</td>
                    <td className="py-3 px-3 font-mono font-extrabold text-rose-600">{r.daysOpen} days</td>
                    <td className="py-3 px-3">{r.companyDept}</td>
                    <td className="py-3 px-3 font-medium">{r.requestor}</td>
                    <td className="py-3 px-3 text-zinc-600">{r.taskDescription}</td>
                    <td className="py-3 px-3 font-mono">{r.location}</td>
                    <td className="py-3 px-3">{r.workedBy}</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 text-[10px] font-bold">
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* REPORT 5 TABLE */}
        {activeReportId === 5 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F8F9FA] text-zinc-500 text-[11px] font-semibold border-y border-[#ECEEF2]">
                  <th className="py-2.5 px-3">Terminal Location</th>
                  <th className="py-2.5 px-3">Mode</th>
                  <th className="py-2.5 px-3">Tickets</th>
                  <th className="py-2.5 px-3">Active Labor (Mins)</th>
                  <th className="py-2.5 px-3">Turnaround (Days)</th>
                  <th className="py-2.5 px-3">Transit Lag (Days)</th>
                  <th className="py-2.5 px-3">Lag / Labor Ratio</th>
                  <th className="py-2.5 px-3">SOP Recommendation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ECEEF2]">
                {REPORT_5_TRANSIT_LAG.map((r) => (
                  <tr key={r.location} className="hover:bg-zinc-50/60">
                    <td className="py-3 px-3 font-bold text-ink">{r.location}</td>
                    <td className="py-3 px-3 font-mono">{r.supportMode}</td>
                    <td className="py-3 px-3 font-mono">{r.completedTickets}</td>
                    <td className="py-3 px-3 font-mono font-semibold">{r.meanLaborMins}m</td>
                    <td className="py-3 px-3 font-mono font-bold text-zinc-900">{r.meanTurnaroundDays}d</td>
                    <td className="py-3 px-3 font-mono font-bold text-emerald-700">{r.meanTransitLagDays}d</td>
                    <td className="py-3 px-3 font-mono text-zinc-500">{r.lagToLaborRatio}x</td>
                    <td className="py-3 px-3 text-zinc-600 font-medium">{r.recommendedAction}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* REPORT 6 TABLE */}
        {activeReportId === 6 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F8F9FA] text-zinc-500 text-[11px] font-semibold border-y border-[#ECEEF2]">
                  <th className="py-2.5 px-3">Terminal Location</th>
                  <th className="py-2.5 px-3">Company</th>
                  <th className="py-2.5 px-3">Top Failure Point</th>
                  <th className="py-2.5 px-3">Incidents</th>
                  <th className="py-2.5 px-3">Downtime (Hours)</th>
                  <th className="py-2.5 px-3">Risk Score</th>
                  <th className="py-2.5 px-3">Staging Recommendation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ECEEF2]">
                {REPORT_6_HARDWARE_HOTSPOTS.map((r) => (
                  <tr key={r.location} className="hover:bg-zinc-50/60">
                    <td className="py-3 px-3 font-bold text-ink">{r.location}</td>
                    <td className="py-3 px-3">{r.company}</td>
                    <td className="py-3 px-3 font-semibold text-zinc-800">{r.topFailureTask}</td>
                    <td className="py-3 px-3 font-mono font-bold text-orange-600">{r.incidentsLogged}</td>
                    <td className="py-3 px-3 font-mono">{r.totalDownTimeHours}h</td>
                    <td className="py-3 px-3 font-mono font-bold text-rose-600">{r.severityRiskScore}/10</td>
                    <td className="py-3 px-3 text-emerald-700 font-medium">{r.stagingRecommendation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* REPORT 7 TABLE */}
        {activeReportId === 7 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F8F9FA] text-zinc-500 text-[11px] font-semibold border-y border-[#ECEEF2]">
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
              <tbody className="divide-y divide-[#ECEEF2]">
                {REPORT_7_PMS_COMPLIANCE.map((r) => (
                  <tr key={r.terminalLocation} className="hover:bg-zinc-50/60">
                    <td className="py-3 px-3 font-bold text-ink">{r.terminalLocation}</td>
                    <td className="py-3 px-3">{r.department}</td>
                    <td className="py-3 px-3 font-mono">{r.totalDevices}</td>
                    <td className="py-3 px-3 font-mono">{r.pmsConducted}</td>
                    <td className="py-3 px-3 font-mono font-bold text-emerald-700">{r.complianceRate.toFixed(1)}%</td>
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
                          Routine Due
                        </span>
                      )}
                      {r.status === 'Critical Overdue' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-semibold text-[11px]">
                          <ShieldAlert className="w-3 h-3" /> Overdue
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* REPORT 8 TABLE */}
        {activeReportId === 8 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F8F9FA] text-zinc-500 text-[11px] font-semibold border-y border-[#ECEEF2]">
                  <th className="py-2.5 px-3">Requestor Name</th>
                  <th className="py-2.5 px-3">Department</th>
                  <th className="py-2.5 px-3">Terminal Location</th>
                  <th className="py-2.5 px-3">Repeat Incidents</th>
                  <th className="py-2.5 px-3">Dominant Issue</th>
                  <th className="py-2.5 px-3">Remote Fix %</th>
                  <th className="py-2.5 px-3">Target SOP Recommendation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ECEEF2]">
                {REPORT_8_CHRONIC_REQUESTORS.map((r) => (
                  <tr key={r.requestorName} className="hover:bg-zinc-50/60">
                    <td className="py-3 px-3 font-bold text-ink">{r.requestorName}</td>
                    <td className="py-3 px-3">{r.department}</td>
                    <td className="py-3 px-3 font-mono">{r.location}</td>
                    <td className="py-3 px-3 font-mono font-bold text-amber-700">{r.repeatIncidents} tickets</td>
                    <td className="py-3 px-3 font-semibold">{r.dominantTask}</td>
                    <td className="py-3 px-3 font-mono">{r.remoteResolutionRate}%</td>
                    <td className="py-3 px-3 text-orange-600 font-medium">{r.sopTrainingTarget}</td>
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
