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
import { AlertTriangle } from 'lucide-react';
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
  // @spec F-05: Preserve negative transit lag with a visible data-review indicator; do not silently zero negative/null values
  const hasNegativeLag = data.some(
    (row) =>
      (row.meanTransitLagDays != null && row.meanTransitLagDays < 0) ||
      (row as any).dataReviewRequired === true
  );

  return (
    <div className="bg-surface border border-line rounded-3xl p-5 shadow-card flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-bold text-ink">
            Logistical Transit Lag vs. Active Labor (FR-DASH-02)
          </h2>
          <span className="text-[11px] font-mono text-ink-subtle">Sir Raefael Metric</span>
        </div>
        <p className="text-xs text-ink-subtle mb-3">
          Separates courier/travel turnaround days from active technician bench hours.
        </p>

        {hasNegativeLag && (
          <div
            role="alert"
            className="mb-3 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2"
          >
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Data Review Required:</strong> Negative transit lag detected in historical timestamps. Verify intake and completion sequence.
            </span>
          </div>
        )}
      </div>

      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ECEEF2" />
            <XAxis dataKey="location" tick={tickStyle} />
            <YAxis tick={tickStyle} domain={['auto', 'auto']} />
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
