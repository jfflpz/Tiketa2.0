import React from 'react';
import type { TransitLagRow } from '../../types/reportSchemas';

export interface TransitLagTableProps {
  data: TransitLagRow[];
}

export const TransitLagTable: React.FC<TransitLagTableProps> = ({ data }) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse text-xs">
        <thead>
          <tr className="bg-canvas text-ink-subtle text-[11px] font-semibold border-y border-line">
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
        <tbody className="divide-y divide-line/60">
          {data.map((r) => (
            <tr key={r.location} className="hover:bg-zinc-50/60 transition-colors">
              <td className="py-3 px-3 font-bold text-ink">{r.location}</td>
              <td className="py-3 px-3 font-mono">{r.supportMode}</td>
              <td className="py-3 px-3 font-mono">{r.completedTickets}</td>
              <td className="py-3 px-3 font-mono font-semibold">{r.meanLaborMins}m</td>
              <td className="py-3 px-3 font-mono font-bold text-ink">{r.meanTurnaroundDays}d</td>
              <td className="py-3 px-3 font-mono font-bold text-emerald-700">{r.meanTransitLagDays}d</td>
              <td className="py-3 px-3 font-mono text-ink-subtle">{r.lagToLaborRatio}x</td>
              <td className="py-3 px-3 text-ink-subtle font-medium">{r.recommendedAction}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
