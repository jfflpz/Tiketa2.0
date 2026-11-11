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
  Users,
  Inbox,
  AlertCircle,
  RefreshCw,
  Tag,
  FileText,
  Save,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { SupportMode, Ticket, TicketStatus } from '../../types/ticket';
import { StatusBadge } from '../../components/common/StatusBadge';
import { DiagnosedTaskSelector } from '../../components/tickets/DiagnosedTaskSelector';
import { TicketChecklistSection } from '../../components/tickets/checklist/TicketChecklistSection';
import { canEditTicket } from '../../store/slices/ticketOperationsSlice';
import { ticketsApi } from '../../api/client';
import { formatStandardTime } from '../../utils/timeFormat';

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
  const requestValidation = useAppStore((state) => state.requestValidation);
  const setSelectedTicketId = useAppStore((state) => state.setSelectedTicketId);
  const setActiveView = useAppStore((state) => state.setActiveView);
  const copyTicketShareLink = useAppStore((state) => state.copyTicketShareLink);
  const sendTicketMessageApi = useAppStore((state) => state.sendTicketMessageApi);
  const updateTicketStatusApi = useAppStore((state) => state.updateTicketStatusApi);
  const claimTicketApi = useAppStore((state) => state.claimTicketApi);
  const addToast = useAppStore((state) => state.addToast);
  const updateTicketDescription = useAppStore((state) => state.updateTicketDescription);
  const currentUser = useAppStore((state) => state.currentUser);
  const isAdmin = currentUser?.role === 'admin';
  const isIntern = currentUser?.role === 'intern';
  const [adminWorkbenchFilter, setAdminWorkbenchFilter] = useState<'claimed' | 'assigned'>('claimed');

  const isMyTicket = (t: Ticket | null | undefined): boolean => {
    if (!t || !currentUser) return false;
    const matchId = t.assigned_tech_id === currentUser.id || t.workedById === currentUser.id;
    const matchName =
      Boolean(currentUser.name) &&
      Boolean(t.workedBy) &&
      t.workedBy!.toLowerCase() === currentUser.name.toLowerCase();
    const matchUsername =
      Boolean(currentUser.username) &&
      Boolean(t.assigned_tech_id) &&
      t.assigned_tech_id === currentUser.username;
    return Boolean(matchId || matchName || matchUsername);
  };

  // Claimed tickets owned by current user
  const myClaimedTickets = tickets.filter(
    (t) =>
      (t.status === 'PROG' || (t.status as string) === 'PVER' || t.status === 'RESL') &&
      isMyTicket(t)
  );

  // All in-progress/assigned tickets across the team (for Admin oversight)
  const allAssignedTickets = tickets.filter(
    (t) =>
      (t.status === 'PROG' || (t.status as string) === 'PVER' || t.status === 'RESL') &&
      Boolean(t.assigned_tech_id || t.workedById || t.workedBy)
  );

  const progTickets = isAdmin
    ? (adminWorkbenchFilter === 'assigned' ? allAssignedTickets : myClaimedTickets)
    : myClaimedTickets;

  const rawFocusedTicket = activeWorkbenchTicketId
    ? tickets.find((t) => t.id === activeWorkbenchTicketId) ?? workbenchTicket
    : null;

  const focusedTicket = rawFocusedTicket;
  const isOwner = canEditTicket(currentUser, focusedTicket);
  const hasValidationBanner = Boolean(
    focusedTicket &&
      focusedTicket.status !== 'CLSD' &&
      (focusedTicket.status === 'RESL' || focusedTicket.validationRequested)
  );

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
      setDiagnosisDraft(focusedTicket.technicianDiagnosis || focusedTicket.description || '');
    } else {
      setDiagnosisDraft('');
    }
  }, [focusedTicket?.id]);

  const handleSaveDiagnosis = async () => {
    if (!focusedTicket || !isOwner) return;
    setIsSavingDiagnosis(true);
    updateTicketDescription(focusedTicket.id, diagnosisDraft);
    try {
      await ticketsApi.updateServiceRecord(focusedTicket.id, { diagnosis: diagnosisDraft });
    } catch {
      // safe fallback
    }
    await updateTicketStatusApi(focusedTicket.id, focusedTicket.status, focusedTicket.mode, focusedTicket.taskCode);
    setIsSavingDiagnosis(false);
  };
  const [copiedLink, setCopiedLink] = useState(false);

  const messages = focusedTicket?.messages ?? [];

  const handleSendWorkbenchChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!focusedTicket || !isOwner || !chatDraft.trim()) return;
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
    await copyTicketShareLink(focusedTicket.ticketCode, focusedTicket.id);
    setCopiedLink(true);
    addToast('Link Copied', `Employee verification URL copied for ${focusedTicket.ticketCode}`, 'success');
    setTimeout(() => setCopiedLink(false), 2000);
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
                {isAdmin ? 'Workbench Console' : 'My Active Workbench'}
              </h1>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              {isAdmin && adminWorkbenchFilter === 'assigned'
                ? 'Reviewing team-assigned active repairs across technicians.'
                : 'Select an assigned ticket below to focus your diagnosis, timer, and live chat.'}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Admin Switcher: Claimed Tickets vs Assigned Tickets */}
            {isAdmin && (
              <div className="inline-flex items-center bg-white p-1 rounded-xl border border-[#ECEEF2] shadow-xs">
                <button
                  type="button"
                  onClick={() => setAdminWorkbenchFilter('claimed')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    adminWorkbenchFilter === 'claimed'
                      ? 'bg-zinc-900 text-white shadow-xs'
                      : 'text-zinc-500 hover:text-ink'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Claimed Tickets ({myClaimedTickets.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAdminWorkbenchFilter('assigned')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    adminWorkbenchFilter === 'assigned'
                      ? 'bg-zinc-900 text-white shadow-xs'
                      : 'text-zinc-500 hover:text-ink'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Assigned Tickets ({allAssignedTickets.length})</span>
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => setActiveView('tickets')}
              className={`px-3.5 py-2 rounded-xl bg-white hover:bg-orange-50 text-ink border border-[#ECEEF2] text-xs font-semibold inline-flex items-center gap-1.5 shadow-card transition-colors press-fx ${isIntern ? 'hidden' : ''}`}
            >
              <Inbox className="w-3.5 h-3.5 text-sky-500" />
              <span>Browse All Ticket Lists</span>
            </button>
          </div>
        </div>

        {/* Section 1: In-Progress Bench Tickets */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-4 rounded-full bg-orange-500" />
              <h2 className="text-sm font-bold text-ink">
                {isAdmin
                  ? adminWorkbenchFilter === 'claimed'
                    ? `Your Claimed Bench (${progTickets.length})`
                    : `Team Assigned Active Tickets (${progTickets.length})`
                  : `Your Assigned Active Bench (${progTickets.length})`}
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
                <h3 className="text-sm font-bold text-ink">
                  {isAdmin
                    ? adminWorkbenchFilter === 'claimed'
                      ? 'No personal claimed tickets'
                      : 'No active tickets currently assigned'
                    : isIntern
                    ? 'No active workbench ticket assigned'
                    : 'No active repairs on your bench'}
                </h3>
                <p className="text-xs text-zinc-500">
                  {isAdmin
                    ? adminWorkbenchFilter === 'claimed'
                      ? 'You have not claimed any tickets under your personal account. Switch to "Assigned Tickets" or browse ticket lists to assign or claim.'
                      : 'There are currently no tickets in progress across the technician team.'
                    : 'You currently have no tickets in progress. Claim an open ticket from Ticket Lists to start working.'}
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
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-zinc-900 text-white group-hover:bg-orange-600 transition-colors shrink-0 whitespace-nowrap">
                          {ticket.ticketCode}
                        </span>
                        <StatusBadge status={ticket.status} size="sm" />
                      </div>
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
                      {(isAdmin || !isMyTicket(ticket)) && ticket.workedBy && (
                        <div className="flex items-center gap-1.5 text-zinc-600">
                          <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="truncate font-medium">Assigned: <strong className="text-ink">{ticket.workedBy}</strong></span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Bottom: Duration, Chat Badge & Open Button */}
                  <div className="pt-3 border-t border-[#ECEEF2] flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                      <span className="inline-flex items-center gap-1 font-mono text-[11px] text-orange-600 font-semibold">
                        <Clock className="w-3.5 h-3.5" />
                        {formatStandardTime(ticket.timeStarted)}
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

          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-zinc-900 text-white">
              {focusedTicket.ticketCode}
            </span>
            <StatusBadge status={focusedTicket.status} size="sm" />
            {focusedTicket.status === 'CLSD' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                <span>Closed &amp; Verified</span>
              </span>
            )}
          </div>
        </div>

        
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
                <h2 className="text-base font-bold text-ink">
                  {focusedTicket.task} — {focusedTicket.location}
                </h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Requested by <strong className="text-ink">{focusedTicket.requestor}</strong> ({focusedTicket.department})
                </p>
              </div>
            </div>

            {/* Top-Right: Mode Switcher + Resolve + Drawer Trigger */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div
                className={`inline-flex items-center bg-[#F4F6F9] p-1 rounded-xl border border-[#ECEEF2] ${
                  focusedTicket.status === 'RESL' || (focusedTicket.status as string) === 'PVER' || !isOwner
                    ? 'opacity-80'
                    : ''
                }`}
                title={
                  !isOwner
                    ? 'Only the assigned technician may edit support mode'
                    : focusedTicket.status === 'RESL' || (focusedTicket.status as string) === 'PVER'
                    ? 'Mode selector is read-only while awaiting requester approval'
                    : undefined
                }
              >
                {(['REM', 'SITE'] as SupportMode[]).map((m) => {
                  const isReadOnly =
                    !isOwner || focusedTicket.status === 'RESL' || (focusedTicket.status as string) === 'PVER';
                  return (
                    <button
                      key={m}
                      type="button"
                      disabled={isReadOnly}
                      onClick={async () => {
                        if (isReadOnly) return;
                        updateTicketMode(focusedTicket.id, m);
                        await updateTicketStatusApi(focusedTicket.id, focusedTicket.status, m);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        focusedTicket.mode === m
                          ? 'bg-orange-500 text-white shadow-sm'
                          : isReadOnly
                          ? 'text-zinc-400 cursor-not-allowed'
                          : 'text-zinc-500 hover:text-ink press-fx'
                      }`}
                    >
                      {m === 'REM' ? 'Remote (REM)' : 'On-Site (SITE)'}
                    </button>
                  );
                })}
              </div>

              {/* Copy Link Button: Only displayed if validation banner is not active (as validation card already features copy link) */}
              {!hasValidationBanner && (
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
              )}

              {focusedTicket.status === 'CLSD' ||
              focusedTicket.status === 'RESL' ||
              (focusedTicket.status as string) === 'PVER' ? null : focusedTicket.status === 'OPEN' ? (
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
              ) : isOwner ? (
                <button
                  type="button"
                  onClick={async () => {
                    await updateTicketStatusApi(focusedTicket.id, 'RESL', focusedTicket.mode);
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold
                  inline-flex items-center gap-1.5 shadow-sm transition-colors press-fx"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Mark Repair Resolved</span>
                </button>
              ) : (
                <div className="px-3.5 py-2 rounded-xl bg-zinc-100 border border-zinc-200 text-zinc-700 text-xs font-semibold inline-flex items-center gap-1.5 shadow-2xs">
                  <User className="w-4 h-4 text-zinc-500" />
                  <span>Assigned to {focusedTicket.workedBy || 'another technician'}</span>
                </div>
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

          {/* Ticket Verified & Closed Confirmation Banner */}
          {focusedTicket.status === 'CLSD' && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex flex-wrap items-center justify-between gap-3 animate-fade-in shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-emerald-950">
                      Ticket Verified &amp; Confirmed Closed
                    </span>
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                      Closure Verified
                    </span>
                  </div>
                  <p className="text-xs text-emerald-800 mt-0.5">
                    Verified and signed off by <strong className="text-emerald-950">{focusedTicket.requestor}</strong>
                    {focusedTicket.employeeId ? ` (ID #${focusedTicket.employeeId})` : ''}.
                    This service record is finalized and archived in central records.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveWorkbenchTicketId(null)}
                  className="px-3.5 py-2 rounded-xl bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-bold inline-flex items-center gap-1.5 shadow-2xs transition-colors press-fx"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Return to My Bench</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveView('joblogs')}
                  className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-2xs transition-colors press-fx"
                >
                  <span>View in My Job Logs</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Validation Request Banner when resolved */}
          {focusedTicket.status !== 'CLSD' && (focusedTicket.status === 'RESL' || focusedTicket.validationRequested) && (
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
            {isOwner ? (
              <DiagnosedTaskSelector
                ticketId={focusedTicket.id}
                currentTaskCode={focusedTicket.taskCode}
                currentTaskName={focusedTicket.task}
              />
            ) : (
              <div className="px-3.5 py-2 rounded-xl bg-[#F4F6F9] border border-[#ECEEF2] flex items-center gap-2.5">
                <Tag className="w-4 h-4 text-orange-500 shrink-0" />
                <div className="min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                    Task Category
                  </span>
                  <span className="text-xs font-bold text-ink truncate block">
                    {focusedTicket.task} ({focusedTicket.taskCode})
                  </span>
                </div>
              </div>
            )}

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
                  {focusedTicket.dateStarted} • {formatStandardTime(focusedTicket.timeStarted)}
                </span>
              </div>
            </div>
          </div>
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

        {/* 4. Technician Notes & Ongoing Findings */}
        <div className="bg-white border border-[#ECEEF2] rounded-2xl p-4 space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-3.5 rounded-full bg-orange-500" />
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-800">
                Technician Notes &amp; Observations
              </span>
              {!isOwner && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-100 text-zinc-600 border border-zinc-200">
                  Assigned to {focusedTicket.workedBy || 'another technician'}
                </span>
              )}
            </div>
            <span className="text-[11px] text-zinc-400 font-medium">
              Save repair progress or pending reasons
            </span>
          </div>

          {/* Dedicated Saved Note Display Card */}
          {focusedTicket.technicianDiagnosis && (
            <div className="p-3.5 rounded-xl bg-orange-50/50 border border-orange-200/60 space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-orange-950 inline-flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-orange-600" />
                  Saved Diagnostic Observation
                </span>
                <span className="text-[10px] font-mono font-medium text-orange-700 bg-orange-100/60 px-2 py-0.5 rounded">
                  {focusedTicket.workedBy ? `Logged by ${focusedTicket.workedBy}` : 'Saved Note'}
                </span>
              </div>
              <p className="text-xs text-ink font-medium leading-relaxed whitespace-pre-wrap bg-white/80 p-2.5 rounded-lg border border-orange-100">
                {focusedTicket.technicianDiagnosis}
              </p>
            </div>
          )}

          {/* Input / Update Textarea */}
          <div className="flex flex-col sm:flex-row gap-2">
            <textarea
              rows={2}
              value={diagnosisDraft}
              readOnly={!isOwner}
              disabled={!isOwner}
              onChange={(e) => setDiagnosisDraft(e.target.value)}
              placeholder={
                !isOwner
                  ? `Assigned to ${focusedTicket.workedBy || 'another technician'} (Read-Only)`
                  : 'Leave technician notes here once in progress or pending (e.g. Diagnosed thermal print head failure. Waiting for replacement part or customer AnyDesk confirmation)...'
              }
              className="flex-1 px-3.5 py-2.5 bg-[#F8F9FA] border border-[#ECEEF2] rounded-xl text-xs text-ink focus:outline-none focus:border-orange-500 resize-none leading-relaxed disabled:bg-zinc-100/60 disabled:text-zinc-500"
            />
            {isOwner && (
              <button
                type="button"
                disabled={isSavingDiagnosis}
                onClick={handleSaveDiagnosis}
                className="px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 shadow-sm transition-colors press-fx sm:self-end"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSavingDiagnosis ? 'Saving...' : 'Save Note'}</span>
              </button>
            )}
          </div>
        </div>

        {/* SOP Checklist & Saved Repair Guides */}
        <TicketChecklistSection
          ticketId={focusedTicket.id}
          ticketStatus={isOwner ? focusedTicket.status : ('CLSD' as TicketStatus)}
          ticketTaskCode={focusedTicket.taskCode}
          assignedTechId={focusedTicket.workedById ?? focusedTicket.assigned_tech_id}
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
                disabled={!isOwner}
                onClick={() =>
                  sendTicketMessageApi(focusedTicket.id, preset, false)
                }
                className="text-[11px] px-2.5 py-1 rounded-lg bg-white hover:bg-orange-50 disabled:opacity-40 disabled:cursor-not-allowed text-zinc-600 hover:text-orange-600 border border-[#ECEEF2] transition-colors press-fx"
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
              disabled={!isOwner}
              value={chatDraft}
              onChange={(e) => setChatDraft(e.target.value)}
              placeholder={
                !isOwner
                  ? `Chat input is restricted to assigned technician (${focusedTicket.workedBy || 'Assigned'})`
                  : `Type a message to ${focusedTicket.requestor} (${focusedTicket.location})...`
              }
              className="flex-1 min-w-0 px-3.5 sm:px-4 py-2 sm:py-2.5 bg-white border border-[#ECEEF2] rounded-xl text-xs text-ink placeholder:text-zinc-400 focus:outline-none focus:border-orange-400 disabled:bg-zinc-100/60 disabled:text-zinc-400"
            />
            <button
              type="submit"
              disabled={!isOwner || !chatDraft.trim()}
              className="px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition-colors press-fx shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Send Message</span>
              <span className="sm:hidden">Send</span>
            </button>
          </form>
        </div>



        
      </div>
    </div>
  );
};
