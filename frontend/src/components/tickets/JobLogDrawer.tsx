// @spec SR-03: Slide-out 15-Column Canonical Job Log Drawer, Repair Controls & Two-Way Employee Chat
import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  RotateCcw,
  Clock,
  ShieldCheck,
  UserCheck,
  MapPin,
  Building2,
  Wrench,
  Save,
  MessageSquare,
  Send,
  FileSpreadsheet,
  Copy,
  Lock,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { SupportMode } from '../../types/ticket';
import { StatusBadge } from '../common/StatusBadge';
import { DiagnosedTaskSelector } from './DiagnosedTaskSelector';

const IT_QUICK_REPLIES = [
  'Can you share your AnyDesk ID so I can connect remotely?',
  'I am on my way to your workstation now.',
  'Please restart the application and let me know if it works.',
  'Repair is complete! Please click Confirm Resolved in My Tickets.',
];

export const JobLogDrawer: React.FC = () => {
  const {
    tickets,
    selectedTicketId,
    setSelectedTicketId,
    currentUser,
    claimTicketApi,          
    updateTicketStatusApi,  
    fetchTicketCommentsApi, 
    sendTicketMessageApi,
    claimTicket,
    assignTicket,
    itTeamMembers,
    updateTicketMode,
    updateTicketDescription,
    resolveTicket,
    requestValidation,
    confirmClosure,
    reopenTicket,
    copyTicketShareLink,
    setActiveWorkbenchTicketId,
    setActiveView,
    addToast,
  } = useAppStore();

  const ticket = tickets.find((t) => t.id === selectedTicketId);
  const [notesDraft, setNotesDraft] = useState('');
  const [chatDraft, setChatDraft] = useState('');
  const [drawerTab, setDrawerTab] = useState<'CHAT' | 'JOB_LOG'>('CHAT');
  const [isInternalNote, setIsInternalNote] = useState(false);
const [isSavingNotes, setIsSavingNotes] = useState(false);

  useEffect(() => {
    if (!ticket) return;
    fetchTicketCommentsApi(ticket.id);

    const interval = setInterval(() => {
      fetchTicketCommentsApi(ticket.id);
    }, 5000);

    return () => clearInterval(interval);
  }, [ticket?.id]);

  useEffect(() => {
    if (ticket) {
      setNotesDraft(ticket.description);
    }
  }, [ticket]);

  if (!ticket) return null;

  const messages = ticket.messages ?? [];
  const techSenderName = ticket.workedBy ?? currentUser?.name ?? 'Christian (IT Specialist)';

  const handleSendITMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatDraft.trim()) return;
    const msg = chatDraft.trim();
    setChatDraft('');
    await sendTicketMessageApi(ticket.id, msg, isInternalNote);
  };

  const handleQuickReply = (replyText: string) => {
    sendTicketMessageApi(ticket.id, replyText, isInternalNote);
  };

  const handleSaveJobLog = async () => {
    if (!ticket) return;
    setIsSavingNotes(true);
    updateTicketDescription(ticket.id, notesDraft);
    await updateTicketStatusApi(ticket.id, ticket.status, ticket.mode);
    setIsSavingNotes(false);
  };

  const orgFields = [
    { no: '01', label: 'Company', value: `${ticket.company} (${ticket.companyCode})` },
    { no: '14', label: 'Location Hub', value: `${ticket.location} (${ticket.locationCode})` },
    { no: '03', label: 'Department', value: `${ticket.department} (${ticket.departmentCode})` },
    {
      no: '04',
      label: 'Requestor',
      value: ticket.employeeId
        ? `${ticket.requestor} [${ticket.employeeId}]`
        : ticket.requestor,
    },
  ];

  const issueFields = [
    { no: '05', label: 'Task Category', value: `${ticket.task} (${ticket.taskCode})` },
    {
      no: '02',
      label: 'Support Mode',
      value:
        ticket.mode === 'SITE'
          ? 'SITE (On-Site Terminal Repair)'
          : 'REM (Remote Support)',
    },
    { no: '13', label: 'Status', value: ticket.status },
    { no: '15', label: 'Worked By', value: ticket.workedBy ?? 'Unassigned (General Pool)' },
    { no: '06', label: 'Description', value: ticket.description },
  ];

  const timeFields = [
    { no: '07', label: 'Month', value: ticket.month },
    { no: '08', label: 'Date Started', value: ticket.dateStarted },
    { no: '09', label: 'Time Started', value: ticket.timeStarted },
    { no: '12', label: 'Date Finished', value: ticket.dateFinished ?? '—' },
    { no: '10', label: 'Time Finished', value: ticket.timeFinished ?? '— (Active)' },
    {
      no: '11',
      label: 'Duration (Hours)',
      value:
        ticket.duration !== undefined
          ? `${ticket.duration.toFixed(2)} hrs`
          : '— (Computed on Resolution)',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/25 backdrop-blur-[1px] transition-opacity">
      <div
        className="fixed inset-0"
        onClick={() => setSelectedTicketId(null)}
        aria-hidden="true"
      />
      <aside className="relative z-10 w-full max-w-xl bg-surface h-full shadow-2xl border-l border-line flex flex-col justify-between overflow-hidden">
        {/* Drawer Header */}
        <div className="p-5 border-b border-line bg-canvas/60 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-sm font-bold px-2.5 py-0.5 rounded-lg bg-zinc-900 text-white">
                  {ticket.ticketCode}
                </span>
                <StatusBadge status={ticket.status} />
                {ticket.intakeSource && (
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-zinc-100 text-ink-subtle border border-line">
                    {ticket.intakeSource}
                  </span>
                )}
              </div>
              <h2 className="text-base font-semibold text-ink mt-2">{ticket.task}</h2>
              <p className="text-xs text-ink-subtle mt-0.5 flex items-center gap-3">
                <span className="inline-flex items-center gap-1 font-medium text-ink">
                  Requestor: {ticket.requestor}
                </span>
                <span>•</span>
                <span className="inline-flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" /> {ticket.location}
                </span>
                <span>•</span>
                <span className="inline-flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5" /> {ticket.department}
                </span>
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  if (ticket.status === 'OPEN') {
                    claimTicket(ticket.id, currentUser?.name, currentUser?.id);
                  }
                  setActiveWorkbenchTicketId(ticket.id);
                  setSelectedTicketId(null);
                  setActiveView('workbench');
                  addToast('Opened in Workbench', `Switched to ${ticket.ticketCode} workbench`, 'success');
                }}
                className="px-2.5 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-95 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition-all press-fx"
                title="Open this ticket in Active Workbench"
              >
                <Wrench className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Active Workbench</span>
              </button>
              <button
                type="button"
                onClick={() => copyTicketShareLink(ticket.ticketCode)}
                className="p-1.5 rounded-xl bg-surface border border-line text-ink-subtle hover:text-ink transition-colors press-fx"
                title="Copy employee confirmation link for chat"
                aria-label="Copy employee confirmation link"
              >
                <Copy className="w-4 h-4 text-orange-500" />
              </button>
              <button
                onClick={() => setSelectedTicketId(null)}
                className="p-1.5 rounded-xl bg-surface border border-line text-ink-subtle hover:text-ink transition-colors press-fx"
                aria-label="Close drawer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Validation Request Banner when Resolved */}
          {(ticket.status === 'RESL' || ticket.validationRequested) && (
            <div className="p-3 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-between gap-2 text-xs">
              <div className="min-w-0">
                <span className="font-bold text-ink block truncate">
                  Validation Requested: Awaiting {ticket.requestor} ({ticket.employeeId}) Sign-Off
                </span>
                <span className="text-[11px] text-zinc-500">
                  Employee must validate repair via confirmation screen.
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => copyTicketShareLink(ticket.ticketCode)}
                  className="px-2.5 py-1 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-[11px] font-bold press-fx"
                >
                  Copy Link
                </button>
                <button
                  type="button"
                  onClick={() => requestValidation(ticket.id)}
                  className="px-2.5 py-1 rounded-lg bg-white border border-orange-300 text-orange-800 hover:bg-orange-100 text-[11px] font-bold press-fx"
                >
                  Remind
                </button>
              </div>
            </div>
          )}

          {/* Drawer View Switcher: Live Chat vs 15-Column Job Log */}
          <div className="grid grid-cols-2 gap-1.5 bg-surface p-1 rounded-xl border border-line">
            <button
              type="button"
              onClick={() => setDrawerTab('CHAT')}
              className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all press-fx ${
                drawerTab === 'CHAT'
                  ? 'bg-[#111315] text-white shadow-sm'
                  : 'text-ink-subtle hover:text-ink'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5 text-[#F97316]" />
              <span>Live Chat with Employee</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  drawerTab === 'CHAT'
                    ? 'bg-[#F97316] text-white'
                    : 'bg-zinc-100 text-ink'
                }`}
              >
                {messages.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setDrawerTab('JOB_LOG')}
              className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all press-fx ${
                drawerTab === 'JOB_LOG'
                  ? 'bg-[#111315] text-white shadow-sm'
                  : 'text-ink-subtle hover:text-ink'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
              <span>15-Column Job Log &amp; Controls</span>
            </button>
          </div>
        </div>

        {/* Drawer Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {/* Closure Verification Loop Banner (When status is RESL) */}
          {ticket.status === 'RESL' && (
            <div className="bg-peach/60 border border-orange-300/80 rounded-2xl p-4 space-y-3">
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="w-5 h-5 text-peach-text shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-peach-text">
                    Pending Employee Closure Verification
                  </h3>
                  <p className="text-xs text-peach-text/90 mt-1 leading-relaxed">
                    Technician <strong>{ticket.workedBy}</strong> marked this repair resolved in{' '}
                    <strong>{ticket.duration ?? 0.65} hrs</strong>. Confirm terminal resolution or
                    reopen if the issue persists.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => confirmClosure(ticket.id)}
                  className="flex-1 py-2 px-3 bg-brand hover:bg-brand-hover text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-colors press-fx"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Confirm Closure Sign-Off
                </button>
                <button
                  onClick={() => reopenTicket(ticket.id)}
                  className="py-2 px-3 bg-surface hover:bg-zinc-50 text-peach-text border border-orange-300 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors press-fx"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reopen Ticket
                </button>
              </div>
            </div>
          )}

          {/* TAB 1: TWO-WAY LIVE CHAT WITH EMPLOYEE */}
          {drawerTab === 'CHAT' ? (
            <div className="space-y-4 flex flex-col h-full">
              {/* Quick Ticket Context Bar */}
              <div className="bg-canvas border border-line rounded-2xl p-3.5 flex items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-ink-faint block">
                    Reported Symptom
                  </span>
                  <p className="text-xs font-medium text-ink mt-0.5">{ticket.description}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-ink-faint block">
                    Claimed By
                  </span>
                  <span className="text-xs font-bold text-ink">
                    {ticket.workedBy ?? 'Unassigned'}
                  </span>
                </div>
              </div>

              {/* Chat Message Feed */}
              <div className="bg-canvas border border-line rounded-2xl p-4 space-y-3 min-h-[260px] max-h-[340px] overflow-y-auto">
                {messages.length === 0 ? (
                  <div className="py-12 text-center space-y-2">
                    <MessageSquare className="w-7 h-7 text-ink-faint mx-auto" />
                    <p className="text-xs font-semibold text-ink">
                      No messages with {ticket.requestor} yet
                    </p>
                    <p className="text-[11px] text-ink-subtle max-w-xs mx-auto">
                      Send a quick question or update below. The employee will see your message
                      immediately in their &ldquo;My Tickets&rdquo; view.
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isIT = msg.senderRole === 'it';
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isIT ? 'items-end' : 'items-start'}`}
                      >
                        <div className="flex items-center gap-1.5 mb-1 px-1">
                          <span className="text-[10px] font-bold text-ink-subtle">
                            {msg.senderName}
                          </span>
                          <span
                            className={`text-[9px] font-semibold px-1.5 py-0.2 rounded ${
                              isIT
                                ? 'bg-orange-50 text-[#F97316]'
                                : 'bg-emerald-50 text-emerald-700'
                            }`}
                          >
                            {isIT ? 'IT Support' : 'Employee'}
                          </span>
                          <span className="text-[10px] font-mono text-ink-faint">
                            {msg.timestamp}
                          </span>
                        </div>
                        <div
                          className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${
                            isIT
                              ? 'bg-[#111315] text-white rounded-br-xs shadow-xs'
                              : 'bg-surface border border-line text-ink rounded-bl-xs shadow-xs'
                          }`}
                        >
                          {msg.message}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Quick-Reply Templates for Technician Speed */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-ink-subtle">
                  One-Click Quick Replies
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {IT_QUICK_REPLIES.map((reply) => (
                    <button
                      key={reply}
                      type="button"
                      onClick={() => handleQuickReply(reply)}
                      className="text-left text-[11px] px-2.5 py-1.5 rounded-xl bg-canvas hover:bg-zinc-100 text-ink border border-line transition-colors press-fx"
                    >
                      + {reply}
                    </button>
                  ))}
                </div>
              </div>

          {/* Message Composer */}
              {/* Message Composer with Internal Note Toggle */}
              <form onSubmit={handleSendITMessage} className="space-y-2 pt-1">
                <div className="flex items-center justify-between px-1">
                  <button
                    type="button"
                    onClick={() => setIsInternalNote(!isInternalNote)}
                    className={`text-[11px] font-semibold inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-colors ${
                      isInternalNote
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-600'
                        : 'bg-zinc-100 border-zinc-200 text-zinc-500 hover:text-zinc-700'
                    }`}
                  >
                    <Lock className="w-3 h-3" />
                    <span>{isInternalNote ? 'Internal IT Note (Hidden from Employee)' : 'Message Employee'}</span>
                  </button>
                  <span className="text-[10px] text-zinc-400">
                    {isInternalNote ? 'Private to IT Specialists' : 'Employee sees in My Tickets'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={chatDraft}
                    onChange={(e) => setChatDraft(e.target.value)}
                    placeholder={
                      isInternalNote
                        ? 'Type private internal note for IT team...'
                        : `Message ${ticket.requestor} as ${techSenderName}...`
                    }
                    className={`flex-1 px-3.5 py-2.5 bg-canvas border rounded-xl text-xs text-ink focus:outline-none ${
                      isInternalNote
                        ? 'border-amber-400 focus:border-amber-500 bg-amber-50/20'
                        : 'border-line focus:border-zinc-900'
                    }`}
                  />
                  <button
                    type="submit"
                    disabled={!chatDraft.trim()}
                    className={`px-4 py-2.5 disabled:opacity-40 text-white text-xs font-semibold rounded-xl inline-flex items-center gap-1.5
transition-colors press-fx shrink-0 shadow-xs ${
                      isInternalNote
                        ? 'bg-amber-600 hover:bg-amber-700'
                        : 'bg-[#F97316] hover:bg-orange-600'
                    }`}
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send</span>
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* TAB 2: 15-COLUMN JOB LOG & WORK CONTROLS */
            <div className="space-y-4">
              {/* Technician Quick Controls: Support Mode & Repair Notes */}
              <div className="bg-canvas border border-line rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-ink">
                    Technician Work Controls
                  </span>
                  <div className="inline-flex items-center bg-surface p-0.5 rounded-xl border border-line">
                    {(['REM', 'SITE'] as SupportMode[]).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => updateTicketMode(ticket.id, m)}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all press-fx ${
                          ticket.mode === m
                            ? 'bg-zinc-900 text-white shadow-sm'
                            : 'text-ink-subtle hover:text-ink'
                        }`}
                      >
                        {m === 'REM' ? 'Remote (REM)' : 'On-Site (SITE)'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-medium text-ink-subtle">
                    Symptom &amp; Repair Notes (Job Log Column #06)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={notesDraft}
                      onChange={(e) => setNotesDraft(e.target.value)}
                      className="flex-1 px-3 py-1.5 bg-surface border border-line rounded-xl text-xs text-ink focus:outline-none focus:border-zinc-
500"
                    />
                    <button
                      type="button"
                      disabled={isSavingNotes}
                      onClick={handleSaveJobLog}
                      className="px-3 py-1.5 rounded-xl bg-surface hover:bg-zinc-100 text-ink border border-line text-xs font-semibold inline-flex
items-center gap-1 transition-colors press-fx"
                    >
                      <Save className="w-3.5 h-3.5 text-ink-subtle" />
                      <span>{isSavingNotes ? 'Saving...' : 'Save Job Log'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Grouped 15-Column Job Log Record */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-ink-subtle">
                    15-Column Job Log Record
                  </span>
                  <span className="text-[11px] font-mono text-ink-faint">
                    Standardized Format
                  </span>
                </div>

                {/* Group 1: Organization & Requestor */}
                <div className="bg-canvas border border-line rounded-2xl divide-y divide-line overflow-hidden">
                  <div className="px-3.5 py-2 bg-zinc-100/70 text-[11px] font-bold text-ink-subtle uppercase tracking-wider">
                    1. Terminal &amp; Requestor Info
                  </div>
                  {orgFields.map((f) => (
                    <div
                      key={f.no}
                      className="px-3.5 py-2 flex items-center justify-between gap-4 text-xs"
                    >
                      <span className="text-ink-subtle font-medium">
                        <span className="font-mono text-[10px] text-ink-faint mr-1.5">
                          #{f.no}
                        </span>
                        {f.label}
                      </span>
                      <span className="font-semibold text-ink text-right">{f.value}</span>
                    </div>
                  ))}
                </div>

                {/* Group 2: Issue & Assignment */}
                <div className="bg-canvas border border-line rounded-2xl divide-y divide-line overflow-hidden">
                  <div className="px-3.5 py-2 bg-zinc-100/70 text-[11px] font-bold text-ink-subtle uppercase tracking-wider">
                    2. Task, Mode &amp; Assignment
                  </div>
                  {issueFields.map((f) => (
                    <div
                      key={f.no}
                      className="px-3.5 py-2 flex items-center justify-between gap-4 text-xs"
                    >
                      <span className="text-ink-subtle font-medium shrink-0">
                        <span className="font-mono text-[10px] text-ink-faint mr-1.5">
                          #{f.no}
                        </span>
                        {f.label}
                      </span>
                      {f.no === '05' ? (
                        <div className="w-60">
                          <DiagnosedTaskSelector
                            ticketId={ticket.id}
                            currentTaskCode={ticket.taskCode}
                            currentTaskName={ticket.task}
                            compact
                          />
                        </div>
                      ) : f.no === '15' && currentUser?.role === 'admin' ? (
                        <select
                          value={ticket.workedById ?? ''}
                          onChange={(e) => {
                            const tech = itTeamMembers.find((m) => m.id === e.target.value);
                            if (tech) assignTicket(ticket.id, tech.name, tech.id);
                          }}
                          className="px-2.5 py-1 bg-surface border border-line rounded-lg text-xs font-semibold text-ink focus:border-orange-500 focus:outline-none"
                        >
                          <option value="" disabled>Assign Tech...</option>
                          {itTeamMembers.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name} ({m.primaryLocation.split(' ')[0]})
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="font-semibold text-ink text-right max-w-[65%]">
                          {f.value}
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Group 3: Timestamps & Duration */}
                <div className="bg-canvas border border-line rounded-2xl divide-y divide-line overflow-hidden">
                  <div className="px-3.5 py-2 bg-zinc-100/70 text-[11px] font-bold text-ink-subtle uppercase tracking-wider">
                    3. Timestamps &amp; Active Labor Duration
                  </div>
                  {timeFields.map((f) => (
                    <div
                      key={f.no}
                      className="px-3.5 py-2 flex items-center justify-between gap-4 text-xs"
                    >
                      <span className="text-ink-subtle font-medium">
                        <span className="font-mono text-[10px] text-ink-faint mr-1.5">
                          #{f.no}
                        </span>
                        {f.label}
                      </span>
                      <span className="font-mono font-semibold text-ink text-right">
                        {f.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Drawer Footer Controls */}
        <div className="p-4 border-t border-line bg-canvas/50 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-ink-subtle">
            <Clock className="w-4 h-4 text-ink-faint" />
            <span>Priority:</span>
            <span className="font-semibold text-ink">{ticket.priority}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (ticket.status === 'OPEN') {
                  claimTicket(ticket.id, currentUser?.name, currentUser?.id);
                }
                setActiveWorkbenchTicketId(ticket.id);
                setSelectedTicketId(null);
                setActiveView('workbench');
                addToast('Opened in Workbench', `Switched to ${ticket.ticketCode} workbench`, 'success');
              }}
              className="px-3.5 py-2 bg-orange-500 hover:bg-orange-600 active:scale-95 text-white text-xs font-bold rounded-xl inline-flex items-center gap-1.5 transition-all shadow-sm"
            >
              <Wrench className="w-4 h-4" />
              <span>Go to Active Workbench</span>
            </button>
            {ticket.status === 'OPEN' && (
              <button
                onClick={() => claimTicketApi(ticket.id)}
                className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-
colors press-fx"
              >
                <UserCheck className="w-4 h-4 text-emerald-400" />
                <span>Claim Ticket</span>
              </button>
            )}
            {ticket.status === 'PROG' && (
              <button
                onClick={() => resolveTicket(ticket.id)}
                className="px-4 py-2 bg-brand hover:bg-brand-hover text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors press-fx"
              >
                <Wrench className="w-4 h-4" />
                <span>Mark as Resolved</span>
              </button>
            )}
            <button
              onClick={() => setSelectedTicketId(null)}
              className="px-3.5 py-2 bg-surface hover:bg-zinc-100 text-ink-subtle border border-line text-xs font-medium rounded-xl transition-colors press-fx"
            >
              Close
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
};
