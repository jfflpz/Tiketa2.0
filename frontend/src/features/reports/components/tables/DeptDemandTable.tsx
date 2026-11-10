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
            <th className="py-2.5 px-3 text-left">Company</th>
            <th className="py-2.5 px-3 text-left">Department</th>
            <th className="py-2.5 px-3 text-left">Hub Location</th>
            <th className="py-2.5 px-3 text-right">Total Incidents</th>
            <th className="py-2.5 px-3 text-right">Labor Hours</th>
            <th className="py-2.5 px-3 text-left">Top Requestor</th>
            <th className="py-2.5 px-3 text-left">Dominant Issue</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line/60">
          {data.map((r, i) => (
            <tr key={`${r.company}-${r.department}-${i}`} className="hover:bg-zinc-50/60 transition-colors">
              <td className="py-3 px-3 font-bold text-ink align-middle text-left">{r.company}</td>
              <td className="py-3 px-3 align-middle text-left">{r.department}</td>
              <td className="py-3 px-3 font-mono align-middle text-left">{r.location}</td>
              <td className="py-3 px-3 font-mono font-bold text-orange-600 align-middle text-right">{r.totalTickets}</td>
              <td className="py-3 px-3 font-mono align-middle text-right">{r.totalHoursConsumed} hrs</td>
              <td className="py-3 px-3 align-middle text-left">{r.topRequestor}</td>
              <td className="py-3 px-3 font-medium text-ink-subtle align-middle text-left">{r.primaryTask}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
