// @spec SR-08: Sub-100ms tactile toast feedback container
// @spec BF-01: Normalized toast description string rendering to prevent React object child crashes
import React from 'react';
import { CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { readableError } from '../../utils/errorMessages';

export const ToastContainer: React.FC = () => {
  const toasts = useAppStore((state) => state.toasts);
  const removeToast = useAppStore((state) => state.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-5 right-5 z-[80] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto bg-zinc-900 text-white border border-zinc-800 rounded-xl px-4 py-3 shadow-lg flex items-start gap-3 transition-all duration-150"
        >
          <div className="mt-0.5 shrink-0">
            {t.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
            {t.type === 'info' && <Info className="w-4 h-4 text-sky-400" />}
            {t.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-400" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold leading-tight">{readableError(t.title, 'Notification')}</p>
            {t.description && (
              <p className="text-[11px] text-zinc-400 mt-0.5 leading-snug">{readableError(t.description, 'The request could not be completed. Please try again.')}</p>
            )}
          </div>
          <button
            onClick={() => removeToast(t.id)}
            className="text-zinc-500 hover:text-zinc-300 p-0.5 transition-colors"
            aria-label="Dismiss toast"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
