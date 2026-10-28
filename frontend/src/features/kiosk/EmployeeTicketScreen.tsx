import React, { useState, useEffect } from 'react';
import {
  Plus,
  ListFilter,
  Search,
  Loader2,
  AlertTriangle,
  Clock,
  ShieldAlert,
  WifiOff,
  ArrowLeft,
  RotateCcw,
} from 'lucide-react';
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
  const verifyTicketCode = useAppStore((state) => state.verifyTicketCode);
  const verifyToken = useAppStore((state) => state.verifyToken);
  const verificationStatus = useAppStore((state) => state.verificationStatus);
  const verificationErrorMessage = useAppStore((state) => state.verificationErrorMessage);
  const verifiedTicket = useAppStore((state) => state.verifiedTicket);
  const employeeTickets = useAppStore((state) => state.employeeTickets);
  const initiateVerificationFlow = useAppStore((state) => state.initiateVerificationFlow);
  const clearVerificationContext = useAppStore((state) => state.clearVerificationContext);
  const copyTicketShareLink = useAppStore((state) => state.copyTicketShareLink);

  const [tab, setTab] = useState<'create' | 'my_tickets' | 'lookup'>('create');
  const [detailTicketId, setDetailTicketId] = useState<string | null>(null);
  const [copiedTicketId, setCopiedTicketId] = useState<string | null>(null);

  const intake = useEmployeeIntake();

  useEffect(() => {
    if (verifyTicketCode && verificationStatus === 'idle') {
      initiateVerificationFlow(verifyTicketCode, verifyToken);
    }
  }, [verifyTicketCode, verifyToken, verificationStatus, initiateVerificationFlow]);

  const handleCopyLink = async (ticketCode: string, id: string) => {
    const res = await copyTicketShareLink(ticketCode, id);
    if (res.success) {
      setCopiedTicketId(id);
      setTimeout(() => setCopiedTicketId(null), 2200);
    }
  };

  const selectedEmployeeTicket =
    (verifiedTicket && verifiedTicket.id === detailTicketId ? verifiedTicket : null) ||
    employeeTickets.find((t) => t.id === detailTicketId) ||
    null;

  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col justify-between">
      {/* 1. Header Bar */}
      <KioskTopBar hubName={intake.activeHub.name} />

      {/* 2. Main Content Area */}
      <main className="max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex-1 space-y-6">
        {/* Verification Flow Branches when arriving with ?verifyTicket= */}
        {verifyTicketCode ? (
          <div className="space-y-4">
            {verificationStatus === 'loading' && (
              <div className="bg-surface border border-line rounded-3xl p-10 text-center space-y-3 shadow-card max-w-md mx-auto animate-fade-in">
                <Loader2 className="w-8 h-8 animate-spin text-zinc-900 mx-auto" />
                <h3 className="font-bold text-sm text-ink">Verifying Ticket Access</h3>
                <p className="text-xs text-ink-subtle">
                  Validating security token for ticket <strong>{verifyTicketCode}</strong> with central IT server...
                </p>
              </div>
            )}

            {verificationStatus === 'not_found' && (
              <div className="bg-surface border border-line rounded-3xl p-8 text-center space-y-4 shadow-card max-w-md mx-auto animate-fade-in">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-sm text-ink">Ticket Not Found</h3>
                  <p className="text-xs text-ink-subtle leading-relaxed">
                    {verificationErrorMessage || `No ticket found with code "${verifyTicketCode}".`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={clearVerificationContext}
                  className="w-full py-2.5 px-4 bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 press-fx"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Return to Kiosk Intake</span>
                </button>
              </div>
            )}

            {verificationStatus === 'expired' && (
              <div className="bg-surface border border-line rounded-3xl p-8 text-center space-y-4 shadow-card max-w-md mx-auto animate-fade-in">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
                  <Clock className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-sm text-ink">Verification Link Expired</h3>
                  <p className="text-xs text-ink-subtle leading-relaxed">
                    {verificationErrorMessage ||
                      'This verification link has expired (72-hour window). Please contact IT Support to reissue a fresh link.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={clearVerificationContext}
                  className="w-full py-2.5 px-4 bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 press-fx"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Return to Kiosk Intake</span>
                </button>
              </div>
            )}

            {verificationStatus === 'forbidden' && (
              <div className="bg-surface border border-line rounded-3xl p-8 text-center space-y-4 shadow-card max-w-md mx-auto animate-fade-in">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-sm text-ink">Access Denied</h3>
                  <p className="text-xs text-ink-subtle leading-relaxed">
                    {verificationErrorMessage ||
                      'You are not authorized to view this ticket, or this ticket is unlinked to an employee.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={clearVerificationContext}
                  className="w-full py-2.5 px-4 bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 press-fx"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Return to Kiosk Intake</span>
                </button>
              </div>
            )}

            {verificationStatus === 'network_error' && (
              <div className="bg-surface border border-line rounded-3xl p-8 text-center space-y-4 shadow-card max-w-md mx-auto animate-fade-in">
                <div className="w-12 h-12 rounded-2xl bg-zinc-100 border border-zinc-200 text-zinc-600 flex items-center justify-center mx-auto">
                  <WifiOff className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-sm text-ink">Network Connection Error</h3>
                  <p className="text-xs text-ink-subtle leading-relaxed">
                    {verificationErrorMessage ||
                      'Unable to communicate with the central server. Please check your network and try again.'}
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => initiateVerificationFlow(verifyTicketCode, verifyToken)}
                    className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 press-fx"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Retry Connection</span>
                  </button>
                  <button
                    type="button"
                    onClick={clearVerificationContext}
                    className="flex-1 py-2.5 px-4 bg-surface border border-line text-ink font-bold text-xs rounded-xl flex items-center justify-center gap-2 press-fx hover:bg-zinc-100"
                  >
                    <span>Back to Intake</span>
                  </button>
                </div>
              </div>
            )}

            {verificationStatus === 'needs_identity' && (
              <div className="space-y-4">
                <KioskVerifyCodeCard
                  ticketCode={verifyTicketCode}
                  onUnlocked={() => {
                    // Handled internally in verification slice
                  }}
                />
                <div className="text-center">
                  <button
                    type="button"
                    onClick={clearVerificationContext}
                    className="text-xs text-ink-subtle hover:text-ink font-semibold inline-flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Cancel and return to Kiosk</span>
                  </button>
                </div>
              </div>
            )}

            {verificationStatus === 'verified' && verifiedTicket && (
              <EmployeeTicketDetails
                ticket={verifiedTicket}
                onBack={clearVerificationContext}
              />
            )}
          </div>
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
                    {employeeTickets.length}
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
                registeredEmail={intake.registeredEmail}
                onRegisteredEmailChange={intake.setRegisteredEmail}
                isMatching={intake.isMatching}
                isMatched={intake.isMatched}
                matchError={intake.matchError}
                cooldownSeconds={intake.cooldownSeconds}
                onContinueMatching={intake.handleContinueMatching}
                employeeProfile={intake.employeeProfile}
                locationState={intake.locationState}
                onCaptureLocation={intake.handleCaptureLocation}
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
              selectedEmployeeTicket ? (
                <EmployeeTicketDetails
                  ticket={selectedEmployeeTicket}
                  onBack={() => setDetailTicketId(null)}
                />
              ) : (
                <EmployeeTicketsPanel
                  tickets={employeeTickets}
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
