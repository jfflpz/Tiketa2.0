import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Bell,
  CheckCircle2,
  Clock,
  Flame,
  Copy,
  Check,
  ChevronRight,
} from 'lucide-react';
import type { Ticket } from '../../../types/ticket';

export interface HeaderNotificationsPopoverProps {
  tickets: Ticket[];
  onSelectTicket: (ticketId: string) => void;
  onViewAllInQueue: () => void;
  onCopyShareLink: (ticketCode: string) => Promise<void>;
}

const getPriorityBadge = (priority: Ticket['priority']) => {
  switch (priority) {
    case 'Critical':
      return 'bg-rose-50 text-rose-700 border-rose-200';
    case 'High':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'Medium':
      return 'bg-sky-50 text-sky-700 border-sky-200';
    case 'Low':
      return 'bg-zinc-100 text-zinc-600 border-zinc-200';
  }
};

export const HeaderNotificationsPopover: React.FC<HeaderNotificationsPopoverProps> = ({
  tickets,
  onSelectTicket,
  onViewAllInQueue,
  onCopyShareLink,
}) => {
  const [notifOpen, setNotifOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setNotifOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const pendingVerifications = useMemo(
    () => tickets.filter((t) => t.status === 'RESL'),
    [tickets]
  );

  const priorityAlerts = useMemo(
    () =>
      tickets.filter(
        (t) =>
          (t.priority === 'Critical' || t.priority === 'High') &&
          t.status !== 'CLSD' &&
          t.status !== 'RESL'
      ),
    [tickets]
  );

  const totalNotifCount = pendingVerifications.length + priorityAlerts.length;

  const handleCopy = async (e: React.MouseEvent, code: string) => {
    e.stopPropagation();
    await onCopyShareLink(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="relative" ref={notifRef}>
      <button
        type="button"
        onClick={() => setNotifOpen(!notifOpen)}
        className={`relative p-2 rounded-lg transition-colors active:scale-95 ${
          notifOpen ? 'bg-orange-50 text-orange-600' : 'hover:bg-zinc-100 text-zinc-600'
        }`}
        title="Notifications & Verification Alerts"
        aria-label="Notifications"
      >
        <Bell className="w-4 h-4" />
        {totalNotifCount > 0 && (
          <span className="px-1 min-w-[16px] h-4 rounded-full bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center absolute -top-0.5 -right-0.5 shadow-sm">
            {totalNotifCount}
          </span>
        )}
      </button>

      {notifOpen && (
        <div className="absolute right-0 top-full mt-2 w-96 max-w-[92vw] bg-white rounded-xl shadow-2xl border border-zinc-200/90 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-4 py-3 bg-zinc-50 border-b border-zinc-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-ink">Notifications</span>
              {totalNotifCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700 text-[10px] font-bold">
                  {totalNotifCount} action required
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                onViewAllInQueue();
                setNotifOpen(false);
              }}
              className="text-[11px] font-semibold text-orange-600 hover:text-orange-700"
            >
              View All in Queue
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-zinc-100">
            {totalNotifCount === 0 ? (
              <div className="p-8 text-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-xs font-bold text-ink">All caught up!</p>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  No pending employee verifications or urgent alerts.
                </p>
              </div>
            ) : (
              <>
                {/* Section: Pending Closure Verifications */}
                {pendingVerifications.length > 0 && (
                  <div className="p-2">
                    <div className="px-2 py-1 text-[10px] font-bold tracking-wider text-amber-700 uppercase flex items-center gap-1.5">
                      <Clock className="w-3 h-3" />
                      <span>Awaiting Employee Sign-Off ({pendingVerifications.length})</span>
                    </div>
                    {pendingVerifications.map((t) => (
                      <div
                        key={t.id}
                        onClick={() => {
                          onSelectTicket(t.id);
                          setNotifOpen(false);
                        }}
                        className="p-2.5 rounded-lg hover:bg-amber-50/60 transition-colors cursor-pointer flex items-start justify-between gap-2 text-xs"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded bg-zinc-900 text-white">
                              {t.ticketCode}
                            </span>
                            <span className="font-bold text-ink truncate">{t.task}</span>
                          </div>
                          <p className="text-[11px] text-zinc-500 mt-1 truncate">
                            Repaired by {t.workedBy ?? 'IT'} • Awaiting {t.requestor} ({t.location})
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => handleCopy(e, t.ticketCode)}
                            className="px-2 py-1 rounded bg-white hover:bg-amber-100 text-amber-800 border border-amber-200 text-[11px] font-bold transition-colors active:scale-95 flex items-center gap-1"
                            title="Copy employee verification share link"
                          >
                            {copiedCode === t.ticketCode ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-600" />
                                <span>Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3 text-amber-700" />
                                <span>Link</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Section: Critical & High Priority Alerts */}
                {priorityAlerts.length > 0 && (
                  <div className="p-2">
                    <div className="px-2 py-1 text-[10px] font-bold tracking-wider text-rose-700 uppercase flex items-center gap-1.5">
                      <Flame className="w-3 h-3" />
                      <span>Urgent Tickets ({priorityAlerts.length})</span>
                    </div>
                    {priorityAlerts.map((t) => (
                      <div
                        key={t.id}
                        onClick={() => {
                          onSelectTicket(t.id);
                          setNotifOpen(false);
                        }}
                        className="p-2.5 rounded-lg hover:bg-rose-50/60 transition-colors cursor-pointer flex items-start justify-between gap-2 text-xs"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded bg-zinc-900 text-white">
                              {t.ticketCode}
                            </span>
                            <span className="font-bold text-ink truncate">{t.task}</span>
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${getPriorityBadge(
                                t.priority
                              )}`}
                            >
                              {t.priority}
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-500 mt-1 truncate">
                            {t.requestor} • {t.location} • Status: {t.status}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-zinc-300 shrink-0 self-center" />
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
