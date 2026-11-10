// @spec UI-OVERVIEW-01: Personal IT Specialist KPI Scorecard & Operations & Service Health Bento Grid
import React, { useEffect } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  Wrench,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  Inbox,
  BookOpen,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { StatusBadge } from '../../components/common/StatusBadge';

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

export const ITOverviewDashboard: React.FC = () => {
    const currentUser = useAppStore((state) => state.currentUser);
  const tickets = useAppStore((state) => state.tickets);
  const savedRepairNotes = useAppStore((state) => state.savedRepairNotes);
  const fetchSavedRepairNotes = useAppStore((state) => state.fetchSavedRepairNotes);
  const setSelectedTicketId = useAppStore((state) => state.setSelectedTicketId);
  const setActiveView = useAppStore((state) => state.setActiveView);
  const fetchQueueApi = useAppStore((state) => state.fetchQueueApi);
  const isFetchingQueue = useAppStore((state) => state.isFetchingQueue);

  React.useEffect(() => {
    fetchSavedRepairNotes();
  }, [fetchSavedRepairNotes]);
  const kpis = useAppStore((state) => state.kpis);
  const fetchKPIsApi = useAppStore((state) => state.fetchKPIsApi);

  const techName = currentUser?.name ?? 'Nathaniel D. Esguerra';
  const techFirstName = techName.split(' ')[0];

    useEffect(() => {
    fetchQueueApi();
    fetchKPIsApi();
  }, [fetchQueueApi, fetchKPIsApi]);

  // Personal KPI calculations for the logged-in IT Specialist (Strict UUID matching first)
  const myTickets = React.useMemo(() => {
    return tickets.filter(
      (t) =>
        (currentUser?.id && (t.assigned_tech_id === currentUser.id || t.workedById === currentUser.id)) ||
        (techName && t.workedBy === techName) ||
        (techFirstName && t.workedBy?.toLowerCase().includes(techFirstName.toLowerCase()))
    );
  }, [tickets, currentUser?.id, techName, techFirstName]);

  const myActiveRepairs = myTickets.filter((t) => t.status === 'PROG');
  // F-05: Real completed counts from authorized history, zero hardcoded +16 offset
  const myResolvedCount = myTickets.filter((t) => t.status === 'RESL' || t.status === 'CLSD').length;
  const openPoolCount = tickets.filter((t) => t.status === 'OPEN').length;

  // Real duration calculations from closed/resolved tickets
  const resolvedWithDuration = myTickets.filter(
    (t) => (t.status === 'RESL' || t.status === 'CLSD') && typeof t.duration === 'number' && t.duration > 0
  );
  const avgDurationHrs = resolvedWithDuration.length > 0
    ? resolvedWithDuration.reduce((acc, t) => acc + (t.duration || 0), 0) / resolvedWithDuration.length
    : null;
  const avgDurationMinutes = avgDurationHrs !== null ? `${Math.round(avgDurationHrs * 60)} mins` : '0 mins';

  // Dynamic Mode breakdown from actual authorized tickets
  const modeCounts = React.useMemo(() => {
    let remote = 0;
    let onsite = 0;
    let other = 0;
    myTickets.forEach((t) => {
      const m = t.mode?.toLowerCase() || '';
      if (m.includes('rem') || m.includes('remote') || m.includes('anydesk')) {
        remote++;
      } else if (m.includes('site') || m.includes('on-site') || m.includes('onsite')) {
        onsite++;
      } else {
        other++;
      }
    });
    return { remote, onsite, other, total: myTickets.length };
  }, [myTickets]);

  const dynamicModeDonutData = React.useMemo(() => {
    if (modeCounts.total === 0) {
      return [{ name: 'No Ticket Data', value: 1, color: '#E4E4E7' }];
    }
    const data = [];
    if (modeCounts.remote > 0) {
      data.push({ name: 'Remote (AnyDesk)', value: modeCounts.remote, color: '#F97316' });
    }
    if (modeCounts.onsite > 0) {
      data.push({ name: 'On-Site Repairs', value: modeCounts.onsite, color: '#FB923C' });
    }
    if (modeCounts.other > 0) {
      data.push({ name: 'General Support', value: modeCounts.other, color: '#FDBA74' });
    }
    return data;
  }, [modeCounts]);

  // F-06: Real monthly output trend for 2026 aggregated from authorized tickets
  const monthlyOutputTrendData = React.useMemo(() => {
    const months = MONTH_NAMES.map((month) => ({
      month,
      resolved: 0,
      remote: 0,
      onsite: 0,
    }));

    myTickets.forEach((t) => {
      if (t.status !== 'RESL' && t.status !== 'CLSD') return;

      let monthIdx = -1;
      if (t.month) {
        const lower = t.month.toLowerCase();
        const shortMonths = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
        monthIdx = shortMonths.findIndex((m) => lower.includes(m));
      }
      if (monthIdx === -1 && t.dateFinished) {
        const d = new Date(t.dateFinished);
        if (!isNaN(d.getTime())) monthIdx = d.getMonth();
      }
      if (monthIdx === -1 && t.dateStarted) {
        const d = new Date(t.dateStarted);
        if (!isNaN(d.getTime())) monthIdx = d.getMonth();
      }
      if (monthIdx === -1 && (t as any).created_at) {
        const d = new Date((t as any).created_at);
        if (!isNaN(d.getTime())) monthIdx = d.getMonth();
      }

      if (monthIdx >= 0 && monthIdx < 12) {
        const m = (t.mode || '').toLowerCase();
        const isRemote = m.includes('rem') || m.includes('remote') || m.includes('anydesk');
        if (isRemote) {
          months[monthIdx].remote += 1;
        } else {
          months[monthIdx].onsite += 1;
        }
        months[monthIdx].resolved += 1;
      }
    });

    return months;
  }, [myTickets]);

  const totalResolvedInYear = React.useMemo(() => {
    return monthlyOutputTrendData.reduce((acc, curr) => acc + curr.resolved, 0);
  }, [monthlyOutputTrendData]);

  // Real Ticket Resolution Rate without fake 40/36 fallbacks or empty 100%
  const totalFleetFromTickets = tickets.length;
  const completedFleetFromTickets = tickets.filter(
    (t) => t.status === 'RESL' || t.status === 'CLSD'
  ).length;

  const totalCount = kpis?.total_tickets ?? totalFleetFromTickets;
  const completedCount = kpis?.completed ?? completedFleetFromTickets;
  const resolutionPercentage =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const strokeOffset =
    2 * Math.PI * 32 * (1 - Math.min(Math.max(resolutionPercentage, 0), 100) / 100);

  return (
    <div className="space-y-5 pb-8">
      {/* Personal Technician Greeting Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink tracking-tight">
            Welcome back, {techName} !
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Personal IT Specialist KPI Scorecard, Repair Durations, and Terminal Service Health.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={isFetchingQueue}
            onClick={() => fetchQueueApi()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-zinc-50 text-ink border border-[#ECEEF2] text-xs font-bold shadow-card transition-colors press-fx"
            title="Refresh queue from server"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 text-zinc-500 ${
                isFetchingQueue ? 'animate-spin text-orange-500' : ''
              }`}
            />
            <span>{isFetchingQueue ? 'Syncing...' : 'Refresh'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveView('tickets')}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-zinc-50 text-ink border border-[#ECEEF2] text-xs font-semibold inline-flex items-center gap-1.5 shadow-card transition-colors press-fx"
            title="View Active Tickets"
          >
            <Inbox className="w-3.5 h-3.5 text-orange-500" />
            <span>View Active Tickets</span>
          </button>
        </div>
      </div>

      {/* Main 12-Column Nexora Personal KPI Bento Grid - Harmonized 2-Row Layout */}
      <div className="space-y-5">
        {/* ROW 1: Fleet SLA & Claimed Tickets (3 Cols) | 4 KPI Cards (6 Cols) | Support Mode Donut (3 Cols) */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">
          {/* LEFT: Fleet SLA Card + Compact Claimed Tickets List */}
          <div className="xl:col-span-3 flex flex-col justify-between gap-5">
            {/* 1. Orange Gradient Card: Option C - Simple & Intuitive Ticket Resolution Rate */}
            <div className="rounded-2xl bg-gradient-to-br from-orange-500 via-orange-500 to-orange-600 text-white p-5 shadow-md relative overflow-hidden flex-1 flex flex-col justify-between">
              <div className="w-36 h-36 rounded-full bg-white/10 absolute -right-10 -bottom-10 pointer-events-none" />
              <div className="w-20 h-20 rounded-full bg-white/5 absolute right-12 -top-6 pointer-events-none" />

              <div className="relative z-10 flex items-center justify-between gap-3">
                <div className="space-y-2 max-w-[63%]">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-black/20 text-orange-100">
                    Terminal Resolution Rate
                  </span>
                  <h2 className="text-base font-bold leading-snug">
                    Ticket Resolution Rate
                  </h2>
                  <p className="text-[11px] text-orange-100 leading-relaxed">
                    <strong>{resolutionPercentage}%</strong> of reported terminal issues resolved ({completedCount} of {totalCount} closed).
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveView('tickets')}
                    className="inline-flex items-center gap-1 text-xs font-bold text-white underline underline-offset-4 hover:text-orange-100 pt-1 press-fx"
                  >
                    <span>View Ticket Lists</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Circular SVG Progress Ring */}
                <div className="relative w-20 h-20 flex items-center justify-center shrink-0">
                  <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                    <circle
                      cx="40"
                      cy="40"
                      r="32"
                      fill="none"
                      stroke="rgba(255,255,255,0.25)"
                      strokeWidth="6"
                    />
                    <circle
                      cx="40"
                      cy="40"
                      r="32"
                      fill="none"
                      stroke="#FFFFFF"
                      strokeWidth="6"
                      strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 32}
                      strokeDashoffset={strokeOffset}
                    />
                  </svg>
                  <span className="absolute text-sm font-extrabold text-white tabular-nums">
                    {resolutionPercentage}%
                  </span>
                </div>
              </div>
            </div>

            {/* 2. My Claimed & Active Tickets List (Compact 2 Items for Strict Row Alignment) */}
            <div className="bg-white border border-[#ECEEF2] rounded-2xl p-4 sm:p-5 shadow-card flex flex-col justify-between flex-1">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-1 h-4 rounded-full bg-orange-500" />
                    <h3 className="text-sm font-bold text-ink">My Claimed Tickets</h3>
                  </div>
                  <span className="text-[11px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                    {myTickets.length} Assigned
                  </span>
                </div>

                <div className="space-y-2.5">
                  {(myTickets.length > 0 ? myTickets.slice(0, 4) : tickets.slice(0, 4)).map(
                    (t, i) => {
                      const badgeColors = [
                        'bg-orange-100 text-orange-700',
                        'bg-amber-100 text-amber-700',
                        'bg-emerald-100 text-emerald-700',
                        'bg-sky-100 text-sky-700',
                      ];
                      return (
                        <div
                          key={t.id}
                          onClick={() => setSelectedTicketId(t.id)}
                          className="flex items-center justify-between gap-2.5 cursor-pointer group hover:bg-zinc-50/80 p-1.5 -mx-1.5 rounded-xl transition-colors"
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-mono font-bold shrink-0 ${
                                badgeColors[i % badgeColors.length]
                              }`}
                            >
                              {t.locationCode}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-zinc-900 text-white shrink-0 whitespace-nowrap">
                                  {t.ticketCode}
                                </span>
                                <p className="text-xs font-bold text-ink truncate group-hover:text-orange-600 transition-colors">
                                  {t.task}
                                </p>
                              </div>
                              <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                                {t.location} • {t.requestor}
                              </p>
                            </div>
                          </div>
                          <div className="shrink-0">
                            <StatusBadge status={t.status} size="sm" />
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              </div>

              {(myTickets.length > 4 || tickets.length > 4) && (
                <div className="pt-2 text-right border-t border-zinc-100 mt-2">
                  <button
                    type="button"
                    onClick={() => setActiveView('tickets')}
                    className="text-[11px] font-bold text-orange-600 hover:text-orange-700 hover:underline inline-flex items-center gap-1 press-fx"
                  >
                    <span>+{Math.max(0, (myTickets.length > 0 ? myTickets.length : tickets.length) - 4)} more assigned</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* CENTER: 4 Personal KPI Cards (2x2 Grid) */}
          <div className="xl:col-span-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 h-full">
              {/* Personal KPI 1: My Resolved Tickets */}
              <div className="bg-white border border-[#ECEEF2] rounded-2xl p-5 shadow-card flex flex-col justify-between space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-zinc-400">
                      My Resolved Tickets (Oct)
                    </p>
                    <h3 className="text-2xl font-extrabold text-ink mt-1 tabular-nums">
                      {myResolvedCount} Repairs
                    </h3>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-sm shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                </div>
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-end justify-between">
                    <div className="relative">
                      <svg className="w-28 h-9 overflow-visible" viewBox="0 0 100 32">
                        <defs>
                          <linearGradient id="kpiGrad1" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#F97316" stopOpacity={0.22} />
                            <stop offset="100%" stopColor="#F97316" stopOpacity={0.00} />
                          </linearGradient>
                        </defs>
                        {/* Ground Zero Baseline */}
                        <line x1="2" y1="28" x2="98" y2="28" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="2 2" />
                        {/* Midline Target Guideline */}
                        <line x1="2" y1="14" x2="98" y2="14" stroke="#FDBA74" strokeWidth="1" strokeDasharray="3 3" opacity={0.65} />
                        {/* Area Fill */}
                        <path
                          d="M 2 24 Q 20 10, 38 18 T 72 8 T 98 12 L 98 28 L 2 28 Z"
                          fill="url(#kpiGrad1)"
                        />
                        {/* Trend Curve */}
                        <path
                          d="M 2 24 Q 20 10, 38 18 T 72 8 T 98 12"
                          fill="none"
                          stroke="#F97316"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                        />
                        {/* Latest Active Dot */}
                        <circle cx="98" cy="12" r="2.8" fill="#F97316" stroke="#FFFFFF" strokeWidth="1.5" />
                      </svg>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-emerald-600">
                        +24% vs last mo
                      </span>
                      <p className="text-[11px] text-zinc-400">personal output</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[9px] text-zinc-400 font-mono pt-1 px-0.5 border-t border-zinc-100">
                    <span>W1</span>
                    <span className="text-orange-500 font-sans font-semibold">Tgt 40+</span>
                    <span>W4</span>
                  </div>
                </div>
              </div>

              {/* Personal KPI 2: My Active Repairs */}
              <div className="bg-white border border-[#ECEEF2] rounded-2xl p-5 shadow-card flex flex-col justify-between space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-zinc-400">
                      My Active Bench Repairs
                    </p>
                    <h3 className="text-2xl font-extrabold text-ink mt-1 tabular-nums">
                      {myActiveRepairs.length} In Progress
                    </h3>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-sm shrink-0">
                    <Wrench className="w-4 h-4" />
                  </div>
                </div>
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-end justify-between">
                    <div className="relative">
                      <svg className="w-28 h-9 overflow-visible" viewBox="0 0 100 32">
                        <defs>
                          <linearGradient id="kpiGrad2" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#EA580C" stopOpacity={0.22} />
                            <stop offset="100%" stopColor="#EA580C" stopOpacity={0.00} />
                          </linearGradient>
                        </defs>
                        {/* Ground Zero Baseline */}
                        <line x1="2" y1="28" x2="98" y2="28" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="2 2" />
                        {/* Safe Capacity Guideline */}
                        <line x1="2" y1="12" x2="98" y2="12" stroke="#FDBA74" strokeWidth="1" strokeDasharray="3 3" opacity={0.65} />
                        {/* Area Fill */}
                        <path
                          d="M 2 20 Q 25 26, 45 14 T 78 18 T 98 8 L 98 28 L 2 28 Z"
                          fill="url(#kpiGrad2)"
                        />
                        {/* Trend Curve */}
                        <path
                          d="M 2 20 Q 25 26, 45 14 T 78 18 T 98 8"
                          fill="none"
                          stroke="#EA580C"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                        />
                        {/* Latest Active Dot */}
                        <circle cx="98" cy="8" r="2.8" fill="#EA580C" stroke="#FFFFFF" strokeWidth="1.5" />
                      </svg>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-orange-600">
                        {openPoolCount} in open pool
                      </span>
                      <p className="text-[11px] text-zinc-400">ready to claim</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[9px] text-zinc-400 font-mono pt-1 px-0.5 border-t border-zinc-100">
                    <span>W1</span>
                    <span className="text-orange-600 font-sans font-semibold">Cap ≤ 5</span>
                    <span>W4</span>
                  </div>
                </div>
              </div>

              {/* Personal KPI 3: My Mean Time To Resolve (MTTR) */}
              <div className="bg-white border border-[#ECEEF2] rounded-2xl p-5 shadow-card flex flex-col justify-between space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-zinc-400">
                      My Avg. Repair Speed
                    </p>
                    <h3 className="text-2xl font-extrabold text-ink mt-1 tabular-nums">
                      {avgDurationMinutes}
                    </h3>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200/60 flex items-center justify-center shrink-0">
                    <span className="font-mono text-xs font-extrabold">#11</span>
                  </div>
                </div>
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-end justify-between">
                    <div className="relative">
                      <svg className="w-28 h-9 overflow-visible" viewBox="0 0 100 32">
                        <defs>
                          <linearGradient id="kpiGrad3" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#10B981" stopOpacity={0.22} />
                            <stop offset="100%" stopColor="#10B981" stopOpacity={0.00} />
                          </linearGradient>
                        </defs>
                        {/* Ground Zero Baseline */}
                        <line x1="2" y1="28" x2="98" y2="28" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="2 2" />
                        {/* SLA Target Guideline: 45m */}
                        <line x1="2" y1="16" x2="98" y2="16" stroke="#6EE7B7" strokeWidth="1" strokeDasharray="3 3" opacity={0.8} />
                        {/* Area Fill */}
                        <path
                          d="M 2 8 Q 25 18, 50 12 T 80 20 T 98 10 L 98 28 L 2 28 Z"
                          fill="url(#kpiGrad3)"
                        />
                        {/* Trend Curve */}
                        <path
                          d="M 2 8 Q 25 18, 50 12 T 80 20 T 98 10"
                          fill="none"
                          stroke="#10B981"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                        />
                        {/* Latest Active Dot */}
                        <circle cx="98" cy="10" r="2.8" fill="#10B981" stroke="#FFFFFF" strokeWidth="1.5" />
                      </svg>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-emerald-600">
                        -12 min faster
                      </span>
                      <p className="text-[11px] text-zinc-400">vs 45 min target</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[9px] text-zinc-400 font-mono pt-1 px-0.5 border-t border-zinc-100">
                    <span>W1</span>
                    <span className="text-emerald-600 font-sans font-semibold">Target 45m</span>
                    <span>W4</span>
                  </div>
                </div>
              </div>

              {/* Personal KPI 4: My Employee Satisfaction */}
              <div className="bg-white border border-[#ECEEF2] rounded-2xl p-5 shadow-card flex flex-col justify-between space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-zinc-400">
                      Employee Sign-Off Rate
                    </p>
                    <h3 className="text-2xl font-extrabold text-ink mt-1 tabular-nums">
                      99.1%
                    </h3>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-sky-50 text-sky-600 border border-sky-200/60 flex items-center justify-center shrink-0">
                    <span className="font-mono text-xs font-extrabold">#13</span>
                  </div>
                </div>
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-end justify-between">
                    <div className="relative">
                      <svg className="w-28 h-9 overflow-visible" viewBox="0 0 100 32">
                        <defs>
                          <linearGradient id="kpiGrad4" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#0284C7" stopOpacity={0.22} />
                            <stop offset="100%" stopColor="#0284C7" stopOpacity={0.00} />
                          </linearGradient>
                        </defs>
                        {/* Ground Zero Baseline */}
                        <line x1="2" y1="28" x2="98" y2="28" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="2 2" />
                        {/* 95% Quality Threshold Guideline */}
                        <line x1="2" y1="12" x2="98" y2="12" stroke="#7DD3FC" strokeWidth="1" strokeDasharray="3 3" opacity={0.8} />
                        {/* Area Fill */}
                        <path
                          d="M 2 22 Q 25 10, 50 14 T 75 8 T 98 6 L 98 28 L 2 28 Z"
                          fill="url(#kpiGrad4)"
                        />
                        {/* Trend Curve */}
                        <path
                          d="M 2 22 Q 25 10, 50 14 T 75 8 T 98 6"
                          fill="none"
                          stroke="#0284C7"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                        />
                        {/* Latest Active Dot */}
                        <circle cx="98" cy="6" r="2.8" fill="#0284C7" stroke="#FFFFFF" strokeWidth="1.5" />
                      </svg>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-sky-600">
                        Verified First-Time
                      </span>
                      <p className="text-[11px] text-zinc-400">terminal approval</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[9px] text-zinc-400 font-mono pt-1 px-0.5 border-t border-zinc-100">
                    <span>W1</span>
                    <span className="text-sky-600 font-sans font-semibold">SLA 95%</span>
                    <span>W4</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: Support Mode Donut Chart */}
          <div className="xl:col-span-3">
            <div className="bg-white border border-[#ECEEF2] rounded-2xl p-5 shadow-card flex flex-col justify-between h-full space-y-4">
              <div className="flex items-center gap-2">
                <span className="w-1 h-4 rounded-full bg-orange-500" />
                <h3 className="text-sm font-bold text-ink">My Support Mode (#02)</h3>
              </div>

              <div className="h-44 w-full relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={dynamicModeDonutData}
                      innerRadius={52}
                      outerRadius={72}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {dynamicModeDonutData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#18181B',
                        borderRadius: '8px',
                        border: 'none',
                        color: '#FFF',
                        fontSize: '11px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-xl font-extrabold text-ink tabular-nums">
                    {modeCounts.total}
                  </span>
                  <span className="text-[10px] text-zinc-400">Total Logged</span>
                </div>
              </div>

              {/* Donut Legend */}
              <div className="space-y-2 pt-1 border-t border-[#ECEEF2]">
                {dynamicModeDonutData.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-zinc-600 font-medium">{item.name}</span>
                    </div>
                    <span className="font-bold text-ink tabular-nums">
                      {item.value} ({modeCounts.total > 0 ? Math.round((item.value / modeCounts.total) * 100) : 0}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ROW 2: Monthly Output Trend Area Chart (Expanded Full Width) & Saved Repair Notes */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">
          {/* Area Chart: My Personal Monthly Ticket Output (Expanded Full Width) */}
          <div className="col-span-12 xl:col-span-12">
            <div className="bg-white border border-[#ECEEF2] rounded-2xl p-5 shadow-card flex flex-col justify-between h-full space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="w-1 h-4 rounded-full bg-orange-500" />
                  <div>
                    <h3 className="text-sm font-bold text-ink">
                      My Monthly Output Trend (2026)
                    </h3>
                    <p className="text-[11px] text-zinc-400">
                      Resolved terminal tickets split between Remote AnyDesk and On-Site
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <span className="flex items-center gap-1.5 font-medium text-ink">
                    <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                    Remote AnyDesk
                  </span>
                  <span className="flex items-center gap-1.5 font-medium text-ink">
                    <span className="w-2.5 h-2.5 rounded-full bg-orange-300" />
                    On-Site
                  </span>
                </div>
              </div>

              {totalResolvedInYear === 0 ? (
                <div className="h-60 w-full flex flex-col items-center justify-center text-center p-6 bg-zinc-50/50 rounded-xl border border-dashed border-zinc-200">
                  <Inbox className="w-8 h-8 text-zinc-300 mb-2" />
                  <p className="text-xs font-semibold text-zinc-600">
                    No ticket resolution activity recorded for 2026
                  </p>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Resolved Remote and On-Site tickets will appear in this trend breakdown.
                  </p>
                </div>
              ) : (
                <div className="h-60 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <AreaChart
                      data={monthlyOutputTrendData}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="colorRemote" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#F97316" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#F97316" stopOpacity={0.0} />
                        </linearGradient>
                        <linearGradient id="colorOnsite" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#FDBA74" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#FDBA74" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="#F4F6F9"
                      />
                      <XAxis
                        dataKey="month"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 11, fill: '#71717A' }}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 11, fill: '#71717A' }}
                        allowDecimals={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#18181B',
                          borderRadius: '8px',
                          border: 'none',
                          color: '#FFF',
                          fontSize: '11px',
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="remote"
                        stroke="#F97316"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorRemote)"
                      />
                      <Area
                        type="monotone"
                        dataKey="onsite"
                        stroke="#FB923C"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorOnsite)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Saved Repair Notes & Quick Guides Card */}
          <div className="col-span-12 xl:col-span-12">
            <div className="bg-white border border-[#ECEEF2] rounded-2xl p-5 shadow-card flex flex-col justify-between h-full space-y-3.5">
              <div className="flex items-center justify-between pb-2 border-b border-[#ECEEF2]">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-orange-500" />
                  <h3 className="text-sm font-bold text-ink">
                    Saved Repair Notes ({savedRepairNotes.length})
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveView('notes')}
                  className="text-[11px] font-bold text-orange-600 hover:text-orange-700 hover:underline inline-flex items-center gap-0.5 press-fx"
                >
                  <span>View All</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              {/* Note items preview (showing top 2 for perfect row alignment) */}
              <div className="space-y-2.5">
                {savedRepairNotes.length === 0 ? (
                  <div className="text-center py-6 text-zinc-400 space-y-1">
                    <BookOpen className="w-6 h-6 mx-auto text-zinc-300" />
                    <p className="text-xs">No saved repair notes yet</p>
                  </div>
                ) : (
                  savedRepairNotes.slice(0, 2).map((note) => (
                    <div
                      key={note.id}
                      onClick={() => setActiveView('notes')}
                      className="p-3 rounded-xl bg-[#F4F6F9] hover:bg-orange-50/60 border border-[#ECEEF2] hover:border-orange-200 cursor-pointer transition-all space-y-1.5 group"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-white border border-zinc-200 text-zinc-700">
                          {note.taskCode}
                        </span>
                        <span className="text-[10px] text-zinc-400 font-medium">
                          {note.checklistSteps.length} SOP steps
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-ink group-hover:text-orange-600 transition-colors line-clamp-1">
                        {note.title}
                      </h4>
                      <p className="text-[11px] text-zinc-500 line-clamp-2 leading-relaxed">
                        {note.symptomAndFixNote}
                      </p>
                    </div>
                  ))
                )}
              </div>

              <div className="pt-1 flex items-center gap-2">
                <button
                  type="button"
                  disabled={isFetchingQueue}
                  onClick={() => fetchQueueApi()}
                  className="px-3 py-2 rounded-xl bg-[#F4F6F9] hover:bg-zinc-100 text-ink border border-[#ECEEF2] text-xs font-semibold inline-flex items-center gap-1.5 transition-colors press-fx"
                  title="Refresh queue and stats"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 text-zinc-500 ${
                      isFetchingQueue ? 'animate-spin text-orange-500' : ''
                    }`}
                  />
                  <span>Refresh</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveView('tickets')}
                  className="flex-1 py-2 px-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 shadow-sm transition-colors press-fx"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>View active tickets</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

