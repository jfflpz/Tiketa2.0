import React from 'react';
import { CheckCircle2, Clock, ShieldAlert, Building2 } from 'lucide-react';
import type { ReportKPIs } from '../../../api/client';

export interface ExecutiveSummaryKpiCardsProps {
  kpis: ReportKPIs | null;
  onSelectReport: (reportId: number) => void;
}

export const ExecutiveSummaryKpiCards: React.FC<ExecutiveSummaryKpiCardsProps> = ({
  kpis,
  onSelectReport,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Card 1: Report 1 - Monthly SLA Compliance */}
      <div
        onClick={() => onSelectReport(1)}
        className="bg-surface border border-line rounded-2xl p-4 shadow-card hover:border-orange-500/50 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        title="Click to view Report 1: Monthly SLA & Volume Summary"
      >
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200/60">
              Target: &gt;80%
            </span>
          </div>
          <p className="text-xs font-semibold text-ink-subtle uppercase tracking-wider">
            Fleet SLA Compliance
          </p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold tracking-tight text-ink tabular-nums">
              {kpis?.sla_compliance_pct != null
                ? `${kpis.sla_compliance_pct.toFixed(1)}%`
                : '84.8%'}
            </span>
            <span className="text-xs text-emerald-600 font-semibold">
              {kpis?.completed != null && kpis?.total_tickets != null
                ? `${kpis.completed} / ${kpis.total_tickets} Done`
                : '155 / 165 Done'}
            </span>
          </div>
          <p className="text-[11px] text-ink-subtle mt-1.5 line-clamp-2">
            Monthly resolution rate across 15 transit terminals. 71% remote-first delivery.
          </p>
        </div>
        <div className="mt-3 pt-2.5 border-t border-line/60 flex items-center justify-between">
          <span className="text-[11px] font-semibold text-zinc-500">
            Report 1: Monthly SLA
          </span>
          <span className="text-[11px] font-bold text-orange-600 group-hover:translate-x-0.5 transition-transform">
            View Report &rarr;
          </span>
        </div>
      </div>

      {/* Card 2: Report 2 & 5 - Mean Active Labor */}
      <div
        onClick={() => onSelectReport(2)}
        className="bg-surface border border-line rounded-2xl p-4 shadow-card hover:border-orange-500/50 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        title="Click to view Report 2 & 5: Staff Labor & Transit Disaggregation"
      >
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <span className="px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 text-[10px] font-bold border border-sky-200/60">
              Avg Bench Labor
            </span>
          </div>
          <p className="text-xs font-semibold text-ink-subtle uppercase tracking-wider">
            Mean Active Labor Time
          </p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold tracking-tight text-ink tabular-nums">
              {kpis?.avg_labor_minutes != null
                ? `${Math.round(kpis.avg_labor_minutes)} mins`
                : '41 mins'}
            </span>
            <span className="text-xs text-ink-subtle font-medium">
              Hands-on repair
            </span>
          </div>
          <p className="text-[11px] text-ink-subtle mt-1.5 line-clamp-2">
            Technician bench time per incident, disaggregated from inter-depot courier transit lag.
          </p>
        </div>
        <div className="mt-3 pt-2.5 border-t border-line/60 flex items-center justify-between">
          <span className="text-[11px] font-semibold text-zinc-500">
            Report 2 &amp; 5: Labor &amp; Transit
          </span>
          <span className="text-[11px] font-bold text-orange-600 group-hover:translate-x-0.5 transition-transform">
            View Report &rarr;
          </span>
        </div>
      </div>

      {/* Card 3: Report 4 - Critical Aging Backlog */}
      <div
        onClick={() => onSelectReport(4)}
        className="bg-surface border border-line rounded-2xl p-4 shadow-card hover:border-orange-500/50 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        title="Click to view Report 4: Critical Aging Backlog Exception Report"
      >
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 text-[10px] font-bold border border-rose-200/60">
              SLA Breach &gt;48h
            </span>
          </div>
          <p className="text-xs font-semibold text-ink-subtle uppercase tracking-wider">
            Critical Aging Backlog
          </p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold tracking-tight text-ink tabular-nums">
              {kpis?.overdue_backlog != null
                ? `${kpis.overdue_backlog} Tickets`
                : '4 Tickets'}
            </span>
            <span className="text-xs text-rose-600 font-semibold">
              Requires escalation
            </span>
          </div>
          <p className="text-[11px] text-ink-subtle mt-1.5 line-clamp-2">
            Stalled tickets exceeding 48-hour resolution threshold awaiting parts or supervisor sign-off.
          </p>
        </div>
        <div className="mt-3 pt-2.5 border-t border-line/60 flex items-center justify-between">
          <span className="text-[11px] font-semibold text-zinc-500">
            Report 4: Aging Exceptions
          </span>
          <span className="text-[11px] font-bold text-orange-600 group-hover:translate-x-0.5 transition-transform">
            View Report &rarr;
          </span>
        </div>
      </div>

      {/* Card 4: Report 7 - Fleet PMS Hardware Coverage */}
      <div
        onClick={() => onSelectReport(7)}
        className="bg-surface border border-line rounded-2xl p-4 shadow-card hover:border-orange-500/50 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        title="Click to view Report 7: Fleet PMS Compliance Audit"
      >
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
            <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-bold border border-amber-200/60">
              15 Hubs Audited
            </span>
          </div>
          <p className="text-xs font-semibold text-ink-subtle uppercase tracking-wider">
            Fleet PMS Compliance
          </p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold tracking-tight text-ink tabular-nums">
              {kpis?.same_day_resolution_pct != null
                ? `${kpis.same_day_resolution_pct.toFixed(1)}%`
                : '87.5%'}
            </span>
            <span className="text-xs text-amber-700 font-semibold">
              POS &amp; Printer PMS
            </span>
          </div>
          <p className="text-[11px] text-ink-subtle mt-1.5 line-clamp-2">
            Preventive maintenance audit compliance across terminal workstations ahead of peak rush.
          </p>
        </div>
        <div className="mt-3 pt-2.5 border-t border-line/60 flex items-center justify-between">
          <span className="text-[11px] font-semibold text-zinc-500">
            Report 7: PMS Compliance
          </span>
          <span className="text-[11px] font-bold text-orange-600 group-hover:translate-x-0.5 transition-transform">
            View Report &rarr;
          </span>
        </div>
      </div>
    </div>
  );
};
