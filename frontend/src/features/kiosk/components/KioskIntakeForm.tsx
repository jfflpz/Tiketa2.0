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
} from 'lucide-react';
import type { TaskCategoryCode } from '../../../types/ticket';

export interface KioskIntakeFormProps {
  employeeId: string;
  onEmployeeIdChange: (val: string) => void;
  declaredName: string;
  isSearchingEmployee: boolean;
  employeeVerified: boolean;
  lookupError: string | null;
  employeeDetails: {
    company?: string;
    location?: string;
    department?: string;
  };
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
  declaredName,
  isSearchingEmployee,
  employeeVerified,
  lookupError,
  employeeDetails,
  activeHubName,
  selectedTask,
  onSelectTask,
  description,
  onDescriptionChange,
  isSubmitting,
  onSubmit,
}) => {
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
      {/* Step 1: Employee ID & Auto-Detected Location */}
      <div className="bg-surface border border-line rounded-3xl p-6 shadow-card space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-zinc-900 text-white text-xs font-bold flex items-center justify-center">
              1
            </span>
            <h3 className="font-bold text-sm text-ink">
              Verify Your Employee Profile
            </h3>
          </div>
          <span className="text-[11px] text-ink-subtle">
            Required for ticket dispatch
          </span>
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-semibold text-ink-subtle">
            Enter your Employee ID No. (e.g. FS-1042)
          </label>
          <div className="relative">
            <input
              type="text"
              value={employeeId}
              onChange={(e) => onEmployeeIdChange(e.target.value.toUpperCase())}
              placeholder="e.g. FS-1042"
              className="w-full px-4 py-3 bg-canvas border border-line rounded-2xl text-sm font-bold text-ink uppercase tracking-wider focus:outline-none focus:border-zinc-500 transition-colors"
            />
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-2">
              {isSearchingEmployee && (
                <Loader2 className="w-4 h-4 text-ink-faint animate-spin" />
              )}
              {employeeVerified && (
                <span className="flex items-center gap-1 text-xs font-bold text-brand bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{declaredName}</span>
                </span>
              )}
            </div>
          </div>

          {lookupError && (
            <p className="text-xs text-rose-600 flex items-center gap-1.5 pt-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{lookupError}</span>
            </p>
          )}

          {/* Reassuring Auto-Bound Location Pill */}
          <div
            className={`p-3 rounded-2xl border text-xs flex items-center justify-between transition-colors ${
              employeeVerified
                ? 'bg-emerald-50/70 border-emerald-200/80 text-emerald-950'
                : 'bg-canvas border-line text-ink-subtle'
            }`}
          >
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-brand shrink-0" />
              <span>
                Terminal Location:{' '}
                <strong>{employeeDetails.location ?? activeHubName}</strong> •
                Department:{' '}
                <strong>{employeeDetails.department ?? 'Operation'}</strong>
              </span>
            </div>
            <span
              className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full border ${
                employeeVerified
                  ? 'bg-white text-brand border-emerald-200'
                  : 'bg-canvas text-ink-faint border-line'
              }`}
            >
              {employeeVerified ? 'Verified Profile' : 'Pending Verification'}
            </span>
          </div>
        </div>
      </div>

      {/* Step 2: 6 Visual Issue Buttons */}
      <div className="bg-surface border border-line rounded-3xl p-6 shadow-card space-y-4">
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
            Tap the category that best matches
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {ISSUE_OPTIONS.map((item) => {
            const isSelected = selectedTask === item.code;
            return (
              <button
                key={item.code}
                type="button"
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
      <div className="bg-surface border border-line rounded-3xl p-6 shadow-card space-y-4">
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

        <textarea
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="Briefly describe what happened (e.g. Booth 2 receipt cutter jammed during shift change)..."
          rows={3}
          className="w-full px-4 py-3 bg-canvas border border-line rounded-2xl text-xs text-ink placeholder:text-ink-faint focus:outline-none focus:border-zinc-500 transition-colors"
        />

        <button
          type="submit"
          disabled={isSubmitting || !employeeVerified}
          className="w-full py-4 px-6 rounded-2xl bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all press-fx"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Sending Ticket to IT Support...</span>
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
