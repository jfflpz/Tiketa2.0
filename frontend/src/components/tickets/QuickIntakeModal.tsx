// @spec SR-04: Walk-in & Viber Ticket Intake Modal
// @spec SR-01: Employee ID Auto-Binding & Confirmation Link Sharing
import React, { useState, useEffect } from 'react';
import {
  X,
  PlusCircle,
  CheckCircle2,
  ShieldAlert,
  Copy,
  Check,
  ExternalLink,
  Send,
  ArrowRight,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import {
  COMPANIES,
  LOCATIONS,
  DEPARTMENTS,
  TASK_CATEGORIES,
} from '../../constants/domain';
import { SupportMode, TaskCategoryCode, Ticket } from '../../types/ticket';

export const QuickIntakeModal: React.FC = () => {
  const isQuickIntakeOpen = useAppStore((state) => state.isQuickIntakeOpen);
  const setQuickIntakeOpen = useAppStore((state) => state.setQuickIntakeOpen);
  const quickIntakeApi = useAppStore((state) => state.quickIntakeApi);
  const copyTicketShareLink = useAppStore((state) => state.copyTicketShareLink);
  const setActiveView = useAppStore((state) => state.setActiveView);
  const setSelectedTicketId = useAppStore((state) => state.setSelectedTicketId);
  const setVerifyTicketCode = useAppStore((state) => state.setVerifyTicketCode);
  const lookupEmployeeApi = useAppStore((state) => state.lookupEmployeeApi);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [employeeIdInput, setEmployeeIdInput] = useState('FS-1042');
  const [requestor, setRequestor] = useState('Maria Santos');
  const [companyCode, setCompanyCode] = useState('FS');
  const [locationCode, setLocationCode] = useState('PSY');
  const [departmentCode, setDepartmentCode] = useState('CASH');
  const [taskCode, setTaskCode] = useState<TaskCategoryCode>('PRN-TS');
  const [mode, setMode] = useState<SupportMode>('REM');
  const [description, setDescription] = useState('');
  const [autoBound, setAutoBound] = useState(true);

  // Success view state after ticket creation
  const [createdTicket, setCreatedTicket] = useState<Ticket | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isQuickIntakeOpen && !isSubmitting) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isQuickIntakeOpen, isSubmitting]);

  useEffect(() => {
    const upper = employeeIdInput.trim().toUpperCase();
    if (!upper || upper.length < 2) return;
    lookupEmployeeApi(upper).then((matched) => {
      if (matched) {
        setRequestor(matched.full_name);
        setCompanyCode(matched.company_name || 'FS');
        setLocationCode(matched.location_name || 'PSY');
        setDepartmentCode(matched.department_name || 'CASH');
        setAutoBound(true);
      } else {
        setAutoBound(false);
      }
    });
  }, [employeeIdInput, lookupEmployeeApi]);

  if (!isQuickIntakeOpen) return null;

  const selectedTask = TASK_CATEGORIES.find((t) => t.code === taskCode);

  const handleClose = () => {
    setQuickIntakeOpen(false);
    setCreatedTicket(null);
    setCopied(false);
    setDescription('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const companyObj =
      COMPANIES.find((c) => c.code === companyCode) ?? COMPANIES[0];
    const locationObj =
      LOCATIONS.find((l) => l.code === locationCode) ?? LOCATIONS[0];
    const deptObj =
      DEPARTMENTS.find((d) => d.code === departmentCode) ?? DEPARTMENTS[0];

    const newTicket = await quickIntakeApi({
      companyName: companyObj.name,
      locationName: locationObj.name,
      departmentName: deptObj.name,
      requestorName: requestor.trim() || 'Terminal Staff',
      employeeId: employeeIdInput.trim().toUpperCase() || 'FS-1042',
      taskCode,
      description:
        description.trim() ||
        `${selectedTask?.name ?? 'Technical support'} logged via IT Support walk-in / Viber intake.`,
      mode,
    });

    setIsSubmitting(false);
    if (newTicket) {
      setCreatedTicket(newTicket);
    }
  };

  const handleCopyLink = async () => {
    if (!createdTicket) return;
    await copyTicketShareLink(createdTicket.ticketCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2400);
  };

  const handleOpenWorkbench = () => {
    if (createdTicket) {
      setSelectedTicketId(createdTicket.id);
      setActiveView('workbench');
    }
    handleClose();
  };

  const handlePreviewEmployeeScreen = () => {
    if (createdTicket) {
      setVerifyTicketCode(createdTicket.ticketCode);
    }
    handleClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto animate-fade-in">
      <div
        className="fixed inset-0"
        onClick={handleClose}
        aria-hidden="true"
      />
      <div className="relative z-10 w-full max-w-lg bg-surface border border-line rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-canvas border-b border-line flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-zinc-900 text-white flex items-center justify-center shadow-sm">
              <PlusCircle className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-ink">
                {createdTicket
                  ? 'Ticket Created • Share Confirmation Link'
                  : 'Log Walk-In / Viber Support Ticket'}
              </h3>
              <p className="text-[11px] text-ink-subtle">
                {createdTicket
                  ? `Ticket ${createdTicket.ticketCode} is ready for employee validation`
                  : 'Enter Employee ID to auto-fill Company, Terminal & Department'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-xl bg-surface border border-line text-ink-subtle hover:text-ink press-fx"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* SUCCESS VIEW: SHARE LINK WITH EMPLOYEE */}
        {createdTicket ? (
          <div className="p-6 space-y-5">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="inline-block px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-mono font-bold">
                {createdTicket.ticketCode} Created Successfully
              </div>
              <h4 className="text-base font-bold text-ink">
                {createdTicket.task}
              </h4>
              <p className="text-xs text-ink-subtle max-w-md mx-auto">
                Created on behalf of{' '}
                <strong className="text-ink">{createdTicket.requestor}</strong> (
                {createdTicket.employeeId}) at{' '}
                <strong className="text-ink">{createdTicket.location}</strong>.
              </p>
            </div>

            {/* Shareable Link Box */}
            <div className="bg-canvas border border-line rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-ink flex items-center gap-1.5">
                  <Send className="w-3.5 h-3.5 text-orange-500" />
                  <span>Employee Ticket Confirmation Link</span>
                </span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-orange-50 text-orange-700 border border-orange-200/60 font-semibold">
                  Required ID: {createdTicket.employeeId || 'FS-1042'}
                </span>
              </div>

              <p className="text-xs text-ink-subtle leading-relaxed">
                Copy and send this link to the employee via Viber, Teams, or SMS.
                When opened, they simply enter their{' '}
                <strong>Employee ID ({createdTicket.employeeId})</strong> to confirm and
                track the ticket.
              </p>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={`${window.location.origin}${window.location.pathname}?verifyTicket=${createdTicket.ticketCode}`}
                  className="flex-1 px-3 py-2 bg-surface border border-line rounded-xl text-xs font-mono text-ink-subtle select-all focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className={`px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition-all press-fx ${
                    copied
                      ? 'bg-emerald-600 text-white'
                      : 'bg-zinc-900 hover:bg-zinc-800 text-white'
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
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
            </div>

            {/* Next Action Buttons */}
            <div className="flex flex-wrap items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={handlePreviewEmployeeScreen}
                className="px-3.5 py-2 rounded-xl bg-canvas hover:bg-zinc-200/70 border border-line text-xs font-semibold text-ink inline-flex items-center gap-1.5 transition-colors press-fx"
                title="Test employee confirmation screen directly"
              >
                <ExternalLink className="w-3.5 h-3.5 text-orange-500" />
                <span>Test Employee Screen</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setCreatedTicket(null);
                  setDescription('');
                }}
                className="px-3.5 py-2 rounded-xl bg-canvas hover:bg-zinc-200/70 border border-line text-xs font-semibold text-ink transition-colors press-fx"
              >
                Log Another
              </button>
              <button
                type="button"
                onClick={handleOpenWorkbench}
                className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition-colors press-fx"
              >
                <span>Open in Workbench</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          /* FORM VIEW: INTAKE WITH EMPLOYEE ID AUTO-BINDING */
          <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
            {/* Employee ID Auto-Binding Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-ink mb-1">
                  Employee ID (e.g. FS-1042, FS-1088)
                </label>
                <input
                  type="text"
                  value={employeeIdInput}
                  onChange={(e) => setEmployeeIdInput(e.target.value)}
                  placeholder="e.g. FS-1042"
                  className="w-full px-3 py-2 bg-canvas border border-line rounded-xl text-xs font-mono font-semibold text-ink focus:outline-none focus:border-zinc-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink mb-1">
                  Requestor Full Name
                </label>
                <input
                  type="text"
                  value={requestor}
                  onChange={(e) => setRequestor(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-canvas border border-line rounded-xl text-xs text-ink focus:outline-none focus:border-zinc-500"
                />
              </div>
            </div>

            {/* Auto-Bound Status Pill */}
            <div
              className={`px-3.5 py-2 rounded-xl border text-xs flex items-center justify-between ${
                autoBound
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                  : 'bg-zinc-50 border-line text-ink-subtle'
              }`}
            >
              <div className="flex items-center gap-2">
                {autoBound ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />
                )}
                <span className="font-medium">
                  {autoBound
                    ? `Auto-Bound Profile: ${companyCode} • ${locationCode} • ${departmentCode}`
                    : 'Unlisted ID — Manual Terminal & Department Selection Enabled'}
                </span>
              </div>
            </div>

            {/* Location & Department Selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-ink-subtle mb-1">
                  Company
                </label>
                <select
                  value={companyCode}
                  onChange={(e) => setCompanyCode(e.target.value)}
                  disabled={autoBound}
                  className="w-full px-2.5 py-2 bg-canvas border border-line rounded-xl text-xs text-ink disabled:opacity-70"
                >
                  {COMPANIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} — {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-ink-subtle mb-1">
                  Terminal Hub
                </label>
                <select
                  value={locationCode}
                  onChange={(e) => setLocationCode(e.target.value)}
                  disabled={autoBound}
                  className="w-full px-2.5 py-2 bg-canvas border border-line rounded-xl text-xs text-ink disabled:opacity-70"
                >
                  {LOCATIONS.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.code} — {l.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-ink-subtle mb-1">
                  Department
                </label>
                <select
                  value={departmentCode}
                  onChange={(e) => setDepartmentCode(e.target.value)}
                  disabled={autoBound}
                  className="w-full px-2.5 py-2 bg-canvas border border-line rounded-xl text-xs text-ink disabled:opacity-70"
                >
                  {DEPARTMENTS.map((d) => (
                    <option key={d.code} value={d.code}>
                      {d.code} — {d.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Task Category & Support Mode */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-ink mb-1">
                  Issue / Task Category
                </label>
                <select
                  value={taskCode}
                  onChange={(e) =>
                    setTaskCode(e.target.value as TaskCategoryCode)
                  }
                  className="w-full px-3 py-2 bg-canvas border border-line rounded-xl text-xs font-medium text-ink"
                >
                  {TASK_CATEGORIES.map((t) => (
                    <option key={t.code} value={t.code}>
                      [{t.code}] {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink mb-1">
                  Support Mode
                </label>
                <div className="grid grid-cols-2 gap-1.5 bg-canvas p-1 rounded-xl border border-line">
                  {(['REM', 'SITE'] as SupportMode[]).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMode(m)}
                      className={`py-1 rounded-lg text-xs font-semibold transition-all ${
                        mode === m
                          ? 'bg-zinc-900 text-white shadow-sm'
                          : 'text-ink-subtle hover:text-ink'
                      }`}
                    >
                      {m === 'REM' ? 'Remote' : 'On-Site'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Issue Description */}
            <div>
              <label className="block text-xs font-semibold text-ink mb-1">
                Technical Symptoms &amp; Details
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe terminal issue, booth number, or error message..."
                className="w-full px-3 py-2 bg-canvas border border-line rounded-xl text-xs text-ink focus:outline-none focus:border-zinc-500"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 rounded-xl border border-line text-xs font-medium text-ink-subtle hover:text-ink press-fx"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 text-white text-xs font-semibold shadow-sm press-fx inline-flex items-center gap-1.5"
              >
                {isSubmitting ? 'Adding to Queue...' : 'Add Ticket to Queue'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
