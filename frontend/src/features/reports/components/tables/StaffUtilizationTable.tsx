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
            <th className="py-2.5 px-3">Worked By (Technician)</th>
            <th className="py-2.5 px-3">Total Assigned</th>
            <th className="py-2.5 px-3">Completed</th>
            <th className="py-2.5 px-3">Pending</th>
            <th className="py-2.5 px-3">Total Hours Logged</th>
            <th className="py-2.5 px-3">Avg Time / Task</th>
            <th className="py-2.5 px-3">Primary Hub</th>
            <th className="py-2.5 px-3">Dominant Specialization</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line/60">
          {data.map((r) => (
            <tr key={r.technician} className="hover:bg-zinc-50/60 transition-colors">
              <td className="py-3 px-3 font-bold text-ink">{r.technician}</td>
              <td className="py-3 px-3 font-mono">{r.totalAssigned}</td>
              <td className="py-3 px-3 font-mono text-emerald-700 font-semibold">{r.completed}</td>
              <td className="py-3 px-3 font-mono">{r.pending}</td>
              <td className="py-3 px-3 font-mono font-semibold">{r.totalHoursLogged.toFixed(1)} hrs</td>
              <td className="py-3 px-3 font-mono">{r.avgTimePerTask} hrs</td>
              <td className="py-3 px-3">{r.primaryLocation}</td>
              <td className="py-3 px-3 font-medium text-ink-subtle">{r.mostFrequentTask}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
