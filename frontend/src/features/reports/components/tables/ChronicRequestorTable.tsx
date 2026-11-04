import React from 'react';
import type { ChronicRequestorRow } from '../../types/reportSchemas';

export interface ChronicRequestorTableProps {
  data: ChronicRequestorRow[];
}

export const ChronicRequestorTable: React.FC<ChronicRequestorTableProps> = ({ data }) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse text-xs">
        <thead>
          <tr className="bg-canvas text-ink-subtle text-[11px] font-semibold border-y border-line">
            <th className="py-2.5 px-3">Requestor Name</th>
            <th className="py-2.5 px-3">Department</th>
            <th className="py-2.5 px-3">Terminal Location</th>
            <th className="py-2.5 px-3">Repeat Incidents</th>
            <th className="py-2.5 px-3">Dominant Issue</th>
            <th className="py-2.5 px-3">Remote Fix %</th>
            <th className="py-2.5 px-3">Target SOP Recommendation</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line/60">
          {data.map((r) => (
            <tr key={`${r.requestorName}-${r.location}`} className="hover:bg-zinc-50/60 transition-colors">
              <td className="py-3 px-3 font-bold text-ink">{r.requestorName}</td>
              <td className="py-3 px-3">{r.department}</td>
              <td className="py-3 px-3 font-mono">{r.location}</td>
              <td className="py-3 px-3 font-mono font-bold text-amber-700">{r.repeatIncidents} tickets</td>
              <td className="py-3 px-3 font-semibold">{r.dominantTask}</td>
              <td className="py-3 px-3 font-mono">{r.remoteResolutionRate}%</td>
              <td className="py-3 px-3 text-orange-600 font-medium">{r.sopTrainingTarget}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
