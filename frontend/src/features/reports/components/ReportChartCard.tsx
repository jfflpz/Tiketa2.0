import React from 'react';
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  LabelList,
} from 'recharts';
import { BP_COLORS, BP_TYPOGRAPHY } from '../export/bpPresentationStandards';
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
  fontFamily: BP_TYPOGRAPHY.FONT_FAMILY,
  fontFeatureSettings: 'normal',
  fontVariant: 'normal',
  color: BP_COLORS.TEXT,
};

const tickStyle = {
  fontSize: 11,
  fill: BP_COLORS.TEXT,
  fontFamily: BP_TYPOGRAPHY.FONT_FAMILY,
  fontFeatureSettings: 'normal',
  fontVariant: 'normal',
};
const smallTickStyle = {
  fontSize: 10,
  fill: BP_COLORS.TEXT,
  fontFamily: BP_TYPOGRAPHY.FONT_FAMILY,
  fontFeatureSettings: 'normal',
  fontVariant: 'normal',
};
const legendStyle = {
  fontSize: '11px',
  paddingTop: '10px',
  fontFamily: BP_TYPOGRAPHY.FONT_FAMILY,
  fontFeatureSettings: 'normal',
  fontVariant: 'normal',
};

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
      {activeReportId === 1 && (() => {
        const showLabels = report1Data.length <= 4;
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={report1Data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ECEEF2" />
              <XAxis dataKey="month" tick={tickStyle} />
              <YAxis
                domain={showLabels ? [0, (dataMax: number) => Math.ceil(dataMax * 1.15)] : [0, 'auto']}
                tick={tickStyle}
              />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={legendStyle} />
              <Bar dataKey="totalRequests" name="Total Requests" fill={BP_COLORS.SEQUENCE[0]} radius={[6, 6, 0, 0]}>
                {showLabels && <LabelList dataKey="totalRequests" position="top" offset={6} fill={BP_COLORS.TEXT} fontSize={10} />}
              </Bar>
              <Bar dataKey="completed" name="Completed" fill={BP_COLORS.SEQUENCE[1]} radius={[6, 6, 0, 0]}>
                {showLabels && <LabelList dataKey="completed" position="top" offset={6} fill={BP_COLORS.TEXT} fontSize={10} />}
              </Bar>
              <Bar dataKey="pending" name="Pending" fill={BP_COLORS.SEQUENCE[2]} radius={[6, 6, 0, 0]}>
                {showLabels && <LabelList dataKey="pending" position="top" offset={6} fill={BP_COLORS.TEXT} fontSize={10} />}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );
      })()}

      {activeReportId === 2 && (() => {
        const staffData = report2Data.filter(
          (d) =>
            !d.technician.toLowerCase().includes('unassigned') &&
            !d.technician.toLowerCase().includes('general it pool')
        );
        const showLabels = staffData.length <= 8;
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={staffData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ECEEF2" />
              <XAxis
                dataKey="technician"
                interval={0}
                height={50}
                angle={-15}
                textAnchor="end"
                tick={smallTickStyle}
              />
              <YAxis
                domain={showLabels ? [0, (dataMax: number) => Math.ceil(dataMax * 1.15)] : [0, 'auto']}
                tick={tickStyle}
              />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={legendStyle} />
              <Bar dataKey="totalAssigned" name="Assigned Tickets" fill={BP_COLORS.SEQUENCE[0]} radius={[6, 6, 0, 0]}>
                {showLabels && <LabelList dataKey="totalAssigned" position="top" offset={6} fill={BP_COLORS.TEXT} fontSize={10} />}
              </Bar>
              <Bar dataKey="completed" name="Completed" fill={BP_COLORS.SEQUENCE[1]} radius={[6, 6, 0, 0]}>
                {showLabels && <LabelList dataKey="completed" position="top" offset={6} fill={BP_COLORS.TEXT} fontSize={10} />}
              </Bar>
              <Bar dataKey="totalHoursLogged" name="Labor Hours" fill={BP_COLORS.SEQUENCE[2]} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );
      })()}

    {activeReportId === 3 && (() => {
      // Group multi-terminal demand records into unique company-wide departments
      const groupedDeptMap = new Map<string, { department: string; totalTickets: number; totalHoursConsumed: number }>();
      for (const row  
        of report3Data) {
        const dept = row.department?.trim() || 'Unspecified';
        const existing = groupedDeptMap.get(dept);
        if (existing) {
          existing.totalTickets += row.totalTickets || 0;
          existing.totalHoursConsumed = Math.round(((existing.totalHoursConsumed || 0) + (row.totalHoursConsumed || 0)) * 100) / 100;
        } else {
          groupedDeptMap.set(dept, {
            department: dept,
            totalTickets: row.totalTickets || 0,
            totalHoursConsumed: Math.round((row.totalHoursConsumed || 0) * 100) / 100,
          });
        }
      }

      // Sort descending by incident density so peak departments appear first
      const chartData = Array.from(groupedDeptMap.values()).sort(
        (a, b) => b.totalTickets - a.totalTickets || a.department.localeCompare(b.department)
      );
      const showLabels = chartData.length <= 13;

      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ECEEF2" />
            <XAxis
              dataKey="department"
              interval={0}
              height={60}
              angle={-20}
              textAnchor="end"
              tick={smallTickStyle}
            />
            <YAxis
              domain={showLabels ? [0, (dataMax: number) => Math.ceil(dataMax * 1.15)] : [0, 'auto']}
              tick={tickStyle}
            />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={legendStyle} />
            <Bar dataKey="totalTickets" name="Incidents Logged" fill={BP_COLORS.SEQUENCE[0]} radius={[6, 6, 0, 0]}>
              {showLabels && <LabelList dataKey="totalTickets" position="top" offset={6} fill={BP_COLORS.TEXT} fontSize={10} />}
            </Bar>
            <Bar dataKey="totalHoursConsumed" name="Labor Hours Consumed" fill={BP_COLORS.SEQUENCE[1]} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      );
    })()}

      {activeReportId === 4 && (() => {
        const showLabels = report4Data.length <= 10;
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={report4Data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ECEEF2" />
              <XAxis dataKey="location" tick={tickStyle} />
              <YAxis
                domain={showLabels ? [0, (dataMax: number) => Math.ceil(dataMax * 1.15)] : [0, 'auto']}
                tick={tickStyle}
              />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={legendStyle} />
              <Bar dataKey="daysOpen" name="Days Open / Stagnant (>48h)" fill={BP_COLORS.SEQUENCE[1]} radius={[6, 6, 0, 0]}>
                {report4Data.map((_, index) => (
                  <Cell
                    key={`cell-aging-${index}`}
                    fill={BP_COLORS.SEQUENCE[index % BP_COLORS.SEQUENCE.length]}
                  />
                ))}
                {showLabels && <LabelList dataKey="daysOpen" position="top" offset={6} fill={BP_COLORS.TEXT} fontSize={10} />}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );
      })()}
        {activeReportId === 5 && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={report5Data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ECEEF2" />
              <XAxis dataKey="location" tick={tickStyle} />
              <YAxis tick={tickStyle} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={legendStyle} />
              <Bar dataKey="meanTurnaroundDays" name="Total Turnaround Days" fill={BP_COLORS.SEQUENCE[0]} radius={[6, 6, 0, 0]} />
              <Bar dataKey="meanTransitLagDays" name="Courier Transit Lag Days" fill={BP_COLORS.SEQUENCE[1]} radius={[6, 6, 0, 0]} />
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
              <Bar dataKey="incidentsLogged" name="Failures Logged" fill={BP_COLORS.SEQUENCE[0]} radius={[6, 6, 0, 0]} />
              <Bar dataKey="severityRiskScore" name="Severity Risk Score (/10)" fill={BP_COLORS.SEQUENCE[1]} radius={[6, 6, 0, 0]} />
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
              <Bar dataKey="expectedServices" name="Expected Services" fill={BP_COLORS.SEQUENCE[0]} radius={[6, 6, 0, 0]} />
              <Bar dataKey="pmsConducted" name="Services Conducted" fill={BP_COLORS.SEQUENCE[1]} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}

      {activeReportId === 8 && (() => {
        const showLabels = report8Data.length <= 10;
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={report8Data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ECEEF2" />
              <XAxis dataKey="requestorName" tick={tickStyle} />
              <YAxis
                domain={showLabels ? [0, (dataMax: number) => Math.ceil(dataMax * 1.15)] : [0, 'auto']}
                tick={tickStyle}
              />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={legendStyle} />
              <Bar dataKey="repeatIncidents" name="Repeat Incidents" fill={BP_COLORS.SEQUENCE[1]} radius={[6, 6, 0, 0]}>
                {showLabels && <LabelList dataKey="repeatIncidents" position="top" offset={6} fill={BP_COLORS.TEXT} fontSize={10} />}
              </Bar>
              <Bar dataKey="remoteResolutionRate" name="Remote Fix %" fill={BP_COLORS.SEQUENCE[0]} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );
      })()}
      </div>
    </div>
  );
};
