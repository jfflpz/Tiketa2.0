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
            <th className="py-2.5 px-3 text-left">Terminal Location</th>
            <th className="py-2.5 px-3 text-left">Mode</th>
            <th className="py-2.5 px-3 text-right">Tickets</th>
            <th className="py-2.5 px-3 text-right">Active Labor (Mins)</th>
            <th className="py-2.5 px-3 text-right">Turnaround (Days)</th>
            <th className="py-2.5 px-3 text-right">Transit Lag (Days)</th>
            <th className="py-2.5 px-3 text-right">Lag / Labor Ratio</th>
            <th className="py-2.5 px-3 text-left">SOP Recommendation</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line/60">
          {data.map((r, i) => (
            <tr key={`${r.location}-${r.supportMode}-${i}`} className="hover:bg-zinc-50/60 transition-colors">
              <td className="py-3 px-3 font-bold text-ink align-middle text-left">{r.location}</td>
              <td className="py-3 px-3 font-mono align-middle text-left">{r.supportMode}</td>
              <td className="py-3 px-3 font-mono align-middle text-right">{r.completedTickets}</td>
              <td className="py-3 px-3 font-mono font-semibold align-middle text-right">{r.meanLaborMins}m</td>
              <td className="py-3 px-3 font-mono font-bold text-ink align-middle text-right">{r.meanTurnaroundDays}d</td>
              <td className="py-3 px-3 font-mono font-bold text-emerald-700 align-middle text-right">{r.meanTransitLagDays}d</td>
              <td className="py-3 px-3 font-mono text-ink-subtle align-middle text-right">{r.lagToLaborRatio}x</td>
              <td className="py-3 px-3 text-ink-subtle font-medium align-middle text-left">{r.recommendedAction}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
