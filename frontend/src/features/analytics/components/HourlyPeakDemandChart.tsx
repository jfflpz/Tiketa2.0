import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { HOURLY_PEAK_DEMAND_DATA } from '../../../constants/domain';

const tooltipStyle = {
  backgroundColor: '#FFFFFF',
  borderColor: '#ECEEF2',
  borderRadius: '12px',
  fontSize: '12px',
};

const tickStyle = { fontSize: 11, fill: '#6B7280' };

export const HourlyPeakDemandChart: React.FC = () => {
  return (
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
            <XAxis dataKey="hour" tick={tickStyle} />
            <YAxis tick={tickStyle} />
            <Tooltip contentStyle={tooltipStyle} />
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
  );
};
