import React from 'react';
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  LabelList,
  ResponsiveContainer,
  Text as ChartText,
} from 'recharts';
import { BP_COLORS, BP_TYPOGRAPHY } from './bpPresentationStandards';
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

const COLOR_SEQUENCE = BP_COLORS.SEQUENCE;
const COLOR_BLUE = BP_COLORS.SEQUENCE[0];   // #246FF0 (1. Vibrant Blue)
const COLOR_ORANGE = BP_COLORS.SEQUENCE[1]; // #FF3F3D (2. Vivid Red-Orange)
const COLOR_GREEN = BP_COLORS.SEQUENCE[2];  // #76BA1B (3. Bright Lime Green)
const COLOR_TEXT = BP_COLORS.TEXT;          // #333333 (Dark Charcoal / Gray20)
const COLOR_GRID = BP_COLORS.GRID;          // #E8E8E8
const COLOR_BORDER = BP_COLORS.BORDER;      // #333333 (Mandatory Graph Border)

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
      fontFamily: BP_TYPOGRAPHY.FONT_FAMILY,
      fontSize: 18,
      fontFeatureSettings: 'normal',
      fontVariant: 'normal',
    }}
    fill={COLOR_TEXT}
  >
    {String(payload?.value ?? '')}
  </ChartText>
);

// Clean two-line tick for Report 6 (Dual Panel: ~75px per bar)
const DualPanelTick: React.FC<ExportTickProps> = ({ x = 0, y = 0, payload }) => {
  const raw = String(payload?.value ?? '');
  const parts = raw.includes('•') ? raw.split('•').map((s) => s.trim()) : [raw];
  const line1 = parts[0] || '';
  const line2 = parts[1] || '';

  return (
    <g transform={`translate(${x},${y + 8})`}>
      <text
        x={0}
        y={0}
        textAnchor="middle"
        fill={COLOR_TEXT}
        style={{
          fontFamily: BP_TYPOGRAPHY.FONT_FAMILY,
          fontSize: '12px',
          fontWeight: 600,
        }}
      >
        {line1.length > 14 ? `${line1.slice(0, 13)}…` : line1}
      </text>
      {line2 && (
        <text
          x={0}
          y={15}
          textAnchor="middle"
          fill="#4B5563"
          style={{
            fontFamily: BP_TYPOGRAPHY.FONT_FAMILY,
            fontSize: '11px',
            fontWeight: 500,
          }}
        >
          {line2}
        </text>
      )}
    </g>
  );
};

// Month tick for Report 1 with auto-abbreviation and rotation for large ranges (>12 months)
const MonthExportTick: React.FC<ExportTickProps & { totalCount?: number }> = ({
  x = 0,
  y = 0,
  payload,
  totalCount = 12,
}) => {
  const val = String(payload?.value ?? '');
  const isCrowded = totalCount > 12;

  let display = val;
  if (isCrowded) {
    const parts = val.split(' ');
    if (parts.length === 2) {
      display = `${parts[0].slice(0, 3)} '${parts[1].slice(2)}`;
    }
  }

  return (
    <g transform={`translate(${x},${y + (isCrowded ? 12 : 6)})`}>
      <text
        x={0}
        y={0}
        transform={isCrowded ? 'rotate(-35)' : undefined}
        textAnchor={isCrowded ? 'end' : 'middle'}
        fill={COLOR_TEXT}
        style={{
          fontFamily: BP_TYPOGRAPHY.FONT_FAMILY,
          fontSize: isCrowded ? '12px' : '15px',
          fontWeight: 500,
        }}
      >
        {display}
      </text>
    </g>
  );
};

// Two-line split tick for full-width Reports 7 & 8
const TwoLineExportTick: React.FC<ExportTickProps> = ({ x = 0, y = 0, payload }) => {
  const raw = String(payload?.value ?? '');
  const parts = raw.includes('•')
    ? raw.split('•').map((s) => s.trim())
    : raw.includes('(')
    ? [raw.slice(0, raw.indexOf('(')).trim(), raw.slice(raw.indexOf('(')).trim()]
    : [raw];

  return (
    <g transform={`translate(${x},${y + 8})`}>
      <text
        x={0}
        y={0}
        textAnchor="middle"
        fill={COLOR_TEXT}
        style={{
          fontFamily: BP_TYPOGRAPHY.FONT_FAMILY,
          fontSize: '13px',
          fontWeight: 600,
        }}
      >
        {parts[0].length > 20 ? `${parts[0].slice(0, 19)}…` : parts[0]}
      </text>
      {parts[1] && (
        <text
          x={0}
          y={16}
          textAnchor="middle"
          fill="#4B5563"
          style={{
            fontFamily: BP_TYPOGRAPHY.FONT_FAMILY,
            fontSize: '12px',
          }}
        >
          {parts[1].length > 22 ? `${parts[1].slice(0, 21)}…` : parts[1]}
        </text>
      )}
    </g>
  );
};

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
      fontFamily: BP_TYPOGRAPHY.FONT_FAMILY,
      fontSize: 18,
      fontFeatureSettings: 'normal',
      fontVariant: 'normal',
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
          fontFamily: BP_TYPOGRAPHY.FONT_FAMILY,
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
        fontFamily: BP_TYPOGRAPHY.FONT_FAMILY,
        fontFeatureSettings: 'normal',
        fontVariant: 'normal',
      }}
    >
    {/* Report 1: Monthly SLA (Volume & 48h Resolution SLA) */}
    {reportId === 1 && (() => {
      const rows = data as MonthlySlaRow[];
      const showLabels = rows.length <= 4;
      return (
        <div style={{ width: '100%', height: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} margin={{ top: 35, right: 30, left: 20, bottom: 45 }}>
              <CartesianGrid stroke={COLOR_GRID} vertical={false} />
              <XAxis
                dataKey="month"
                height={70}
                tick={<MonthExportTick totalCount={rows.length} />}
                interval={0}
                stroke={COLOR_TEXT}
              />
              <YAxis
                domain={showLabels ? [0, (dataMax: number) => Math.ceil(dataMax * 1.15)] : [0, 'auto']}
                tick={{ fill: COLOR_TEXT, fontSize: 16 }}
                stroke={COLOR_TEXT}
              />
              <Legend verticalAlign="bottom" align="center" wrapperStyle={{ paddingTop: 16, fontSize: '16px' }} />
              <Bar dataKey="totalRequests" name="Total Requests" fill={COLOR_BLUE} radius={[0, 0, 0, 0]} isAnimationActive={false}>
                {showLabels && <LabelList dataKey="totalRequests" position="top" fill={COLOR_TEXT} fontSize={18} />}
              </Bar>
              <Bar dataKey="completed" name="Completed Tickets" fill={COLOR_ORANGE} radius={[0, 0, 0, 0]} isAnimationActive={false}>
                {showLabels && <LabelList dataKey="completed" position="top" fill={COLOR_TEXT} fontSize={18} />}
              </Bar>
              <Bar dataKey="pending" name="Pending Tickets" fill={COLOR_GREEN} radius={[0, 0, 0, 0]} isAnimationActive={false}>
                {showLabels && <LabelList dataKey="pending" position="top" fill={COLOR_TEXT} fontSize={18} />}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      );
    })()}

      {reportId === 2 && (() => {
        const top10 = ([...data] as StaffUtilizationRow[])
          .filter(
            (r) =>
              !r.technician.toLowerCase().includes('unassigned') &&
              !r.technician.toLowerCase().includes('general it pool')
          )
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
              fontFamily: BP_TYPOGRAPHY.FONT_FAMILY,
              fontSize: 18,
              fontFeatureSettings: 'normal',
              fontVariant: 'normal',
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
                          {panel.hours &&
                            top10.map((_, index) => (
                              <Cell
                                key={`cell-hours-${index}`}
                                fill={COLOR_SEQUENCE[index % COLOR_SEQUENCE.length]}
                              />
                            ))}
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
                        {top10.map((_, index) => (
                          <Cell
                            key={`cell-dept-${panel.dataKey}-${index}`}
                            fill={COLOR_SEQUENCE[index % COLOR_SEQUENCE.length]}
                          />
                        ))}
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
            ticketLabel: `${r.location} • ${r.taskDescription.slice(0, 14)}`,
          }));
        return (
          <div style={{ width: '100%', height: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={top10} margin={{ top: 35, right: 30, left: 20, bottom: 30 }}>
                <CartesianGrid stroke={COLOR_GRID} vertical={false} />
                <XAxis dataKey="ticketLabel" height={100} tick={<WrappedTick />} interval={0} />
                <YAxis domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.15)]} tick={{ fill: COLOR_TEXT, fontSize: 18 }} stroke={COLOR_TEXT} label={{ value: 'Days Stagnant', angle: -90, position: 'insideLeft', fill: COLOR_TEXT, fontSize: 18 }} />                <Legend verticalAlign="bottom" align="center" wrapperStyle={{ paddingTop: 12, fontSize: '18px' }} />
                <Bar dataKey="daysOpen" name="Dwell Time (>48h SLA Days)" fill={COLOR_ORANGE} radius={[0, 0, 0, 0]} isAnimationActive={false}>
                  {top10.map((_, index) => (
                    <Cell
                      key={`cell-aging-${index}`}
                      fill={COLOR_SEQUENCE[index % COLOR_SEQUENCE.length]}
                    />
                  ))}
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
                <XAxis dataKey="modeLabel" height={100} tick={<WrappedTick />} interval={0} stroke={COLOR_TEXT} />
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
                <BarChart data={top10} margin={{ top: 30, right: 15, left: 10, bottom: 45 }}>
                  <CartesianGrid stroke={COLOR_GRID} vertical={false} />
                  <XAxis dataKey="vulnLabel" height={60} tick={<DualPanelTick />} interval={0} stroke={COLOR_TEXT} />
                  <YAxis tick={{ fill: COLOR_TEXT, fontSize: 17 }} stroke={COLOR_TEXT} />
                  <Legend verticalAlign="bottom" align="center" wrapperStyle={{ paddingTop: 14, fontSize: '14px' }} />
                  <Bar dataKey="incidentsLogged" name="Incidents Logged" fill={COLOR_BLUE} radius={[0, 0, 0, 0]} isAnimationActive={false}>
                    {top10.map((_, index) => (
                      <Cell
                        key={`cell-vuln-inc-${index}`}
                        fill={COLOR_SEQUENCE[index % COLOR_SEQUENCE.length]}
                      />
                    ))}
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
                <BarChart data={top10} margin={{ top: 30, right: 15, left: 10, bottom: 45 }}>
                  <CartesianGrid stroke={COLOR_GRID} vertical={false} />
                  <XAxis dataKey="vulnLabel" height={60} tick={<DualPanelTick />} interval={0} stroke={COLOR_TEXT} />
                  <YAxis domain={[0, 10]} tick={{ fill: COLOR_TEXT, fontSize: 17 }} stroke={COLOR_TEXT} />
                  <Legend verticalAlign="bottom" align="center" wrapperStyle={{ paddingTop: 14, fontSize: '14px' }} />
                  <Bar dataKey="severityRiskScore" name="Severity Risk (/10)" fill={COLOR_ORANGE} radius={[0, 0, 0, 0]} isAnimationActive={false}>
                    {top10.map((_, index) => (
                      <Cell
                        key={`cell-vuln-sev-${index}`}
                        fill={COLOR_SEQUENCE[index % COLOR_SEQUENCE.length]}
                      />
                    ))}
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
              <BarChart data={top10} margin={{ top: 35, right: 30, left: 20, bottom: 45 }}>
                <CartesianGrid stroke={COLOR_GRID} vertical={false} />
                <XAxis dataKey="pmsLabel" height={70} tick={<TwoLineExportTick />} interval={0} stroke={COLOR_TEXT} />
                <YAxis tick={{ fill: COLOR_TEXT, fontSize: 18 }} stroke={COLOR_TEXT} label={{ value: 'Service Count', angle: -90, position: 'insideLeft', fill: COLOR_TEXT, fontSize: 18 }} />
                <Legend verticalAlign="bottom" align="center" wrapperStyle={{ paddingTop: 16, fontSize: '15px' }} />
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
              <BarChart data={top10} margin={{ top: 35, right: 30, left: 20, bottom: 45 }}>
                <CartesianGrid stroke={COLOR_GRID} vertical={false} />
                <XAxis dataKey="staffLabel" height={70} tick={<TwoLineExportTick />} interval={0} stroke={COLOR_TEXT} />
                <YAxis domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.15)]} tick={{ fill: COLOR_TEXT, fontSize: 18 }} stroke={COLOR_TEXT} label={{ value: 'Repeat Tickets (Count - 1)', angle: -90, position: 'insideLeft', fill: COLOR_TEXT, fontSize: 18 }} />
                <Legend verticalAlign="bottom" align="center" wrapperStyle={{ paddingTop: 16, fontSize: '15px' }} />
                <Bar dataKey="repeatIncidents" name="Repeat Incidents (Count - 1)" fill={COLOR_ORANGE} radius={[0, 0, 0, 0]} isAnimationActive={false}>
                  {top10.map((_, index) => (
                    <Cell
                      key={`cell-chronic-${index}`}
                      fill={COLOR_SEQUENCE[index % COLOR_SEQUENCE.length]}
                    />
                  ))}
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

