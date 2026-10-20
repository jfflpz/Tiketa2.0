// @spec FR-QUEUE-02 & FR-TICK-03: Hands-On Technician Kanban Board, Balanced Header, Top Full-Width Live Chat & Editable Checklist
import React, { useState, useEffect } from 'react';
import {
  Wrench,
  CheckCircle2,
  UserCheck,
  Clock,
  MapPin,
  Save,
  RotateCcw,
  CheckSquare,
  Square,
  Sparkles,
  Plus,
  Trash2,
  Edit3,
  Check,
  MessageSquare,
  Send,
  BookmarkPlus,
  BookOpen,
  Tag,
  ArrowUpRight,
  User,
  Copy,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { SupportMode } from '../../types/ticket';
import { StatusBadge } from '../../components/common/StatusBadge';

const WORKBENCH_QUICK_REPLIES = [
  'Please share your AnyDesk ID so I can check remotely.',
  'I am heading to your terminal booth now.',
  'Please restart the application and check if the error is gone.',
  'Please test the printer/PC now and click Confirm Closure if fixed.',
];

export const ITWorkbenchBoardView: React.FC = () => {
  const {
    currentUser,
    tickets,
    claimTicket,
    updateTicketMode,
    updateTicketDescription,
    resolveTicket,
    requestValidation,
    confirmClosure,
    reopenTicket,
    setSelectedTicketId,
    setActiveView,
    copyTicketShareLink,
    sendTicketMessage,
    getTicketChecklist,
    toggleTicketChecklistStep,
    addTicketChecklistStep,
    removeTicketChecklistStep,
    editTicketChecklistStep,
    saveRepairNoteAndChecklist,
  } = useAppStore();

  const openTickets = tickets.filter((t) => t.status === 'OPEN');
  const progTickets = tickets.filter((t) => t.status === 'PROG');
  const reslTickets = tickets.filter((t) => t.status === 'RESL');

  const [focusedId, setFocusedId] = useState<string | null>(
    progTickets[0]?.id ?? null
  );
  const focusedTicket =
    progTickets.find((t) => t.id === focusedId) ?? progTickets[0] ?? null;

  const [notesDraft, setNotesDraft] = useState('');
  const [noteTitleDraft, setNoteTitleDraft] = useState('');
  const [newStepText, setNewStepText] = useState('');
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [editingStepText, setEditingStepText] = useState('');
  const [chatDraft, setChatDraft] = useState('');

  useEffect(() => {
    if (focusedTicket) {
      setNotesDraft(focusedTicket.description);
      setNoteTitleDraft(
        `${focusedTicket.task} Fix (${focusedTicket.location})`
      );
    }
  }, [focusedTicket]);

  const currentChecklist = focusedTicket
    ? getTicketChecklist(focusedTicket.id)
    : [];
  const completedStepsCount = currentChecklist.filter((s) => s.completed).length;
  const messages = focusedTicket?.messages ?? [];
  const techSenderName =
    focusedTicket?.workedBy ??
    currentUser?.name ??
    'Nathaniel D. Esguerra';

  const handleAddStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!focusedTicket || !newStepText.trim()) return;
    addTicketChecklistStep(focusedTicket.id, newStepText);
    setNewStepText('');
  };

  const handleSaveEditStep = (stepId: string) => {
    if (!focusedTicket || !editingStepText.trim()) return;
    editTicketChecklistStep(focusedTicket.id, stepId, editingStepText);
    setEditingStepId(null);
    setEditingStepText('');
  };

  const handleSendWorkbenchChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!focusedTicket || !chatDraft.trim()) return;
    sendTicketMessage(focusedTicket.id, 'it', techSenderName, chatDraft);
    setChatDraft('');
  };

  const handleSaveToLibrary = () => {
    if (!focusedTicket) return;
    updateTicketDescription(focusedTicket.id, notesDraft);
    saveRepairNoteAndChecklist({
      title:
        noteTitleDraft.trim() ||
        `${focusedTicket.task} SOP (${focusedTicket.ticketCode})`,
      taskCode: focusedTicket.taskCode,
      taskName: focusedTicket.task,
      symptomAndFixNote:
        notesDraft.trim() || focusedTicket.description,
      checklistSteps: currentChecklist.map((s) => s.text),
      author: currentUser?.name ?? 'Nathaniel D. Esguerra',
      sourceTicketCode: focusedTicket.ticketCode,
    });
  };

  return (
    <div className="space-y-5 pb-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink tracking-tight">
            My Active Workbench &amp; Repair Console
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Hands-on repair console for{' '}
            <strong className="text-ink">
              {currentUser?.name ?? 'Nathaniel D. Esguerra'}
            </strong>{' '}
            — chat live with the employee, manage your troubleshooting checklist, and save repair guides.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={() => setActiveView('notes')}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-orange-50 text-ink border border-[#ECEEF2] font-semibold inline-flex items-center gap-1.5 shadow-card transition-colors press-fx"
          >
            <BookOpen className="w-3.5 h-3.5 text-orange-500" />
            <span>Browse Saved Repair Notes</span>
          </button>
        </div>
      </div>

      {/* TOP FOCUS BANNER: Active Repair Console */}
      {focusedTicket ? (
        <div className="bg-white border border-[#ECEEF2] rounded-2xl p-5 shadow-card space-y-5">
          {/* ============================================================
              1. BALANCED FULL-WIDTH CARD HEADER
              - Top Row: Title & Status on Left | Mode Toggle, Resolve & Drawer Arrow Button on Top-Right
              - Bottom 4-Col Strip: Evenly distributed static metadata across the full width (no left crowding or right whitespace)
             ============================================================ */}
          <div className="w-full space-y-3.5 pb-4 border-b border-[#ECEEF2]">
            {/* Header Top Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Left: Icon + Ticket ID + Title */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <Wrench className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-orange-50 text-orange-600 border border-orange-200/60">
                      Active Focus Repair
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

              {/* Top-Right: Mode Switcher + Resolve + Top-Right Arrow Button for Side Drawer */}
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="inline-flex items-center bg-[#F4F6F9] p-1 rounded-xl border border-[#ECEEF2]">
                  {(['REM', 'SITE'] as SupportMode[]).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => updateTicketMode(focusedTicket.id, m)}
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
                  onClick={() => copyTicketShareLink(focusedTicket.ticketCode)}
                  className="px-3 py-2 rounded-xl bg-[#F4F6F9] hover:bg-[#111315] text-ink hover:text-white border border-[#ECEEF2] text-xs font-semibold inline-flex items-center gap-1.5 transition-colors press-fx"
                  title="Copy employee confirmation link to send via Viber/Chat"
                >
                  <Copy className="w-3.5 h-3.5 text-orange-500" />
                  <span>Copy Link</span>
                </button>

                <button
                  onClick={() => resolveTicket(focusedTicket.id)}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition-colors press-fx"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Mark Repair Resolved</span>
                </button>

                {/* Top-Right Arrow Button to Open Slide-Out Side Drawer */}
                <button
                  type="button"
                  onClick={() => setSelectedTicketId(focusedTicket.id)}
                  className="w-9 h-9 rounded-xl bg-[#F4F6F9] hover:bg-[#111315] text-ink hover:text-white border border-[#ECEEF2] flex items-center justify-center transition-colors press-fx"
                  title="Open 15-Column Job Log Side Drawer"
                  aria-label="Open 15-Column Job Log Side Drawer"
                >
                  <ArrowUpRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Validation Request Tracking Banner (Shown when ticket is resolved or awaiting confirmation) */}
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
                    onClick={() => copyTicketShareLink(focusedTicket.ticketCode)}
                    className="px-3 py-1.5 rounded-lg bg-white hover:bg-orange-100 text-orange-700 border border-orange-200 text-xs font-bold inline-flex items-center gap-1.5 shadow-2xs transition-colors press-fx"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Validation Link</span>
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

            {/* Header Bottom 4-Column Balanced Metadata Strip (Eliminates right-side whitespace) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
              {/* Static Problem Category */}
              <div className="px-3.5 py-2 rounded-xl bg-[#F4F6F9] border border-[#ECEEF2] flex items-center gap-2.5">
                <Tag className="w-4 h-4 text-orange-500 shrink-0" />
                <div className="min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                    Problem Category (Static)
                  </span>
                  <span className="text-xs font-bold text-ink truncate block select-none">
                    {focusedTicket.task} ({focusedTicket.taskCode})
                  </span>
                </div>
              </div>

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
                    {focusedTicket.requestor}
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

          {/* ============================================================
              2. TOP FULL-WIDTH LIVE CHAT WITH EMPLOYEE (Above Checklist & Repair Notes!)
             ============================================================ */}
          <div className="w-full bg-[#F4F6F9] border border-[#ECEEF2] rounded-2xl p-4 space-y-3">
            {/* Full-Width Chat Header */}
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
                    sendTicketMessage(
                      focusedTicket.id,
                      'it',
                      techSenderName,
                      preset
                    )
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

          {/* ============================================================
              3. BOTTOM 2-COLUMN ROW: Editable Troubleshooting Checklist + Repair Notes (#06)
             ============================================================ */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Left (1/2 width): Editable Troubleshooting Checklist */}
            <div className="bg-[#F4F6F9] border border-[#ECEEF2] rounded-xl p-4 flex flex-col justify-between space-y-3">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-ink">
                    Editable Troubleshooting Checklist
                  </span>
                  <span className="text-[11px] font-mono font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200/60">
                    {completedStepsCount}/{currentChecklist.length} Completed
                  </span>
                </div>

                {/* Checklist Steps List with Inline Edit & Delete */}
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {currentChecklist.length === 0 ? (
                    <p className="text-xs text-zinc-400 italic py-4 text-center">
                      No checklist steps yet. Add a step below.
                    </p>
                  ) : (
                    currentChecklist.map((step) => {
                      const isEditing = editingStepId === step.id;
                      return (
                        <div
                          key={step.id}
                          className="group flex items-center justify-between gap-2 bg-white border border-[#ECEEF2] rounded-lg px-2.5 py-2 text-xs"
                        >
                          {isEditing ? (
                            <div className="flex items-center gap-1.5 flex-1">
                              <input
                                type="text"
                                value={editingStepText}
                                onChange={(e) => setEditingStepText(e.target.value)}
                                className="flex-1 px-2 py-1 rounded border border-orange-400 text-xs text-ink focus:outline-none"
                                autoFocus
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveEditStep(step.id)}
                                className="p-1 rounded bg-emerald-600 text-white hover:bg-emerald-700"
                                title="Save Step"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  toggleTicketChecklistStep(focusedTicket.id, step.id)
                                }
                                className="flex items-start gap-2 text-left flex-1 min-w-0"
                              >
                                {step.completed ? (
                                  <CheckSquare className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                                ) : (
                                  <Square className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
                                )}
                                <span
                                  className={`leading-snug ${
                                    step.completed
                                      ? 'line-through text-zinc-400 font-medium'
                                      : 'text-ink font-medium'
                                  }`}
                                >
                                  {step.text}
                                </span>
                              </button>

                              {/* Edit & Remove Step Controls */}
                              <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingStepId(step.id);
                                    setEditingStepText(step.text);
                                  }}
                                  className="p-1 rounded hover:bg-zinc-100 text-zinc-400 hover:text-ink transition-colors"
                                  title="Edit Checklist Step"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    removeTicketChecklistStep(focusedTicket.id, step.id)
                                  }
                                  className="p-1 rounded hover:bg-rose-50 text-zinc-400 hover:text-rose-600 transition-colors"
                                  title="Remove Checklist Step"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Add New Checklist Step Form */}
              <form onSubmit={handleAddStep} className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  value={newStepText}
                  onChange={(e) => setNewStepText(e.target.value)}
                  placeholder="Add new troubleshooting step..."
                  className="flex-1 px-3 py-2 bg-white border border-[#ECEEF2] rounded-lg text-xs text-ink placeholder:text-zinc-400 focus:outline-none focus:border-orange-400"
                />
                <button
                  type="submit"
                  disabled={!newStepText.trim()}
                  className="px-3 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white text-xs font-bold inline-flex items-center gap-1 transition-colors press-fx shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Step</span>
                </button>
              </form>
            </div>

            {/* Right (1/2 width): Repair Notes (#06 Description) + Save to Library */}
            <div className="bg-[#F4F6F9] border border-[#ECEEF2] rounded-xl p-4 flex flex-col justify-between space-y-3">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-ink">
                    Repair Notes &amp; Guide Saver (#06)
                  </span>
                  <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-white border border-[#ECEEF2] text-zinc-600 select-none">
                    {focusedTicket.taskCode}
                  </span>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                    Guide Title (For Saving to Saved Repair Notes)
                  </label>
                  <input
                    type="text"
                    value={noteTitleDraft}
                    onChange={(e) => setNoteTitleDraft(e.target.value)}
                    placeholder="e.g. Thermal Printer Cutter Jam Fix"
                    className="w-full px-3 py-2 bg-white border border-[#ECEEF2] rounded-lg text-xs font-semibold text-ink focus:outline-none focus:border-orange-400"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                    Symptom &amp; Resolution Summary (#06 Description)
                  </label>
                  <textarea
                    rows={4}
                    value={notesDraft}
                    onChange={(e) => setNotesDraft(e.target.value)}
                    className="w-full p-2.5 bg-white border border-[#ECEEF2] rounded-xl text-xs text-ink focus:outline-none focus:border-orange-400"
                    placeholder="Document root cause, parts replaced, or AnyDesk session action..."
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  onClick={() =>
                    updateTicketDescription(focusedTicket.id, notesDraft)
                  }
                  className="px-3.5 py-2 rounded-lg bg-white hover:bg-zinc-100 text-ink border border-zinc-200 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors press-fx"
                >
                  <Save className="w-3.5 h-3.5 text-zinc-600" />
                  <span>Update Ticket #06</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveToLibrary}
                  className="px-3.5 py-2 rounded-lg bg-[#111315] hover:bg-zinc-800 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors press-fx"
                  title="Save both the repair note and troubleshooting checklist to Saved Repair Notes"
                >
                  <BookmarkPlus className="w-3.5 h-3.5 text-orange-400" />
                  <span>Save Note &amp; Checklist to Library</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-[#ECEEF2] rounded-2xl p-6 text-center space-y-2 shadow-card">
          <Sparkles className="w-6 h-6 text-orange-500 mx-auto" />
          <h2 className="text-sm font-bold text-ink">
            No Active Ticket in Your Bench Right Now
          </h2>
          <p className="text-xs text-zinc-500">
            Claim any unassigned ticket from Column 1 below to start an active repair session.
          </p>
        </div>
      )}

      {/* 3-COLUMN TECHNICIAN KANBAN BOARD */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* COLUMN 1: READY TO CLAIM (OPEN) */}
        <div className="bg-white border border-[#ECEEF2] rounded-2xl p-4 shadow-card flex flex-col space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#ECEEF2]">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-zinc-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-ink">
                1. Unassigned Pool (OPEN)
              </h3>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-zinc-100 text-ink text-xs font-bold tabular-nums">
              {openTickets.length}
            </span>
          </div>

          <div className="space-y-3">
            {openTickets.map((t) => (
              <div
                key={t.id}
                onClick={() => setSelectedTicketId(t.id)}
                className="p-3.5 rounded-xl bg-[#F4F6F9] hover:bg-orange-50/40 border border-[#ECEEF2] space-y-2.5 cursor-pointer transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-ink">
                    {t.ticketCode}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      t.priority === 'Critical'
                        ? 'bg-rose-100 text-rose-700'
                        : t.priority === 'High'
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-zinc-200 text-zinc-700'
                    }`}
                  >
                    {t.priority}
                  </span>
                </div>

                <div>
                  <p className="text-xs font-bold text-ink">{t.task}</p>
                  <p className="text-[11px] text-zinc-500 line-clamp-2 mt-0.5">
                    {t.description}
                  </p>
                </div>

                <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-1 border-t border-zinc-200/70">
                  <span>
                    <strong className="text-ink">{t.location}</strong> • {t.requestor}
                  </span>
                  <span className="inline-flex items-center gap-1 text-orange-600 font-semibold">
                    <MessageSquare className="w-3 h-3" />
                    {t.messages?.length ?? 0}
                  </span>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    claimTicket(t.id);
                    setFocusedId(t.id);
                  }}
                  className="w-full py-2 px-3 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-colors press-fx"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Claim to My Workbench</span>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* COLUMN 2: MY IN-PROGRESS REPAIRS (PROG) */}
        <div className="bg-white border border-[#ECEEF2] rounded-2xl p-4 shadow-card flex flex-col space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#ECEEF2]">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-ink">
                2. Active Repairs (PROG)
              </h3>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-xs font-bold tabular-nums">
              {progTickets.length}
            </span>
          </div>

          <div className="space-y-3">
            {progTickets.map((t) => {
              const isFocused = focusedTicket?.id === t.id;
              return (
                <div
                  key={t.id}
                  onClick={() => setFocusedId(t.id)}
                  className={`p-3.5 rounded-xl border space-y-2.5 cursor-pointer transition-all ${
                    isFocused
                      ? 'bg-orange-50/60 border-orange-400 ring-1 ring-orange-400/30'
                      : 'bg-[#F4F6F9] border-[#ECEEF2] hover:border-orange-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs font-bold text-ink">
                        {t.ticketCode}
                      </span>
                      {isFocused && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-orange-500 text-white">
                          Focused Above
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-white border border-zinc-200 text-zinc-700">
                      {t.mode === 'SITE' ? 'On-Site' : 'Remote'}
                    </span>
                  </div>

                  <div>
                    <p className="text-xs font-bold text-ink">{t.task}</p>
                    <p className="text-[11px] text-zinc-500 line-clamp-2 mt-0.5">
                      {t.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-1 border-t border-zinc-200/70">
                    <span>
                      <strong className="text-ink">{t.location}</strong> • {t.department}
                    </span>
                    <span className="text-orange-600 font-semibold">
                      {t.workedBy ?? 'Assigned'}
                    </span>
                  </div>

                  <div
                    className="grid grid-cols-2 gap-2 pt-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => setFocusedId(t.id)}
                      className="py-1.5 px-2.5 rounded-lg bg-white hover:bg-zinc-100 text-ink border border-zinc-200 text-xs font-semibold transition-colors press-fx"
                    >
                      Focus &amp; Chat ({t.messages?.length ?? 0})
                    </button>
                    <button
                      onClick={() => resolveTicket(t.id)}
                      className="py-1.5 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center justify-center gap-1 shadow-sm transition-colors press-fx"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Resolve</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* COLUMN 3: AWAITING USER SIGN-OFF (RESL) */}
        <div className="bg-white border border-[#ECEEF2] rounded-2xl p-4 shadow-card flex flex-col space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#ECEEF2]">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-ink">
                3. Pending Sign-Off (RESL)
              </h3>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-bold tabular-nums">
              {reslTickets.length}
            </span>
          </div>

          <div className="space-y-3">
            {reslTickets.map((t) => (
              <div
                key={t.id}
                onClick={() => setSelectedTicketId(t.id)}
                className="p-3.5 rounded-xl bg-amber-50/40 border border-amber-200/80 space-y-2.5 cursor-pointer transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-ink">
                    {t.ticketCode}
                  </span>
                  <span className="text-[10px] font-mono font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                    {t.duration ?? 0.65} hrs logged
                  </span>
                </div>

                <div>
                  <p className="text-xs font-bold text-ink">{t.task}</p>
                  <p className="text-[11px] text-zinc-600 line-clamp-2 mt-0.5">
                    {t.description}
                  </p>
                </div>

                <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-1 border-t border-amber-200/60">
                  <span>
                    <strong className="text-ink">{t.location}</strong> • {t.requestor}
                  </span>
                  <span>Awaiting Verify</span>
                </div>

                <div
                  className="grid grid-cols-2 gap-2 pt-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => reopenTicket(t.id)}
                    className="py-1.5 px-2.5 rounded-lg bg-white hover:bg-zinc-100 text-amber-900 border border-amber-300 text-xs font-semibold inline-flex items-center justify-center gap-1 transition-colors press-fx"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reopen</span>
                  </button>
                  <button
                    onClick={() => confirmClosure(t.id)}
                    className="py-1.5 px-2.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold inline-flex items-center justify-center gap-1 shadow-sm transition-colors press-fx"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Confirm Sign-Off</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
