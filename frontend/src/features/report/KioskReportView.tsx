// @spec SR-01: Solution 4 Terminal PC Kiosk & Employee ID Validated Intake (/report)
// @spec SR-07: Digital Closure Verification Sign-Off Loop
import React, { useState } from 'react';
import {
  Monitor,
  ShieldCheck,
  Printer,
  Wifi,
  HardDrive,
  Server,
  AppWindow,
  Wrench,
  CheckCircle2,
  RotateCcw,
  Lock,
  Send,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { LOCATIONS, VERIFIED_EMPLOYEES } from '../../data/mockTicketsData';
import { TaskCategoryCode } from '../../types/ticket';
import { StatusBadge } from '../../components/common/StatusBadge';
import { BarcodeDivider } from '../../components/common/TickMeter';

export const KioskReportView: React.FC = () => {
  const {
    tickets,
    activeOfficeLocationCode,
    setActiveOfficeLocationCode,
    createTicket,
    confirmClosure,
    reopenTicket,
    setSelectedTicketId,
  } = useAppStore();

  const [employeeId, setEmployeeId] = useState('FS-1088');
  const [declaredName, setDeclaredName] = useState('J. Dela Cruz (Booth #3)');
  const [selectedTask, setSelectedTask] = useState<TaskCategoryCode>('PRN-TS');
  const [description, setDescription] = useState('');

  const activeHub =
    LOCATIONS.find((l) => l.code === activeOfficeLocationCode) ?? LOCATIONS[5];

  const handleEmployeeLookup = (val: string) => {
    setEmployeeId(val);
    const matched = VERIFIED_EMPLOYEES[val.trim().toUpperCase()];
    if (matched) {
      setDeclaredName(matched.full_name);
      setActiveOfficeLocationCode(matched.location_id);
    }
  };

  const quickButtons: {
    code: TaskCategoryCode;
    label: string;
    sub: string;
    priority: string;
    icon: React.ReactNode;
  }[] = [
    {
      code: 'PRN-TS',
      label: 'Printer Jam / Blank Receipt',
      sub: 'Thermal booth printer or spooler',
      priority: 'High',
      icon: <Printer className="w-5 h-5 text-rose-500" />,
    },
    {
      code: 'NET-CFG',
      label: 'No Internet / Wi-Fi Down',
      sub: 'Terminal VLAN, router, or GPS sync',
      priority: 'High',
      icon: <Wifi className="w-5 h-5 text-sky-500" />,
    },
    {
      code: 'SW-ASST',
      label: 'POS / Ticketing App Error',
      sub: 'Excel lock, booking crash, login',
      priority: 'Medium',
      icon: <AppWindow className="w-5 h-5 text-emerald-600" />,
    },
    {
      code: 'PC-HW-REP',
      label: 'PC Won’t Turn On / Beeping',
      sub: 'RAM, power supply, monitor fault',
      priority: 'High',
      icon: <HardDrive className="w-5 h-5 text-amber-500" />,
    },
    {
      code: 'SRV-ASSESS',
      label: 'Server / CCTV / UPS Alarm',
      sub: 'NVR rack or battery backup alert',
      priority: 'Critical',
      icon: <Server className="w-5 h-5 text-purple-600" />,
    },
    {
      code: 'PC-PMS',
      label: 'Request Routine PMS Check',
      sub: 'Scheduled terminal cleaning & test',
      priority: 'Low',
      icon: <Wrench className="w-5 h-5 text-zinc-600" />,
    },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createTicket({
      company: 'Pangasinan Five Star Bus Co.',
      companyCode: 'FS',
      location: activeHub.name,
      locationCode: activeHub.code,
      department: 'Operation',
      departmentCode: 'OPS',
      requestor: declaredName.trim() || 'Terminal Staff',
      employeeId: employeeId.trim().toUpperCase(),
      taskCode: selectedTask,
      description:
        description.trim() ||
        `Reported via Solution 4 Terminal PC Kiosk at ${activeHub.name}.`,
      mode: 'SITE',
      intakeSource: 'PC Kiosk',
    });
    setDescription('');
  };

  const hubTickets = tickets.filter((t) => t.locationCode === activeHub.code);
  const needsSignOff = tickets.filter((t) => t.status === 'RESL');

  return (
    <div className="space-y-4 pb-6">
      {/* Solution 4 Kiosk Banner */}
      <div className="bg-surface border border-line rounded-3xl p-5 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-brand shrink-0">
            <Monitor className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900">
                Solution 4: Enforced Terminal Kiosk Session
              </span>
              <span className="text-xs font-mono text-ink-subtle">
                Zero Workforce Passwords (ADR-002)
              </span>
            </div>
            <h1 className="text-lg font-bold text-ink mt-1">
              🏢 {activeHub.name} ({activeHub.code}) — IT Helpdesk Portal
            </h1>
            <p className="text-xs text-ink-subtle">
              Company, Terminal Location, and Department are cryptographically bound to this workstation.
            </p>
          </div>
        </div>

        {/* Switch Terminal Kiosk Session Simulator */}
        <div className="flex items-center gap-2 shrink-0">
          <label className="text-xs font-medium text-ink-subtle">Simulate Kiosk Hub:</label>
          <select
            value={activeOfficeLocationCode}
            onChange={(e) => setActiveOfficeLocationCode(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-canvas border border-line text-xs font-semibold text-ink"
          >
            {LOCATIONS.map((l) => (
              <option key={l.code} value={l.code}>
                {l.name} ({l.code})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Pending Closure Verification Sign-Off Alert (SR-07) */}
      {needsSignOff.length > 0 && (
        <div className="bg-peach/65 border border-orange-300 rounded-3xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-peach-text shrink-0 mt-0.5" />
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-peach-text">
                Action Required: Verify Completed IT Repair ({needsSignOff.length})
              </h2>
              <p className="text-xs text-peach-text/90 mt-0.5">
                Ticket <strong>{needsSignOff[0].ticketCode}</strong> ({needsSignOff[0].task} at{' '}
                {needsSignOff[0].location}) was marked resolved by{' '}
                <strong>{needsSignOff[0].workedBy}</strong>. Please confirm before final closure.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => confirmClosure(needsSignOff[0].id)}
              className="px-3.5 py-2 rounded-xl bg-brand hover:bg-brand-hover text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm press-fx"
            >
              <CheckCircle2 className="w-4 h-4" />
              Verify & Confirm Closure
            </button>
            <button
              onClick={() => reopenTicket(needsSignOff[0].id)}
              className="px-3 py-2 rounded-xl bg-surface text-peach-text border border-orange-300 text-xs font-semibold inline-flex items-center gap-1 press-fx"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reopen
            </button>
          </div>
        </div>
      )}

      {/* Main 2-Column Grid: 6-Button Instant Intake Form + Active Terminal Requests */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Left 3/5: 1-Tap Issue Reporting Form */}
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-3 bg-surface border border-line rounded-3xl p-5 shadow-card space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-ink">
              Submit Terminal IT Problem (6-Button Rapid Intake)
            </h2>
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-ink-subtle">
              <Lock className="w-3 h-3 text-emerald-600" /> Auto-Bound to {activeHub.code}
            </span>
          </div>

          <BarcodeDivider count={55} />

          {/* Employee ID & Name Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-ink mb-1">
                Employee ID No. (Auto-Fills Profile)
              </label>
              <input
                type="text"
                value={employeeId}
                onChange={(e) => handleEmployeeLookup(e.target.value)}
                placeholder="e.g. FS-1088 or FS-1042"
                className="w-full px-3 py-2 bg-canvas border border-line rounded-xl text-xs font-mono font-semibold text-ink"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink mb-1">
                Your Name / Booth No.
              </label>
              <input
                type="text"
                value={declaredName}
                onChange={(e) => setDeclaredName(e.target.value)}
                required
                className="w-full px-3 py-2 bg-canvas border border-line rounded-xl text-xs text-ink"
              />
            </div>
          </div>

          {/* 6 Visual Task Category Buttons */}
          <div>
            <label className="block text-xs font-semibold text-ink mb-2">
              Tap the Problem Category (Auto-Derives SLA Priority)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {quickButtons.map((btn) => {
                const active = selectedTask === btn.code;
                return (
                  <button
                    key={btn.code}
                    type="button"
                    onClick={() => setSelectedTask(btn.code)}
                    className={`p-3 rounded-2xl border text-left transition-all flex items-start gap-3 press-fx ${
                      active
                        ? 'bg-zinc-900 text-white border-zinc-900 shadow-sm'
                        : 'bg-canvas/70 hover:bg-canvas text-ink border-line'
                    }`}
                  >
                    <div
                      className={`p-2 rounded-xl shrink-0 ${
                        active ? 'bg-zinc-800' : 'bg-surface border border-line'
                      }`}
                    >
                      {btn.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold truncate">{btn.label}</p>
                      <p
                        className={`text-[11px] truncate mt-0.5 ${
                          active ? 'text-zinc-300' : 'text-ink-subtle'
                        }`}
                      >
                        {btn.sub}
                      </p>
                      <span
                        className={`inline-block mt-1.5 text-[10px] font-mono px-1.5 py-0.5 rounded ${
                          active
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-surface text-ink-subtle border border-line'
                        }`}
                      >
                        Auto-Priority: {btn.priority}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Issue Details */}
          <div>
            <label className="block text-xs font-semibold text-ink mb-1">
              Brief Description (Booth #, Asset Tag, or Error Message)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Booth #3 thermal printer red light blinking after paper roll change..."
              className="w-full px-3 py-2 bg-canvas border border-line rounded-xl text-xs text-ink"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 px-4 rounded-xl bg-brand hover:bg-brand-hover text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition-colors press-fx"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Submit Ticket to Central IT Queue</span>
          </button>
        </form>

        {/* Right 2/5: Live Terminal Ticket Feed */}
        <div className="lg:col-span-2 bg-surface border border-line rounded-3xl p-5 shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-ink">
                {activeHub.name} Requests ({hubTickets.length})
              </h2>
              <span className="text-[11px] font-mono text-ink-subtle">Live Status</span>
            </div>

            <BarcodeDivider count={38} />

            <div className="space-y-2.5 mt-3">
              {hubTickets.length === 0 ? (
                <div className="p-6 text-center bg-canvas rounded-2xl border border-line">
                  <p className="text-xs font-semibold text-ink">
                    No active tickets for {activeHub.name}
                  </p>
                  <p className="text-[11px] text-ink-subtle mt-1">
                    Use the 6-button form on the left to log a terminal issue.
                  </p>
                </div>
              ) : (
                hubTickets.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTicketId(t.id)}
                    className="p-3.5 rounded-2xl bg-canvas border border-line hover:border-zinc-300 cursor-pointer transition-all space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-ink">
                        {t.ticketCode}
                      </span>
                      <StatusBadge status={t.status} size="sm" />
                    </div>
                    <p className="text-xs font-semibold text-ink">{t.task}</p>
                    <p className="text-[11px] text-ink-subtle line-clamp-2">
                      {t.description}
                    </p>
                    <div className="flex items-center justify-between text-[11px] text-ink-faint pt-1 border-t border-line">
                      <span>By: {t.requestor}</span>
                      <span>Tech: {t.workedBy ?? 'Awaiting claim'}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
