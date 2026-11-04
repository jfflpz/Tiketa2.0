import React from 'react';
import { CheckCircle2, ShieldAlert, AlertTriangle, Clock } from 'lucide-react';
import type { PmsComplianceRow } from '../../types/reportSchemas';

export interface PmsComplianceTableProps {
  data: PmsComplianceRow[];
}

export const PmsComplianceTable: React.FC<PmsComplianceTableProps> = ({ data }) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse text-xs">
        <thead>
          <tr className="bg-canvas text-ink-subtle text-[11px] font-semibold border-y border-line">
            <th className="py-2.5 px-3">Terminal Location</th>
            <th className="py-2.5 px-3">Department</th>
            <th className="py-2.5 px-3">Expected Services</th>
            <th className="py-2.5 px-3">Services Conducted</th>
            <th className="py-2.5 px-3">Coverage %</th>
            <th className="py-2.5 px-3">Last Completed</th>
            <th className="py-2.5 px-3">Serviced By</th>
            <th className="py-2.5 px-3">Service Plan Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line/60">
          {data.map((r, i) => (
            <tr key={`${r.terminalLocation}-${r.department}-${i}`} className="hover:bg-zinc-50/60 transition-colors">
              <td className="py-3 px-3 font-bold text-ink">{r.terminalLocation}</td>
              <td className="py-3 px-3">{r.department}</td>
              <td className="py-3 px-3 font-mono">{r.expectedServices != null ? r.expectedServices : '—'}</td>
              <td className="py-3 px-3 font-mono">{r.pmsConducted}</td>
              <td className="py-3 px-3 font-mono font-bold text-emerald-700">
                {r.complianceRate != null ? `${r.complianceRate.toFixed(1)}%` : '—'}
              </td>
              <td className="py-3 px-3 font-mono">{r.lastCompletedDate || '—'}</td>
              <td className="py-3 px-3">{r.servicedBy || '—'}</td>
              <td className="py-3 px-3">
                {r.status === 'compliant' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold text-[11px]">
                    <CheckCircle2 className="w-3 h-3" /> Compliant
                  </span>
                )}
                {r.status === 'due' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 font-semibold text-[11px]">
                    <Clock className="w-3 h-3" /> Due
                  </span>
                )}
                {r.status === 'overdue' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-50 text-orange-800 font-semibold text-[11px]">
                    <AlertTriangle className="w-3 h-3" /> Overdue
                  </span>
                )}
                {r.status === 'critical' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-semibold text-[11px]">
                    <ShieldAlert className="w-3 h-3" /> Critical
                  </span>
                )}
                {r.status === 'unplanned' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 font-semibold text-[11px]">
                    Unplanned
                  </span>
                )}
                {r.status === 'company-filtered' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold text-[11px]">
                    Company Filtered
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
