import React from 'react';
import type { DeptDemandRow } from '../../types/reportSchemas';

export interface DeptDemandTableProps {
  data: DeptDemandRow[];
}

export const DeptDemandTable: React.FC<DeptDemandTableProps> = ({ data }) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse text-xs">
        <thead>
          <tr className="bg-canvas text-ink-subtle text-[11px] font-semibold border-y border-line">
            <th className="py-2.5 px-3">Company</th>
            <th className="py-2.5 px-3">Department</th>
            <th className="py-2.5 px-3">Hub Location</th>
            <th className="py-2.5 px-3">Total Incidents</th>
            <th className="py-2.5 px-3">Labor Hours</th>
            <th className="py-2.5 px-3">Top Requestor</th>
            <th className="py-2.5 px-3">Dominant Issue</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line/60">
          {data.map((r, i) => (
            <tr key={`${r.company}-${r.department}-${i}`} className="hover:bg-zinc-50/60 transition-colors">
              <td className="py-3 px-3 font-bold text-ink">{r.company}</td>
              <td className="py-3 px-3">{r.department}</td>
              <td className="py-3 px-3 font-mono">{r.location}</td>
              <td className="py-3 px-3 font-mono font-bold text-orange-600">{r.totalTickets}</td>
              <td className="py-3 px-3 font-mono">{r.totalHoursConsumed} hrs</td>
              <td className="py-3 px-3">{r.topRequestor}</td>
              <td className="py-3 px-3 font-medium text-ink-subtle">{r.primaryTask}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
