import React, { useState, useEffect } from 'react';
import { Plus, ListFilter, Search } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useEmployeeIntake } from './hooks/useEmployeeIntake';
import { KioskTopBar } from './components/KioskTopBar';
import { KioskIntakeForm } from './components/KioskIntakeForm';
import { TicketSubmissionReceipt } from './components/TicketSubmissionReceipt';
import { EmployeeTicketsPanel } from './components/EmployeeTicketsPanel';
import { EmployeeTicketDetails } from './components/EmployeeTicketDetails';
import { KioskTrackLookupTab } from './components/KioskTrackLookupTab';
import { KioskVerifyCodeCard } from './components/KioskVerifyCodeCard';

export const EmployeeTicketScreen: React.FC = () => {
  const tickets = useAppStore((state) => state.tickets);
  const verifyTicketCode = useAppStore((state) => state.verifyTicketCode);
  const unlockedTicketCodes = useAppStore((state) => state.unlockedTicketCodes);
  const copyTicketShareLink = useAppStore((state) => state.copyTicketShareLink);
  const trackTicketApi = useAppStore((state) => state.trackTicketApi);

  const [tab, setTab] = useState<'create' | 'my_tickets' | 'lookup'>('create');
  const [detailTicketId, setDetailTicketId] = useState<string | null>(null);
  const [copiedTicketId, setCopiedTicketId] = useState<string | null>(null);

  const intake = useEmployeeIntake();

  // URL ?verifyTicket= handler
  const targetVerifyTicket = verifyTicketCode
    ? tickets.find(
        (t) => t.ticketCode.toUpperCase() === verifyTicketCode.trim().toUpperCase()
      ) ?? null
    : null;

  const isCurrentVerifyUnlocked =
    targetVerifyTicket &&
    Boolean(unlockedTicketCodes[targetVerifyTicket.ticketCode.toUpperCase()]);

  useEffect(() => {
    if (verifyTicketCode && !targetVerifyTicket) {
      trackTicketApi(verifyTicketCode);
    }
  }, [verifyTicketCode, targetVerifyTicket, trackTicketApi]);

  useEffect(() => {
    if (targetVerifyTicket && isCurrentVerifyUnlocked) {
      setDetailTicketId(targetVerifyTicket.id);
      setTab('my_tickets');
    }
  }, [targetVerifyTicket, isCurrentVerifyUnlocked]);

  const handleCopyLink = async (ticketCode: string, id: string) => {
    await copyTicketShareLink(ticketCode);
    setCopiedTicketId(id);
    setTimeout(() => setCopiedTicketId(null), 2200);
  };

  const detailTicket = tickets.find((t) => t.id === detailTicketId) ?? null;

  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col justify-between">
      {/* 1. Header Bar */}
      <KioskTopBar hubName={intake.activeHub.name} />

      {/* 2. Main Content Area */}
      <main className="max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex-1 space-y-6">
        {/* Verification Card if arriving from Direct Validation URL and not unlocked */}
        {targetVerifyTicket && !isCurrentVerifyUnlocked ? (
          <KioskVerifyCodeCard
            ticket={targetVerifyTicket}
            onUnlocked={() => {
              setDetailTicketId(targetVerifyTicket.id);
              setTab('my_tickets');
            }}
          />
        ) : intake.submittedTicket ? (
          /* Post-Submit Confirmation Receipt */
          <TicketSubmissionReceipt
            ticket={intake.submittedTicket}
            onReset={intake.resetIntake}
            onViewTickets={() => {
              setDetailTicketId(intake.submittedTicket?.id ?? null);
              setTab('my_tickets');
              intake.resetIntake();
            }}
          />
        ) : (
          <>
            {/* Header Greeting & 3-Tab Selector */}
            <div className="text-center space-y-3 pt-2">
              <h1 className="text-2xl sm:text-3xl font-black text-ink tracking-tight">
                How can IT Support assist you today?
              </h1>
              <p className="text-xs sm:text-sm text-ink-subtle max-w-lg mx-auto leading-relaxed">
                Report workstation, ticketing, network, or hardware issues across Five Star terminals in under 30 seconds.
              </p>

              <div className="inline-flex items-center gap-1.5 p-1 bg-surface border border-line rounded-2xl shadow-xs">
                <button
                  type="button"
                  onClick={() => {
                    setTab('create');
                    setDetailTicketId(null);
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all press-fx flex items-center gap-1.5 ${
                    tab === 'create'
                      ? 'bg-zinc-900 text-white shadow-xs'
                      : 'text-ink-subtle hover:text-ink'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Ticket</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTab('my_tickets')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all press-fx flex items-center gap-1.5 ${
                    tab === 'my_tickets'
                      ? 'bg-zinc-900 text-white shadow-xs'
                      : 'text-ink-subtle hover:text-ink'
                  }`}
                >
                  <ListFilter className="w-3.5 h-3.5" />
                  <span>My Tickets</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-canvas text-ink-subtle ml-1">
                    {tickets.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setTab('lookup');
                    setDetailTicketId(null);
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all press-fx flex items-center gap-1.5 ${
                    tab === 'lookup'
                      ? 'bg-zinc-900 text-white shadow-xs'
                      : 'text-ink-subtle hover:text-ink'
                  }`}
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Track Code</span>
                </button>
              </div>
            </div>

            {/* TAB 1: CREATE TICKET */}
            {tab === 'create' && (
              <KioskIntakeForm
                employeeId={intake.employeeId}
                onEmployeeIdChange={intake.setEmployeeId}
                declaredName={intake.declaredName}
                isSearchingEmployee={intake.isSearchingEmployee}
                employeeVerified={intake.employeeVerified}
                lookupError={intake.lookupError}
                employeeDetails={intake.employeeDetails}
                activeHubName={intake.activeHub.name}
                selectedTask={intake.selectedTask}
                onSelectTask={intake.setSelectedTask}
                description={intake.description}
                onDescriptionChange={intake.setDescription}
                isSubmitting={intake.isSubmitting}
                onSubmit={intake.handleSubmit}
              />
            )}

            {/* TAB 2: MY TICKETS (LIST vs EXPANDED DETAIL) */}
            {tab === 'my_tickets' && (
              detailTicket ? (
                <EmployeeTicketDetails
                  ticket={detailTicket}
                  onBack={() => setDetailTicketId(null)}
                />
              ) : (
                <EmployeeTicketsPanel
                  tickets={tickets}
                  onSelectTicket={(id) => setDetailTicketId(id)}
                  onCopyLink={handleCopyLink}
                  copiedId={copiedTicketId}
                />
              )
            )}

            {/* TAB 3: LOOKUP CODE */}
            {tab === 'lookup' && (
              <KioskTrackLookupTab
                onTicketFound={(id) => {
                  setDetailTicketId(id);
                  setTab('my_tickets');
                }}
              />
            )}
          </>
        )}
      </main>

      {/* 3. Footer */}
      <footer className="border-t border-line/60 bg-surface/50 py-4 text-center text-xs text-ink-subtle">
        <p>© 2026 Pangasinan Five Star Bus Co., Inc. • Central IT Operations System</p>
      </footer>
    </div>
  );
};
