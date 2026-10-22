import React from 'react';
import type { AgingBacklogRow } from '../../types/reportSchemas';

export interface AgingBacklogTableProps {
  data: AgingBacklogRow[];
}

export const AgingBacklogTable: React.FC<AgingBacklogTableProps> = ({ data }) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse text-xs">
        <thead>
          <tr className="bg-canvas text-ink-subtle text-[11px] font-semibold border-y border-line">
            <th className="py-2.5 px-3">Date Started</th>
            <th className="py-2.5 px-3">Days Open</th>
            <th className="py-2.5 px-3">Department</th>
            <th className="py-2.5 px-3">Requestor</th>
            <th className="py-2.5 px-3">Task Description</th>
            <th className="py-2.5 px-3">Terminal Location</th>
            <th className="py-2.5 px-3">Assigned Tech</th>
            <th className="py-2.5 px-3">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line/60">
          {data.map((r, i) => (
            <tr key={`${r.dateStarted}-${r.requestor}-${i}`} className="hover:bg-zinc-50/60 transition-colors">
              <td className="py-3 px-3 font-mono text-ink-subtle">{r.dateStarted}</td>
              <td className="py-3 px-3 font-mono font-extrabold text-rose-600">{r.daysOpen} days</td>
              <td className="py-3 px-3">{r.companyDept}</td>
              <td className="py-3 px-3 font-medium">{r.requestor}</td>
              <td className="py-3 px-3 text-ink-subtle">{r.taskDescription}</td>
              <td className="py-3 px-3 font-mono">{r.location}</td>
              <td className="py-3 px-3">{r.workedBy}</td>
              <td className="py-3 px-3">
                <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 text-[10px] font-bold">
                  {r.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
