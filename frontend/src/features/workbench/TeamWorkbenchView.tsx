// @spec UI-TEAM-01: 1:1 Pixel-Accurate Recreation of Reference UI Dashboard
import React, { useState } from 'react';
import {
  Calendar,
  Settings,
  Plus,
  Upload,
  ShieldAlert,
  ShieldCheck,
  Edit3,
  Eye,
  CreditCard,
  Terminal,
  ChevronDown,
  Flame,
  Award,
  ExternalLink,
} from 'lucide-react';
import {
  TEAM_KPIS,
  MEMBER_STATUS_BREAKDOWN,
  ROLE_DISTRIBUTIONS,
  SEAT_USAGE_DATA,
  TOP_WORKFLOWS_ACTIVITY,
  TOP_CONTRIBUTORS,
  TEAM_ROSTER,
} from '../../data/mockTeamData';
import { MetricCard } from '../../components/common/MetricCard';
import { TickMeter, BarcodeDivider } from '../../components/common/TickMeter';
import { useAppStore } from '../../store/useAppStore';

export const TeamWorkbenchView: React.FC = () => {
  const { addToast, setQuickIntakeOpen, setActiveView, tickets, setSelectedTicketId } =
    useAppStore();

  const [subTab, setSubTab] = useState<'details' | 'members' | 'activity'>('details');
  const [periodFilter, setPeriodFilter] = useState('This Month');

  const exportCsv = () => {
    const headers = ['No,Workflow Name,Category,Trigger,Runs,Success Rate,Creator'];
    const rows = TOP_WORKFLOWS_ACTIVITY.map(
      (w) =>
        `${w.no},"${w.name}","${w.category}",${w.trigger},${w.runs},${w.successRate}%,"${w.creator.name}"`
    );
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'tiketa_team_workflows_2026.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast('Exported CSV Report', 'tiketa_team_workflows_2026.csv downloaded', 'success');
  };

  const renderRoleIcon = (iconName: string) => {
    switch (iconName) {
      case 'shield-alert':
        return <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />;
      case 'shield-check':
        return <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />;
      case 'edit':
        return <Edit3 className="w-3.5 h-3.5 text-emerald-600" />;
      case 'eye':
        return <Eye className="w-3.5 h-3.5 text-amber-500" />;
      case 'credit-card':
        return <CreditCard className="w-3.5 h-3.5 text-orange-500" />;
      default:
        return <Terminal className="w-3.5 h-3.5 text-indigo-500" />;
    }
  };

  return (
    <div className="space-y-4 pb-6">
      {/* Page Title & Action Controls Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink">Team Members</h1>
          <p className="text-xs text-ink-subtle mt-0.5">
            Manage who has access to your workspace and terminal dispatch hubs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() =>
              addToast('Calendar Filter', 'Showing telemetry for October 2026', 'info')
            }
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface border border-line text-xs font-medium text-ink shadow-card hover:bg-zinc-50 transition-colors press-fx"
          >
            <Calendar className="w-3.5 h-3.5 text-ink-subtle" />
            <span>27 April, 2026</span>
          </button>

          <button
            onClick={() =>
              addToast(
                '2-Tier RBAC Governance (ADR-002)',
                'Authenticated accounts strictly scoped to role=it and role=admin',
                'info'
              )
            }
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface border border-line text-xs font-medium text-ink shadow-card hover:bg-zinc-50 transition-colors press-fx"
          >
            <Settings className="w-3.5 h-3.5 text-ink-subtle" />
            <span>Team Settings</span>
          </button>

          <button
            onClick={() => setQuickIntakeOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-surface border border-line text-xs font-semibold text-ink shadow-card hover:bg-zinc-50 transition-colors press-fx"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Invite Member</span>
          </button>
        </div>
      </div>

      {/* Top Outer Card: Sub-Nav Segmented Tabs + 5-Column KPI Metric Row */}
      <div className="bg-surface border border-line rounded-3xl p-4 shadow-card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Segmented Control */}
          <div className="inline-flex items-center bg-canvas p-1 rounded-xl border border-line">
            <button
              onClick={() => setSubTab('members')}
              className={`px-3 py-1.5 rounded-lg text-xs transition-all press-fx ${
                subTab === 'members'
                  ? 'bg-surface text-ink font-semibold shadow-card border border-line'
                  : 'text-ink-subtle hover:text-ink font-medium'
              }`}
            >
              Team Members
            </button>
            <button
              onClick={() => setSubTab('details')}
              className={`px-3 py-1.5 rounded-lg text-xs transition-all press-fx ${
                subTab === 'details'
                  ? 'bg-surface text-ink font-semibold shadow-card border border-line'
                  : 'text-ink-subtle hover:text-ink font-medium'
              }`}
            >
              Team Details
            </button>
            <button
              onClick={() => setSubTab('activity')}
              className={`px-3 py-1.5 rounded-lg text-xs transition-all press-fx ${
                subTab === 'activity'
                  ? 'bg-surface text-ink font-semibold shadow-card border border-line'
                  : 'text-ink-subtle hover:text-ink font-medium'
              }`}
            >
              Activity Log
            </button>
          </div>

          {/* Export CSV Button */}
          <button
            onClick={exportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface hover:bg-zinc-50 text-ink border border-line text-xs font-medium shadow-card transition-colors press-fx"
          >
            <Upload className="w-3.5 h-3.5 text-ink-subtle" />
            <span>Export CSV</span>
          </button>
        </div>

        {/* 5-Column KPI Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {TEAM_KPIS.map((kpi) => (
            <MetricCard
              key={kpi.id}
              label={kpi.label}
              value={kpi.value}
              subLabel={kpi.subLabel}
            />
          ))}
        </div>
      </div>

      {/* Sub-Tab Conditional Roster or Activity Log Banner */}
      {subTab === 'members' && (
        <div className="bg-surface border border-line rounded-3xl p-5 shadow-card space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-ink">
              Active Five Star IT Roster (2-Tier RBAC Verified)
            </h2>
            <span className="text-xs text-ink-subtle">6 Core Specialists Online</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {TEAM_ROSTER.map((member) => (
              <div
                key={member.id}
                className="bg-canvas border border-line rounded-2xl p-3.5 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={member.avatar}
                    alt={member.name}
                    className="w-10 h-10 rounded-full border border-line bg-white shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-ink truncate">{member.name}</p>
                    <p className="text-[11px] text-ink-subtle truncate">
                      {member.role} • {member.primaryLocation}
                    </p>
                    <p className="text-[10px] font-mono text-emerald-700 mt-0.5">
                      {member.ticketsClosed} closed • {member.activeTickets} active
                    </p>
                  </div>
                </div>
                <span className="px-2 py-1 rounded-lg bg-amber-50 border border-amber-200/80 text-amber-800 text-xs font-semibold flex items-center gap-1 shrink-0">
                  <Flame className="w-3.5 h-3.5 text-orange-500 fill-orange-400" />
                  {member.flameScore}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {subTab === 'activity' && (
        <div className="bg-surface border border-line rounded-3xl p-5 shadow-card space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-ink">
              Recent 15-Column Job Log Dispatches
            </h2>
            <button
              onClick={() => setActiveView('overview')}
              className="text-xs font-semibold text-brand hover:underline"
            >
              Open Full IT Triage Queue →
            </button>
          </div>
          <div className="divide-y divide-line">
            {tickets.slice(0, 4).map((t) => (
              <div
                key={t.id}
                onClick={() => setSelectedTicketId(t.id)}
                className="py-2.5 flex items-center justify-between gap-4 text-xs cursor-pointer hover:bg-canvas px-2 rounded-xl transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <span className="font-mono font-bold text-ink">{t.ticketCode}</span>
                  <span className="font-medium text-ink">{t.task}</span>
                  <span className="text-ink-subtle">• {t.location}</span>
                </div>
                <span className="text-ink-subtle font-mono">{t.workedBy ?? 'Unassigned'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Middle 3-Card Row: Member Status, Role Distributions, Seat Usage */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Card 1: Member Status */}
        <div className="bg-surface border border-line rounded-3xl p-5 shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full border border-dashed border-zinc-400 inline-block" />
                <h2 className="text-[15px] font-semibold text-ink">Member Status</h2>
              </div>
              <span className="w-4 h-4 rounded-full border border-dashed border-zinc-300 inline-block" />
            </div>

            <BarcodeDivider count={40} />

            <div className="space-y-2 mt-3">
              {MEMBER_STATUS_BREAKDOWN.map((item) => (
                <div
                  key={item.id}
                  className="bg-canvas border border-line/80 rounded-xl px-3.5 py-2.5 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`w-2 h-2 rounded-full ${item.dotColor}`} />
                    <span className="font-semibold text-ink tabular-nums">
                      {item.count}
                    </span>
                    <span className="text-ink-subtle font-medium">{item.label}</span>
                  </div>
                  <span className="text-ink-faint font-mono text-[11px]">
                    {item.percentage}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Card 2: Role Distributions */}
        <div className="bg-surface border border-line rounded-3xl p-5 shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full border border-dashed border-zinc-400 inline-block" />
                <h2 className="text-[15px] font-semibold text-ink">
                  Role Distributions
                </h2>
              </div>
              <span className="w-4 h-4 rounded-full border border-dashed border-zinc-300 inline-block" />
            </div>

            <BarcodeDivider count={40} />

            <div className="space-y-2 mt-3">
              {/* Top 2 full-width rows (Owner, Admin) matching screenshot */}
              {ROLE_DISTRIBUTIONS.slice(0, 2).map((role) => (
                <div
                  key={role.id}
                  className="bg-canvas border border-line/80 rounded-xl px-3.5 py-2.5 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="p-1 rounded-md bg-surface border border-line">
                      {renderRoleIcon(role.icon)}
                    </span>
                    <span className="font-semibold text-ink tabular-nums">
                      {role.count}
                    </span>
                    <span className="text-ink-subtle font-medium">{role.label}</span>
                  </div>
                  <span className="text-ink-faint font-mono text-[11px]">
                    {role.percentage}
                  </span>
                </div>
              ))}

              {/* Bottom 4 roles in a 2x2 grid (Editor, Viewer, Billing, Devops) matching screenshot */}
              <div className="grid grid-cols-2 gap-2">
                {ROLE_DISTRIBUTIONS.slice(2).map((role) => (
                  <div
                    key={role.id}
                    className="bg-canvas border border-line/80 rounded-xl px-3 py-2.5 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="p-1 rounded-md bg-surface border border-line shrink-0">
                        {renderRoleIcon(role.icon)}
                      </span>
                      <span className="font-semibold text-ink tabular-nums">
                        {role.count}
                      </span>
                      <span className="text-ink-subtle font-medium truncate">
                        {role.label}
                      </span>
                    </div>
                    <span className="text-ink-faint font-mono text-[11px] ml-1">
                      {role.percentage}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Seat Usage */}
        <div className="bg-surface border border-line rounded-3xl p-5 shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full border border-dashed border-zinc-400 inline-block" />
                <h2 className="text-[15px] font-semibold text-ink">Seat Usage</h2>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-canvas border border-line text-[11px] font-medium text-ink-subtle">
                {SEAT_USAGE_DATA.planName}
              </span>
            </div>

            <BarcodeDivider count={40} />

            {/* Inner Seat Meter Box */}
            <div className="bg-canvas border border-line rounded-2xl p-3.5 mt-3 space-y-2.5">
              <div className="w-5 h-5 rounded-md bg-zinc-900 text-white flex items-center justify-center font-bold text-[10px]">
                T<span className="text-emerald-400">•</span>
              </div>

              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-lg font-bold text-ink tabular-nums">
                    {SEAT_USAGE_DATA.used}/{SEAT_USAGE_DATA.total}
                  </span>
                  <span className="text-xs text-ink-subtle ml-1.5">of Seats</span>
                </div>
                <span className="text-xs font-semibold text-ink-subtle tabular-nums">
                  {SEAT_USAGE_DATA.percentage}%
                </span>
              </div>

              {/* Signature Vertical Tick Barcode Meter */}
              <TickMeter total={42} filled={30} height={22} />

              <div className="flex items-center justify-between pt-0.5 text-[11px]">
                <span className="text-ink-subtle">
                  {SEAT_USAGE_DATA.remaining} seats remaining
                </span>
                <span className="px-2 py-0.5 rounded-md bg-amber-100/80 text-amber-900 font-medium">
                  {SEAT_USAGE_DATA.renewsDate}
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Buttons Row */}
          <div className="flex items-center gap-2.5 mt-3 pt-1">
            <button
              onClick={() => setQuickIntakeOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-surface hover:bg-zinc-50 text-ink border border-line text-xs font-semibold inline-flex items-center gap-1.5 transition-colors press-fx"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Invite</span>
            </button>
            <button
              onClick={() =>
                addToast(
                  'Enterprise Terminal License',
                  'All 15 Five Star & Bataan Transit hubs unlocked',
                  'success'
                )
              }
              className="flex-1 py-2.5 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold text-center shadow-sm transition-colors press-fx"
            >
              Upgrade Plan
            </button>
          </div>
        </div>
      </div>

      {/* Bottom 2-Card Row: Top Workflows by Activity (2/3) + Top Contributors (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left 2/3 Card: Top Workflows by Activity */}
        <div className="lg:col-span-2 bg-surface border border-line rounded-3xl p-5 shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[15px] font-semibold text-ink">
                Top Workflows by Activity
              </h2>
              <button
                onClick={() =>
                  setPeriodFilter((p) =>
                    p === 'This Month' ? 'Last 90 Days' : 'This Month'
                  )
                }
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface border border-line text-xs font-medium text-ink-subtle hover:text-ink transition-colors press-fx"
              >
                <span>{periodFilter}</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-canvas text-ink-subtle text-[11px] font-medium border-y border-line">
                    <th className="py-2.5 px-3 rounded-l-xl">No</th>
                    <th className="py-2.5 px-3">Workflow Name</th>
                    <th className="py-2.5 px-3">Trigger</th>
                    <th className="py-2.5 px-3">Runs</th>
                    <th className="py-2.5 px-3">Workflow</th>
                    <th className="py-2.5 px-3">Creator</th>
                    <th className="py-2.5 px-3 text-right rounded-r-xl">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line text-xs">
                  {TOP_WORKFLOWS_ACTIVITY.map((wf, index) => (
                    <tr
                      key={wf.id}
                      onClick={() => {
                        const targetTicket = tickets[index % tickets.length];
                        if (targetTicket) setSelectedTicketId(targetTicket.id);
                      }}
                      className="hover:bg-canvas/70 transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-3 font-mono text-ink-subtle">
                        {wf.no}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`w-5 h-5 rounded-md ${wf.iconBg} text-white flex items-center justify-center text-[10px] font-bold shrink-0 shadow-sm`}
                          >
                            ⌘
                          </span>
                          <span className="font-semibold text-ink group-hover:text-brand transition-colors">
                            {wf.name}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-ink-subtle">{wf.trigger}</td>
                      <td className="py-3 px-3 font-mono font-medium text-ink tabular-nums">
                        {wf.runs.toLocaleString()}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`font-mono font-semibold ${
                            wf.successRate >= 98
                              ? 'text-emerald-600'
                              : 'text-amber-600'
                          }`}
                        >
                          {wf.successRate}%
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <img
                            src={wf.creator.avatar}
                            alt={wf.creator.name}
                            className="w-6 h-6 rounded-full border border-line bg-zinc-100"
                          />
                          <span className="text-ink font-medium">
                            {wf.creator.name}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const targetTicket = tickets[index % tickets.length];
                            if (targetTicket) setSelectedTicketId(targetTicket.id);
                          }}
                          className="p-1.5 rounded-lg text-ink-subtle hover:text-ink hover:bg-zinc-100 transition-colors"
                          title="Inspect 15-Column Job Log"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right 1/3 Card: Top Contributors */}
        <div className="bg-surface border border-line rounded-3xl p-5 shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-[15px] font-semibold text-ink">
                Top Contributors
              </h2>
              <button
                onClick={() =>
                  setPeriodFilter((p) =>
                    p === 'This Month' ? 'Last 90 Days' : 'This Month'
                  )
                }
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface border border-line text-xs font-medium text-ink-subtle hover:text-ink transition-colors press-fx"
              >
                <span>{periodFilter}</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>

            <BarcodeDivider count={38} />

            <div className="space-y-2.5 mt-3">
              {TOP_CONTRIBUTORS.map((person) => (
                <div
                  key={person.id}
                  onClick={() => setActiveView('analytics')}
                  className="bg-canvas/70 hover:bg-canvas border border-line rounded-2xl px-3.5 py-2.5 flex items-center justify-between gap-2 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* Medal or Rank Badge */}
                    <div className="w-5 flex items-center justify-center shrink-0">
                      {person.medal === 'gold' && (
                        <Award className="w-4 h-4 text-amber-500 fill-amber-100" />
                      )}
                      {person.medal === 'silver' && (
                        <Award className="w-4 h-4 text-slate-400 fill-slate-100" />
                      )}
                      {person.medal === 'bronze' && (
                        <Award className="w-4 h-4 text-orange-600 fill-orange-100" />
                      )}
                      {!person.medal && (
                        <span className="w-5 h-5 rounded-full bg-zinc-200/80 text-ink-subtle text-[10px] font-bold flex items-center justify-center">
                          {person.rank}
                        </span>
                      )}
                    </div>

                    <img
                      src={person.avatar}
                      alt={person.name}
                      className="w-9 h-9 rounded-full border border-line bg-surface shrink-0"
                    />

                    <div className="min-w-0">
                      <p className="text-xs font-bold text-ink truncate">
                        {person.name}
                      </p>
                      <p className="text-[11px] text-ink-subtle truncate">
                        {person.role}
                      </p>
                    </div>
                  </div>

                  <span className="px-2.5 py-1 rounded-xl bg-amber-50 border border-amber-200/70 text-amber-900 text-xs font-bold inline-flex items-center gap-1 shrink-0 tabular-nums">
                    <Flame className="w-3.5 h-3.5 text-orange-500 fill-orange-400" />
                    {person.flameCount}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Decorative Bottom Barcode Rhythm matching screenshot footer */}
      <BarcodeDivider count={96} className="pt-2 opacity-60" />
    </div>
  );
};
