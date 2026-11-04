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
  Text as ChartText,
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

interface ExportTickProps {
  x?: number;
  y?: number;
  width?: number;
  visibleTicksCount?: number;
  payload?: { value?: string | number };
}

const WrappedTick: React.FC<ExportTickProps> = ({
  x = 0,
  y = 0,
  width = 1800,
  visibleTicksCount = 1,
  payload,
}) => (
  <ChartText
    x={x}
    y={y + 10}
    width={Math.max(
      1,
      width / Math.max(1, visibleTicksCount) - 16
    )}
    maxLines={3}
    breakAll
    lineHeight={20}
    textAnchor="middle"
    verticalAnchor="start"
    style={{
      fontFamily: 'Verdana, sans-serif',
      fontSize: 18,
    }}
    fill={COLOR_TEXT}
  >
    {String(payload?.value ?? '')}
  </ChartText>
);

const DepartmentExportTick: React.FC<ExportTickProps> = ({
  x = 0,
  y = 0,
  payload,
}) => (
  <ChartText
    x={x - 10}
    y={y}
    width={270}
    maxLines={2}
    breakAll
    lineHeight={20}
    textAnchor="end"
    verticalAnchor="middle"
    style={{
      fontFamily: 'Verdana, sans-serif',
      fontSize: 18,
    }}
    fill={COLOR_TEXT}
  >
    {String(payload?.value ?? '').replace(/\n/g, ' / ')}
  </ChartText>
);

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
          fontFamily: 'Verdana, sans-serif',
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
        fontFamily: 'Verdana, sans-serif',
      }}
    >
      {/* Report 1: Monthly SLA (Volume & 48h Resolution SLA) */}
      {reportId === 1 && (
        <div style={{ width: '100%', height: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data as MonthlySlaRow[]} margin={{ top: 35, right: 30, left: 20, bottom: 85 }}>
              <CartesianGrid stroke={COLOR_GRID} vertical={false} />
              <XAxis dataKey="month" height={100} tick={<WrappedTick />} interval={0} stroke={COLOR_TEXT} />
              <YAxis tick={{ fill: COLOR_TEXT, fontSize: 18 }} stroke={COLOR_TEXT} />
              <Legend verticalAlign="bottom" align="center" wrapperStyle={{ paddingTop: 12, fontSize: '18px' }} />
              <Bar dataKey="totalRequests" name="Total Requests" fill={COLOR_BLUE} radius={[0, 0, 0, 0]} isAnimationActive={false}>
                <LabelList dataKey="totalRequests" position="top" fill={COLOR_TEXT} fontSize={22} />
              </Bar>
              <Bar dataKey="completed" name="Completed Tickets" fill={COLOR_ORANGE} radius={[0, 0, 0, 0]} isAnimationActive={false}>
                <LabelList dataKey="completed" position="top" fill={COLOR_TEXT} fontSize={22} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Report 2: Staff Productivity (Horizontal Ticket and Labor Panels) */}
      {reportId === 2 && (() => {
        const top10 = ([...data] as StaffUtilizationRow[])
          .sort(
            (a, b) =>
              (b.completed || 0) - (a.completed || 0) ||
              a.technician.localeCompare(b.technician)
          )
          .slice(0, 10);

        const TechnicianTick: React.FC<ExportTickProps> = ({
          x = 0,
          y = 0,
          payload,
        }) => (
          <ChartText
            x={x - 10}
            y={y}
            width={270}
            maxLines={2}
            breakAll
            lineHeight={20}
            textAnchor="end"
            verticalAnchor="middle"
            style={{
              fontFamily: 'Verdana, sans-serif',
              fontSize: 18,
            }}
            fill={COLOR_TEXT}
          >
            {String(payload?.value ?? '')}
          </ChartText>
        );

        const panels = [
          {
            title: 'Ticket Output (Assigned vs Completed)',
            hours: false,
            series: [
              {
                key: 'totalAssigned',
                name: 'Assigned',
                color: COLOR_BLUE,
              },
              {
                key: 'completed',
                name: 'Completed',
                color: COLOR_ORANGE,
              },
            ],
          },
          {
            title: 'Technician Labor Logged (Hours)',
            hours: true,
            series: [
              {
                key: 'totalHoursLogged',
                name: 'Logged Hours',
                color: COLOR_BLUE,
              },
            ],
          },
        ];

        return (
          <div
            style={{
              display: 'flex',
              width: '100%',
              height: '100%',
              gap: '24px',
            }}
          >
            {panels.map((panel) => (
              <div
                key={panel.title}
                style={{
                  flex: 1,
                  minWidth: 0,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <div
                  style={{
                    fontSize: '20px',
                    fontWeight: 'bold',
                    color: COLOR_TEXT,
                    textAlign: 'center',
                    marginBottom: 12,
                  }}
                >
                  {panel.title}
                </div>

                <div style={{ flex: 1, minHeight: 0 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={top10}
                      margin={{
                        top: 8,
                        right: 80,
                        left: 10,
                        bottom: 12,
                      }}
                      barSize={14}
                      barGap={4}
                    >
                      <CartesianGrid
                        stroke={COLOR_GRID}
                        horizontal={false}
                      />

                      <XAxis
                        type="number"
                        domain={[0, 'auto']}
                        allowDecimals={panel.hours}
                        tick={{ fill: COLOR_TEXT, fontSize: 17 }}
                        stroke={COLOR_TEXT}
                      />

                      <YAxis
                        type="category"
                        dataKey="technician"
                        width={300}
                        interval={0}
                        tick={<TechnicianTick />}
                        tickLine={false}
                        axisLine={false}
                      />

                      <Legend
                        verticalAlign="bottom"
                        align="center"
                        wrapperStyle={{
                          paddingTop: 12,
                          fontSize: '18px',
                        }}
                      />

                      {panel.series.map((series) => (
                        <Bar
                          key={series.key}
                          dataKey={series.key}
                          name={series.name}
                          fill={series.color}
                          isAnimationActive={false}
                        >
                          <LabelList
                            dataKey={series.key}
                            position="right"
                            offset={8}
                            fill={COLOR_TEXT}
                            fontSize={17}
                            formatter={(value: unknown) =>
                              panel.hours
                                ? Number(value).toFixed(2)
                                : String(value)
                            }
                          />
                        </Bar>
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ))}
          </div>
        );
      })()}

      {/* Report 3: Dept Demand (Horizontal Incidents and Labor Panels) */}
      {reportId === 3 && (() => {
        const top10 = ([...data] as DeptDemandRow[])
          .sort(
            (a, b) =>
              (b.totalTickets || 0) - (a.totalTickets || 0) ||
              a.department.localeCompare(b.department) ||
              a.location.localeCompare(b.location)
          )
          .slice(0, 10)
          .map((row) => ({
            ...row,
            deptLabel: `${row.department}\n${row.location}`,
          }));

        const panels = [
          {
            title: 'Incident Demand by Department (Count)',
            dataKey: 'totalTickets',
            name: 'Incidents Logged',
            color: COLOR_BLUE,
            integerValues: true,
          },
          {
            title: 'Support Labor Consumed (Hours)',
            dataKey: 'totalHoursConsumed',
            name: 'Labor Consumed (Hours)',
            color: COLOR_ORANGE,
            integerValues: false,
          },
        ] as const;

        return (
          <div
            style={{
              display: 'flex',
              width: '100%',
              height: '100%',
              gap: '24px',
            }}
          >
            {panels.map((panel) => (
              <div
                key={panel.dataKey}
                style={{
                  flex: 1,
                  minWidth: 0,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <div
                  style={{
                    fontSize: '20px',
                    fontWeight: 'bold',
                    color: COLOR_TEXT,
                    textAlign: 'center',
                    marginBottom: 12,
                  }}
                >
                  {panel.title}
                </div>

                <div style={{ flex: 1, minHeight: 0 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={top10}
                      margin={{
                        top: 8,
                        right: 80,
                        left: 10,
                        bottom: 12,
                      }}
                      barSize={22}
                    >
                      <CartesianGrid
                        stroke={COLOR_GRID}
                        horizontal={false}
                      />

                      <XAxis
                        type="number"
                        domain={[0, 'auto']}
                        allowDecimals={!panel.integerValues}
                        tick={{ fill: COLOR_TEXT, fontSize: 17 }}
                        stroke={COLOR_TEXT}
                      />

                      <YAxis
                        type="category"
                        dataKey="deptLabel"
                        width={300}
                        interval={0}
                        tick={<DepartmentExportTick />}
                        tickLine={false}
                        axisLine={false}
                      />

                      <Bar
                        dataKey={panel.dataKey}
                        name={panel.name}
                        fill={panel.color}
                        isAnimationActive={false}
                      >
                        <LabelList
                          dataKey={panel.dataKey}
                          position="right"
                          offset={10}
                          fill={COLOR_TEXT}
                          fontSize={18}
                          formatter={(value: unknown) => {
                            const number = Number(value);
                            return panel.integerValues
                              ? String(number)
                              : number.toFixed(2);
                          }}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ))}
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
            ticketLabel: `${r.location} • ${r.taskDescription.slice(0, 18)}`,
          }));
        return (
          <div style={{ width: '100%', height: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={top10} margin={{ top: 35, right: 30, left: 20, bottom: 85 }}>
                <CartesianGrid stroke={COLOR_GRID} vertical={false} />
                <XAxis dataKey="ticketLabel" height={100} tick={<WrappedTick />} interval={0} />
                <YAxis tick={{ fill: COLOR_TEXT, fontSize: 18 }} stroke={COLOR_TEXT} label={{ value: 'Days Stagnant', angle: -90, position: 'insideLeft', fill: COLOR_TEXT, fontSize: 18 }} />
                <Legend verticalAlign="bottom" align="center" wrapperStyle={{ paddingTop: 12, fontSize: '18px' }} />
                <Bar dataKey="daysOpen" name="Dwell Time (>48h SLA Days)" fill={COLOR_ORANGE} radius={[0, 0, 0, 0]} isAnimationActive={false}>
                  <LabelList dataKey="daysOpen" position="top" fill={COLOR_TEXT} fontSize={22} />
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
              <BarChart data={sortedData} margin={{ top: 35, right: 30, left: 20, bottom: 85 }}>
                <CartesianGrid stroke={COLOR_GRID} vertical={false} />
                <XAxis dataKey="modeLabel" height={100} tick={<WrappedTick />} interval={0} stroke={COLOR_TEXT} />
                <YAxis tick={{ fill: COLOR_TEXT, fontSize: 18 }} stroke={COLOR_TEXT} label={{ value: 'Elapsed Days', angle: -90, position: 'insideLeft', fill: COLOR_TEXT, fontSize: 18 }} />
                <Legend verticalAlign="bottom" align="center" wrapperStyle={{ paddingTop: 12, fontSize: '18px' }} />
                <Bar dataKey="meanTurnaroundDays" name="Mean Total Turnaround Days" fill={COLOR_BLUE} radius={[0, 0, 0, 0]} isAnimationActive={false}>
                  <LabelList dataKey="meanTurnaroundDays" position="top" fill={COLOR_TEXT} fontSize={22} />
                </Bar>
                <Bar dataKey="meanTransitLagDays" name="Mean Courier Transit Lag Days" fill={COLOR_ORANGE} radius={[0, 0, 0, 0]} isAnimationActive={false}>
                  <LabelList dataKey="meanTransitLagDays" position="top" fill={COLOR_TEXT} fontSize={22} />
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
              <div style={{ fontSize: '22px', fontWeight: 'bold', color: COLOR_TEXT, textAlign: 'center', marginBottom: 6 }}>
                Hardware Breakdown Incidents Logged
              </div>
              <ResponsiveContainer width="100%" height="86%">
                <BarChart data={top10} margin={{ top: 30, right: 15, left: 10, bottom: 80 }}>
                  <CartesianGrid stroke={COLOR_GRID} vertical={false} />
                  <XAxis dataKey="vulnLabel" tick={<DualPanelWrappedTick />} height={80} interval={0} stroke={COLOR_TEXT} />
                  <YAxis tick={{ fill: COLOR_TEXT, fontSize: 20 }} stroke={COLOR_TEXT} />
                  <Legend verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '20px' }} />
                  <Bar dataKey="incidentsLogged" name="Incidents Logged" fill={COLOR_BLUE} radius={[0, 0, 0, 0]} isAnimationActive={false}>
                    <LabelList dataKey="incidentsLogged" position="top" fill={COLOR_TEXT} fontSize={18} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={{ flex: 1, height: '100%' }}>
              <div style={{ fontSize: '22px', fontWeight: 'bold', color: COLOR_TEXT, textAlign: 'center', marginBottom: 6 }}>
                Severity Risk Score (Max 10.0)
              </div>
              <ResponsiveContainer width="100%" height="86%">
                <BarChart data={top10} margin={{ top: 30, right: 15, left: 10, bottom: 80 }}>
                  <CartesianGrid stroke={COLOR_GRID} vertical={false} />
                  <XAxis dataKey="vulnLabel" tick={<DualPanelWrappedTick />} height={80} interval={0} stroke={COLOR_TEXT} />
                  <YAxis domain={[0, 10]} tick={{ fill: COLOR_TEXT, fontSize: 20 }} stroke={COLOR_TEXT} />
                  <Legend verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '20px' }} />
                  <Bar dataKey="severityRiskScore" name="Severity Risk (/10)" fill={COLOR_ORANGE} radius={[0, 0, 0, 0]} isAnimationActive={false}>
                    <LabelList dataKey="severityRiskScore" position="top" fill={COLOR_TEXT} fontSize={18} />
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
              <BarChart data={top10} margin={{ top: 35, right: 30, left: 20, bottom: 85 }}>
                <CartesianGrid stroke={COLOR_GRID} vertical={false} />
                <XAxis dataKey="pmsLabel" tick={<WrappedTick />} height={85} interval={0} stroke={COLOR_TEXT} />
                <YAxis tick={{ fill: COLOR_TEXT, fontSize: 22 }} stroke={COLOR_TEXT} label={{ value: 'Service Count', angle: -90, position: 'insideLeft', fill: COLOR_TEXT, fontSize: 20 }} />
                <Legend verticalAlign="bottom" align="center" wrapperStyle={{ paddingTop: 16, fontSize: '22px' }} />
                <Bar dataKey="expectedServices" name="Expected Services" fill={COLOR_BLUE} radius={[0, 0, 0, 0]} isAnimationActive={false}>
                  <LabelList dataKey="expectedServices" position="top" fill={COLOR_TEXT} fontSize={22} />
                </Bar>
                <Bar dataKey="pmsConducted" name="Services Conducted" fill={COLOR_ORANGE} radius={[0, 0, 0, 0]} isAnimationActive={false}>
                  <LabelList dataKey="pmsConducted" position="top" fill={COLOR_TEXT} fontSize={22} />
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
              <BarChart data={top10} margin={{ top: 35, right: 30, left: 20, bottom: 85 }}>
                <CartesianGrid stroke={COLOR_GRID} vertical={false} />
                <XAxis dataKey="staffLabel" tick={<WrappedTick />} height={85} interval={0} stroke={COLOR_TEXT} />
                <YAxis tick={{ fill: COLOR_TEXT, fontSize: 22 }} stroke={COLOR_TEXT} label={{ value: 'Repeat Tickets (Count - 1)', angle: -90, position: 'insideLeft', fill: COLOR_TEXT, fontSize: 20 }} />
                <Legend verticalAlign="bottom" align="center" wrapperStyle={{ paddingTop: 16, fontSize: '22px' }} />
                <Bar dataKey="repeatIncidents" name="Repeat Incidents (Count - 1)" fill={COLOR_ORANGE} radius={[0, 0, 0, 0]} isAnimationActive={false}>
                  <LabelList dataKey="repeatIncidents" position="top" fill={COLOR_TEXT} fontSize={22} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        );
      })()}
    </div>
  );
};
