// @spec FR-QUEUE-01..04: Clean IT Support Workbench & Ticket Queue Dashboard
import React from 'react';
import {
  UserCheck,
  Plus,
  Search,
  CheckCircle2,
  Wrench,
  FileText,
  Download,
  Inbox,
  Clock,
  MapPin,
} from 'lucide-react';
import { useAppStore, QueueFilterTab } from '../../store/useAppStore';
import { LOCATIONS } from '../../data/mockTicketsData';
import { StatusBadge } from '../../components/common/StatusBadge';

export const CentralQueueView: React.FC = () => {
  const {
    currentUser,
    tickets,
    searchQuery,
    setSearchQuery,
    queueFilter,
    setQueueFilter,
    locationFilter,
    setLocationFilter,
    claimTicket,
    resolveTicket,
    setSelectedTicketId,
    setQuickIntakeOpen,
    confirmClosure,
    addToast,
  } = useAppStore();

  const currentTechName = currentUser?.name ?? 'Nathaniel D. Esguerra';

  const openCount = tickets.filter((t) => t.status === 'OPEN').length;
  const myActiveCount = tickets.filter(
    (t) =>
      t.status === 'PROG' &&
      (t.workedBy === currentTechName || !t.workedBy)
  ).length;
  const reslCount = tickets.filter((t) => t.status === 'RESL').length;
  const clsdCount = tickets.filter((t) => t.status === 'CLSD').length;

  const filteredTickets = tickets.filter((t) => {
    // 1. Tab filter
    if (queueFilter === 'OPEN' && t.status !== 'OPEN') return false;
    if (
      queueFilter === 'MY_ACTIVE' &&
      !(t.status === 'PROG' && (t.workedBy === currentTechName || !t.workedBy))
    ) {
      return false;
    }
    if (queueFilter === 'RESL' && t.status !== 'RESL') return false;
    if (queueFilter === 'CLSD' && t.status !== 'CLSD') return false;

    // 2. Terminal Location filter
    if (locationFilter !== 'ALL' && t.locationCode !== locationFilter) {
      return false;
    }

    // 3. Search query filter
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      t.ticketCode.toLowerCase().includes(q) ||
      t.task.toLowerCase().includes(q) ||
      t.location.toLowerCase().includes(q) ||
      t.requestor.toLowerCase().includes(q) ||
      t.department.toLowerCase().includes(q) ||
      (t.workedBy && t.workedBy.toLowerCase().includes(q))
    );
  });

  const handleExportJobLogs = () => {
    const headers = [
      'Ticket ID,Company,Mode,Department,Requestor,Task,Description,Month,Date Started,Time Started,Time Finished,Duration,Date Finished,Status,Location,Worked By',
    ];
    const rows = tickets.map(
      (t) =>
        `${t.ticketCode},"${t.company}",${t.mode},"${t.department}","${t.requestor}","${t.task}","${t.description.replace(/"/g, '""')}",${t.month},${t.dateStarted},${t.timeStarted},${t.timeFinished ?? ''},${t.duration ?? ''},${t.dateFinished ?? ''},${t.status},"${t.location}","${t.workedBy ?? 'Unassigned'}"`
    );
    const csvContent =
      'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'it_support_15col_job_logs.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast(
      '15-Column Job Logs Exported',
      'Downloaded it_support_15col_job_logs.csv',
      'success'
    );
  };

  const kpiCards: {
    id: QueueFilterTab;
    title: string;
    value: string | number;
    subtitle: string;
    icon: React.ReactNode;
    accentClass: string;
  }[] = [
    {
      id: 'OPEN',
      title: 'Unassigned Pool',
      value: openCount,
      subtitle: 'Waiting for IT pickup',
      icon: <Inbox className="w-4 h-4 text-amber-600" />,
      accentClass: 'bg-amber-50 border-amber-200/70',
    },
    {
      id: 'MY_ACTIVE',
      title: 'My Active Repairs',
      value: myActiveCount,
      subtitle: 'Currently in progress',
      icon: <Wrench className="w-4 h-4 text-blue-600" />,
      accentClass: 'bg-blue-50 border-blue-200/70',
    },
    {
      id: 'RESL',
      title: 'Pending Sign-Off',
      value: reslCount,
      subtitle: 'Awaiting user confirmation',
      icon: <Clock className="w-4 h-4 text-orange-600" />,
      accentClass: 'bg-orange-50 border-orange-200/70',
    },
    {
      id: 'CLSD',
      title: 'Completed Today',
      value: clsdCount,
      subtitle: 'Avg repair time: 38 mins',
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
      accentClass: 'bg-emerald-50 border-emerald-200/70',
    },
  ];

  const filterTabs: { id: QueueFilterTab; label: string; count: number }[] = [
    { id: 'ALL', label: 'All Tickets', count: tickets.length },
    { id: 'OPEN', label: 'Unassigned', count: openCount },
    { id: 'MY_ACTIVE', label: 'My Active', count: myActiveCount },
    { id: 'RESL', label: 'Pending Sign-Off', count: reslCount },
    { id: 'CLSD', label: 'Completed', count: clsdCount },
  ];

  return (
    <div className="space-y-5 pb-6">
      {/* Page Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink">
            IT Support Workbench
          </h1>
          <p className="text-xs text-ink-subtle mt-0.5">
            Manage incoming terminal support requests, claim open tickets, and update 15-column job logs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleExportJobLogs}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface hover:bg-zinc-50 text-ink border border-line text-xs font-semibold shadow-card transition-colors press-fx"
          >
            <Download className="w-3.5 h-3.5 text-ink-subtle" />
            <span>Export 15-Col CSV</span>
          </button>

          <button
            onClick={() => setQuickIntakeOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold shadow-sm transition-colors press-fx"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
            <span>Log Walk-In / Viber Ticket</span>
          </button>
        </div>
      </div>

      {/* 4 Clean Interactive KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {kpiCards.map((card) => {
          const isSelected = queueFilter === card.id;
          return (
            <button
              key={card.id}
              onClick={() =>
                setQueueFilter(queueFilter === card.id ? 'ALL' : card.id)
              }
              className={`text-left bg-surface rounded-2xl p-4 border transition-all press-fx ${
                isSelected
                  ? 'border-zinc-900 ring-1 ring-zinc-900/10 shadow-subtle'
                  : 'border-line shadow-card hover:border-zinc-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-ink-subtle">
                  {card.title}
                </span>
                <div
                  className={`w-8 h-8 rounded-xl border flex items-center justify-center ${card.accentClass}`}
                >
                  {card.icon}
                </div>
              </div>
              <div className="mt-2.5 flex items-baseline justify-between">
                <span className="text-2xl font-bold tracking-tight text-ink tabular-nums">
                  {card.value}
                </span>
                <span className="text-[11px] font-medium text-ink-subtle">
                  {card.subtitle}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Main Ticket Queue Card */}
      <div className="bg-surface border border-line rounded-3xl p-5 shadow-card space-y-4">
        {/* Toolbar: Filter Tabs + Search + Terminal Dropdown */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-1 border-b border-line">
          {/* Segmented Filter Tabs */}
          <div className="inline-flex flex-wrap items-center bg-canvas p-1 rounded-xl border border-line self-start">
            {filterTabs.map((tab) => {
              const active = queueFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setQueueFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs transition-all flex items-center gap-1.5 press-fx ${
                    active
                      ? 'bg-surface text-ink font-semibold shadow-card border border-line'
                      : 'text-ink-subtle hover:text-ink font-medium'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                      active
                        ? 'bg-zinc-900 text-white'
                        : 'bg-zinc-200/70 text-ink-subtle'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Right Controls: Search Input & Terminal Location Dropdown */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative flex-1 sm:flex-initial">
              <Search className="w-3.5 h-3.5 text-ink-faint absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search ticket, person, or issue..."
                className="pl-8 pr-3 py-1.5 bg-canvas border border-line rounded-xl text-xs text-ink placeholder:text-ink-faint focus:outline-none focus:border-zinc-400 w-full sm:w-60 transition-all"
              />
            </div>

            {/* Terminal Hub Filter */}
            <div className="relative flex items-center">
              <MapPin className="w-3.5 h-3.5 text-ink-subtle absolute left-3 pointer-events-none" />
              <select
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="pl-8 pr-7 py-1.5 bg-canvas border border-line rounded-xl text-xs font-medium text-ink focus:outline-none focus:border-zinc-400 cursor-pointer"
              >
                <option value="ALL">All 15 Terminals</option>
                {LOCATIONS.map((loc) => (
                  <option key={loc.code} value={loc.code}>
                    {loc.name} ({loc.code})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Clean 7-Column Ticket Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-canvas text-ink-subtle text-[11px] font-semibold uppercase tracking-wider border-y border-line">
                <th className="py-3 px-3.5 rounded-l-xl">Ticket ID</th>
                <th className="py-3 px-3.5">Terminal &amp; Dept</th>
                <th className="py-3 px-3.5">Issue / Task</th>
                <th className="py-3 px-3.5">Requestor</th>
                <th className="py-3 px-3.5">Mode</th>
                <th className="py-3 px-3.5">Status &amp; Tech</th>
                <th className="py-3 px-3.5 text-right rounded-r-xl">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line text-xs">
              {filteredTickets.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="py-10 text-center text-ink-subtle text-xs"
                  >
                    No tickets match the current filter. Try switching tabs or clearing your search.
                  </td>
                </tr>
              ) : (
                filteredTickets.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => setSelectedTicketId(t.id)}
                    className="hover:bg-canvas/70 transition-colors cursor-pointer group"
                  >
                    {/* 1. Ticket ID & Time */}
                    <td className="py-3.5 px-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            t.priority === 'Critical'
                              ? 'bg-rose-500'
                              : t.priority === 'High'
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                          title={`Priority: ${t.priority}`}
                        />
                        <span className="font-mono font-bold text-ink group-hover:text-brand transition-colors">
                          {t.ticketCode}
                        </span>
                      </div>
                      <p className="text-[11px] text-ink-faint font-mono mt-0.5 pl-4">
                        {t.dateStarted} • {t.timeStarted.slice(0, 5)}
                      </p>
                    </td>

                    {/* 2. Terminal & Department */}
                    <td className="py-3.5 px-3.5">
                      <p className="font-semibold text-ink">{t.location}</p>
                      <p className="text-[11px] text-ink-subtle">
                        {t.department} ({t.companyCode})
                      </p>
                    </td>

                    {/* 3. Issue / Task Category */}
                    <td className="py-3.5 px-3.5 max-w-xs">
                      <p className="font-semibold text-ink truncate">{t.task}</p>
                      <p className="text-[11px] text-ink-subtle truncate mt-0.5">
                        {t.description}
                      </p>
                    </td>

                    {/* 4. Requestor */}
                    <td className="py-3.5 px-3.5">
                      <p className="font-medium text-ink">{t.requestor}</p>
                      <p className="text-[11px] text-ink-faint">
                        {t.intakeSource ?? 'PC Kiosk'}
                      </p>
                    </td>

                    {/* 5. Support Mode */}
                    <td className="py-3.5 px-3.5 whitespace-nowrap">
                      <span
                        className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                          t.mode === 'SITE'
                            ? 'bg-amber-50 text-amber-800 border-amber-200/70'
                            : 'bg-sky-50 text-sky-800 border-sky-200/70'
                        }`}
                      >
                        {t.mode === 'SITE' ? 'On-Site' : 'Remote'}
                      </span>
                    </td>

                    {/* 6. Status & Assigned Tech */}
                    <td className="py-3.5 px-3.5 whitespace-nowrap">
                      <StatusBadge status={t.status} size="sm" />
                      <p className="text-[11px] text-ink-subtle mt-1 truncate max-w-[140px]">
                        {t.workedBy ? t.workedBy : 'Unassigned'}
                      </p>
                    </td>

                    {/* 7. Action Buttons */}
                    <td
                      className="py-3.5 px-3.5 text-right whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {t.status === 'OPEN' && (
                        <button
                          onClick={() => claimTicket(t.id)}
                          className="px-3.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm transition-colors press-fx"
                        >
                          <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Claim Ticket</span>
                        </button>
                      )}

                      {t.status === 'PROG' && (
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => resolveTicket(t.id)}
                            className="px-3 py-1.5 rounded-xl bg-brand hover:bg-brand-hover text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm transition-colors press-fx"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Mark Resolved</span>
                          </button>
                          <button
                            onClick={() => setSelectedTicketId(t.id)}
                            className="px-2.5 py-1.5 rounded-xl bg-canvas hover:bg-zinc-200/70 text-ink-subtle border border-line text-xs font-medium transition-colors press-fx"
                          >
                            Edit
                          </button>
                        </div>
                      )}

                      {t.status === 'RESL' && (
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => confirmClosure(t.id)}
                            className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold inline-flex items-center gap-1 shadow-sm transition-colors press-fx"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Confirm Sign-Off</span>
                          </button>
                          <button
                            onClick={() => setSelectedTicketId(t.id)}
                            className="px-2.5 py-1.5 rounded-xl bg-canvas hover:bg-zinc-200/70 text-ink-subtle border border-line text-xs font-medium transition-colors press-fx"
                          >
                            Details
                          </button>
                        </div>
                      )}

                      {t.status === 'CLSD' && (
                        <button
                          onClick={() => setSelectedTicketId(t.id)}
                          className="px-3 py-1.5 rounded-xl bg-canvas hover:bg-zinc-200/70 text-ink-subtle border border-line text-xs font-medium inline-flex items-center gap-1.5 transition-colors press-fx"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>View Job Log</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
