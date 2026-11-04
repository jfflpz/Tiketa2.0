import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import type { TransitLagRow } from '../../reports/types/reportSchemas';

export interface TurnaroundLagChartProps {
  data: TransitLagRow[];
}

const tooltipStyle = {
  backgroundColor: '#FFFFFF',
  borderColor: '#ECEEF2',
  borderRadius: '12px',
  fontSize: '12px',
};

const tickStyle = { fontSize: 11, fill: '#6B7280' };

export const TurnaroundLagChart: React.FC<TurnaroundLagChartProps> = ({ data }) => {
  return (
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
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ECEEF2" />
            <XAxis dataKey="location" tick={tickStyle} />
            <YAxis tick={tickStyle} />
            <Tooltip contentStyle={tooltipStyle} />
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
  );
};
