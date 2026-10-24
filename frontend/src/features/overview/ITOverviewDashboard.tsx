// @spec UI-OVERVIEW-01: Personal IT Specialist KPI Scorecard & Fleet Operational Health Bento Grid
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

const MY_PERSONAL_MONTHLY_OUTPUT = [
  { month: 'Jan', resolved: 14, remote: 9, onsite: 5 },
  { month: 'Feb', resolved: 17, remote: 11, onsite: 6 },
  { month: 'Mar', resolved: 15, remote: 10, onsite: 5 },
  { month: 'Apr', resolved: 21, remote: 13, onsite: 8 },
  { month: 'May', resolved: 19, remote: 12, onsite: 7 },
  { month: 'Jun', resolved: 24, remote: 15, onsite: 9 },
  { month: 'Jul', resolved: 22, remote: 14, onsite: 8 },
  { month: 'Aug', resolved: 27, remote: 17, onsite: 10 },
  { month: 'Sep', resolved: 23, remote: 15, onsite: 8 },
  { month: 'Oct', resolved: 26, remote: 17, onsite: 9 },
  { month: 'Nov', resolved: 24, remote: 16, onsite: 8 },
  { month: 'Dec', resolved: 21, remote: 14, onsite: 7 },
];

const MY_MODE_DONUT_DATA = [
  { name: 'My Remote (AnyDesk)', value: 18, color: '#F97316' },
  { name: 'My On-Site Repairs', value: 11, color: '#FB923C' },
  { name: 'Terminal Maintenance', value: 6, color: '#FDBA74' },
  { name: 'Saved SOP Guides', value: 5, color: '#E4E4E7' },
];

const MY_WEEKLY_HOURS_BARS = [
  { day: 'S', target: 6, logged: 5.2 },
  { day: 'M', target: 8, logged: 7.6 },
  { day: 'T', target: 8, logged: 6.8 },
  { day: 'W', target: 8, logged: 7.9 },
  { day: 'T', target: 8, logged: 7.1 },
  { day: 'F', target: 8, logged: 7.5 },
  { day: 'S', target: 6, logged: 4.8 },
];

export const ITOverviewDashboard: React.FC = () => {
    const currentUser = useAppStore((state) => state.currentUser);
  const tickets = useAppStore((state) => state.tickets);
  const savedRepairNotes = useAppStore((state) => state.savedRepairNotes);
  const setSelectedTicketId = useAppStore((state) => state.setSelectedTicketId);
  const setActiveView = useAppStore((state) => state.setActiveView);
  const fetchQueueApi = useAppStore((state) => state.fetchQueueApi);
  const isFetchingQueue = useAppStore((state) => state.isFetchingQueue);
  const kpis = useAppStore((state) => state.kpis);
  const fetchKPIsApi = useAppStore((state) => state.fetchKPIsApi);

  const techName = currentUser?.name ?? 'Nathaniel D. Esguerra';
  const techFirstName = techName.split(' ')[0];

    useEffect(() => {
    fetchQueueApi();
    fetchKPIsApi();
    const interval = setInterval(() => {
      fetchQueueApi();
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  // Personal KPI calculations for the logged-in IT Specialist
  const myTickets = tickets.filter(
    (t) =>
      t.workedBy?.toLowerCase().includes(techFirstName.toLowerCase()) ||
      t.workedBy === techName
  );
  const myActiveRepairs = myTickets.filter((t) => t.status === 'PROG');
  const myResolvedCount =
    myTickets.filter((t) => t.status === 'RESL' || t.status === 'CLSD').length + 16;
  const openPoolCount = tickets.filter((t) => t.status === 'OPEN').length;

  // Option C: Intuitive Ticket Resolution Rate (Simple completed vs total ratio)
  const totalFleetFromTickets = tickets.length;
  const completedFleetFromTickets = tickets.filter(
    (t) => t.status === 'RESL' || t.status === 'CLSD'
  ).length;

  const totalCount = kpis?.total_tickets ?? (totalFleetFromTickets > 0 ? totalFleetFromTickets : 40);
  const completedCount = kpis?.completed ?? (totalFleetFromTickets > 0 ? completedFleetFromTickets : 36);
  const resolutionPercentage =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 100;
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
            Personal IT Specialist KPI Scorecard, Repair Durations, and Fleet Service Health.
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

      {/* Main 12-Column Nexora Personal KPI Bento Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* LEFT COLUMN (3 Cols): Fleet SLA Card + Claimed Tickets + Weekly Bench Hours */}
        <div className="xl:col-span-3 space-y-5">
          {/* 1. Orange Gradient Card: Option C - Simple & Intuitive Ticket Resolution Rate */}
          <div className="rounded-2xl bg-gradient-to-br from-orange-500 via-orange-500 to-orange-600 text-white p-5 shadow-md relative overflow-hidden">
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

          {/* 2. My Claimed & Active Tickets List */}
          <div className="bg-white border border-[#ECEEF2] rounded-2xl p-5 shadow-card space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-1 h-4 rounded-full bg-orange-500" />
                <h3 className="text-sm font-bold text-ink">My Claimed Tickets</h3>
              </div>
              <span className="text-[11px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                {myTickets.length} Assigned
              </span>
            </div>

            <div className="space-y-3">
              {(myTickets.length > 0 ? myTickets : tickets.slice(0, 4)).map(
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
                      className="flex items-center justify-between gap-2 cursor-pointer group hover:bg-zinc-50/80 p-1.5 -mx-1.5 rounded-xl transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-mono font-bold shrink-0 ${
                            badgeColors[i % badgeColors.length]
                          }`}
                        >
                          {t.locationCode}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-ink truncate group-hover:text-orange-600 transition-colors">
                            {t.ticketCode} • {t.task}
                          </p>
                          <p className="text-[11px] text-zinc-400 truncate">
                            {t.location} • {t.requestor}
                          </p>
                        </div>
                      </div>
                      <StatusBadge status={t.status} size="sm" />
                    </div>
                  );
                }
              )}
            </div>
          </div>

          {/* 3. My Weekly Logged Labor Hours */}
          <div className="bg-white border border-[#ECEEF2] rounded-2xl p-5 shadow-card space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-1 h-4 rounded-full bg-orange-500" />
                <h3 className="text-sm font-bold text-ink">My Weekly Repair Hours</h3>
              </div>
              <span className="text-[11px] font-semibold text-emerald-600">
                38.4 hrs this week
              </span>
            </div>

            <div className="flex items-end justify-between gap-2 pt-2">
              <div>
                <span className="text-2xl font-extrabold text-ink tabular-nums">
                  0.42 hrs
                </span>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  My Avg. Repair Duration (#11)
                </p>
              </div>

              <div className="flex items-end gap-2 h-20">
                {MY_WEEKLY_HOURS_BARS.map((bar, idx) => (
                  <div key={idx} className="flex flex-col items-center gap-1">
                    <div className="w-2.5 h-14 rounded-full bg-orange-100 relative overflow-hidden flex items-end">
                      <div
                        className="w-full rounded-full bg-orange-500"
                        style={{ height: `${(bar.logged / bar.target) * 100}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-bold text-zinc-400">
                      {bar.day}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* CENTER COLUMN (6 Cols): 4 Personal KPI Cards + Output Area Chart */}
        <div className="xl:col-span-6 space-y-5">
          {/* 2x2 Grid of Personal Technician KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
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
              <div className="flex items-end justify-between pt-1">
                <svg className="w-24 h-7 overflow-visible" viewBox="0 0 100 30">
                  <path
                    d="M 2 24 Q 20 10, 38 18 T 72 8 T 98 14"
                    fill="none"
                    stroke="#F97316"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="text-right">
                  <span className="text-xs font-bold text-emerald-600">
                    +24% vs last mo
                  </span>
                  <p className="text-[11px] text-zinc-400">personal output</p>
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
              <div className="flex items-end justify-between pt-1">
                <svg className="w-24 h-7 overflow-visible" viewBox="0 0 100 30">
                  <path
                    d="M 2 20 Q 25 26, 45 14 T 78 18 T 98 6"
                    fill="none"
                    stroke="#F97316"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="text-right">
                  <span className="text-xs font-bold text-orange-600">
                    {openPoolCount} in open pool
                  </span>
                  <p className="text-[11px] text-zinc-400">ready to claim</p>
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
                    25 mins
                  </h3>
                </div>
                <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200/60 flex items-center justify-center shrink-0">
                  <span className="font-mono text-xs font-extrabold">#11</span>
                </div>
              </div>
              <div className="flex items-end justify-between pt-1">
                <svg className="w-24 h-7 overflow-visible" viewBox="0 0 100 30">
                  <path
                    d="M 2 6 Q 25 20, 50 12 T 80 24 T 98 22"
                    fill="none"
                    stroke="#10B981"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="text-right">
                  <span className="text-xs font-bold text-emerald-600">
                    -12 min faster
                  </span>
                  <p className="text-[11px] text-zinc-400">vs 45 min target</p>
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
              <div className="flex items-end justify-between pt-1">
                <svg className="w-24 h-7 overflow-visible" viewBox="0 0 100 30">
                  <path
                    d="M 2 24 Q 25 10, 50 14 T 75 8 T 98 6"
                    fill="none"
                    stroke="#0284C7"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="text-right">
                  <span className="text-xs font-bold text-sky-600">
                    Verified First-Time
                  </span>
                  <p className="text-[11px] text-zinc-400">terminal approval</p>
                </div>
              </div>
            </div>
          </div>

          {/* Area Chart: My Personal Monthly Ticket Output */}
          <div className="bg-white border border-[#ECEEF2] rounded-2xl p-5 shadow-card space-y-4">
            <div className="flex items-center justify-between">
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

            <div className="h-60 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={MY_PERSONAL_MONTHLY_OUTPUT}
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
          </div>
        </div>

        {/* RIGHT COLUMN (3 Cols): Support Mode Donut + Saved Notes Library Shortcut */}
        <div className="xl:col-span-3 space-y-5">
          {/* Donut Chart: My Support Mode Breakdown */}
          <div className="bg-white border border-[#ECEEF2] rounded-2xl p-5 shadow-card space-y-4">
            <div className="flex items-center gap-2">
              <span className="w-1 h-4 rounded-full bg-orange-500" />
              <h3 className="text-sm font-bold text-ink">My Support Mode (#02)</h3>
            </div>

            <div className="h-44 w-full relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={MY_MODE_DONUT_DATA}
                    innerRadius={52}
                    outerRadius={72}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {MY_MODE_DONUT_DATA.map((entry, index) => (
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
                  35
                </span>
                <span className="text-[10px] text-zinc-400">Total Logged</span>
              </div>
            </div>

            {/* Donut Legend */}
            <div className="space-y-2 pt-1 border-t border-[#ECEEF2]">
              {MY_MODE_DONUT_DATA.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-zinc-600 font-medium">{item.name}</span>
                  </div>
                  <span className="font-bold text-ink tabular-nums">
                    {item.value} ({Math.round((item.value / 40) * 100)}%)
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Saved Repair Notes & Quick Guides Card */}
          <div className="bg-white border border-[#ECEEF2] rounded-2xl p-5 shadow-card space-y-3.5">
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

            {/* Note items preview */}
            <div className="space-y-2.5">
              {savedRepairNotes.length === 0 ? (
                <div className="text-center py-6 text-zinc-400 space-y-1">
                  <BookOpen className="w-6 h-6 mx-auto text-zinc-300" />
                  <p className="text-xs">No saved repair notes yet</p>
                </div>
              ) : (
                savedRepairNotes.slice(0, 3).map((note) => (
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
                onClick={() => setActiveView('notes')}
                className="flex-1 py-2 px-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 shadow-sm transition-colors press-fx"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Open Library ({savedRepairNotes.length})</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
