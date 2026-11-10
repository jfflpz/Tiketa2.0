import React, { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { useAppStore } from '../../../store/useAppStore';

const tooltipStyle = {
  backgroundColor: '#FFFFFF',
  borderColor: '#ECEEF2',
  borderRadius: '12px',
  fontSize: '12px',
};

const tickStyle = { fontSize: 11, fill: '#6B7280' };

const OPERATING_HOURS = [
  '06:00',
  '07:00',
  '08:00',
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
];

export interface HourlyPeakDemandChartProps {
  tickets?: any[];
}

export const HourlyPeakDemandChart: React.FC<HourlyPeakDemandChartProps> = ({ tickets: propTickets }) => {
  const storeTickets = useAppStore((state) => state.tickets);
  const tickets = propTickets ?? storeTickets;

  // @spec F-05: Remove production hourly sample series and bind to actual started-at Asia/Manila window
  const hourlyData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const h of OPERATING_HOURS) {
      counts[h] = 0;
    }

    tickets.forEach((ticket) => {
      let hourStr: string | null = null;
      if (ticket.time_started) {
        const parts = String(ticket.time_started).split(':');
        if (parts.length >= 1) {
          hourStr = `${parts[0].padStart(2, '0')}:00`;
        }
      } else if (ticket.started_at) {
        try {
          const d = new Date(ticket.started_at);
          const manilaHour = d.toLocaleTimeString('en-GB', {
            timeZone: 'Asia/Manila',
            hour: '2-digit',
            hour12: false,
          });
          hourStr = `${manilaHour}:00`;
        } catch {
          // ignore parsing error
        }
      }

      if (hourStr && counts[hourStr] !== undefined) {
        counts[hourStr]++;
      }
    });

    return OPERATING_HOURS.map((h) => ({
      hour: h,
      tickets: counts[h],
    }));
  }, [tickets]);

  const totalEvaluated = useMemo(() => {
    return hourlyData.reduce((acc, curr) => acc + curr.tickets, 0);
  }, [hourlyData]);

  return (
    <div className="bg-surface border border-line rounded-3xl p-5 shadow-card flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-bold text-ink">
            Hourly Support Surge Histogram
          </h2>
          <span className="text-[11px] font-mono text-ink-subtle">06:00–17:00 Window</span>
        </div>
        <p className="text-xs text-ink-subtle mb-4">
          Aggregates Asia/Manila Time Started into 60-minute dispatch bins ({totalEvaluated} ticket{totalEvaluated !== 1 ? 's' : ''} evaluated).
        </p>
      </div>
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={hourlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ECEEF2" />
            <XAxis dataKey="hour" tick={tickStyle} />
            <YAxis tick={tickStyle} allowDecimals={false} />
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
