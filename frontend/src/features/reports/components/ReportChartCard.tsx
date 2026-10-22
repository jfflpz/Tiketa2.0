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
import type {
  MonthlySlaRow,
  StaffUtilizationRow,
  DeptDemandRow,
  AgingBacklogRow,
  TransitLagRow,
  HardwareVulnerabilityRow,
  PmsComplianceRow,
  ChronicRequestorRow,
  ReportMeta,
} from '../types/reportSchemas';

export interface ReportChartCardProps {
  activeReportId: number;
  activeTabMeta: ReportMeta;
  report1Data: MonthlySlaRow[];
  report2Data: StaffUtilizationRow[];
  report3Data: DeptDemandRow[];
  report4Data: AgingBacklogRow[];
  report5Data: TransitLagRow[];
  report6Data: HardwareVulnerabilityRow[];
  report7Data: PmsComplianceRow[];
  report8Data: ChronicRequestorRow[];
}

const tooltipStyle = {
  backgroundColor: '#FFFFFF',
  borderColor: '#ECEEF2',
  borderRadius: '12px',
  fontSize: '12px',
};

const tickStyle = { fontSize: 11, fill: '#6B7280' };
const smallTickStyle = { fontSize: 10, fill: '#6B7280' };
const legendStyle = { fontSize: '11px', paddingTop: '10px' };

export const ReportChartCard: React.FC<ReportChartCardProps> = ({
  activeReportId,
  activeTabMeta,
  report1Data,
  report2Data,
  report3Data,
  report4Data,
  report5Data,
  report6Data,
  report7Data,
  report8Data,
}) => {
  return (
    <div className="bg-surface border border-line rounded-3xl p-5 shadow-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-ink-subtle">
          Visual Analytical Trend • {activeTabMeta.shortTitle}
        </h3>
        <span className="text-xs text-ink-subtle font-mono">Interactive Bar Chart</span>
      </div>

      <div className="h-64 w-full">
        {activeReportId === 1 && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={report1Data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ECEEF2" />
              <XAxis dataKey="month" tick={tickStyle} />
              <YAxis tick={tickStyle} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={legendStyle} />
              <Bar dataKey="totalRequests" name="Total Requests" fill="#18181B" radius={[6, 6, 0, 0]} />
              <Bar dataKey="completed" name="Completed" fill="#10B981" radius={[6, 6, 0, 0]} />
              <Bar dataKey="pending" name="Pending" fill="#F59E0B" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}

        {activeReportId === 2 && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={report2Data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ECEEF2" />
              <XAxis dataKey="technician" tick={tickStyle} />
              <YAxis tick={tickStyle} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={legendStyle} />
              <Bar dataKey="totalAssigned" name="Assigned Tickets" fill="#6366F1" radius={[6, 6, 0, 0]} />
              <Bar dataKey="completed" name="Completed" fill="#10B981" radius={[6, 6, 0, 0]} />
              <Bar dataKey="totalHoursLogged" name="Labor Hours" fill="#EA580C" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}

        {activeReportId === 3 && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={report3Data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ECEEF2" />
              <XAxis dataKey="department" tick={smallTickStyle} />
              <YAxis tick={tickStyle} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={legendStyle} />
              <Bar dataKey="totalTickets" name="Incidents Logged" fill="#EA580C" radius={[6, 6, 0, 0]} />
              <Bar dataKey="totalHoursConsumed" name="Labor Hours Consumed" fill="#18181B" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}

        {activeReportId === 4 && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={report4Data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ECEEF2" />
              <XAxis dataKey="location" tick={tickStyle} />
              <YAxis tick={tickStyle} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={legendStyle} />
              <Bar dataKey="daysOpen" name="Days Open / Stagnant (>48h)" fill="#E11D48" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}

        {activeReportId === 5 && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={report5Data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ECEEF2" />
              <XAxis dataKey="location" tick={tickStyle} />
              <YAxis tick={tickStyle} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={legendStyle} />
              <Bar dataKey="meanTurnaroundDays" name="Total Turnaround Days" fill="#18181B" radius={[6, 6, 0, 0]} />
              <Bar dataKey="meanTransitLagDays" name="Courier Transit Lag Days" fill="#10B981" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}

        {activeReportId === 6 && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={report6Data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ECEEF2" />
              <XAxis dataKey="location" tick={tickStyle} />
              <YAxis tick={tickStyle} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={legendStyle} />
              <Bar dataKey="incidentsLogged" name="Failures Logged" fill="#EA580C" radius={[6, 6, 0, 0]} />
              <Bar dataKey="severityRiskScore" name="Severity Risk Score (/10)" fill="#E11D48" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}

        {activeReportId === 7 && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={report7Data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ECEEF2" />
              <XAxis dataKey="terminalLocation" tick={tickStyle} />
              <YAxis tick={tickStyle} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={legendStyle} />
              <Bar dataKey="totalDevices" name="Total Devices on File" fill="#18181B" radius={[6, 6, 0, 0]} />
              <Bar dataKey="pmsConducted" name="PMS Audits Done" fill="#10B981" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}

        {activeReportId === 8 && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={report8Data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ECEEF2" />
              <XAxis dataKey="requestorName" tick={tickStyle} />
              <YAxis tick={tickStyle} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={legendStyle} />
              <Bar dataKey="repeatIncidents" name="Repeat Incidents" fill="#E11D48" radius={[6, 6, 0, 0]} />
              <Bar dataKey="remoteResolutionRate" name="Remote Fix %" fill="#6366F1" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};
