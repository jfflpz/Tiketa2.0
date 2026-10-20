// @spec UI-OVERVIEW-01: 1:1 Nexora Reference UI Bento Dashboard tailored to the Logged-In IT Specialist's Personal KPIs
import React, { useState } from 'react';
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
  Award,
  Wrench,
  Timer,
  CheckCircle2,
  ArrowRight,
  Search,
  Plus,
  UserCheck,
  MessageSquare,
  Download,
  BookOpen,
  Copy,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { TicketStatus } from '../../types/ticket';
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
  { name: 'My Routine PMS', value: 6, color: '#FDBA74' },
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
  const {
    currentUser,
    tickets,
    savedRepairNotes,
    searchQuery,
    setSearchQuery,
    claimTicket,
    resolveTicket,
    confirmClosure,
    setSelectedTicketId,
    setQuickIntakeOpen,
    setActiveView,
    copyTicketShareLink,
  } = useAppStore();

  const techName = currentUser?.name ?? 'Nathaniel D. Esguerra';
  const techFirstName = techName.split(' ')[0];

  const [queueScope, setQueueScope] = useState<'MY_TICKETS' | 'OPEN_POOL' | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | TicketStatus>('ALL');

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

  // Personal daily quota progress (e.g. 5 of 6 daily target repairs completed = 83%)
  const myDailyQuotaPct = Math.min(98, 72 + myTickets.length * 6);

  const filteredTickets = tickets.filter((t) => {
    if (queueScope === 'MY_TICKETS') {
      const isMine =
        t.workedBy?.toLowerCase().includes(techFirstName.toLowerCase()) ||
        t.workedBy === techName;
      if (!isMine) return false;
    } else if (queueScope === 'OPEN_POOL') {
      if (t.status !== 'OPEN') return false;
    }

    if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;

    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      t.ticketCode.toLowerCase().includes(q) ||
      t.requestor.toLowerCase().includes(q) ||
      t.task.toLowerCase().includes(q) ||
      t.location.toLowerCase().includes(q) ||
      t.department.toLowerCase().includes(q)
    );
  });

  const getLocationPillStyle = (locCode: string) => {
    switch (locCode) {
      case 'PSY':
        return 'bg-orange-50 text-orange-600 border-orange-200/60';
      case 'CUB':
      case 'CMA':
        return 'bg-amber-50 text-amber-700 border-amber-200/60';
      case 'CAL':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200/60';
      case 'MRV':
        return 'bg-sky-50 text-sky-700 border-sky-200/60';
      case 'DAU':
        return 'bg-purple-50 text-purple-700 border-purple-200/60';
      default:
        return 'bg-zinc-100 text-zinc-700 border-zinc-200/60';
    }
  };

  return (
    <div className="space-y-5 pb-8">
      {/* Personal Technician Greeting Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink tracking-tight">
            Welcome back, {techName} !
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Personal IT Specialist KPI Scorecard, Daily Quota Progress, and Assigned Repair Queue.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveView('notes')}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-zinc-50 text-ink border border-[#ECEEF2] text-xs font-semibold inline-flex items-center gap-1.5 shadow-card transition-colors press-fx"
          >
            <BookOpen className="w-3.5 h-3.5 text-orange-500" />
            <span>My Saved Repair Notes ({savedRepairNotes.length})</span>
          </button>
        </div>
      </div>

      {/* Main 12-Column Nexora Personal KPI Bento Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* LEFT COLUMN (3 Cols): My Daily Target Ring + My Claimed Tickets + My Weekly Bench Hours */}
        <div className="xl:col-span-3 space-y-5">
          {/* 1. Orange Gradient Personal Daily Target Card */}
          <div className="rounded-2xl bg-gradient-to-br from-orange-500 via-orange-500 to-orange-600 text-white p-5 shadow-md relative overflow-hidden">
            <div className="w-36 h-36 rounded-full bg-white/10 absolute -right-10 -bottom-10 pointer-events-none" />
            <div className="w-20 h-20 rounded-full bg-white/5 absolute right-12 -top-6 pointer-events-none" />

            <div className="relative z-10 flex items-center justify-between gap-3">
              <div className="space-y-2 max-w-[63%]">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-black/20 text-orange-100">
                  My Personal Quota
                </span>
                <h2 className="text-base font-bold leading-snug">
                  My Daily SLA Target
                </h2>
                <p className="text-[11px] text-orange-100 leading-relaxed">
                  You have achieved <strong>{myDailyQuotaPct}%</strong> of your personal daily ticket resolution goal.
                </p>
                <button
                  onClick={() => setActiveView('workbench')}
                  className="inline-flex items-center gap-1 text-xs font-bold text-white underline underline-offset-4 hover:text-orange-100 pt-1 press-fx"
                >
                  <span>Go to My Workbench</span>
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
                    strokeDashoffset={
                      2 * Math.PI * 32 * (1 - myDailyQuotaPct / 100)
                    }
                  />
                </svg>
                <span className="absolute text-sm font-extrabold text-white tabular-nums">
                  {myDailyQuotaPct}%
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

        {/* CENTER COLUMN (6 Cols): 4 Personal KPI Sparkline Cards + My Personal Output Area Chart */}
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
                <div className="w-10 h-10 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-sm shrink-0">
                  <Timer className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-end justify-between pt-1">
                <svg className="w-24 h-7 overflow-visible" viewBox="0 0 100 30">
                  <path
                    d="M 2 22 Q 22 8, 48 16 T 76 10 T 98 4"
                    fill="none"
                    stroke="#F97316"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="text-right">
                  <span className="text-xs font-bold text-emerald-600">
                    12 mins faster
                  </span>
                  <p className="text-[11px] text-zinc-400">than team target</p>
                </div>
              </div>
            </div>

            {/* Personal KPI 4: My First-Time Fix / Employee Sign-Off Score */}
            <div className="bg-white border border-[#ECEEF2] rounded-2xl p-5 shadow-card flex flex-col justify-between space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-zinc-400">
                    My First-Time Fix Rate
                  </p>
                  <h3 className="text-2xl font-extrabold text-ink mt-1 tabular-nums">
                    96.8%
                  </h3>
                </div>
                <div className="w-10 h-10 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-sm shrink-0">
                  <Award className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-end justify-between pt-1">
                <svg className="w-24 h-7 overflow-visible" viewBox="0 0 100 30">
                  <path
                    d="M 2 25 Q 25 18, 50 12 T 80 14 T 98 5"
                    fill="none"
                    stroke="#F97316"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="text-right">
                  <span className="text-xs font-bold text-emerald-600">
                    0 Reopened
                  </span>
                  <p className="text-[11px] text-zinc-400">verified by booth staff</p>
                </div>
              </div>
            </div>
          </div>

          {/* Center Area Chart: My Personal Monthly Repair Output */}
          <div className="bg-white border border-[#ECEEF2] rounded-2xl p-5 shadow-card space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-1 h-4 rounded-full bg-orange-500" />
                <h3 className="text-sm font-bold text-ink">
                  My Personal Repair Output ({techName})
                </h3>
              </div>

              <div className="flex items-center gap-4 text-[11px] font-semibold text-zinc-500">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                  My Total Resolved
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-300" />
                  My Remote Fixes
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-zinc-300" />
                  My On-Site Visits
                </span>
              </div>
            </div>

            <div className="h-[265px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={MY_PERSONAL_MONTHLY_OUTPUT}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="myResolvedGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F97316" stopOpacity={0.28} />
                      <stop offset="95%" stopColor="#F97316" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#F1F5F9"
                  />
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: '#94A3B8' }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: '#94A3B8' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#111315',
                      border: 'none',
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="resolved"
                    name="My Total Resolved"
                    stroke="#F97316"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#myResolvedGrad)"
                  />
                  <Area
                    type="monotone"
                    dataKey="remote"
                    name="My Remote (REM)"
                    stroke="#FB923C"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    fill="none"
                  />
                  <Area
                    type="monotone"
                    dataKey="onsite"
                    name="My On-Site (SITE)"
                    stroke="#CBD5E1"
                    strokeWidth={2}
                    fill="none"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN (3 Cols): My Support Mode Donut + My Saved Checklists Summary + My Recent Actions */}
        <div className="xl:col-span-3 space-y-5">
          {/* 1. My Support Mode Breakdown Donut */}
          <div className="bg-white border border-[#ECEEF2] rounded-2xl p-5 shadow-card space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-1 h-4 rounded-full bg-orange-500" />
                <h3 className="text-sm font-bold text-ink">My Work Mode Split</h3>
              </div>
              <span className="text-[11px] font-semibold text-zinc-400">
                REM vs SITE
              </span>
            </div>

            <div className="relative h-44 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={MY_MODE_DONUT_DATA}
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={72}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {MY_MODE_DONUT_DATA.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[11px] font-medium text-zinc-400">
                  My Total
                </span>
                <span className="text-xl font-extrabold text-ink tabular-nums">
                  {myResolvedCount}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#ECEEF2] text-center">
              {MY_MODE_DONUT_DATA.map((item) => (
                <div key={item.name} className="p-1.5 rounded-lg bg-[#F4F6F9]">
                  <div className="flex items-center justify-center gap-1 text-[10px] text-zinc-500 font-medium">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="truncate">{item.name}</span>
                  </div>
                  <p className="text-xs font-extrabold text-ink mt-0.5 tabular-nums">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* 2. Quick Saved Repair Notes & Checklists Preview */}
          <div className="bg-white border border-[#ECEEF2] rounded-2xl p-5 shadow-card space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-1 h-4 rounded-full bg-orange-500" />
                <h3 className="text-sm font-bold text-ink">
                  Saved Repair Notes
                </h3>
              </div>
              <button
                onClick={() => setActiveView('notes')}
                className="text-[11px] font-semibold text-orange-600 hover:underline inline-flex items-center gap-1"
              >
                <span>Browse All</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <p className="text-[11px] text-zinc-500">
              Quick-reference troubleshooting checklists &amp; past repair notes if you need a reminder:
            </p>

            <div className="space-y-2">
              {savedRepairNotes.slice(0, 3).map((note) => (
                <div
                  key={note.id}
                  onClick={() => setActiveView('notes')}
                  className="p-2.5 rounded-xl bg-[#F4F6F9] hover:bg-orange-50/50 border border-[#ECEEF2] cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-white border border-zinc-200 text-orange-600">
                      {note.taskCode}
                    </span>
                    <span className="text-[10px] text-zinc-400">
                      {note.checklistSteps.length} steps
                    </span>
                  </div>
                  <p className="text-xs font-bold text-ink mt-1 line-clamp-1">
                    {note.title}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM FULL-WIDTH TABLE: My Assigned Tickets & General Dispatch Pool */}
      <div className="bg-white border border-[#ECEEF2] rounded-2xl p-5 shadow-card space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="w-1 h-4 rounded-full bg-orange-500" />
              <h3 className="text-sm font-bold text-ink">
                IT Support Ticket Queue &amp; Live Chat
              </h3>
            </div>

            {/* Scope Toggle: All vs My Claimed Tickets vs Unassigned Open Pool */}
            <div className="inline-flex items-center bg-[#F4F6F9] p-1 rounded-xl border border-[#ECEEF2]">
              {(
                [
                  { id: 'ALL', label: `All Tickets (${tickets.length})` },
                  { id: 'MY_TICKETS', label: `My Claimed (${myTickets.length})` },
                  { id: 'OPEN_POOL', label: `Unassigned Pool (${openPoolCount})` },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setQueueScope(tab.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all press-fx ${
                    queueScope === tab.id
                      ? 'bg-[#111315] text-white shadow-xs'
                      : 'text-zinc-500 hover:text-ink'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Here Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search ticket, terminal, requestor..."
                className="pl-8 pr-3 py-1.5 bg-[#F4F6F9] border border-[#ECEEF2] focus:border-orange-400 focus:bg-white rounded-lg text-xs text-ink placeholder:text-zinc-400 focus:outline-none w-52 transition-all"
              />
            </div>

            {/* Status Filter Pills */}
            <div className="inline-flex items-center bg-[#F4F6F9] p-1 rounded-lg border border-[#ECEEF2]">
              {(['ALL', 'OPEN', 'PROG', 'RESL'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors press-fx ${
                    statusFilter === st
                      ? 'bg-orange-500 text-white shadow-xs'
                      : 'text-zinc-500 hover:text-ink'
                  }`}
                >
                  {st === 'ALL' ? 'All' : st}
                </button>
              ))}
            </div>

            {/* SINGLE Log Walk-In / Viber Action Button */}
            <button
              onClick={() => setQuickIntakeOpen(true)}
              className="px-3.5 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition-colors press-fx"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Log Walk-In / Viber</span>
            </button>
          </div>
        </div>

        {/* Clean Responsive Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#ECEEF2] text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                <th className="py-3 px-3">Ticket ID</th>
                <th className="py-3 px-3">Requestor &amp; Dept</th>
                <th className="py-3 px-3">Task &amp; Symptom (#05 / #06)</th>
                <th className="py-3 px-3">Terminal Hub (#14)</th>
                <th className="py-3 px-3">Mode (#02)</th>
                <th className="py-3 px-3">Status (#13)</th>
                <th className="py-3 px-3">Claimed By (#15)</th>
                <th className="py-3 px-3 text-right">Actions &amp; Chat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ECEEF2] text-xs">
              {filteredTickets.map((t) => {
                const msgCount = t.messages?.length ?? 0;
                return (
                  <tr
                    key={t.id}
                    onClick={() => setSelectedTicketId(t.id)}
                    className="hover:bg-orange-50/30 transition-colors cursor-pointer group"
                  >
                    <td className="py-3.5 px-3 font-mono font-bold text-ink whitespace-nowrap">
                      {t.ticketCode}
                    </td>

                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <div>
                        <p className="font-bold text-ink">{t.requestor}</p>
                        <p className="text-[11px] text-zinc-400">
                          {t.department} ({t.companyCode})
                        </p>
                      </div>
                    </td>

                    <td className="py-3.5 px-3 max-w-xs">
                      <p className="font-bold text-ink truncate">{t.task}</p>
                      <p className="text-[11px] text-zinc-400 truncate">
                        {t.description}
                      </p>
                    </td>

                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${getLocationPillStyle(
                          t.locationCode
                        )}`}
                      >
                        {t.location}
                      </span>
                    </td>

                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <span className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded bg-[#F4F6F9] text-zinc-700 border border-[#ECEEF2]">
                        {t.mode === 'SITE' ? 'On-Site' : 'Remote'}
                      </span>
                    </td>

                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <StatusBadge status={t.status} size="sm" />
                    </td>

                    <td className="py-3.5 px-3 whitespace-nowrap">
                      {t.workedBy ? (
                        <span className="font-semibold text-ink">
                          {t.workedBy}
                        </span>
                      ) : (
                        <span className="text-zinc-400 italic">
                          Unclaimed Pool
                        </span>
                      )}
                    </td>

                    <td
                      className="py-3.5 px-3 whitespace-nowrap text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="inline-flex items-center justify-end gap-1.5">
                        {t.status === 'OPEN' && (
                          <button
                            onClick={() => claimTicket(t.id)}
                            className="px-2.5 py-1 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-[11px] font-bold inline-flex items-center gap-1 shadow-xs transition-colors press-fx"
                          >
                            <UserCheck className="w-3 h-3" />
                            <span>Claim</span>
                          </button>
                        )}
                        {t.status === 'PROG' && (
                          <button
                            onClick={() => resolveTicket(t.id)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold inline-flex items-center gap-1 shadow-xs transition-colors press-fx"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Resolve</span>
                          </button>
                        )}
                        {t.status === 'RESL' && (
                          <button
                            onClick={() => confirmClosure(t.id)}
                            className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-bold inline-flex items-center gap-1 shadow-xs transition-colors press-fx"
                          >
                            <span>Sign-Off</span>
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedTicketId(t.id)}
                          className="px-2.5 py-1 rounded-lg bg-[#F4F6F9] hover:bg-orange-100 text-zinc-700 hover:text-orange-600 text-[11px] font-semibold inline-flex items-center gap-1 transition-colors press-fx"
                          title="Open Chat & 15-Column Job Log"
                        >
                          <MessageSquare className="w-3 h-3 text-orange-500" />
                          <span>Chat ({msgCount})</span>
                        </button>

                        <button
                          onClick={() => copyTicketShareLink(t.ticketCode)}
                          className="p-1.5 rounded-lg bg-[#F4F6F9] hover:bg-zinc-200 text-zinc-600 hover:text-ink text-[11px] font-semibold transition-colors press-fx"
                          title="Copy employee confirmation link to send via Viber/Chat"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="pt-3 border-t border-[#ECEEF2] flex items-center justify-between text-xs text-zinc-400">
          <span>
            Showing <strong className="text-ink">{filteredTickets.length}</strong> of{' '}
            <strong className="text-ink">{tickets.length}</strong> tickets
          </span>
          <button
            onClick={() => setActiveView('joblogs')}
            className="text-orange-600 font-semibold hover:underline inline-flex items-center gap-1"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Open My Job Logs</span>
          </button>
        </div>
      </div>
    </div>
  );
};
