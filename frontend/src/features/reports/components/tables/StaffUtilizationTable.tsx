import React from 'react';
import type { StaffUtilizationRow } from '../../types/reportSchemas';

export interface StaffUtilizationTableProps {
  data: StaffUtilizationRow[];
}

export const StaffUtilizationTable: React.FC<StaffUtilizationTableProps> = ({ data }) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse text-xs">
        <thead>
          <tr className="bg-canvas text-ink-subtle text-[11px] font-semibold border-y border-line">
            <th className="py-2.5 px-3 text-left">Worked By (Technician)</th>
            <th className="py-2.5 px-3 text-right">Total Assigned</th>
            <th className="py-2.5 px-3 text-right">Completed</th>
            <th className="py-2.5 px-3 text-right">Pending</th>
            <th className="py-2.5 px-3 text-right">Total Hours Logged</th>
            <th className="py-2.5 px-3 text-right">Avg Time / Task</th>
            <th className="py-2.5 px-3 text-left">Primary Hub</th>
            <th className="py-2.5 px-3 text-left">Dominant Specialization</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line/60">
          {data.map((r, i) => (
            <tr key={`${r.technician}-${i}`} className="hover:bg-zinc-50/60 transition-colors">
              <td className="py-3 px-3 font-bold text-ink align-middle text-left">{r.technician}</td>
              <td className="py-3 px-3 font-mono align-middle text-right">{r.totalAssigned}</td>
              <td className="py-3 px-3 font-mono text-emerald-700 font-semibold align-middle text-right">{r.completed}</td>
              <td className="py-3 px-3 font-mono align-middle text-right">{r.pending}</td>
              <td className="py-3 px-3 font-mono font-semibold align-middle text-right">{r.totalHoursLogged.toFixed(1)} hrs</td>
              <td className="py-3 px-3 font-mono align-middle text-right">{r.avgTimePerTask} hrs</td>
              <td className="py-3 px-3 align-middle text-left">{r.primaryLocation}</td>
              <td className="py-3 px-3 font-medium text-ink-subtle align-middle text-left">{r.mostFrequentTask}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
