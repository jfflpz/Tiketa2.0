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
            <th className="py-2.5 px-3">Month</th>
            <th className="py-2.5 px-3">Total Requests</th>
            <th className="py-2.5 px-3">Completed</th>
            <th className="py-2.5 px-3">Pending</th>
            <th className="py-2.5 px-3">Completion Rate</th>
            <th className="py-2.5 px-3">Remote (REM)</th>
            <th className="py-2.5 px-3">On-Site (SITE)</th>
            <th className="py-2.5 px-3">Avg Resolution</th>
            <th className="py-2.5 px-3">Same-Day SLA %</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line/60">
          {data.map((r) => (
            <tr key={r.month} className="hover:bg-zinc-50/60 transition-colors">
              <td className="py-3 px-3 font-bold text-ink">{r.month}</td>
              <td className="py-3 px-3 font-mono">{r.totalRequests}</td>
              <td className="py-3 px-3 font-mono text-emerald-700 font-semibold">{r.completed}</td>
              <td className="py-3 px-3 font-mono text-amber-700">{r.pending}</td>
              <td className="py-3 px-3 font-mono font-bold text-emerald-600">{r.completionRate}%</td>
              <td className="py-3 px-3 font-mono">{r.remoteMode}</td>
              <td className="py-3 px-3 font-mono">{r.siteMode}</td>
              <td className="py-3 px-3 font-mono">{r.avgResolutionHours} hrs</td>
              <td className="py-3 px-3 font-mono font-semibold">{r.sameDayResolutionRate}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
