// @spec F-F2: Supported asset service-age, incident history, and repair-cost chart with accessible table alternative
import React, { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { Info, Table2, BarChart3 } from 'lucide-react';
import type { AssetServiceMetric } from '../../../api/client';

export interface AssetServiceMetricsCardProps {
  metrics: AssetServiceMetric[];
  isLoading: boolean;
  error: string | null;
  activePeriodText: string;
}

export const AssetServiceMetricsCard: React.FC<AssetServiceMetricsCardProps> = ({
  metrics,
  isLoading,
  error,
  activePeriodText,
}) => {
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');

  const chartData = metrics.map((m) => ({
    label: `${m.asset_tag} (${m.model_name})`,
    serviceIncidents: m.service_incident_count,
    ageMonths: m.age_months,
    repairCostPhp: m.repair_cost_total,
  }));

  const hasUnknownAcquisition = metrics.some((m) => !m.acquisition_date || m.age_months == null);
  const hasSparseHistory = metrics.length > 0 && metrics.length < 3;

  return (
    <div
      data-testid="asset-service-metrics-card"
      className="bg-white border border-[#ECEEF2] rounded-3xl p-5 shadow-card space-y-4"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-ink">
            Asset Service Age, Incident History &amp; Repair Cost
          </h3>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            Units: Age in Months (when acquisition date is recorded), Incidents in Count, Repair Cost in PHP · Window:{' '}
            <span className="font-mono">{activePeriodText}</span>
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setViewMode('chart')}
            aria-pressed={viewMode === 'chart'}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${
              viewMode === 'chart'
                ? 'bg-zinc-900 text-white'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Chart</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('table')}
            aria-pressed={viewMode === 'table'}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${
              viewMode === 'table'
                ? 'bg-zinc-900 text-white'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
            }`}
          >
            <Table2 className="w-3.5 h-3.5" />
            <span>Accessible Table</span>
          </button>
        </div>
      </div>

      {/* Data limitations disclosure */}
      <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50/70 px-3 py-2 text-[11px] text-amber-900">
        <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="font-semibold">
            Data Limitations: Incident counts do not represent remaining asset life.
          </p>
          {hasUnknownAcquisition && (
            <p>
              Assets without a recorded acquisition date show Age as Unknown and are omitted from age bars.
            </p>
          )}
          {hasSparseHistory && (
            <p>Sparse history: fewer than 3 tracked assets have recorded service events in this window.</p>
          )}
        </div>
      </div>

      {isLoading && (
        <div className="py-8 text-center text-xs text-ink-subtle font-mono animate-pulse">
          Loading asset service metrics...
        </div>
      )}

      {!isLoading && error && (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-semibold text-rose-700">
          {error}
        </div>
      )}

      {!isLoading && !error && metrics.length === 0 && (
        <div className="py-8 text-center text-xs text-zinc-500">
          No saved asset service metrics recorded for this window.
        </div>
      )}

      {!isLoading && !error && metrics.length > 0 && viewMode === 'chart' && (
        <div className="h-64 w-full" role="region" aria-label="Asset service age, incident history, and repair cost chart">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ECEEF2" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#52525B' }} />
              <YAxis tick={{ fontSize: 10, fill: '#52525B' }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="serviceIncidents" name="Service Incidents (Count)" fill="#EA580C" radius={[6, 6, 0, 0]} />
              <Bar dataKey="ageMonths" name="Recorded Age (Months)" fill="#0284C7" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {!isLoading && !error && metrics.length > 0 && (
        <div className={viewMode === 'table' ? 'overflow-x-auto' : 'sr-only'}>
          <table className="w-full text-left border-collapse text-xs" aria-label="Asset service metrics accessible table">
            <thead>
              <tr className="bg-canvas text-ink-subtle text-[11px] font-semibold border-y border-line">
                <th className="py-2 px-3">Asset Tag</th>
                <th className="py-2 px-3">Model &amp; Serial</th>
                <th className="py-2 px-3 text-right">Recorded Age (Months)</th>
                <th className="py-2 px-3 text-right">Service Incidents</th>
                <th className="py-2 px-3 text-right">Repair Cost (PHP)</th>
                <th className="py-2 px-3 text-right">Acquisition Cost (PHP)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {metrics.map((m) => (
                <tr key={m.asset_id}>
                  <td className="py-2.5 px-3 font-mono font-bold text-ink">{m.asset_tag}</td>
                  <td className="py-2.5 px-3 text-ink">
                    {m.model_name} · S/N: {m.serial_number ?? 'Unknown'}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-right">
                    {m.age_months == null ? 'Unknown' : `${m.age_months} mo`}
                  </td>
                  <td className="py-2.5 px-3 font-mono font-bold text-orange-600 text-right">
                    {m.service_incident_count}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-right">
                    {m.repair_cost_total == null ? 'Unknown' : `₱${m.repair_cost_total.toLocaleString()}`}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-right">
                    {m.acquisition_cost == null ? 'Unknown' : `₱${m.acquisition_cost.toLocaleString()}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
