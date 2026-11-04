import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  MessageSquare,
  Send,
  Lock,
  ArrowDown,
  AlertCircle,
  Users,
} from 'lucide-react';
import type { Ticket, TicketChatMessage } from '../../../types/ticket';
import { useAppStore } from '../../../store/useAppStore';

export interface JobLogDrawerChatProps {
  ticket: Ticket;
  techSenderName: string;
  onSendMessage: (msg: string, isInternal: boolean) => Promise<unknown> | unknown;
}

const IT_QUICK_REPLIES = [
  'Can you share your AnyDesk ID so I can connect remotely?',
  'I am on my way to your workstation now.',
  'Please restart the application and let me know if it works.',
  'Repair is complete! Please click Confirm Resolved in My Tickets.',
];

export const JobLogDrawerChat: React.FC<JobLogDrawerChatProps> = ({
  ticket,
  techSenderName,
  onSendMessage,
}) => {
  const fetchTicketCommentsApi = useAppStore((state) => state.fetchTicketCommentsApi);
  const authSessionId = useAppStore((state) => state.authSessionId);
  const currentUser = useAppStore((state) => state.currentUser);

  const [chatDraft, setChatDraft] = useState('');
  const [isInternalMode, setIsInternalMode] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [hasUnseenNewMessage, setHasUnseenNewMessage] = useState(false);

  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const isFetchingRef = useRef(false);
  const activeTicketIdRef = useRef(ticket.id);
  const previousMessageCountRef = useRef(ticket.messages?.length ?? 0);

  activeTicketIdRef.current = ticket.id;

  const messages: TicketChatMessage[] = ticket.messages ?? [];

  // @spec F-07: Bounded 3-second two-way chat polling gated by document.visibilityState === 'visible'
  const pollComments = useCallback(async () => {
    if (document.visibilityState !== 'visible') return;
    if (isFetchingRef.current) return;
    if (!ticket.id || ticket.id.startsWith('t-')) return;

    isFetchingRef.current = true;
    try {
      await fetchTicketCommentsApi(ticket.id);
    } finally {
      isFetchingRef.current = false;
    }
  }, [ticket.id, fetchTicketCommentsApi]);

  useEffect(() => {
    // Initial fetch when drawer opens or ticket changes
    pollComments();

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        pollComments();
      }
    }, 3000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        pollComments();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [ticket.id, authSessionId, currentUser?.role, pollComments]);

  // Auto-scroll logic: scroll to bottom if user is already near bottom (< 80px),
  // otherwise show "New message ↓" banner to avoid hijacking scroll position while reading history.
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const count = messages.length;
    const isNewMessage = count > previousMessageCountRef.current;
    previousMessageCountRef.current = count;

    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    const isNearBottom = distanceFromBottom < 80;

    if (isNearBottom) {
      if (typeof container.scrollTo === 'function') {
        container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
      } else {
        container.scrollTop = container.scrollHeight;
      }
      setHasUnseenNewMessage(false);
    } else if (isNewMessage) {
      setHasUnseenNewMessage(true);
    }
  }, [messages]);

  const scrollToBottom = () => {
    const container = messagesContainerRef.current;
    if (container) {
      if (typeof container.scrollTo === 'function') {
        container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
      } else {
        container.scrollTop = container.scrollHeight;
      }
      setHasUnseenNewMessage(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatDraft.trim() || isSending) return;
    const msg = chatDraft.trim();
    setIsSending(true);
    setSendError(null);

    try {
      const res = await onSendMessage(msg, isInternalMode);
      if (res === false) {
        // Failed: preserve draft in composer
        setSendError('Message delivery failed. Draft preserved.');
      } else {
        setChatDraft('');
        scrollToBottom();
      }
    } catch {
      setSendError('Message delivery failed. Draft preserved.');
    } finally {
      setIsSending(false);
    }
  };

  const handleQuickReply = (replyText: string) => {
    onSendMessage(replyText, false);
    scrollToBottom();
  };

  return (
    <div className="space-y-3.5 flex flex-col h-full relative">
      {/* Ticket Context Header */}
      <div className="bg-canvas border border-line rounded-2xl p-3 flex items-center justify-between gap-3 text-xs">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-ink-faint block">
            Reported Symptom
          </span>
          <p className="font-semibold text-ink truncate max-w-xs">{ticket.description}</p>
        </div>
        <div className="text-right shrink-0">
          <span className="text-[10px] font-bold uppercase tracking-wider text-ink-faint block">
            Claimed Tech
          </span>
          <span className="font-bold text-ink">{ticket.workedBy ?? 'Unassigned'}</span>
        </div>
      </div>

      {/* Chat Messages Feed */}
      <div
        ref={messagesContainerRef}
        aria-label="Ticket conversation feed"
        className="bg-canvas border border-line rounded-2xl p-4 space-y-3 min-h-[260px] max-h-[320px] overflow-y-auto relative"
      >
        {messages.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <MessageSquare className="w-7 h-7 text-ink-faint mx-auto" />
            <p className="text-xs font-semibold text-ink">
              No messages with {ticket.requestor} yet
            </p>
            <p className="text-[11px] text-ink-subtle max-w-xs mx-auto">
              Live messages poll every 3 seconds while this drawer is open.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            // @spec F-07: Canonical author role mapping: employee messages must not be presented as IT replies
            const isInternal = Boolean(msg.isInternal);
            const isEmployee = msg.senderRole === 'employee';
            const isIT = !isEmployee;

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isIT && !isInternal ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center gap-1.5 mb-1 px-1">
                  <span className="text-[10px] font-bold text-ink-subtle">
                    {msg.senderName}
                  </span>
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                      isInternal
                        ? 'bg-amber-100 text-amber-800'
                        : isEmployee
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-orange-50 text-[#F97316] border border-orange-200'
                    }`}
                  >
                    {isInternal ? (
                      <span className="flex items-center gap-0.5">
                        <Lock className="w-2.5 h-2.5" /> Internal Note
                      </span>
                    ) : isEmployee ? (
                      'Employee'
                    ) : (
                      'IT Support'
                    )}
                  </span>
                  {msg.timestamp && (
                    <span className="text-[10px] font-mono text-ink-faint">
                      {msg.timestamp}
                    </span>
                  )}
                </div>
                <div
                  className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${
                    isInternal
                      ? 'bg-amber-50 border border-amber-300 text-amber-900 rounded-bl-xs shadow-xs'
                      : isEmployee
                      ? 'bg-white border border-line text-ink rounded-bl-xs shadow-xs'
                      : 'bg-[#111315] text-white rounded-br-xs shadow-xs'
                  }`}
                >
                  {msg.message}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* New Message Floating Cue */}
      {hasUnseenNewMessage && (
        <button
          type="button"
          onClick={scrollToBottom}
          className="absolute bottom-28 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold shadow-lg flex items-center gap-1 animate-bounce z-10"
        >
          <span>New messages</span>
          <ArrowDown className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Quick Replies */}
      {!isInternalMode && (
        <div className="space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-ink-subtle">
            One-Click Quick Replies
          </span>
          <div className="flex flex-wrap gap-1.5">
            {IT_QUICK_REPLIES.map((reply) => (
              <button
                key={reply}
                type="button"
                onClick={() => handleQuickReply(reply)}
                className="text-left text-[11px] px-2.5 py-1 rounded-xl bg-canvas hover:bg-zinc-100 text-ink border border-line transition-colors press-fx"
              >
                + {reply}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Composer Mode Selector: Send to Employee vs Internal Note */}
      <div className="flex items-center gap-2 pt-1 border-t border-line/60">
        <button
          type="button"
          onClick={() => setIsInternalMode(false)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            !isInternalMode
              ? 'bg-zinc-900 text-white shadow-xs'
              : 'bg-canvas text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Send to Employee</span>
        </button>

        <button
          type="button"
          onClick={() => setIsInternalMode(true)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            isInternalMode
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-canvas text-zinc-500 hover:text-amber-800 hover:bg-amber-50'
          }`}
        >
          <Lock className="w-3.5 h-3.5" />
          <span>Internal Note (Hidden)</span>
        </button>
      </div>

      {/* Delivery Error Notice */}
      {sendError && (
        <div
          role="alert"
          className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2"
        >
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{sendError}</span>
        </div>
      )}

      {/* Message Composer Form */}
      <form onSubmit={handleSend} className="space-y-2">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={chatDraft}
            onChange={(e) => {
              setChatDraft(e.target.value);
              if (sendError) setSendError(null);
            }}
            placeholder={
              isInternalMode
                ? 'Add confidential note visible only to IT staff...'
                : `Message ${ticket.requestor} as ${techSenderName}...`
            }
            className={`flex-1 px-3.5 py-2.5 rounded-xl text-xs text-ink focus:outline-none transition-colors ${
              isInternalMode
                ? 'bg-amber-50/60 border border-amber-300 focus:border-amber-600 placeholder:text-amber-700/60'
                : 'bg-canvas border border-line focus:border-zinc-900'
            }`}
          />
          <button
            type="submit"
            disabled={!chatDraft.trim() || isSending}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors press-fx text-white disabled:opacity-40 ${
              isInternalMode
                ? 'bg-amber-600 hover:bg-amber-700'
                : 'bg-[#111315] hover:bg-orange-500'
            }`}
          >
            {isInternalMode ? (
              <>
                <Lock className="w-3.5 h-3.5" />
                <span>Save Note</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Send</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
