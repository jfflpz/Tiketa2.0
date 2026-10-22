// @spec SR-03: Slide-out 15-Column Canonical Job Log Drawer, Repair Controls & Two-Way Employee Chat
import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  RotateCcw,
  Clock,
  ShieldCheck,
  UserCheck,
  Wrench,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { JobLogDrawerHeader } from './drawer/JobLogDrawerHeader';
import { JobLogDrawerChat } from './drawer/JobLogDrawerChat';
import { JobLogDrawerRecordForm } from './drawer/JobLogDrawerRecordForm';

export const JobLogDrawer: React.FC = () => {
  const tickets = useAppStore((state) => state.tickets);
  const selectedTicketId = useAppStore((state) => state.selectedTicketId);
  const setSelectedTicketId = useAppStore((state) => state.setSelectedTicketId);
  const currentUser = useAppStore((state) => state.currentUser);
  const claimTicketApi = useAppStore((state) => state.claimTicketApi);
  const updateTicketStatusApi = useAppStore((state) => state.updateTicketStatusApi);
  const fetchTicketCommentsApi = useAppStore((state) => state.fetchTicketCommentsApi);
  const sendTicketMessageApi = useAppStore((state) => state.sendTicketMessageApi);
  const claimTicket = useAppStore((state) => state.claimTicket);
  const assignTicket = useAppStore((state) => state.assignTicket);
  const itTeamMembers = useAppStore((state) => state.itTeamMembers);
  const updateTicketMode = useAppStore((state) => state.updateTicketMode);
  const updateTicketDescription = useAppStore((state) => state.updateTicketDescription);
  const resolveTicket = useAppStore((state) => state.resolveTicket);
  const requestValidation = useAppStore((state) => state.requestValidation);
  const confirmClosure = useAppStore((state) => state.confirmClosure);
  const reopenTicket = useAppStore((state) => state.reopenTicket);
  const copyTicketShareLink = useAppStore((state) => state.copyTicketShareLink);
  const setActiveWorkbenchTicketId = useAppStore((state) => state.setActiveWorkbenchTicketId);
  const setActiveView = useAppStore((state) => state.setActiveView);
  const addToast = useAppStore((state) => state.addToast);

  const ticket = tickets.find((t) => t.id === selectedTicketId);
  const [notesDraft, setNotesDraft] = useState('');
  const [drawerTab, setDrawerTab] = useState<'CHAT' | 'JOB_LOG'>('CHAT');
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  useEffect(() => {
    if (!ticket) return;
    fetchTicketCommentsApi(ticket.id);

    const interval = setInterval(() => {
      fetchTicketCommentsApi(ticket.id);
    }, 5000);

    return () => clearInterval(interval);
  }, [ticket?.id, fetchTicketCommentsApi]);

  useEffect(() => {
    if (ticket) {
      setNotesDraft(ticket.description);
    }
  }, [ticket]);

  if (!ticket) return null;

  const messages = ticket.messages ?? [];
  const techSenderName = ticket.workedBy ?? currentUser?.name ?? 'Christian (IT Specialist)';
  const isAdmin = currentUser?.role === 'admin';

  const handleOpenWorkbench = () => {
    if (ticket.status === 'OPEN') {
      claimTicket(ticket.id, currentUser?.name, currentUser?.id);
    }
    setActiveWorkbenchTicketId(ticket.id);
    setSelectedTicketId(null);
    setActiveView('workbench');
    addToast('Opened in Workbench', `Switched to ${ticket.ticketCode} workbench`, 'success');
  };

  const handleSaveJobLog = async () => {
    setIsSavingNotes(true);
    updateTicketDescription(ticket.id, notesDraft);
    await updateTicketStatusApi(ticket.id, ticket.status, ticket.mode);
    setIsSavingNotes(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/25 backdrop-blur-[1px] transition-opacity">
      <div
        className="fixed inset-0"
        onClick={() => setSelectedTicketId(null)}
        aria-hidden="true"
      />
      <aside className="relative z-10 w-full max-w-xl bg-surface h-full shadow-2xl border-l border-line flex flex-col justify-between overflow-hidden">
        {/* Drawer Header */}
        <JobLogDrawerHeader
          ticket={ticket}
          drawerTab={drawerTab}
          messageCount={messages.length}
          onSelectTab={setDrawerTab}
          onOpenWorkbench={handleOpenWorkbench}
          onCopyShareLink={() => copyTicketShareLink(ticket.ticketCode)}
          onRequestValidation={() => requestValidation(ticket.id)}
          onClose={() => setSelectedTicketId(null)}
        />

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
            <JobLogDrawerChat
              ticket={ticket}
              techSenderName={techSenderName}
              onSendMessage={(msg, isInternal) =>
                sendTicketMessageApi(ticket.id, msg, isInternal)
              }
            />
          ) : (
            /* TAB 2: 15-COLUMN JOB LOG & WORK CONTROLS */
            <JobLogDrawerRecordForm
              ticket={ticket}
              notesDraft={notesDraft}
              onNotesDraftChange={setNotesDraft}
              isSavingNotes={isSavingNotes}
              onSaveJobLog={handleSaveJobLog}
              onUpdateMode={(mode) => updateTicketMode(ticket.id, mode)}
              isAdmin={isAdmin}
              itTeamMembers={itTeamMembers}
              onAssignTicket={assignTicket}
            />
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
              onClick={handleOpenWorkbench}
              className="px-3.5 py-2 bg-orange-500 hover:bg-orange-600 active:scale-95 text-white text-xs font-bold rounded-xl inline-flex items-center gap-1.5 transition-all shadow-sm"
            >
              <Wrench className="w-4 h-4" />
              <span>Go to Active Workbench</span>
            </button>
            {ticket.status === 'OPEN' && (
              <button
                onClick={() => claimTicketApi(ticket.id)}
                className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors press-fx"
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
