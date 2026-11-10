import React from 'react';
import type { MonthlySlaRow } from '../../types/reportSchemas';

export interface MonthlySlaTableProps {
  data: MonthlySlaRow[];
}

export const MonthlySlaTable: React.FC<MonthlySlaTableProps> = ({ data }) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse text-xs">
        <thead>
          <tr className="bg-canvas text-ink-subtle text-[11px] font-semibold border-y border-line">
            <th className="py-2.5 px-3 text-left">Month</th>
            <th className="py-2.5 px-3 text-right">Total Requests</th>
            <th className="py-2.5 px-3 text-right">Completed</th>
            <th className="py-2.5 px-3 text-right">Pending</th>
            <th className="py-2.5 px-3 text-right">Completion Rate</th>
            <th className="py-2.5 px-3 text-right">Remote (REM)</th>
            <th className="py-2.5 px-3 text-right">On-Site (SITE)</th>
            <th className="py-2.5 px-3 text-right">Avg Resolution</th>
            <th className="py-2.5 px-3 text-right">Same-Day SLA %</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line/60">
          {data.map((r, i) => (
            <tr key={`${r.month}-${i}`} className="hover:bg-zinc-50/60 transition-colors">
              <td className="py-3 px-3 font-bold text-ink align-middle text-left">{r.month}</td>
              <td className="py-3 px-3 font-mono align-middle text-right">{r.totalRequests}</td>
              <td className="py-3 px-3 font-mono text-emerald-700 font-semibold align-middle text-right">{r.completed}</td>
              <td className="py-3 px-3 font-mono text-amber-700 align-middle text-right">{r.pending}</td>
              <td className="py-3 px-3 font-mono font-bold text-emerald-600 align-middle text-right">{r.completionRate}%</td>
              <td className="py-3 px-3 font-mono align-middle text-right">{r.remoteMode}</td>
              <td className="py-3 px-3 font-mono align-middle text-right">{r.siteMode}</td>
              <td className="py-3 px-3 font-mono align-middle text-right">{r.avgResolutionHours} hrs</td>
              <td className="py-3 px-3 font-mono font-semibold align-middle text-right">{r.sameDayResolutionRate}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
