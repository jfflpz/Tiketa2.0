// @spec FR-AUTH-02 & SR-01: Dedicated Distraction-Free Employee Ticket Screen
// @spec SR-04: Ticket Confirmation Screen, Employee ID Verification Gate & Validation Sign-Off
import React, { useState, useEffect } from 'react';
import {
  Printer,
  Wifi,
  AppWindow,
  HardDrive,
  Server,
  Wrench,
  CheckCircle2,
  Send,
  ShieldCheck,
  WrenchIcon,
  RotateCcw,
  Sparkles,
  MapPin,
  ArrowRight,
  ArrowLeft,
  MessageSquare,
  UserCheck,
  Clock,
  Eye,
  KeyRound,
  Lock,
  Unlock,
  Copy,
  Check,
  AlertCircle,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { VERIFIED_EMPLOYEES, LOCATIONS } from '../../data/mockTicketsData';
import { TaskCategoryCode, Ticket } from '../../types/ticket';
import { StatusBadge } from '../../components/common/StatusBadge';
import { BarcodeDivider } from '../../components/common/TickMeter';

export const EmployeeTicketScreen: React.FC = () => {
  const {
    tickets,
    activeOfficeLocationCode,
    setActiveOfficeLocationCode,
    createTicket,
    confirmClosure,
    reopenTicket,
    sendTicketMessage,
    openLoginModal,
    verifyTicketCode,
    setVerifyTicketCode,
    unlockedTicketCodes,
    unlockTicketVerification,
    copyTicketShareLink,
  } = useAppStore();

  const [tab, setTab] = useState<'create' | 'my_tickets' | 'lookup'>('create');
  const [employeeId, setEmployeeId] = useState('FS-1088');
  const [declaredName, setDeclaredName] = useState('J. Dela Cruz');
  const [selectedTask, setSelectedTask] = useState<TaskCategoryCode>('PRN-TS');
  const [description, setDescription] = useState('');
  const [submittedTicket, setSubmittedTicket] = useState<Ticket | null>(null);

  // Selected ticket ID inside "My Tickets" for viewing full details & live chat
  const [detailTicketId, setDetailTicketId] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState('');

  // Ticket verification input states
  const [verifyIdInput, setVerifyIdInput] = useState('');
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [lookupTicketCodeInput, setLookupTicketCodeInput] = useState('');
  const [copiedTicketId, setCopiedTicketId] = useState<string | null>(null);

  const activeHub =
    LOCATIONS.find((l) => l.code === activeOfficeLocationCode) ?? LOCATIONS[5];

  const matchedEmployee = VERIFIED_EMPLOYEES[employeeId.trim().toUpperCase()];

  // Listen to verifyTicketCode from URL params or store
  const targetVerifyTicket = verifyTicketCode
    ? tickets.find(
        (t) => t.ticketCode.toUpperCase() === verifyTicketCode.trim().toUpperCase()
      ) ?? null
    : null;

  const isCurrentVerifyUnlocked =
    targetVerifyTicket &&
    Boolean(unlockedTicketCodes[targetVerifyTicket.ticketCode.toUpperCase()]);

  useEffect(() => {
    if (targetVerifyTicket && isCurrentVerifyUnlocked) {
      setDetailTicketId(targetVerifyTicket.id);
      setTab('my_tickets');
    }
  }, [targetVerifyTicket, isCurrentVerifyUnlocked]);

  const handleEmployeeChange = (val: string) => {
    setEmployeeId(val);
    const found = VERIFIED_EMPLOYEES[val.trim().toUpperCase()];
    if (found) {
      setDeclaredName(found.full_name);
      setActiveOfficeLocationCode(found.location_id);
    }
  };

  const handleVerifySubmit = (e: React.FormEvent, targetTicket: Ticket) => {
    e.preventDefault();
    const upperInput = verifyIdInput.trim().toUpperCase();
    if (!upperInput) return;

    const matchedRequester = VERIFIED_EMPLOYEES[upperInput];
    const isIdMatch =
      (targetTicket.employeeId &&
        targetTicket.employeeId.toUpperCase() === upperInput) ||
      (matchedRequester &&
        matchedRequester.full_name.toLowerCase() ===
          targetTicket.requestor.toLowerCase()) ||
      upperInput === targetTicket.requestor.toUpperCase();

    if (isIdMatch) {
      unlockTicketVerification(targetTicket.ticketCode);
      setDetailTicketId(targetTicket.id);
      setTab('my_tickets');
      setVerifyError(null);
      setVerifyIdInput('');
    } else {
      setVerifyError(
        `Employee ID "${upperInput}" does not match the requestor on this ticket (${targetTicket.requestor}). Please check your ID card (e.g. ${
          targetTicket.employeeId || 'FS-1042'
        }).`
      );
    }
  };

  const handleLookupCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = lookupTicketCodeInput.trim().toUpperCase();
    if (!trimmed) return;
    setVerifyTicketCode(trimmed);
    setLookupTicketCodeInput('');
  };

  const handleCopyLink = async (ticketCode: string, id: string) => {
    await copyTicketShareLink(ticketCode);
    setCopiedTicketId(id);
    setTimeout(() => setCopiedTicketId(null), 2200);
  };

  const issueOptions: {
    code: TaskCategoryCode;
    title: string;
    subtitle: string;
    icon: React.ReactNode;
  }[] = [
    {
      code: 'PRN-TS',
      title: 'Printer Issue',
      subtitle: 'Paper jam, blank receipt, or red blinking light',
      icon: <Printer className="w-5 h-5 text-rose-500" />,
    },
    {
      code: 'NET-CFG',
      title: 'No Internet / Wi-Fi',
      subtitle: 'Slow connection, offline booth, or GPS sync',
      icon: <Wifi className="w-5 h-5 text-sky-500" />,
    },
    {
      code: 'SW-ASST',
      title: 'POS / Software Help',
      subtitle: 'Ticketing app error, Excel lock, or login issue',
      icon: <AppWindow className="w-5 h-5 text-emerald-600" />,
    },
    {
      code: 'PC-HW-REP',
      title: 'Computer / Monitor',
      subtitle: 'PC won’t turn on, beeping, keyboard or mouse',
      icon: <HardDrive className="w-5 h-5 text-amber-500" />,
    },
    {
      code: 'SRV-ASSESS',
      title: 'Server / CCTV / UPS',
      subtitle: 'Battery backup alarm or camera offline',
      icon: <Server className="w-5 h-5 text-purple-600" />,
    },
    {
      code: 'PC-PMS',
      title: 'Routine Checkup (PMS)',
      subtitle: 'Request scheduled cleaning or equipment setup',
      icon: <Wrench className="w-5 h-5 text-zinc-600" />,
    },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const created = createTicket({
      company: matchedEmployee?.company_name ?? 'Pangasinan Five Star Bus Co.',
      companyCode: matchedEmployee?.company_id ?? 'FS',
      location: activeHub.name,
      locationCode: activeHub.code,
      department: matchedEmployee?.department_name ?? 'Operation',
      departmentCode: matchedEmployee?.department_id ?? 'OPS',
      requestor: declaredName.trim() || 'Terminal Staff',
      employeeId: employeeId.trim().toUpperCase(),
      taskCode: selectedTask,
      description:
        description.trim() ||
        `Reported from ${activeHub.name} employee helpdesk screen.`,
      mode: 'SITE',
      intakeSource: 'PC Kiosk',
    });
    setSubmittedTicket(created);
    setDescription('');
  };

  const detailTicket = tickets.find((t) => t.id === detailTicketId) ?? null;

  const handleSendEmployeeChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!detailTicket || !chatInput.trim()) return;
    sendTicketMessage(
      detailTicket.id,
      'employee',
      detailTicket.requestor || declaredName || 'Employee',
      chatInput
    );
    setChatInput('');
  };

  const getStepIndex = (status: Ticket['status']) => {
    switch (status) {
      case 'OPEN':
        return 1;
      case 'PROG':
        return 2;
      case 'RESL':
        return 3;
      case 'CLSD':
        return 4;
    }
  };

  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col justify-between">
      {/* Minimal, Calm Top Bar with Staff Login Buttons */}
      <header className="h-16 bg-surface border-b border-line px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-zinc-900 text-white flex items-center justify-center font-bold text-sm shadow-sm">
            T<span className="text-emerald-400 text-xs">•</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-tight text-ink">
                Tiketa
              </span>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-brand border border-emerald-200/70">
                Employee Helpdesk
              </span>
            </div>
            <p className="text-[11px] text-ink-subtle hidden sm:block">
              Five Star Bus Co. &amp; Affiliate Terminals — Fast IT Support Request
            </p>
          </div>
        </div>

        {/* Dedicated Staff Login Buttons (IT Support & Admin) */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => openLoginModal('it')}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-surface hover:bg-zinc-50 text-ink border border-line text-xs font-semibold shadow-card transition-colors press-fx"
          >
            <WrenchIcon className="w-3.5 h-3.5 text-ink-subtle" />
            <span>IT Support Login</span>
          </button>

          <button
            onClick={() => openLoginModal('admin')}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold shadow-sm transition-colors press-fx"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Admin Dashboard</span>
          </button>
        </div>
      </header>

      {/* Centered, Distraction-Free Main Container */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-3xl space-y-5">
          {/* ============================================================
              CASE 1: TICKET CONFIRMATION & EMPLOYEE ID VERIFICATION GATE
              (Shown when user opens ?verifyTicket=T-XXXXXX and hasn't unlocked yet)
             ============================================================ */}
          {targetVerifyTicket && !isCurrentVerifyUnlocked ? (
            <div className="bg-surface border border-line rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 animate-fade-in">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center mx-auto shadow-sm">
                  <Lock className="w-6 h-6" />
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 text-orange-700 border border-orange-200 text-xs font-mono font-bold">
                  <span>Ticket Confirmation Gate</span>
                  <span>•</span>
                  <span>{targetVerifyTicket.ticketCode}</span>
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-ink">
                  Enter Employee ID to Access Ticket
                </h2>
                <p className="text-xs text-ink-subtle max-w-md mx-auto">
                  IT Support has created or updated this ticket for you. Please enter your
                  company <strong>Employee ID</strong> to verify your identity, view the repair
                  progress, and confirm closure.
                </p>
              </div>

              {/* Ticket Preview Card */}
              <div className="bg-canvas border border-line rounded-2xl p-4 space-y-2 text-xs">
                <div className="flex justify-between items-center pb-2 border-b border-line">
                  <span className="text-ink-subtle">Issue:</span>
                  <span className="font-bold text-ink">{targetVerifyTicket.task}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-line">
                  <span className="text-ink-subtle">Terminal Hub:</span>
                  <span className="font-semibold text-ink">
                    {targetVerifyTicket.location} • {targetVerifyTicket.department}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-ink-subtle">Registered Requestor:</span>
                  <span className="font-semibold text-ink">
                    {targetVerifyTicket.requestor}
                  </span>
                </div>
              </div>

              {/* Error Message */}
              {verifyError && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{verifyError}</span>
                </div>
              )}

              {/* Verification Form */}
              <form
                onSubmit={(e) => handleVerifySubmit(e, targetVerifyTicket)}
                className="space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-ink">
                      Enter Your Employee ID No.
                    </label>
                    <div className="flex items-center gap-1.5 text-[11px] text-ink-subtle">
                      <span>Quick fill:</span>
                      {[targetVerifyTicket.employeeId, 'FS-1042', 'FS-1088']
                        .filter(Boolean)
                        .slice(0, 3)
                        .map((id) => (
                          <button
                            key={id}
                            type="button"
                            onClick={() => {
                              setVerifyIdInput(id!);
                              setVerifyError(null);
                            }}
                            className="font-mono px-2 py-0.5 rounded-md bg-canvas border border-line hover:bg-zinc-100 text-ink text-[11px]"
                          >
                            {id}
                          </button>
                        ))}
                    </div>
                  </div>
                  <input
                    type="text"
                    value={verifyIdInput}
                    onChange={(e) => {
                      setVerifyIdInput(e.target.value);
                      setVerifyError(null);
                    }}
                    placeholder={`e.g. ${targetVerifyTicket.employeeId || 'FS-1042'}`}
                    autoFocus
                    required
                    className="w-full px-4 py-3 bg-canvas border border-line rounded-2xl text-base font-mono font-bold text-ink focus:outline-none focus:border-zinc-500 uppercase tracking-wider"
                  />
                </div>

                <div className="flex items-center justify-between gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setVerifyTicketCode(null);
                      setVerifyError(null);
                    }}
                    className="px-4 py-2.5 rounded-xl border border-line text-xs font-medium text-ink-subtle hover:text-ink transition-colors press-fx"
                  >
                    Cancel / Back to Kiosk
                  </button>

                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold inline-flex items-center gap-2 shadow-sm transition-colors press-fx"
                  >
                    <Unlock className="w-4 h-4 text-emerald-400" />
                    <span>Verify &amp; Open Ticket</span>
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* ============================================================
               NORMAL KIOSK FLOW: + Create Ticket, My Tickets, or Lookup
               ============================================================ */
            <>
              {/* Greeting & Mode Switcher */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-ink">
                    Need IT Help at Your Terminal?
                  </h1>
                  <p className="text-xs text-ink-subtle mt-0.5">
                    No account or password needed. Submit a ticket or enter your Employee ID
                    to track and validate repairs.
                  </p>
                </div>

                {/* 3-Pill Toggle: + Create Ticket | My Tickets | Lookup Link */}
                <div className="inline-flex items-center bg-surface p-1 rounded-2xl border border-line shadow-card self-start">
                  <button
                    onClick={() => {
                      setTab('create');
                      setSubmittedTicket(null);
                      setDetailTicketId(null);
                      setVerifyTicketCode(null);
                    }}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all press-fx ${
                      tab === 'create'
                        ? 'bg-zinc-900 text-white shadow-sm'
                        : 'text-ink-subtle hover:text-ink'
                    }`}
                  >
                    + Create Ticket
                  </button>
                  <button
                    onClick={() => {
                      setTab('my_tickets');
                      setVerifyTicketCode(null);
                    }}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 press-fx ${
                      tab === 'my_tickets'
                        ? 'bg-zinc-900 text-white shadow-sm'
                        : 'text-ink-subtle hover:text-ink'
                    }`}
                  >
                    <span>My Tickets</span>
                    <span className="px-1.5 py-0.2 rounded-full bg-orange-500 text-white text-[10px] font-bold">
                      {tickets.length}
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      setTab('lookup');
                      setDetailTicketId(null);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1 press-fx ${
                      tab === 'lookup'
                        ? 'bg-zinc-900 text-white shadow-sm'
                        : 'text-ink-subtle hover:text-ink'
                    }`}
                    title="Lookup ticket by code or confirmation link"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-orange-500" />
                    <span>Lookup Code</span>
                  </button>
                </div>
              </div>

              {/* TAB 3: LOOKUP TICKET CODE / LINK */}
              {tab === 'lookup' && (
                <div className="bg-surface border border-line rounded-3xl p-6 sm:p-7 shadow-subtle space-y-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-orange-500 text-white flex items-center justify-center shadow-xs">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-ink">
                        Lookup Support Ticket by Code
                      </h2>
                      <p className="text-[11px] text-ink-subtle">
                        Did IT send you a ticket code or link via Viber / Teams? Enter it below.
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handleLookupCodeSubmit} className="space-y-3 pt-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={lookupTicketCodeInput}
                        onChange={(e) => setLookupTicketCodeInput(e.target.value)}
                        placeholder="e.g. T-261042, T-261054"
                        required
                        className="flex-1 px-3.5 py-2.5 bg-canvas border border-line rounded-xl text-xs font-mono uppercase font-bold text-ink focus:outline-none focus:border-zinc-500"
                      />
                      <button
                        type="submit"
                        className="px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition-colors press-fx"
                      >
                        <span>Open &amp; Confirm</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-ink-subtle">
                      <span>Recent terminal tickets:</span>
                      {tickets.slice(0, 4).map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setVerifyTicketCode(t.ticketCode)}
                          className="font-mono text-[11px] px-2 py-0.5 rounded-lg bg-canvas border border-line hover:bg-zinc-100 font-semibold text-ink"
                        >
                          {t.ticketCode}
                        </button>
                      ))}
                    </div>
                  </form>
                </div>
              )}

              {/* TAB 1: CREATE A TICKET */}
              {tab === 'create' && !submittedTicket && (
                <form
                  onSubmit={handleSubmit}
                  className="bg-surface border border-line rounded-3xl p-6 sm:p-7 shadow-subtle space-y-5"
                >
                  {/* Step 1: Employee ID & Auto-Detected Location */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-ink-subtle">
                        Step 1 — Your Identity &amp; Location
                      </span>
                      <div className="flex items-center gap-1.5 text-[11px] text-ink-subtle">
                        <span>Quick fill:</span>
                        {(['FS-1088', 'FS-1042', 'BTCI-2019'] as const).map((id) => (
                          <button
                            key={id}
                            type="button"
                            onClick={() => handleEmployeeChange(id)}
                            className={`font-mono px-2 py-0.5 rounded-md border transition-colors ${
                              employeeId.toUpperCase() === id
                                ? 'bg-emerald-50 border-emerald-300 text-brand font-semibold'
                                : 'bg-canvas border-line hover:bg-zinc-100'
                            }`}
                          >
                            {id}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-ink-subtle mb-1">
                          Employee ID No.
                        </label>
                        <input
                          type="text"
                          value={employeeId}
                          onChange={(e) => handleEmployeeChange(e.target.value)}
                          placeholder="e.g. FS-1088"
                          required
                          className="w-full px-3.5 py-2.5 bg-canvas border border-line rounded-xl text-sm font-mono font-semibold text-ink focus:outline-none focus:border-zinc-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-ink-subtle mb-1">
                          Your Name / Booth
                        </label>
                        <input
                          type="text"
                          value={declaredName}
                          onChange={(e) => setDeclaredName(e.target.value)}
                          placeholder="e.g. Juan Dela Cruz (Booth #3)"
                          required
                          className="w-full px-3.5 py-2.5 bg-canvas border border-line rounded-xl text-sm text-ink focus:outline-none focus:border-zinc-500"
                        />
                      </div>
                    </div>

                    {/* Reassuring Auto-Bound Location Pill */}
                    <div className="px-3.5 py-2.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 flex items-center justify-between text-xs text-emerald-950">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-brand shrink-0" />
                        <span>
                          Terminal Location:{' '}
                          <strong>
                            {activeHub.name} ({activeHub.code})
                          </strong>{' '}
                          • Department:{' '}
                          <strong>
                            {matchedEmployee?.department_name ?? 'Operation'}
                          </strong>
                        </span>
                      </div>
                      <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-white text-brand border border-emerald-200">
                        Auto-Bound
                      </span>
                    </div>
                  </div>

                  <BarcodeDivider count={64} />

                  {/* Step 2: 6 Visual Issue Buttons */}
                  <div className="space-y-2.5">
                    <span className="block text-xs font-bold uppercase tracking-wider text-ink-subtle">
                      Step 2 — Tap What Needs Fixing
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {issueOptions.map((opt) => {
                        const isSelected = selectedTask === opt.code;
                        return (
                          <button
                            key={opt.code}
                            type="button"
                            onClick={() => setSelectedTask(opt.code)}
                            className={`p-3.5 rounded-2xl border text-left transition-all flex items-start gap-3 press-fx ${
                              isSelected
                                ? 'bg-zinc-900 text-white border-zinc-900 shadow-md'
                                : 'bg-canvas/70 hover:bg-canvas text-ink border-line'
                            }`}
                          >
                            <div
                              className={`p-2 rounded-xl shrink-0 ${
                                isSelected ? 'bg-zinc-800' : 'bg-surface'
                              }`}
                            >
                              {opt.icon}
                            </div>
                            <div>
                              <p className="text-xs font-bold">{opt.title}</p>
                              <p
                                className={`text-[11px] mt-0.5 leading-snug ${
                                  isSelected ? 'text-zinc-300' : 'text-ink-subtle'
                                }`}
                              >
                                {opt.subtitle}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Step 3: Optional Extra Description */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-ink-subtle">
                      Optional: What happened? (e.g. Printer red light blinking)
                    </label>
                    <textarea
                      rows={2}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Type details or leave blank if issue is straightforward..."
                      className="w-full px-3.5 py-2.5 bg-canvas border border-line rounded-xl text-xs text-ink focus:outline-none focus:border-zinc-500"
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    className="w-full py-3.5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-bold shadow-md transition-all flex items-center justify-center gap-2 press-fx"
                  >
                    <span>Submit IT Support Ticket</span>
                    <ArrowRight className="w-4 h-4 text-emerald-400" />
                  </button>
                </form>
              )}

              {/* CONFIRMATION SCREEN AFTER SUBMITTING */}
              {tab === 'create' && submittedTicket && (
                <div className="bg-surface border border-line rounded-3xl p-8 shadow-subtle text-center space-y-4 animate-fade-in">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-brand flex items-center justify-center mx-auto shadow-sm">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs font-mono font-semibold uppercase px-2.5 py-1 rounded-full bg-emerald-50 text-brand border border-emerald-200">
                      Ticket Logged Successfully
                    </span>
                    <h2 className="text-2xl font-bold text-ink mt-2 font-mono">
                      {submittedTicket.ticketCode}
                    </h2>
                    <p className="text-xs text-ink-subtle mt-1 max-w-md mx-auto">
                      Your request for <strong>{submittedTicket.task}</strong> at{' '}
                      <strong>{submittedTicket.location}</strong> has been sent to the IT
                      Support team.
                    </p>
                  </div>

                  <div className="bg-canvas border border-line rounded-2xl p-4 max-w-md mx-auto text-left text-xs space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-ink-subtle">Requested By:</span>
                      <span className="font-semibold text-ink">
                        {submittedTicket.requestor} ({submittedTicket.employeeId})
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-subtle">Terminal Location:</span>
                      <span className="font-semibold text-ink">
                        {submittedTicket.location}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-subtle">Auto-Priority:</span>
                      <span className="font-semibold text-brand">
                        {submittedTicket.priority}
                      </span>
                    </div>
                  </div>

                  {/* Shareable Link Box */}
                  <div className="bg-canvas border border-line rounded-2xl p-3 max-w-md mx-auto flex items-center justify-between gap-2 text-xs">
                    <span className="text-ink-subtle font-mono text-[11px] truncate">
                      ?verifyTicket={submittedTicket.ticketCode}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        handleCopyLink(
                          submittedTicket.ticketCode,
                          submittedTicket.id
                        )
                      }
                      className="px-3 py-1.5 rounded-lg bg-surface border border-line text-xs font-semibold inline-flex items-center gap-1.5 text-ink hover:text-orange-600 transition-colors press-fx"
                    >
                      {copiedTicketId === submittedTicket.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Link</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="flex items-center justify-center gap-3 pt-2">
                    <button
                      onClick={() => setSubmittedTicket(null)}
                      className="px-4 py-2.5 rounded-xl bg-canvas hover:bg-zinc-200/70 text-ink border border-line text-xs font-semibold transition-colors press-fx"
                    >
                      Submit Another Issue
                    </button>
                    <button
                      onClick={() => {
                        setTab('my_tickets');
                        setDetailTicketId(submittedTicket.id);
                      }}
                      className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors press-fx"
                    >
                      <span>Open Ticket Details &amp; Chat</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: MY TICKETS (LIST VIEW vs EXPANDED DETAIL & LIVE CHAT VIEW) */}
              {tab === 'my_tickets' && !detailTicket && (
                <div className="bg-surface border border-line rounded-3xl p-6 shadow-subtle space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-base font-bold text-ink">
                        My Tickets &amp; Live IT Support Updates
                      </h2>
                      <p className="text-xs text-ink-subtle">
                        Click any ticket below to view full details, see who claimed it, or
                        chat directly with IT Support.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {tickets.map((t) => {
                      const isClaimed = Boolean(t.workedBy);
                      const msgCount = t.messages?.length ?? 0;
                      const isValidationReq =
                        t.status === 'RESL' || t.validationRequested;

                      return (
                        <div
                          key={t.id}
                          onClick={() => setDetailTicketId(t.id)}
                          className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-3 hover:shadow-card ${
                            isValidationReq
                              ? 'bg-peach/30 border-orange-300 ring-1 ring-orange-200'
                              : 'bg-canvas hover:bg-white border-line'
                          }`}
                        >
                          {/* Top Row: Ticket Code, Task, Status, Copy Link */}
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-lg bg-zinc-900 text-white">
                                {t.ticketCode}
                              </span>
                              <span className="text-sm font-bold text-ink">
                                {t.task}
                              </span>
                              {isValidationReq && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500 text-white animate-pulse">
                                  Validation Requested
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <StatusBadge status={t.status} size="sm" />
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopyLink(t.ticketCode, t.id);
                                }}
                                className="p-1.5 rounded-lg bg-surface border border-line text-ink-subtle hover:text-ink transition-colors press-fx"
                                title="Copy confirmation link"
                              >
                                {copiedTicketId === t.id ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </div>

                          {/* Description */}
                          <p className="text-xs text-ink-subtle line-clamp-2">
                            {t.description}
                          </p>

                          {/* Claim Status Bar + View Details & Chat Button */}
                          <div className="pt-2 border-t border-line/80 flex flex-wrap items-center justify-between gap-3">
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                              {isClaimed ? (
                                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-900">
                                  <img
                                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
                                      t.workedBy!
                                    )}&backgroundColor=b6e3f4`}
                                    alt={t.workedBy}
                                    className="w-5 h-5 rounded-full border border-emerald-300 bg-white"
                                  />
                                  <span>
                                    Claimed by <strong>{t.workedBy}</strong> (
                                    {t.mode === 'SITE' ? 'On-Site' : 'Remote'})
                                  </span>
                                </div>
                              ) : (
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-800 font-medium">
                                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                                  <span>Unclaimed — Waiting for IT Support</span>
                                </div>
                              )}

                              <span className="text-ink-faint text-[11px]">
                                • {t.location} ({t.requestor})
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-surface border border-line text-xs font-semibold text-ink-subtle">
                                <MessageSquare className="w-3.5 h-3.5 text-orange-500" />
                                <span>
                                  {msgCount} {msgCount === 1 ? 'Message' : 'Messages'}
                                </span>
                              </span>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDetailTicketId(t.id);
                                }}
                                className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm transition-colors press-fx"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>View Details &amp; Chat</span>
                              </button>
                            </div>
                          </div>

                          {/* Quick Closure Sign-off Banner if Resolved */}
                          {isValidationReq && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="pt-2.5 border-t border-orange-200/80 flex flex-wrap items-center justify-between gap-2"
                            >
                              <span className="text-xs font-semibold text-peach-text">
                                IT completed repair. Please test your equipment and confirm closure:
                              </span>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => confirmClosure(t.id)}
                                  className="px-3 py-1.5 rounded-xl bg-brand hover:bg-brand-hover text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm press-fx"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  Yes, Confirm Closure
                                </button>
                                <button
                                  onClick={() => reopenTicket(t.id)}
                                  className="px-3 py-1.5 rounded-xl bg-surface text-peach-text border border-orange-300 text-xs font-semibold inline-flex items-center gap-1 press-fx"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  Still Broken
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* EXPANDED TICKET DETAILS & TWO-WAY LIVE CHAT VIEW */}
              {tab === 'my_tickets' && detailTicket && (
                <div className="bg-surface border border-line rounded-3xl p-6 shadow-subtle space-y-5 animate-fade-in">
                  {/* Top Bar: Back Button + Ticket Code + Status + Copy Link */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-line">
                    <button
                      onClick={() => {
                        setDetailTicketId(null);
                        setVerifyTicketCode(null);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-canvas hover:bg-zinc-200/70 text-ink border border-line text-xs font-semibold transition-colors press-fx"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back to My Tickets</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold px-2.5 py-0.5 rounded-lg bg-zinc-900 text-white">
                        {detailTicket.ticketCode}
                      </span>
                      <StatusBadge status={detailTicket.status} />
                      <button
                        type="button"
                        onClick={() =>
                          handleCopyLink(detailTicket.ticketCode, detailTicket.id)
                        }
                        className="p-1.5 rounded-lg bg-canvas border border-line text-ink-subtle hover:text-ink text-xs font-semibold inline-flex items-center gap-1 transition-colors press-fx"
                        title="Copy employee confirmation link"
                      >
                        {copiedTicketId === detailTicket.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-[11px] text-emerald-700 font-bold">
                              Copied!
                            </span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span className="text-[11px]">Copy Link</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* HIGH-VISIBILITY VALIDATION REQUEST CARD (WHEN RESL OR REQUESTED) */}
                  {(detailTicket.status === 'RESL' ||
                    detailTicket.validationRequested) && (
                    <div className="bg-gradient-to-r from-orange-50 to-amber-50 border-2 border-orange-300 rounded-2xl p-5 shadow-sm space-y-3 animate-fade-in">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                            <CheckCircle2 className="w-6 h-6" />
                          </div>
                          <div>
                            <span className="text-[11px] font-bold uppercase tracking-wider text-orange-700 block">
                              Validation Requested by IT Support
                            </span>
                            <h3 className="text-base font-bold text-ink">
                              Please Confirm If Your Issue Is Resolved
                            </h3>
                          </div>
                        </div>

                        <span className="text-[11px] font-mono font-semibold px-2.5 py-1 rounded-full bg-white border border-orange-200 text-orange-800">
                          {detailTicket.timeFinished?.slice(0, 5) || 'Resolved Today'}
                        </span>
                      </div>

                      <p className="text-xs text-zinc-700 leading-relaxed">
                        Your IT Specialist (
                        <strong>
                          {detailTicket.workedBy ?? 'Nathaniel D. Esguerra'}
                        </strong>
                        ) has marked this repair as resolved. Please test your terminal
                        equipment or software at{' '}
                        <strong>{detailTicket.location}</strong>. If everything is
                        working normally, click{' '}
                        <strong>"Yes, Confirm Closure"</strong> to validate and close this
                        ticket.
                      </p>

                      <div className="flex flex-wrap items-center justify-end gap-2.5 pt-1">
                        <button
                          onClick={() => reopenTicket(detailTicket.id)}
                          className="px-4 py-2 rounded-xl bg-white hover:bg-orange-100 text-orange-800 border border-orange-300 text-xs font-bold inline-flex items-center gap-1.5 transition-colors press-fx"
                        >
                          <RotateCcw className="w-4 h-4" />
                          <span>Still Broken (Reopen)</span>
                        </button>
                        <button
                          onClick={() => confirmClosure(detailTicket.id)}
                          className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-2 shadow-sm transition-colors press-fx"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Yes, Confirm Closure</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* SUCCESS SIGN-OFF BANNER WHEN CLSD */}
                  {detailTicket.status === 'CLSD' && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between text-xs text-emerald-900">
                      <div className="flex items-center gap-2.5">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                        <div>
                          <span className="font-bold block">
                            Ticket Verified &amp; Closed
                          </span>
                          <span className="text-emerald-700 text-[11px]">
                            Closure confirmed and archived in 15-Column Job Log.
                          </span>
                        </div>
                      </div>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white border border-emerald-200 font-semibold">
                        Status: Closed
                      </span>
                    </div>
                  )}

                  {/* 4-Step Visual Progress Tracker */}
                  <div className="bg-canvas border border-line rounded-2xl p-4">
                    <div className="grid grid-cols-4 gap-2 text-center">
                      {[
                        {
                          step: 1,
                          label: '1. Submitted',
                          sub: detailTicket.timeStarted.slice(0, 5),
                        },
                        {
                          step: 2,
                          label: '2. Claimed by IT',
                          sub: detailTicket.workedBy
                            ? detailTicket.workedBy
                            : 'Waiting...',
                        },
                        {
                          step: 3,
                          label: '3. Repair Resolved',
                          sub: detailTicket.timeFinished
                            ? detailTicket.timeFinished.slice(0, 5)
                            : 'Pending',
                        },
                        {
                          step: 4,
                          label: '4. Verified & Closed',
                          sub:
                            detailTicket.status === 'CLSD' ? 'Confirmed' : 'Sign-Off',
                        },
                      ].map((item) => {
                        const currentStep = getStepIndex(detailTicket.status);
                        const done = currentStep >= item.step;
                        return (
                          <div key={item.step} className="space-y-1">
                            <div
                              className={`h-2 rounded-full transition-colors ${
                                done ? 'bg-brand' : 'bg-zinc-200'
                              }`}
                            />
                            <p
                              className={`text-xs font-bold ${
                                done ? 'text-ink' : 'text-ink-faint'
                              }`}
                            >
                              {item.label}
                            </p>
                            <p className="text-[11px] text-ink-subtle truncate">
                              {item.sub}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Claim & Technician Details Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Who Claimed It Card */}
                    <div className="bg-canvas border border-line rounded-2xl p-4 space-y-2.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-ink-subtle block">
                        IT Support Claim Status
                      </span>

                      {detailTicket.workedBy ? (
                        <div className="flex items-center gap-3 pt-1">
                          <img
                            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
                              detailTicket.workedBy
                            )}&backgroundColor=b6e3f4`}
                            alt={detailTicket.workedBy}
                            className="w-11 h-11 rounded-full border border-emerald-300 bg-white shrink-0"
                          />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <UserCheck className="w-4 h-4 text-brand" />
                              <span className="text-sm font-bold text-ink">
                                {detailTicket.workedBy}
                              </span>
                            </div>
                            <p className="text-xs text-ink-subtle mt-0.5">
                              Support Mode:{' '}
                              <strong className="text-ink">
                                {detailTicket.mode === 'SITE'
                                  ? 'On-Site Terminal Visit'
                                  : 'Remote (AnyDesk / Phone)'}
                              </strong>
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 pt-1 text-amber-800">
                          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                            <Clock className="w-5 h-5 text-amber-600" />
                          </div>
                          <div>
                            <p className="text-xs font-bold">
                              Not Claimed Yet (In General Pool)
                            </p>
                            <p className="text-[11px] text-amber-700 mt-0.5">
                              An available IT Support specialist will claim this ticket
                              shortly. You can leave extra details in the chat below.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Ticket Summary Details Card */}
                    <div className="bg-canvas border border-line rounded-2xl p-4 space-y-1.5 text-xs">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-ink-subtle block mb-1">
                        Ticket Information
                      </span>
                      <div className="flex justify-between">
                        <span className="text-ink-subtle">Issue Category:</span>
                        <span className="font-bold text-ink">
                          {detailTicket.task}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-ink-subtle">Terminal &amp; Dept:</span>
                        <span className="font-semibold text-ink">
                          {detailTicket.location} • {detailTicket.department}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-ink-subtle">Requested By:</span>
                        <span className="font-semibold text-ink">
                          {detailTicket.requestor} (
                          {detailTicket.employeeId || 'Kiosk'})
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-ink-subtle">Date &amp; Time Logged:</span>
                        <span className="font-mono text-ink">
                          {detailTicket.dateStarted} • {detailTicket.timeStarted}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* LIVE CHAT BOX BETWEEN EMPLOYEE & IT SUPPORT */}
                  <div className="bg-canvas border border-line rounded-2xl overflow-hidden flex flex-col">
                    {/* Chat Header */}
                    <div className="px-4 py-3 bg-surface border-b border-line flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-orange-500" />
                        <span className="text-xs font-bold text-ink">
                          Live Chat with IT Support
                        </span>
                      </div>
                      <span className="text-[11px] text-ink-subtle">
                        {detailTicket.workedBy
                          ? `Connected with ${detailTicket.workedBy}`
                          : 'Messages visible to all IT Support specialists'}
                      </span>
                    </div>

                    {/* Messages Scroll Area */}
                    <div className="p-4 space-y-3 max-h-72 overflow-y-auto">
                      {!detailTicket.messages ||
                      detailTicket.messages.length === 0 ? (
                        <p className="text-xs text-ink-subtle text-center py-6">
                          No messages yet. Send a message below if you have questions or
                          an AnyDesk ID to share with IT Support.
                        </p>
                      ) : (
                        detailTicket.messages.map((msg) => {
                          const isEmployee = msg.senderRole === 'employee';
                          const isSystemValidation = msg.message.includes(
                            'VALIDATION REQUEST'
                          );

                          return (
                            <div
                              key={msg.id}
                              className={`flex flex-col ${
                                isEmployee ? 'items-end' : 'items-start'
                              }`}
                            >
                              <div className="flex items-center gap-1.5 mb-1 px-1">
                                <span className="text-[10px] font-bold text-ink-subtle">
                                  {msg.senderName}
                                </span>
                                <span className="text-[10px] text-ink-faint">
                                  • {msg.timestamp}
                                </span>
                              </div>
                              <div
                                className={`px-3.5 py-2.5 rounded-2xl text-xs max-w-[85%] leading-relaxed ${
                                  isSystemValidation
                                    ? 'bg-orange-100 border-2 border-orange-300 text-orange-950 font-medium'
                                    : isEmployee
                                    ? 'bg-zinc-900 text-white rounded-br-sm'
                                    : 'bg-orange-50 border border-orange-200/80 text-ink rounded-bl-sm'
                                }`}
                              >
                                {msg.message}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Quick Reply Chips for Employee */}
                    <div className="px-4 py-2 bg-surface/60 border-t border-line flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] font-semibold text-ink-faint mr-1">
                        Quick send:
                      </span>
                      {[
                        'Our AnyDesk ID is 482-910-331',
                        'Equipment is turned on and ready',
                        'I tested it and it works great, thank you!',
                        'Still having the same issue',
                      ].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() =>
                            sendTicketMessage(
                              detailTicket.id,
                              'employee',
                              detailTicket.requestor || declaredName || 'Employee',
                              preset
                            )
                          }
                          className="text-[11px] px-2.5 py-1 rounded-full bg-surface hover:bg-zinc-100 text-ink-subtle hover:text-ink border border-line transition-colors press-fx"
                        >
                          {preset}
                        </button>
                      ))}
                    </div>

                    {/* Chat Input Form */}
                    <form
                      onSubmit={handleSendEmployeeChat}
                      className="p-3 bg-surface border-t border-line flex items-center gap-2"
                    >
                      <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        placeholder="Type a message or answer IT Support..."
                        className="flex-1 px-3.5 py-2 bg-canvas border border-line rounded-xl text-xs text-ink focus:outline-none focus:border-zinc-500"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-xl bg-brand hover:bg-brand-hover text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm transition-colors press-fx"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Send</span>
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Subtle Footer */}
      <footer className="py-4 px-6 text-center text-[11px] text-ink-faint flex items-center justify-center gap-2">
        <Sparkles className="w-3.5 h-3.5" />
        <span>
          Tiketa (Omnitick) — Zero-Password Terminal Kiosk &amp; Employee ID Validation Gate
        </span>
      </footer>
    </div>
  );
};
