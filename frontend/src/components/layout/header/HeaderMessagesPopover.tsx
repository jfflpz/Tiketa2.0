import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Mail, MessageSquare, CheckCircle2 } from 'lucide-react';
import type { Ticket } from '../../../types/ticket';

export interface HeaderMessagesPopoverProps {
  tickets: Ticket[];
  onSelectTicket: (ticketId: string) => void;
  onClaimAndChat: (e: React.MouseEvent, ticket: Ticket) => void;
}

export const HeaderMessagesPopover: React.FC<HeaderMessagesPopoverProps> = ({
  tickets,
  onSelectTicket,
  onClaimAndChat,
}) => {
  const [mailOpen, setMailOpen] = useState(false);
  const [mailTab, setMailTab] = useState<'chats' | 'unassigned'>('chats');
  const mailRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (mailRef.current && !mailRef.current.contains(e.target as Node)) {
        setMailOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMailOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const ticketsWithMessages = useMemo(
    () => tickets.filter((t) => t.messages && t.messages.length > 0),
    [tickets]
  );

  const unassignedTickets = useMemo(
    () => tickets.filter((t) => t.status === 'OPEN' && !t.workedBy),
    [tickets]
  );

  const totalMailCount = ticketsWithMessages.length + unassignedTickets.length;

  return (
    <div className="relative" ref={mailRef}>
      <button
        type="button"
        onClick={() => setMailOpen(!mailOpen)}
        className={`relative p-2 rounded-lg transition-colors active:scale-95 ${
          mailOpen ? 'bg-orange-50 text-orange-600' : 'hover:bg-zinc-100 text-zinc-600'
        }`}
        title="Messages & Unassigned Dispatch Pool"
        aria-label="Messages and Dispatches"
      >
        <Mail className="w-4 h-4" />
        {totalMailCount > 0 && (
          <span className="px-1 min-w-[16px] h-4 rounded-full bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center absolute -top-0.5 -right-0.5 shadow-sm">
            {totalMailCount}
          </span>
        )}
      </button>

      {mailOpen && (
        <div className="absolute right-0 top-full mt-2 w-96 max-w-[92vw] bg-white rounded-xl shadow-2xl border border-zinc-200/90 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-4 py-3 bg-zinc-50 border-b border-zinc-100 flex items-center justify-between">
            <span className="text-xs font-bold text-ink">Messages &amp; Dispatches</span>
            <span className="text-[11px] text-zinc-400">Click to reply</span>
          </div>

          <div className="grid grid-cols-2 p-1.5 bg-zinc-100/70 border-b border-zinc-200/70 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setMailTab('chats')}
              className={`py-1.5 rounded-lg text-center transition-all ${
                mailTab === 'chats'
                  ? 'bg-white text-ink shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              Active Chats ({ticketsWithMessages.length})
            </button>
            <button
              type="button"
              onClick={() => setMailTab('unassigned')}
              className={`py-1.5 rounded-lg text-center transition-all ${
                mailTab === 'unassigned'
                  ? 'bg-white text-ink shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              Unassigned ({unassignedTickets.length})
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-zinc-100">
            {mailTab === 'chats' ? (
              ticketsWithMessages.length === 0 ? (
                <div className="p-8 text-center">
                  <MessageSquare className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-ink">No active chat messages</p>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    Employee conversations will appear here in real-time.
                  </p>
                </div>
              ) : (
                ticketsWithMessages.map((t) => {
                  const lastMsg = t.messages![t.messages!.length - 1];
                  const isEmployee = lastMsg.senderRole === 'employee';
                  return (
                    <div
                      key={t.id}
                      onClick={() => {
                        onSelectTicket(t.id);
                        setMailOpen(false);
                      }}
                      className="p-3 hover:bg-orange-50/40 transition-colors cursor-pointer flex items-start gap-3 group"
                    >
                      <div className="w-8 h-8 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-zinc-700">
                          {lastMsg.senderName.slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-bold text-ink truncate">
                            {lastMsg.senderName}
                          </span>
                          <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-zinc-100 text-zinc-700 shrink-0">
                            {t.ticketCode}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-600 mt-0.5 line-clamp-2">
                          {lastMsg.message}
                        </p>
                        <div className="flex items-center justify-between gap-1 mt-1 text-[10px] text-zinc-400">
                          <span>
                            {isEmployee ? '👤 Requestor' : '🛠️ IT Tech'} • {t.location}
                          </span>
                          <span>{lastMsg.timestamp}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )
            ) : unassignedTickets.length === 0 ? (
              <div className="p-8 text-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-xs font-bold text-ink">Queue is clear</p>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  All submitted tickets have been claimed by technicians.
                </p>
              </div>
            ) : (
              unassignedTickets.map((t) => (
                <div
                  key={t.id}
                  className="p-3 hover:bg-orange-50/40 transition-colors flex items-start justify-between gap-2"
                >
                  <div
                    className="min-w-0 flex-1 cursor-pointer"
                    onClick={() => {
                      onSelectTicket(t.id);
                      setMailOpen(false);
                    }}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded bg-zinc-900 text-white">
                        {t.ticketCode}
                      </span>
                      <span className="font-bold text-xs text-ink truncate">{t.task}</span>
                    </div>
                    <p className="text-[11px] text-zinc-500 mt-0.5 truncate">
                      {t.requestor} • {t.location} ({t.department})
                    </p>
                    <p className="text-[10px] text-zinc-400 mt-0.5">
                      Opened at {t.timeStarted} • {t.priority} Priority
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      onClaimAndChat(e, t);
                      setMailOpen(false);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-orange-500 hover:bg-orange-600 active:scale-95 text-white text-[11px] font-bold shrink-0 transition-all shadow-sm"
                  >
                    Claim &amp; Chat
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
