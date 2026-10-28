// @spec FR-QUEUE-02 & FR-TICK-03: Two-State Active Workbench Hub (Bench Picker ⇄ Focused Repair Console)
import React, { useState, useEffect } from 'react';
import {
  Wrench,
  CheckCircle2,
  Clock,
  MapPin,
  MessageSquare,
  Send,
  User,
  Copy,
  ArrowRight,
  ArrowLeft,
  ArrowUpRight,
  Check,
  UserCheck,
  Inbox,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { SupportMode, Ticket } from '../../types/ticket';
import { StatusBadge } from '../../components/common/StatusBadge';
import { DiagnosedTaskSelector } from '../../components/tickets/DiagnosedTaskSelector';
import { TicketChecklistSection } from '../../components/tickets/checklist/TicketChecklistSection';

const WORKBENCH_QUICK_REPLIES = [
  'Please share your AnyDesk ID so I can check remotely.',
  'I am heading to your terminal booth now.',
  'Please restart the application and check if the error is gone.',
  'Please test the printer/PC now and click Confirm Closure if fixed.',
];

export const ITWorkbenchBoardView: React.FC = () => {
  const tickets = useAppStore((state) => state.tickets);
  const activeWorkbenchTicketId = useAppStore((state) => state.activeWorkbenchTicketId);
  const setActiveWorkbenchTicketId = useAppStore((state) => state.setActiveWorkbenchTicketId);
  const workbenchTicket = useAppStore((state) => state.workbenchTicket);
  const isWorkbenchLoading = useAppStore((state) => state.isWorkbenchLoading);
  const workbenchError = useAppStore((state) => state.workbenchError);
  const fetchWorkbenchTicketApi = useAppStore((state) => state.fetchWorkbenchTicketApi);
  const fetchTicketCommentsApi = useAppStore((state) => state.fetchTicketCommentsApi);
  const updateTicketMode = useAppStore((state) => state.updateTicketMode);
  const resolveTicket = useAppStore((state) => state.resolveTicket);
  const requestValidation = useAppStore((state) => state.requestValidation);
  const setSelectedTicketId = useAppStore((state) => state.setSelectedTicketId);
  const setActiveView = useAppStore((state) => state.setActiveView);
  const copyTicketShareLink = useAppStore((state) => state.copyTicketShareLink);
  const sendTicketMessageApi = useAppStore((state) => state.sendTicketMessageApi);
  const updateTicketStatusApi = useAppStore((state) => state.updateTicketStatusApi);
  const claimTicketApi = useAppStore((state) => state.claimTicketApi);
  const addToast = useAppStore((state) => state.addToast);
  const updateTicketDescription = useAppStore((state) => state.updateTicketDescription);

  const progTickets = tickets.filter((t) => t.status === 'PROG');
  const openTickets = tickets.filter((t) => t.status === 'OPEN');

  const focusedTicket = activeWorkbenchTicketId
    ? tickets.find((t) => t.id === activeWorkbenchTicketId) ?? workbenchTicket
    : null;

  // Poll comments for focused ticket
  useEffect(() => {
    if (!focusedTicket?.id) return;
    fetchTicketCommentsApi(focusedTicket.id);

    const interval = setInterval(() => {
      fetchTicketCommentsApi(focusedTicket.id);
    }, 5000);

    return () => clearInterval(interval);
  }, [focusedTicket?.id, fetchTicketCommentsApi]);

  // Load ticket by ID if absent from tickets and workbenchTicket
  useEffect(() => {
    if (activeWorkbenchTicketId && !focusedTicket && !isWorkbenchLoading && !workbenchError) {
      fetchWorkbenchTicketApi(activeWorkbenchTicketId);
    }
  }, [activeWorkbenchTicketId, focusedTicket, isWorkbenchLoading, workbenchError, fetchWorkbenchTicketApi]);

  const [chatDraft, setChatDraft] = useState('');
  const [diagnosisDraft, setDiagnosisDraft] = useState('');
  const [isSavingDiagnosis, setIsSavingDiagnosis] = useState(false);

  useEffect(() => {
    if (focusedTicket) {
      setDiagnosisDraft(focusedTicket.technicianDiagnosis || '');
    }
  }, [focusedTicket?.id]);

  const handleSaveDiagnosis = async () => {
    if (!focusedTicket) return;
    setIsSavingDiagnosis(true);
    updateTicketDescription(focusedTicket.id, diagnosisDraft);
    await updateTicketStatusApi(focusedTicket.id, focusedTicket.status, focusedTicket.mode, focusedTicket.taskCode);
    setIsSavingDiagnosis(false);
  };
  const [copiedLink, setCopiedLink] = useState(false);

  const messages = focusedTicket?.messages ?? [];

  const handleSendWorkbenchChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!focusedTicket || !chatDraft.trim()) return;
    const msg = chatDraft.trim();
    setChatDraft('');
    const res = await sendTicketMessageApi(focusedTicket.id, msg, false);
    if (res === false) {
      setChatDraft(msg);
    }
  };

  const handleCopyLink = async () => {
    if (!focusedTicket) return;
    if (focusedTicket.closureUrl) {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(focusedTicket.closureUrl);
      }
      setCopiedLink(true);
      addToast('Viber Link Copied', `Direct resolution URL copied for ${focusedTicket.ticketCode}`, 'success');
      setTimeout(() => setCopiedLink(false), 2000);
      return;
    }
    await copyTicketShareLink(focusedTicket.ticketCode);
    setCopiedLink(true);
    addToast('Link Copied', `Employee verification URL copied for ${focusedTicket.ticketCode}`, 'success');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleClaimAndFocus = async (ticket: Ticket) => {
    await claimTicketApi(ticket.id);
    setActiveWorkbenchTicketId(ticket.id);
  };

  const getPriorityBadge = (priority: Ticket['priority']) => {
    switch (priority) {
      case 'Critical':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'High':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Medium':
        return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'Low':
        return 'bg-zinc-100 text-zinc-600 border-zinc-200';
    }
  };

  if (activeWorkbenchTicketId && isWorkbenchLoading && !focusedTicket) {
    return (
      <div className="space-y-6 pb-12 animate-fade-in">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setActiveWorkbenchTicketId(null)}
            className="py-1.5 px-3 rounded-xl bg-white border border-[#ECEEF2] text-xs font-semibold text-zinc-600 hover:text-ink transition-colors"
          >
            ← Back to Workbench List
          </button>
        </div>
        <div className="p-16 text-center bg-white border border-[#ECEEF2] rounded-3xl shadow-card space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-orange-500" />
          <h3 className="text-sm font-bold text-ink">Loading Workbench Ticket...</h3>
          <p className="text-xs text-zinc-500">Fetching canonical ticket record from server</p>
        </div>
      </div>
    );
  }

  if (activeWorkbenchTicketId && workbenchError && !focusedTicket) {
    return (
      <div className="space-y-6 pb-12 animate-fade-in">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setActiveWorkbenchTicketId(null)}
            className="py-1.5 px-3 rounded-xl bg-white border border-[#ECEEF2] text-xs font-semibold text-zinc-600 hover:text-ink transition-colors"
          >
            ← Back to Workbench List
          </button>
        </div>
        <div className="p-16 text-center bg-white border border-rose-200 rounded-3xl shadow-card space-y-3">
          <AlertCircle className="w-8 h-8 mx-auto text-rose-500" />
          <h3 className="text-sm font-bold text-rose-700">Failed to Load Workbench Ticket</h3>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">{workbenchError}</p>
          <button
            type="button"
            onClick={() => fetchWorkbenchTicketApi(activeWorkbenchTicketId)}
            className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition-colors"
          >
            Retry Loading
          </button>
        </div>
      </div>
    );
  }

  if (!focusedTicket) {
    return (
      <div className="space-y-6 pb-8">
        {/* Hub Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
              <h1 className="text-xl font-bold text-ink tracking-tight">
                My Active Workbench
              </h1>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              Select an assigned ticket below to focus your diagnosis, timer, and live chat.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveView('tickets')}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-orange-50 text-ink border border-[#ECEEF2] text-xs font-semibold inline-flex items-center gap-1.5 shadow-card transition-colors press-fx"
            >
              <Inbox className="w-3.5 h-3.5 text-sky-500" />
              <span>Browse All Ticket Lists</span>
            </button>
          </div>
        </div>

        {/* Section 1: In-Progress Bench Tickets Assigned to Tech */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-4 rounded-full bg-orange-500" />
              <h2 className="text-sm font-bold text-ink">
                Your Assigned Active Bench ({progTickets.length})
              </h2>
            </div>
            <span className="text-[11px] text-zinc-400">
              Pick a ticket to open full repair workstation
            </span>
          </div>

          {progTickets.length === 0 ? (
            <div className="bg-white border border-[#ECEEF2] rounded-2xl p-8 text-center shadow-card space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-500 border border-orange-200/60 flex items-center justify-center mx-auto">
                <Wrench className="w-6 h-6" />
              </div>
              <div className="max-w-sm mx-auto space-y-1">
                <h3 className="text-sm font-bold text-ink">No active repairs on your bench</h3>
                <p className="text-xs text-zinc-500">
                  You currently have no tickets in progress. Claim an open ticket below or from the Ticket Lists to start working.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveView('tickets')}
                className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition-all"
              >
                <span>Browse Open Tickets</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {progTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="bg-white border border-[#ECEEF2] hover:border-orange-400 rounded-2xl p-5 shadow-card flex flex-col justify-between space-y-4 transition-all group"
                >
                  <div className="space-y-3">
                    {/* Card Top: Code, Mode, Priority */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-zinc-900 text-white group-hover:bg-orange-600 transition-colors">
                        {ticket.ticketCode}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-zinc-100 text-zinc-700 border border-zinc-200">
                          {ticket.mode === 'SITE' ? 'On-Site' : 'Remote'}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getPriorityBadge(
                            ticket.priority
                          )}`}
                        >
                          {ticket.priority}
                        </span>
                      </div>
                    </div>

                    {/* Task Title & Description */}
                    <div>
                      <h3 className="text-sm font-bold text-ink group-hover:text-orange-600 transition-colors line-clamp-1">
                        {ticket.task}
                      </h3>
                      <p className="text-xs text-zinc-500 line-clamp-2 mt-1">
                        {ticket.description || 'No description provided.'}
                      </p>
                    </div>

                    {/* Terminal & Requestor Details */}
                    <div className="space-y-1 pt-2 border-t border-zinc-100 text-[11px] text-zinc-500">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                        <span className="font-semibold text-ink truncate">
                          {ticket.location} ({ticket.locationCode}) • {ticket.department}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        <span className="truncate">Requestor: {ticket.requestor}</span>
                      </div>
                    </div>
                  </div>

                  {/* Card Bottom: Duration, Chat Badge & Open Button */}
                  <div className="pt-3 border-t border-[#ECEEF2] flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                      <span className="inline-flex items-center gap-1 font-mono text-[11px] text-orange-600 font-semibold">
                        <Clock className="w-3.5 h-3.5" />
                        {ticket.timeStarted.slice(0, 5)}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] text-zinc-400">
                        <MessageSquare className="w-3 h-3" />
                        {ticket.messages?.length ?? 0}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveWorkbenchTicketId(ticket.id)}
                      className="px-3.5 py-1.5 rounded-xl bg-[#111315] hover:bg-orange-500 active:scale-95 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition-all"
                    >
                      <span>Open in Workbench</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 2: Unassigned Tickets Ready to Claim */}
        {openTickets.length > 0 && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-4 rounded-full bg-sky-500" />
                <h2 className="text-sm font-bold text-ink">
                  Ready to Claim from Queue ({openTickets.length} Unassigned)
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setActiveView('tickets')}
                className="text-[11px] font-bold text-orange-600 hover:text-orange-700 inline-flex items-center gap-1"
              >
                <span>View Full Queue</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {openTickets.slice(0, 3).map((ticket) => (
                <div
                  key={ticket.id}
                  className="bg-white border border-[#ECEEF2] rounded-2xl p-4 shadow-card flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-zinc-900 text-white">
                        {ticket.ticketCode}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${getPriorityBadge(
                          ticket.priority
                        )}`}
                      >
                        {ticket.priority}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-ink truncate">{ticket.task}</p>
                    <p className="text-[11px] text-zinc-500 truncate">
                      {ticket.location} • {ticket.requestor}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleClaimAndFocus(ticket)}
                    className="w-full py-1.5 px-3 rounded-lg bg-orange-500 hover:bg-orange-600 active:scale-95 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-all shadow-xs"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Claim &amp; Start Workbench</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // STATE 2: FOCUSED REPAIR CONSOLE
  // Displayed when the technician has explicitly chosen a ticket to work on
  // =========================================================================
  return (
    <div className="space-y-4 pb-8">
      {/* State 2 Navigation Bar: Back to Bench + Quick Ticket Switchers */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-[#ECEEF2] rounded-2xl px-4 py-3 shadow-card">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setActiveWorkbenchTicketId(null)}
            className="px-3 py-1.5 rounded-xl bg-[#F4F6F9] hover:bg-orange-50 hover:text-orange-600 text-zinc-700 text-xs font-bold inline-flex items-center gap-1.5 transition-colors press-fx"
            title="Return to Active Bench Ticket Picker"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>← Back to My Bench</span>
          </button>

          <div className="h-4 w-[1px] bg-zinc-200 hidden sm:block" />

          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400 font-medium hidden sm:inline">
              Currently Focusing:
            </span>
            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-zinc-900 text-white">
              {focusedTicket.ticketCode}
            </span>
            <StatusBadge status={focusedTicket.status} size="sm" />
          </div>
        </div>

        {/* Quick Ticket Switcher Pills for Tech's Other Active Tickets */}
        {progTickets.length > 1 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs">
            <span className="text-[11px] font-semibold text-zinc-400 shrink-0">
              Switch Bench:
            </span>
            {progTickets.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveWorkbenchTicketId(t.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  t.id === focusedTicket.id
                    ? 'bg-orange-500 text-white font-bold shadow-xs'
                    : 'bg-[#F4F6F9] text-zinc-600 hover:text-ink hover:bg-zinc-200/70'
                }`}
              >
                {t.ticketCode}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Active Repair Console */}
      <div className="bg-white border border-[#ECEEF2] rounded-2xl p-5 shadow-card space-y-5">
        {/* 1. Header Row & Action Controls */}
        <div className="w-full space-y-3.5 pb-4 border-b border-[#ECEEF2]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Left: Icon + Title */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                <Wrench className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-orange-50 text-orange-600 border border-orange-200/60">
                    Active Repair Workstation
                  </span>
                  <span className="font-mono text-sm font-extrabold text-ink">
                    {focusedTicket.ticketCode}
                  </span>
                  <StatusBadge status={focusedTicket.status} size="sm" />
                </div>
                <h2 className="text-base font-bold text-ink mt-0.5">
                  {focusedTicket.task} — {focusedTicket.location}
                </h2>
              </div>
            </div>

            {/* Top-Right: Mode Switcher + Resolve + Drawer Trigger */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="inline-flex items-center bg-[#F4F6F9] p-1 rounded-xl border border-[#ECEEF2]">
                {(['REM', 'SITE'] as SupportMode[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={async () => {
                        updateTicketMode(focusedTicket.id, m);
                        await updateTicketStatusApi(focusedTicket.id, 'PROG', m);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all press-fx ${
                      focusedTicket.mode === m
                        ? 'bg-orange-500 text-white shadow-sm'
                        : 'text-zinc-500 hover:text-ink'
                    }`}
                  >
                    {m === 'REM' ? 'Remote (REM)' : 'On-Site (SITE)'}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={handleCopyLink}
                className="px-3 py-2 rounded-xl bg-[#F4F6F9] hover:bg-[#111315] text-ink hover:text-white border border-[#ECEEF2] text-xs font-semibold inline-flex items-center gap-1.5 transition-colors press-fx"
                title="Copy employee confirmation link"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-orange-500" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>

              {focusedTicket.status === 'OPEN' ? (
                <button
                  type="button"
                  onClick={async () => {
                    await claimTicketApi(focusedTicket.id);
                  }}
                  className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition-colors press-fx"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>Claim & Start Repair</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={async () => {
                    resolveTicket(focusedTicket.id);
                    await updateTicketStatusApi(focusedTicket.id, 'RESL', focusedTicket.mode);
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition-colors press-fx"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Mark Repair Resolved</span>
                </button>
              )}

              {/* Arrow Button to Open Slide-Out Side Drawer */}
              <button
                type="button"
                onClick={() => setSelectedTicketId(focusedTicket.id)}
                className="w-9 h-9 rounded-xl bg-[#F4F6F9] hover:bg-[#111315] text-ink hover:text-white border border-[#ECEEF2] flex items-center justify-center transition-colors press-fx"
                title="Open 15-Column Job Log Side Drawer"
              >
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Validation Request Banner when resolved */}
          {(focusedTicket.status === 'RESL' || focusedTicket.validationRequested) && (
            <div className="p-3.5 rounded-xl bg-orange-50/90 border border-orange-200 flex flex-wrap items-center justify-between gap-3 animate-fade-in">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-orange-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-ink">
                      Validation Requested from Requestor
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 border border-orange-300">
                      Awaiting Employee Sign-Off
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-600 mt-0.5">
                    Request sent to <strong className="text-ink">{focusedTicket.requestor}</strong> (
                    {focusedTicket.employeeId}). The employee enters their Employee ID to validate and confirm closure.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-3 py-1.5 rounded-lg bg-white hover:bg-orange-100 text-orange-700 border border-orange-200 text-xs font-bold inline-flex items-center gap-1.5 shadow-2xs transition-colors press-fx"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Link</span>
                </button>
                <button
                  type="button"
                  onClick={() => requestValidation(focusedTicket.id)}
                  className="px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold inline-flex items-center gap-1 shadow-2xs transition-colors press-fx"
                >
                  <span>Re-send Validation</span>
                </button>
              </div>
            </div>
          )}

          {/* Header Bottom 4-Column Balanced Metadata Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
            {/* Diagnosed Technical Task (Smart Grouped Selector) */}
            <DiagnosedTaskSelector
              ticketId={focusedTicket.id}
              currentTaskCode={focusedTicket.taskCode}
              currentTaskName={focusedTicket.task}
            />

            {/* Terminal Hub & Department */}
            <div className="px-3.5 py-2 rounded-xl bg-[#F4F6F9] border border-[#ECEEF2] flex items-center gap-2.5">
              <MapPin className="w-4 h-4 text-orange-500 shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                  Terminal &amp; Dept
                </span>
                <span className="text-xs font-bold text-ink truncate block">
                  {focusedTicket.location} ({focusedTicket.locationCode}) •{' '}
                  {focusedTicket.department}
                </span>
              </div>
            </div>

            {/* Requestor */}
            <div className="px-3.5 py-2 rounded-xl bg-[#F4F6F9] border border-[#ECEEF2] flex items-center gap-2.5">
              <User className="w-4 h-4 text-orange-500 shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                  Requested By
                </span>
                <span className="text-xs font-bold text-ink truncate block">
                  {focusedTicket.requestor} ({focusedTicket.companyCode})
                </span>
              </div>
            </div>

            {/* Time Started */}
            <div className="px-3.5 py-2 rounded-xl bg-[#F4F6F9] border border-[#ECEEF2] flex items-center gap-2.5">
              <Clock className="w-4 h-4 text-orange-500 shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                  Date &amp; Time Started
                </span>
                <span className="text-xs font-mono font-bold text-orange-600 truncate block">
                  {focusedTicket.dateStarted} • {focusedTicket.timeStarted.slice(0, 5)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* SOP Checklist & Saved Repair Guides */}
        <TicketChecklistSection
          ticketId={focusedTicket.id}
          ticketStatus={focusedTicket.status}
          ticketTaskCode={focusedTicket.taskCode}
        />

        {/* 2. Full-Width Live Chat with Employee */}
        <div className="w-full bg-[#F4F6F9] border border-[#ECEEF2] rounded-2xl p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[#ECEEF2]">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-orange-500/15 text-orange-600 flex items-center justify-center">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-ink">
                  Live Chat with Employee — {focusedTicket.requestor} ({focusedTicket.location})
                </h3>
                <p className="text-[11px] text-zinc-500">
                  Real-time messages synchronize directly with the employee&apos;s &ldquo;My Tickets&rdquo; screen.
                </p>
              </div>
            </div>
            <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-orange-500 text-white">
              {messages.length} {messages.length === 1 ? 'Message' : 'Messages'}
            </span>
          </div>

          {/* Large Full-Width Message Feed */}
          <div className="w-full bg-white border border-[#ECEEF2] rounded-xl p-4 space-y-3 h-64 overflow-y-auto">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-1.5 text-zinc-400">
                <MessageSquare className="w-6 h-6 text-zinc-300" />
                <p className="text-xs font-semibold text-zinc-500">
                  No messages yet with {focusedTicket.requestor}
                </p>
                <p className="text-[11px]">
                  Send a message or click a quick-reply chip below to ask for their AnyDesk ID or booth status.
                </p>
              </div>
            ) : (
              messages.map((msg) => {
                const isIT = msg.senderRole === 'it';
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      isIT ? 'items-end' : 'items-start'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 mb-1 px-1">
                      <span className="font-bold text-zinc-700">
                        {msg.senderName}
                      </span>
                      <span
                        className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                          isIT
                            ? 'bg-orange-50 text-orange-600'
                            : 'bg-emerald-50 text-emerald-700'
                        }`}
                      >
                        {isIT ? 'IT Support' : 'Employee'}
                      </span>
                      <span className="font-mono">• {msg.timestamp}</span>
                    </div>
                    <div
                      className={`px-4 py-2.5 rounded-2xl text-xs max-w-[75%] leading-relaxed shadow-2xs ${
                        isIT
                          ? 'bg-[#111315] text-white rounded-br-xs'
                          : 'bg-orange-50/80 border border-orange-200/80 text-ink rounded-bl-xs'
                      }`}
                    >
                      {msg.message}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Full-Width Quick Reply Chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mr-1">
              Quick Replies:
            </span>
            {WORKBENCH_QUICK_REPLIES.map((preset) => (
              <button
                key={preset}
                type="button"
                  onClick={() =>
                    sendTicketMessageApi(focusedTicket.id, preset, false)
                  }
                className="text-[11px] px-2.5 py-1 rounded-lg bg-white hover:bg-orange-50 text-zinc-600 hover:text-orange-600 border border-[#ECEEF2] transition-colors press-fx"
              >
                + {preset}
              </button>
            ))}
          </div>

          {/* Full-Width Chat Composer */}
          <form
            onSubmit={handleSendWorkbenchChat}
            className="w-full flex items-center gap-2 pt-1"
          >
            <input
              type="text"
              value={chatDraft}
              onChange={(e) => setChatDraft(e.target.value)}
              placeholder={`Type a message to ${focusedTicket.requestor} (${focusedTicket.location})...`}
              className="flex-1 px-4 py-2.5 bg-white border border-[#ECEEF2] rounded-xl text-xs text-ink placeholder:text-zinc-400 focus:outline-none focus:border-orange-400"
            />
            <button
              type="submit"
              disabled={!chatDraft.trim()}
              className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition-colors press-fx shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send Message</span>
            </button>
          </form>
        </div>

        {/* 3. Original Employee Report & Context */}
        <div className="bg-[#F4F6F9] border border-[#ECEEF2] rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
              #06 Original Employee Report &amp; Context
            </span>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-white border border-zinc-200 text-zinc-600">
              {focusedTicket.intakeSource ?? 'PC Kiosk'}
            </span>
          </div>
          <div className="p-3 bg-white border border-zinc-200/80 rounded-xl text-xs text-ink leading-relaxed space-y-1">
            <div className="font-bold text-ink">
              {focusedTicket.reportedIssue || focusedTicket.task}
            </div>
            <p className="font-medium italic text-zinc-600">
              &ldquo;{focusedTicket.reportedDetails || focusedTicket.description || 'No description provided by requestor.'}&rdquo;
            </p>
          </div>
          <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-1">
            <span>Company: <strong className="text-ink">{focusedTicket.company}</strong></span>
            <span>Logged by: <strong className="text-ink">{focusedTicket.requestor} {focusedTicket.employeeId ? `[${focusedTicket.employeeId}]` : ''}</strong></span>
          </div>
        </div>

        {/* 4. Technician Diagnosis & Exact Problem Record */}
        <div className="bg-white border border-[#ECEEF2] rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-700">
              Technician Diagnosis &amp; Exact Problem Record
            </span>
            <span className="text-[11px] text-zinc-400">
              Persisted in Canonical Ledger
            </span>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={diagnosisDraft}
              onChange={(e) => setDiagnosisDraft(e.target.value)}
              placeholder="e.g. Diagnosed thermal print head failure. Cleaned roller sensor and replaced thermal ribbons."
              className="flex-1 px-3.5 py-2 bg-[#F8F9FA] border border-[#ECEEF2] rounded-xl text-xs text-ink focus:outline-none focus:border-orange-500"
            />
            <button
              type="button"
              disabled={isSavingDiagnosis}
              onClick={handleSaveDiagnosis}
              className="px-4 py-2 rounded-xl bg-[#111315] hover:bg-orange-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors press-fx"
            >
              <span>{isSavingDiagnosis ? 'Saving...' : 'Save Diagnosis'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
