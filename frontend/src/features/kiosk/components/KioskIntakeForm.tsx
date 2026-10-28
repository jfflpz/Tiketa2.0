import React from 'react';
import {
  Printer,
  Wifi,
  AppWindow,
  HardDrive,
  Server,
  Wrench,
  CheckCircle2,
  AlertCircle,
  MapPin,
  ArrowRight,
  Loader2,
  Lock,
  Clock,
  Compass,
} from 'lucide-react';
import type { TaskCategoryCode } from '../../../types/ticket';
import {
  formatRemainingTime,
  type LocationObservationState,
} from '../hooks/useEmployeeIntake';

export interface KioskIntakeFormProps {
  employeeId: string;
  onEmployeeIdChange: (val: string) => void;
  registeredEmail: string;
  onRegisteredEmailChange: (val: string) => void;
  isMatching: boolean;
  isMatched: boolean;
  matchError: string | null;
  cooldownSeconds: number;
  onContinueMatching: () => void;
  employeeProfile: {
    fullName: string;
    company: string;
    location: string;
    department: string;
  } | null;
  locationState: LocationObservationState;
  onCaptureLocation: () => void;
  activeHubName: string;
  selectedTask: TaskCategoryCode;
  onSelectTask: (code: TaskCategoryCode) => void;
  description: string;
  onDescriptionChange: (desc: string) => void;
  isSubmitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export const ISSUE_OPTIONS: {
  code: TaskCategoryCode;
  title: string;
  subtitle: string;
  iconName: string;
}[] = [
  {
    code: 'PRN-TS',
    title: 'Printer Issue',
    subtitle: 'Paper jam, blank receipt, or red blinking light',
    iconName: 'printer',
  },
  {
    code: 'NET-CFG',
    title: 'No Internet / Wi-Fi',
    subtitle: 'Slow connection, offline booth, or GPS sync',
    iconName: 'wifi',
  },
  {
    code: 'SW-ASST',
    title: 'POS / Software Help',
    subtitle: 'Ticketing app error, Excel lock, or login issue',
    iconName: 'software',
  },
  {
    code: 'PC-HW-REP',
    title: 'Computer / Monitor',
    subtitle: 'PC won’t turn on, beeping, keyboard or mouse',
    iconName: 'hardware',
  },
  {
    code: 'SRV-ASSESS',
    title: 'Server / CCTV / UPS',
    subtitle: 'Battery backup alarm or camera offline',
    iconName: 'server',
  },
  {
    code: 'PC-PMS',
    title: 'Routine Checkup (PMS)',
    subtitle: 'Request scheduled cleaning or equipment setup',
    iconName: 'pms',
  },
];

export const KioskIntakeForm: React.FC<KioskIntakeFormProps> = ({
  employeeId,
  onEmployeeIdChange,
  registeredEmail,
  onRegisteredEmailChange,
  isMatching,
  isMatched,
  matchError,
  cooldownSeconds,
  onContinueMatching,
  employeeProfile,
  locationState,
  onCaptureLocation,
  activeHubName,
  selectedTask,
  onSelectTask,
  description,
  onDescriptionChange,
  isSubmitting,
  onSubmit,
}) => {
  const isCooldown = cooldownSeconds > 0;

  const renderIcon = (name: string) => {
    switch (name) {
      case 'printer':
        return <Printer className="w-5 h-5 text-rose-500" />;
      case 'wifi':
        return <Wifi className="w-5 h-5 text-sky-500" />;
      case 'software':
        return <AppWindow className="w-5 h-5 text-emerald-600" />;
      case 'hardware':
        return <HardDrive className="w-5 h-5 text-amber-500" />;
      case 'server':
        return <Server className="w-5 h-5 text-purple-600" />;
      case 'pms':
        return <Wrench className="w-5 h-5 text-zinc-600" />;
      default:
        return <Wrench className="w-5 h-5 text-zinc-600" />;
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Step 1: Employee Record Matching */}
      <div className="bg-surface border border-line rounded-3xl p-6 shadow-card space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-zinc-900 text-white text-xs font-bold flex items-center justify-center">
              1
            </span>
            <h3 className="font-bold text-sm text-ink">
              Match Employee Record
            </h3>
          </div>
          <span className="text-[11px] text-ink-subtle">
            Terminal: {activeHubName}
          </span>
        </div>

        <p className="text-xs text-ink-subtle leading-relaxed">
          Enter your numeric Employee ID and registered company email address. Matching your employee record ensures the ticket is assigned to the correct terminal and department.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {/* Employee ID */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-ink">
              Employee ID No.
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={employeeId}
              onChange={(e) => onEmployeeIdChange(e.target.value)}
              placeholder="e.g. 1042"
              disabled={isMatching || isCooldown}
              className="w-full px-4 py-3 bg-canvas border border-line rounded-2xl text-sm font-bold text-ink tracking-wider focus:outline-none focus:border-zinc-500 disabled:opacity-60 transition-colors"
            />
            <span className="text-[10px] text-ink-faint">
              1–50 digits (leading zeros preserved)
            </span>
          </div>

          {/* Registered Email */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-ink">
              Registered Email
            </label>
            <input
              type="email"
              value={registeredEmail}
              onChange={(e) => onRegisteredEmailChange(e.target.value)}
              placeholder="e.g. employee@fivestarbus.com"
              disabled={isMatching || isCooldown}
              className="w-full px-4 py-3 bg-canvas border border-line rounded-2xl text-sm font-medium text-ink focus:outline-none focus:border-zinc-500 disabled:opacity-60 transition-colors"
            />
            <span className="text-[10px] text-ink-faint">
              Accepts any registered provider domain
            </span>
          </div>
        </div>

        {/* Continue Button & Status */}
        <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
          <button
            type="button"
            onClick={onContinueMatching}
            disabled={
              isMatching ||
              isCooldown ||
              !employeeId.trim() ||
              !registeredEmail.trim()
            }
            className={`w-full sm:w-auto px-6 py-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all press-fx ${
              isCooldown
                ? 'bg-amber-100 text-amber-800 border border-amber-300 cursor-not-allowed'
                : isMatched
                ? 'bg-zinc-800 text-white hover:bg-zinc-700'
                : 'bg-zinc-900 text-white hover:bg-zinc-800 disabled:opacity-50'
            }`}
          >
            {isMatching ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Matching Record...</span>
              </>
            ) : isCooldown ? (
              <>
                <Clock className="w-3.5 h-3.5 text-amber-700 animate-pulse" />
                <span>Please try again in {formatRemainingTime(cooldownSeconds)}</span>
              </>
            ) : (
              <>
                <span>{isMatched ? 'Re-Verify Record' : 'Continue'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>

          {isCooldown && (
            <span className="text-[11px] text-amber-700 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              Cooldown active to prevent abuse. Matching will re-enable automatically.
            </span>
          )}
        </div>

        {/* Mismatch Error */}
        {matchError && !isCooldown && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{matchError}</span>
          </div>
        )}

        {/* Matched Profile Card */}
        {isMatched && employeeProfile && (
          <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="text-xs font-bold text-emerald-950">
                  Employee details matched.
                </span>
              </div>
              <span className="text-[10px] font-bold text-emerald-800 bg-white border border-emerald-200 px-2.5 py-0.5 rounded-full">
                Directory Bound
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
              <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-100">
                <span className="block text-[10px] uppercase font-semibold text-emerald-800">
                  Full Name
                </span>
                <strong className="text-ink block truncate">{employeeProfile.fullName}</strong>
              </div>
              <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-100">
                <span className="block text-[10px] uppercase font-semibold text-emerald-800">
                  Company
                </span>
                <strong className="text-ink block truncate">{employeeProfile.company}</strong>
              </div>
              <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-100">
                <span className="block text-[10px] uppercase font-semibold text-emerald-800">
                  Terminal
                </span>
                <strong className="text-ink block truncate">{employeeProfile.location}</strong>
              </div>
              <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-100">
                <span className="block text-[10px] uppercase font-semibold text-emerald-800">
                  Department
                </span>
                <strong className="text-ink block truncate">{employeeProfile.department}</strong>
              </div>
            </div>

            <p className="text-[11px] text-emerald-800/80 leading-normal">
              Notice: Matching confirms these details correspond to an active personnel record. It is not cryptographic proof of identity.
            </p>
          </div>
        )}

        {/* Optional Geolocation Capture */}
        <div className="pt-2 border-t border-line/60">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 bg-canvas/60 border border-line rounded-2xl">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-ink">
                <Compass className="w-3.5 h-3.5 text-brand" />
                <span>Terminal Bay Location (Optional)</span>
              </div>
              <p className="text-[11px] text-ink-subtle">
                Sharing location telemetry helps dispatchers identify your terminal bay. Not required to submit.
              </p>
            </div>

            <div className="shrink-0 flex items-center gap-2">
              {locationState.status === 'captured' ? (
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>
                    Location captured
                    {locationState.accuracy ? ` (±${locationState.accuracy}m)` : ''}
                  </span>
                </div>
              ) : locationState.status === 'requesting' ? (
                <div className="flex items-center gap-1.5 text-xs font-medium text-ink-subtle bg-surface px-3 py-1.5 rounded-xl border border-line">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Requesting GPS...</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={onCaptureLocation}
                  className="px-3.5 py-1.5 bg-surface hover:bg-zinc-100 border border-line rounded-xl text-xs font-semibold text-ink flex items-center gap-1.5 transition-colors press-fx"
                >
                  <MapPin className="w-3.5 h-3.5 text-ink-subtle" />
                  <span>Capture Location</span>
                </button>
              )}
            </div>
          </div>

          {locationState.message && locationState.status !== 'captured' && (
            <p className="text-[11px] text-ink-subtle mt-1.5 px-1">
              {locationState.message}
            </p>
          )}
        </div>
      </div>

      {/* Step 2: 6 Visual Issue Buttons */}
      <div
        className={`bg-surface border border-line rounded-3xl p-6 shadow-card space-y-4 transition-opacity ${
          !isMatched ? 'opacity-60 pointer-events-none' : 'opacity-100'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-zinc-900 text-white text-xs font-bold flex items-center justify-center">
              2
            </span>
            <h3 className="font-bold text-sm text-ink">
              What seems to be the problem?
            </h3>
          </div>
          <span className="text-[11px] text-ink-subtle">
            {!isMatched ? 'Unlock by matching employee record above' : 'Tap the category that best matches'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {ISSUE_OPTIONS.map((item) => {
            const isSelected = selectedTask === item.code;
            return (
              <button
                key={item.code}
                type="button"
                disabled={!isMatched}
                onClick={() => onSelectTask(item.code)}
                className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition-all press-fx ${
                  isSelected
                    ? 'bg-zinc-900 text-white border-zinc-900 shadow-md ring-2 ring-zinc-900/10'
                    : 'bg-canvas hover:bg-surface border-line text-ink hover:border-zinc-300'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      isSelected ? 'bg-zinc-800' : 'bg-surface shadow-xs border border-line'
                    }`}
                  >
                    {renderIcon(item.iconName)}
                  </div>
                  {isSelected && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-xs leading-snug">{item.title}</h4>
                  <p
                    className={`text-[11px] mt-1 leading-normal ${
                      isSelected ? 'text-zinc-400' : 'text-ink-subtle'
                    }`}
                  >
                    {item.subtitle}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step 3: Optional Extra Description & Submit Button */}
      <div
        className={`bg-surface border border-line rounded-3xl p-6 shadow-card space-y-4 transition-opacity ${
          !isMatched ? 'opacity-60 pointer-events-none' : 'opacity-100'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-zinc-900 text-white text-xs font-bold flex items-center justify-center">
              3
            </span>
            <h3 className="font-bold text-sm text-ink">
              Additional Details (Optional)
            </h3>
          </div>
          <span className="text-[11px] text-ink-subtle">
            e.g. Cash booth #, terminal bay
          </span>
        </div>

        <div className="space-y-1.5">
          <textarea
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            disabled={!isMatched}
            placeholder="Briefly describe what happened (e.g. Booth 2 receipt cutter jammed during shift change)..."
            rows={3}
            className="w-full px-4 py-3 bg-canvas border border-line rounded-2xl text-xs text-ink placeholder:text-ink-faint focus:outline-none focus:border-zinc-500 transition-colors"
          />
          <div className="flex justify-between items-center text-[11px] text-ink-subtle px-1">
            <span>
              {description.trim().length === 0
                ? 'Optional: An automated issue summary will be used if left blank.'
                : description.trim().length < 10
                ? `${description.trim().length}/10 chars (auto-completed if under 10 chars)`
                : `${description.trim().length} characters`}
            </span>
            <span className="text-ink-faint">Min. 10 chars</span>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !isMatched}
          className="w-full py-4 px-6 rounded-2xl bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all press-fx"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Sending Ticket to IT Support...</span>
            </>
          ) : !isMatched ? (
            <>
              <Lock className="w-4 h-4" />
              <span>Match Employee Details to Submit</span>
            </>
          ) : (
            <>
              <span>Submit Help Request</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </form>
  );
};
