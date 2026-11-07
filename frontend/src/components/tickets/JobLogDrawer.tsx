// @spec SR-03: Slide-out 15-Column Canonical Job Log Drawer, Repair Controls & Two-Way Employee Chat
// @spec FR-VERIF-02: Closure Verification Modal Gate
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  RotateCcw,
  Clock,
  UserCheck,
  Wrench,
  Copy,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { canEditTicket } from '../../store/slices/ticketOperationsSlice';
import { ticketsApi } from '../../api/client';
import { JobLogDrawerHeader } from './drawer/JobLogDrawerHeader';
import { JobLogDrawerChat } from './drawer/JobLogDrawerChat';
import { JobLogDrawerRecordForm } from './drawer/JobLogDrawerRecordForm';

export const JobLogDrawer: React.FC = () => {
  const tickets = useAppStore((state) => state.tickets);
  const selectedTicketId = useAppStore((state) => state.selectedTicketId);
  const setSelectedTicketId = useAppStore((state) => state.setSelectedTicketId);
  const inspectedTicket = useAppStore((state) => state.inspectedTicket);
  const isInspectingTicket = useAppStore((state) => state.isInspectingTicket);
  const inspectTicketError = useAppStore((state) => state.inspectTicketError);
  const currentUser = useAppStore((state) => state.currentUser);
  const claimTicketApi = useAppStore((state) => state.claimTicketApi);
  const updateTicketStatusApi = useAppStore((state) => state.updateTicketStatusApi);
  const fetchTicketCommentsApi = useAppStore((state) => state.fetchTicketCommentsApi);
  const sendTicketMessageApi = useAppStore((state) => state.sendTicketMessageApi);
  const assignTicket = useAppStore((state) => state.assignTicket);
  const itTeamMembers = useAppStore((state) => state.itTeamMembers);
  const updateTicketMode = useAppStore((state) => state.updateTicketMode);
  const updateTicketDescription = useAppStore((state) => state.updateTicketDescription);
  const resolveTicket = useAppStore((state) => state.resolveTicket);
  const requestValidation = useAppStore((state) => state.requestValidation);
  const reopenTicket = useAppStore((state) => state.reopenTicket);
  const copyTicketShareLink = useAppStore((state) => state.copyTicketShareLink);
  const setActiveWorkbenchTicketId = useAppStore((state) => state.setActiveWorkbenchTicketId);
  const setActiveView = useAppStore((state) => state.setActiveView);
  const addToast = useAppStore((state) => state.addToast);

  const ticket = tickets.find((t) => t.id === selectedTicketId) ?? inspectedTicket;
  const [notesDraft, setNotesDraft] = useState('');
  const [drawerTab, setDrawerTab] = useState<'CHAT' | 'JOB_LOG'>('JOB_LOG');
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  const drawerRef = useRef<HTMLDivElement>(null);
  const triggerElementRef = useRef<HTMLElement | null>(null);

  // Focus capture and restoration lifecycle
  useEffect(() => {
    if (!selectedTicketId) return;
    if (!triggerElementRef.current) {
      triggerElementRef.current = document.activeElement as HTMLElement | null;
    }

    return () => {
      if (triggerElementRef.current && document.body.contains(triggerElementRef.current)) {
        triggerElementRef.current.focus();
      }
      triggerElementRef.current = null;
    };
  }, [selectedTicketId]);

  // Transfer focus appropriately whenever drawer state changes (loading -> loaded, or error)
  useEffect(() => {
    if (!selectedTicketId) return;
    const transferFocus = () => {
      const container = drawerRef.current;
      if (!container) return;
      const focusable = container.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length > 0) {
        focusable[0].focus();
      } else {
        container.focus();
      }
    };
    transferFocus();
  }, [selectedTicketId, isInspectingTicket, Boolean(ticket), Boolean(inspectTicketError)]);

  // Keyboard Escape listener (capture phase: drawer handles first as topmost overlay)
  useEffect(() => {
    if (!selectedTicketId) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setSelectedTicketId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [selectedTicketId, setSelectedTicketId]);

  // Focus containment (Tab trap inside topmost drawer)
  const handleDrawerKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Tab' && drawerRef.current) {
      const focusable = drawerRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
  }, []);

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
      setNotesDraft(ticket.technicianDiagnosis || ticket.description);
      
    }
  }, [ticket?.id]);

  if (!selectedTicketId) return null;

  if (isInspectingTicket && !ticket) {
    return (
      <div className="fixed inset-0 z-[70] flex justify-end bg-black/30 backdrop-blur-[1px] transition-opacity">
        <div
          className="fixed inset-0"
          onClick={() => setSelectedTicketId(null)}
          aria-hidden="true"
        />
        <aside
          ref={drawerRef}
          tabIndex={-1}
          onKeyDown={handleDrawerKeyDown}
          aria-label="Loading Ticket Drawer"
          className="relative z-10 w-full max-w-xl bg-surface h-full shadow-2xl border-l border-line flex flex-col items-center justify-center p-8 space-y-3 focus:outline-none"
        >
          <Clock className="w-8 h-8 animate-spin text-orange-500" />
          <p className="text-sm font-bold text-ink">Loading Ticket Record...</p>
          <p className="text-xs text-zinc-500">Fetching canonical log from server</p>
          <button
            type="button"
            onClick={() => setSelectedTicketId(null)}
            className="mt-4 px-3.5 py-1.5 rounded-xl border border-line text-xs font-semibold text-zinc-600 hover:text-ink hover:bg-zinc-100 transition-colors"
          >
            Cancel Loading
          </button>
        </aside>
      </div>
    );
  }

  if (inspectTicketError && !ticket) {
    return (
      <div className="fixed inset-0 z-[70] flex justify-end bg-black/30 backdrop-blur-[1px] transition-opacity">
        <div
          className="fixed inset-0"
          onClick={() => setSelectedTicketId(null)}
          aria-hidden="true"
        />
        <aside
          ref={drawerRef}
          tabIndex={-1}
          onKeyDown={handleDrawerKeyDown}
          aria-label="Error Loading Ticket Drawer"
          className="relative z-10 w-full max-w-xl bg-surface h-full shadow-2xl border-l border-line flex flex-col items-center justify-center p-8 space-y-3 text-center focus:outline-none"
        >
          <p className="text-sm font-bold text-rose-600">Failed to Load Ticket Record</p>
          <p className="text-xs text-zinc-500 max-w-sm">{inspectTicketError}</p>
          <button
            type="button"
            onClick={() => setSelectedTicketId(null)}
            className="px-4 py-2 bg-zinc-800 text-white rounded-xl text-xs font-bold"
          >
            Close
          </button>
        </aside>
      </div>
    );
  }

  if (!ticket) return null;

  const messages = ticket.messages ?? [];
  const techSenderName = ticket.workedBy ?? currentUser?.name ?? 'Christian (IT Specialist)';
  const isAdmin = currentUser?.role === 'admin';
  const isOwner = canEditTicket(currentUser, ticket);

  const handleOpenWorkbench = () => {
    // Preserve explicit claiming: opening a ticket or workbench must not claim it automatically
    setActiveWorkbenchTicketId(ticket.id);
    setSelectedTicketId(null);
    setActiveView('workbench');
    addToast('Opened in Workbench', `Switched to ${ticket.ticketCode} workbench`, 'success');
  };

  const handleSaveJobLog = async () => {
    if (!isOwner) {
      addToast('Permission Denied', `Ticket is assigned to ${ticket.workedBy || 'another technician'}`, 'warning');
      return;
    }
    setIsSavingNotes(true);
    try {
      await ticketsApi.updateServiceRecord(ticket.id, {
        diagnosis: notesDraft,
      });
      updateTicketDescription(ticket.id, notesDraft);
      addToast('Service Record Saved', 'Diagnosis & resolution saved to database', 'success');
    } catch (err) {
      addToast('Save Failed', err instanceof Error ? err.message : 'Failed to save service record', 'warning');
    } finally {
      setIsSavingNotes(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex justify-end bg-black/25 backdrop-blur-[1px] transition-opacity">
      <div
        className="fixed inset-0"
        onClick={() => setSelectedTicketId(null)}
        aria-hidden="true"
      />
      <aside
        ref={drawerRef}
        onKeyDown={handleDrawerKeyDown}
        className="relative z-10 w-full max-w-xl bg-surface h-full shadow-2xl border-l border-line flex flex-col justify-between overflow-hidden"
      >
        {/* Drawer Header */}
        <JobLogDrawerHeader
          ticket={ticket}
          drawerTab={drawerTab}
          messageCount={messages.length}
          onSelectTab={setDrawerTab}
          onCopyShareLink={() => copyTicketShareLink(ticket.ticketCode, ticket.id)}
          onRequestValidation={() => requestValidation(ticket.id)}
          onClose={() => setSelectedTicketId(null)}
        />

        {/* Drawer Body */}
        <div className="p-5 pb-36 overflow-y-auto flex-1 space-y-4">
          {/* Compact Requester Approval Banner (When status is RESL) */}
          {ticket.status === 'RESL' && (
            <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-3.5 space-y-2.5 animate-fade-in">
              <div className="flex items-center justify-between gap-2">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-300 text-xs font-bold">
                  <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                  <span>Waiting for requester approval</span>
                </div>
                <span className="text-[11px] font-medium text-amber-700">
                  Awaiting {ticket.requestor} sign-off
                </span>
              </div>
              <p className="text-xs text-zinc-600 leading-relaxed">
                Technician <strong>{ticket.workedBy}</strong> marked this repair resolved. Requester validation is pending.
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={async () => {
                    if (ticket.closureUrl) {
                      if (navigator.clipboard?.writeText) {
                        await navigator.clipboard.writeText(ticket.closureUrl);
                      }
                      addToast(
                        'Viber Link Copied',
                        `Viber resolution link copied to clipboard`,
                        'success'
                      );
                    } else {
                      await copyTicketShareLink(ticket.ticketCode, ticket.id);
                    }
                  }}
                  className="py-1.5 px-3 bg-white hover:bg-amber-50 text-amber-800 border border-amber-300 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors press-fx shadow-2xs"
                  title="Copy Viber closure link"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Viber Link</span>
                </button>
                <button
                  type="button"
                  onClick={() => reopenTicket(ticket.id)}
                  className="py-1.5 px-3 bg-white hover:bg-zinc-50 text-zinc-700 border border-zinc-300 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors press-fx shadow-2xs"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reopen Ticket</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 1: TWO-WAY LIVE CHAT WITH EMPLOYEE */}
          {drawerTab === 'CHAT' ? (
            <JobLogDrawerChat
              ticket={ticket}
              techSenderName={techSenderName}
              onSendMessage={(msg, isInternal) => {
                if (!isOwner) {
                  addToast('Permission Denied', `Ticket is assigned to ${ticket.workedBy || 'another technician'}. Only the assigned owner may post comments.`, 'warning');
                  return false;
                }
                return sendTicketMessageApi(ticket.id, msg, isInternal);
              }}
            />
          ) : (
            /* TAB 2: 15-COLUMN JOB LOG & WORK CONTROLS */
            <JobLogDrawerRecordForm
              ticket={ticket}
              notesDraft={notesDraft}
              onNotesDraftChange={setNotesDraft}
              isSavingNotes={isSavingNotes}
              onSaveJobLog={handleSaveJobLog}
              onUpdateMode={(mode) => {
                if (!isOwner) {
                  addToast('Permission Denied', `Ticket is assigned to ${ticket.workedBy || 'another technician'}. Only the assigned owner may change mode.`, 'warning');
                  return;
                }
                updateTicketMode(ticket.id, mode);
              }}
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
                type="button"
                onClick={() => claimTicketApi(ticket.id)}
                className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors press-fx"
              >
                <UserCheck className="w-4 h-4 text-emerald-400" />
                <span>Claim Ticket</span>
              </button>
            )}
            {ticket.status === 'PROG' && (
              isOwner ? (
                <button
                  type="button"
                  onClick={async () => {
                    resolveTicket(ticket.id);
                    await updateTicketStatusApi(ticket.id, 'RESL', ticket.mode || 'SITE');
                  }}
                  className="px-4 py-2 bg-brand hover:bg-brand-hover text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors press-fx"
                >
                  <Wrench className="w-4 h-4" />
                  <span>Mark as Resolved</span>
                </button>
              ) : (
                <span className="px-3 py-1.5 rounded-xl bg-zinc-100 text-zinc-600 text-xs font-medium border border-zinc-200">
                  Assigned to {ticket.workedBy || 'another technician'}
                </span>
              )
            )}
            <button
              type="button"
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
