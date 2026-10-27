import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  LabelList,
  ResponsiveContainer,
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
} from '../types/reportSchemas';

export interface ExportChartRendererProps {
  reportId: number;
  data: any[];
}

const COLOR_BLUE = '#156082';
const COLOR_ORANGE = '#E97132';
const COLOR_TEXT = '#333333';
const COLOR_GRID = '#D9D9D9';
const COLOR_BORDER = '#7F7F7F';

// Horizontal wrapped label tick scaled for 1896x640 canvas (2x reference)
const WrappedTick: React.FC<any> = ({ x, y, payload }) => {
  const text = String(payload.value || '');
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if ((currentLine + ' ' + word).trim().length > 16) {
      if (currentLine) lines.push(currentLine.trim());
      currentLine = word;
    } else {
      currentLine = (currentLine + ' ' + word).trim();
    }
  }
  if (currentLine) lines.push(currentLine.trim());

  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={20} textAnchor="middle" fill={COLOR_TEXT} fontSize={19} fontFamily="Arial, sans-serif">
        {lines.slice(0, 2).map((line, idx) => (
          <tspan x={0} dy={idx === 0 ? 0 : 22} key={idx}>
            {line}
          </tspan>
        ))}
      </text>
    </g>
  );
};

export const ExportChartRenderer: React.FC<ExportChartRendererProps> = ({ reportId, data }) => {
  // Empty data state
  if (!data || data.length === 0) {
    return (
      <div
        id="pptx-export-chart-canvas"
        style={{
          width: '1896px',
          height: '640px',
          backgroundColor: '#FFFFFF',
          border: `1.5px solid ${COLOR_BORDER}`,
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'Arial, sans-serif',
          color: COLOR_TEXT,
        }}
      >
        <span style={{ fontSize: '32px', fontWeight: 'bold' }}>No Data Available</span>
        <span style={{ fontSize: '22px', color: '#666666', marginTop: '12px' }}>
          No records matched the selected period and organization filters.
        </span>
      </div>
    );
  }

  return (
    <div
      id="pptx-export-chart-canvas"
      style={{
        width: '1896px',
        height: '640px',
        backgroundColor: '#FFFFFF',
        border: `1.5px solid ${COLOR_BORDER}`,
        boxSizing: 'border-box',
        padding: '16px 24px',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      {/* Report 1: Monthly SLA (Volume & 48h Resolution SLA) */}
      {reportId === 1 && (
        <div style={{ width: '100%', height: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data as MonthlySlaRow[]} margin={{ top: 35, right: 30, left: 20, bottom: 30 }}>
              <CartesianGrid stroke={COLOR_GRID} vertical={false} />
              <XAxis dataKey="month" tick={<WrappedTick />} interval={0} stroke={COLOR_TEXT} />
              <YAxis tick={{ fill: COLOR_TEXT, fontSize: 18 }} stroke={COLOR_TEXT} />
              <Legend verticalAlign="bottom" align="center" wrapperStyle={{ paddingTop: 12, fontSize: '18px' }} />
              <Bar dataKey="totalRequests" name="Total Requests" fill={COLOR_BLUE} radius={[0, 0, 0, 0]} isAnimationActive={false}>
                <LabelList dataKey="totalRequests" position="top" fill={COLOR_TEXT} fontSize={18} />
              </Bar>
              <Bar dataKey="completed" name="Completed Tickets" fill={COLOR_ORANGE} radius={[0, 0, 0, 0]} isAnimationActive={false}>
                <LabelList dataKey="completed" position="top" fill={COLOR_TEXT} fontSize={18} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Report 2: Staff Productivity (Dual Panel: Ticket Yields vs Labor Hours) */}
      {reportId === 2 && (() => {
        const top10 = ([...data] as StaffUtilizationRow[])
          .sort((a, b) => (b.completed || 0) - (a.completed || 0) || a.technician.localeCompare(b.technician))
          .slice(0, 10);
        return (
          <div style={{ display: 'flex', width: '100%', height: '100%', gap: '24px' }}>
            <div style={{ flex: 1, height: '100%' }}>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: COLOR_TEXT, textAlign: 'center', marginBottom: 6 }}>
                Ticket Output (Assigned vs Completed)
              </div>
              <ResponsiveContainer width="100%" height="88%">
                <BarChart data={top10} margin={{ top: 30, right: 15, left: 10, bottom: 25 }}>
                  <CartesianGrid stroke={COLOR_GRID} vertical={false} />
                  <XAxis dataKey="technician" tick={<WrappedTick />} interval={0} stroke={COLOR_TEXT} />
                  <YAxis tick={{ fill: COLOR_TEXT, fontSize: 17 }} stroke={COLOR_TEXT} />
                  <Legend verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '17px' }} />
                  <Bar dataKey="totalAssigned" name="Assigned" fill={COLOR_BLUE} radius={[0, 0, 0, 0]} isAnimationActive={false}>
                    <LabelList dataKey="totalAssigned" position="top" fill={COLOR_TEXT} fontSize={16} />
                  </Bar>
                  <Bar dataKey="completed" name="Completed" fill={COLOR_ORANGE} radius={[0, 0, 0, 0]} isAnimationActive={false}>
                    <LabelList dataKey="completed" position="top" fill={COLOR_TEXT} fontSize={16} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={{ flex: 1, height: '100%' }}>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: COLOR_TEXT, textAlign: 'center', marginBottom: 6 }}>
                Technician Labor Logged (Hours)
              </div>
              <ResponsiveContainer width="100%" height="88%">
                <BarChart data={top10} margin={{ top: 30, right: 15, left: 10, bottom: 25 }}>
                  <CartesianGrid stroke={COLOR_GRID} vertical={false} />
                  <XAxis dataKey="technician" tick={<WrappedTick />} interval={0} stroke={COLOR_TEXT} />
                  <YAxis tick={{ fill: COLOR_TEXT, fontSize: 17 }} stroke={COLOR_TEXT} />
                  <Legend verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '17px' }} />
                  <Bar dataKey="totalHoursLogged" name="Logged Hours" fill={COLOR_BLUE} radius={[0, 0, 0, 0]} isAnimationActive={false}>
                    <LabelList dataKey="totalHoursLogged" position="top" fill={COLOR_TEXT} fontSize={16} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
      })()}

      {/* Report 3: Dept Demand (Dual Panel: Incidents vs Labor Consumed) */}
      {reportId === 3 && (() => {
        const top10 = ([...data] as DeptDemandRow[])
          .sort((a, b) => (b.totalTickets || 0) - (a.totalTickets || 0) || a.department.localeCompare(b.department) || a.location.localeCompare(b.location))
          .slice(0, 10)
          .map((r) => ({
            ...r,
            deptLabel: `${r.department} (${r.location})`,
          }));
        return (
          <div style={{ display: 'flex', width: '100%', height: '100%', gap: '24px' }}>
            <div style={{ flex: 1, height: '100%' }}>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: COLOR_TEXT, textAlign: 'center', marginBottom: 6 }}>
                Incident Demand by Department (Count)
              </div>
              <ResponsiveContainer width="100%" height="88%">
                <BarChart data={top10} margin={{ top: 30, right: 15, left: 10, bottom: 25 }}>
                  <CartesianGrid stroke={COLOR_GRID} vertical={false} />
                  <XAxis dataKey="deptLabel" tick={<WrappedTick />} interval={0} stroke={COLOR_TEXT} />
                  <YAxis tick={{ fill: COLOR_TEXT, fontSize: 17 }} stroke={COLOR_TEXT} />
                  <Legend verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '17px' }} />
                  <Bar dataKey="totalTickets" name="Incidents Logged" fill={COLOR_BLUE} radius={[0, 0, 0, 0]} isAnimationActive={false}>
                    <LabelList dataKey="totalTickets" position="top" fill={COLOR_TEXT} fontSize={16} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={{ flex: 1, height: '100%' }}>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: COLOR_TEXT, textAlign: 'center', marginBottom: 6 }}>
                Support Labor Consumed (Hours)
              </div>
              <ResponsiveContainer width="100%" height="88%">
                <BarChart data={top10} margin={{ top: 30, right: 15, left: 10, bottom: 25 }}>
                  <CartesianGrid stroke={COLOR_GRID} vertical={false} />
                  <XAxis dataKey="deptLabel" tick={<WrappedTick />} interval={0} stroke={COLOR_TEXT} />
                  <YAxis tick={{ fill: COLOR_TEXT, fontSize: 17 }} stroke={COLOR_TEXT} />
                  <Legend verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '17px' }} />
                  <Bar dataKey="totalHoursConsumed" name="Labor Consumed (Hours)" fill={COLOR_ORANGE} radius={[0, 0, 0, 0]} isAnimationActive={false}>
                    <LabelList dataKey="totalHoursConsumed" position="top" fill={COLOR_TEXT} fontSize={16} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
      })()}

      {/* Report 4: Aging Backlog (Exceptions > 48h SLA) */}
      {reportId === 4 && (() => {
        const top10 = ([...data] as AgingBacklogRow[])
          .sort((a, b) => (b.daysOpen || 0) - (a.daysOpen || 0) || a.location.localeCompare(b.location) || a.requestor.localeCompare(b.requestor))
          .slice(0, 10)
          .map((r) => ({
            ...r,
            ticketLabel: `${r.location} • ${r.taskDescription.slice(0, 14)}`,
          }));
        return (
          <div style={{ width: '100%', height: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={top10} margin={{ top: 35, right: 30, left: 20, bottom: 30 }}>
                <CartesianGrid stroke={COLOR_GRID} vertical={false} />
                <XAxis dataKey="ticketLabel" tick={<WrappedTick />} interval={0} stroke={COLOR_TEXT} />
                <YAxis tick={{ fill: COLOR_TEXT, fontSize: 18 }} stroke={COLOR_TEXT} label={{ value: 'Days Stagnant', angle: -90, position: 'insideLeft', fill: COLOR_TEXT, fontSize: 18 }} />
                <Legend verticalAlign="bottom" align="center" wrapperStyle={{ paddingTop: 12, fontSize: '18px' }} />
                <Bar dataKey="daysOpen" name="Dwell Time (>48h SLA Days)" fill={COLOR_ORANGE} radius={[0, 0, 0, 0]} isAnimationActive={false}>
                  <LabelList dataKey="daysOpen" position="top" fill={COLOR_TEXT} fontSize={18} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        );
      })()}

      {/* Report 5: Transit Lag Disaggregation (Turnaround vs Courier Transit Lag Days) */}
      {reportId === 5 && (() => {
        const sortedData = ([...data] as TransitLagRow[])
          .sort((a, b) => (b.meanTransitLagDays || 0) - (a.meanTransitLagDays || 0) || a.location.localeCompare(b.location) || a.supportMode.localeCompare(b.supportMode))
          .slice(0, 10)
          .map((r) => ({
            ...r,
            modeLabel: `${r.location} (${r.supportMode})`,
          }));
        return (
          <div style={{ width: '100%', height: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sortedData} margin={{ top: 35, right: 30, left: 20, bottom: 30 }}>
                <CartesianGrid stroke={COLOR_GRID} vertical={false} />
                <XAxis dataKey="modeLabel" tick={<WrappedTick />} interval={0} stroke={COLOR_TEXT} />
                <YAxis tick={{ fill: COLOR_TEXT, fontSize: 18 }} stroke={COLOR_TEXT} label={{ value: 'Elapsed Days', angle: -90, position: 'insideLeft', fill: COLOR_TEXT, fontSize: 18 }} />
                <Legend verticalAlign="bottom" align="center" wrapperStyle={{ paddingTop: 12, fontSize: '18px' }} />
                <Bar dataKey="meanTurnaroundDays" name="Mean Total Turnaround Days" fill={COLOR_BLUE} radius={[0, 0, 0, 0]} isAnimationActive={false}>
                  <LabelList dataKey="meanTurnaroundDays" position="top" fill={COLOR_TEXT} fontSize={18} />
                </Bar>
                <Bar dataKey="meanTransitLagDays" name="Mean Courier Transit Lag Days" fill={COLOR_ORANGE} radius={[0, 0, 0, 0]} isAnimationActive={false}>
                  <LabelList dataKey="meanTransitLagDays" position="top" fill={COLOR_TEXT} fontSize={18} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        );
      })()}

      {/* Report 6: Hardware Vulnerability (Dual Panel: Incidents vs Severity Risk Score) */}
      {reportId === 6 && (() => {
        const top10 = ([...data] as HardwareVulnerabilityRow[])
          .sort((a, b) => (b.severityRiskScore || 0) - (a.severityRiskScore || 0) || (b.incidentsLogged || 0) - (a.incidentsLogged || 0) || a.location.localeCompare(b.location))
          .slice(0, 10)
          .map((r) => ({
            ...r,
            vulnLabel: `${r.location} • ${r.topFailureTask}`,
          }));
        return (
          <div style={{ display: 'flex', width: '100%', height: '100%', gap: '24px' }}>
            <div style={{ flex: 1, height: '100%' }}>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: COLOR_TEXT, textAlign: 'center', marginBottom: 6 }}>
                Hardware Breakdown Incidents Logged
              </div>
              <ResponsiveContainer width="100%" height="88%">
                <BarChart data={top10} margin={{ top: 30, right: 15, left: 10, bottom: 25 }}>
                  <CartesianGrid stroke={COLOR_GRID} vertical={false} />
                  <XAxis dataKey="vulnLabel" tick={<WrappedTick />} interval={0} stroke={COLOR_TEXT} />
                  <YAxis tick={{ fill: COLOR_TEXT, fontSize: 17 }} stroke={COLOR_TEXT} />
                  <Legend verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '17px' }} />
                  <Bar dataKey="incidentsLogged" name="Incidents Logged" fill={COLOR_BLUE} radius={[0, 0, 0, 0]} isAnimationActive={false}>
                    <LabelList dataKey="incidentsLogged" position="top" fill={COLOR_TEXT} fontSize={16} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={{ flex: 1, height: '100%' }}>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: COLOR_TEXT, textAlign: 'center', marginBottom: 6 }}>
                Severity Risk Score (Max 10.0)
              </div>
              <ResponsiveContainer width="100%" height="88%">
                <BarChart data={top10} margin={{ top: 30, right: 15, left: 10, bottom: 25 }}>
                  <CartesianGrid stroke={COLOR_GRID} vertical={false} />
                  <XAxis dataKey="vulnLabel" tick={<WrappedTick />} interval={0} stroke={COLOR_TEXT} />
                  <YAxis domain={[0, 10]} tick={{ fill: COLOR_TEXT, fontSize: 17 }} stroke={COLOR_TEXT} />
                  <Legend verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '17px' }} />
                  <Bar dataKey="severityRiskScore" name="Severity Risk (/10)" fill={COLOR_ORANGE} radius={[0, 0, 0, 0]} isAnimationActive={false}>
                    <LabelList dataKey="severityRiskScore" position="top" fill={COLOR_TEXT} fontSize={16} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
      })()}

      {/* Report 7: Fleet PMS Compliance (Expected vs Conducted Services) */}
      {reportId === 7 && (() => {
        const top10 = ([...data] as PmsComplianceRow[])
          .sort((a, b) => (b.expectedServices || 0) - (a.expectedServices || 0) || (b.pmsConducted || 0) - (a.pmsConducted || 0) || a.terminalLocation.localeCompare(b.terminalLocation) || a.department.localeCompare(b.department))
          .slice(0, 10)
          .map((r) => ({
            ...r,
            pmsLabel: `${r.terminalLocation} • ${r.department}`,
          }));
        return (
          <div style={{ width: '100%', height: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={top10} margin={{ top: 35, right: 30, left: 20, bottom: 30 }}>
                <CartesianGrid stroke={COLOR_GRID} vertical={false} />
                <XAxis dataKey="pmsLabel" tick={<WrappedTick />} interval={0} stroke={COLOR_TEXT} />
                <YAxis tick={{ fill: COLOR_TEXT, fontSize: 18 }} stroke={COLOR_TEXT} label={{ value: 'Service Count', angle: -90, position: 'insideLeft', fill: COLOR_TEXT, fontSize: 18 }} />
                <Legend verticalAlign="bottom" align="center" wrapperStyle={{ paddingTop: 12, fontSize: '18px' }} />
                <Bar dataKey="expectedServices" name="Expected Services" fill={COLOR_BLUE} radius={[0, 0, 0, 0]} isAnimationActive={false}>
                  <LabelList dataKey="expectedServices" position="top" fill={COLOR_TEXT} fontSize={18} />
                </Bar>
                <Bar dataKey="pmsConducted" name="Services Conducted" fill={COLOR_ORANGE} radius={[0, 0, 0, 0]} isAnimationActive={false}>
                  <LabelList dataKey="pmsConducted" position="top" fill={COLOR_TEXT} fontSize={18} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        );
      })()}

      {/* Report 8: Chronic Requestor Index (Repeat Incidents) */}
      {reportId === 8 && (() => {
        const top10 = ([...data] as ChronicRequestorRow[])
          .sort((a, b) => (b.repeatIncidents || 0) - (a.repeatIncidents || 0) || a.requestorName.localeCompare(b.requestorName))
          .slice(0, 10)
          .map((r) => ({
            ...r,
            staffLabel: `${r.requestorName} (${r.location})`,
          }));
        return (
          <div style={{ width: '100%', height: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={top10} margin={{ top: 35, right: 30, left: 20, bottom: 30 }}>
                <CartesianGrid stroke={COLOR_GRID} vertical={false} />
                <XAxis dataKey="staffLabel" tick={<WrappedTick />} interval={0} stroke={COLOR_TEXT} />
                <YAxis tick={{ fill: COLOR_TEXT, fontSize: 18 }} stroke={COLOR_TEXT} label={{ value: 'Repeat Tickets (Count - 1)', angle: -90, position: 'insideLeft', fill: COLOR_TEXT, fontSize: 18 }} />
                <Legend verticalAlign="bottom" align="center" wrapperStyle={{ paddingTop: 12, fontSize: '18px' }} />
                <Bar dataKey="repeatIncidents" name="Repeat Incidents (Count - 1)" fill={COLOR_ORANGE} radius={[0, 0, 0, 0]} isAnimationActive={false}>
                  <LabelList dataKey="repeatIncidents" position="top" fill={COLOR_TEXT} fontSize={18} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        );
      })()}
    </div>
  );
};

