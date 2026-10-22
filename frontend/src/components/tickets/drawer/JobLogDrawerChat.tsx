import React, { useState } from 'react';
import { MessageSquare, Send, Lock } from 'lucide-react';
import type { Ticket } from '../../../types/ticket';

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
  const [chatDraft, setChatDraft] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const messages = ticket.messages ?? [];

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatDraft.trim() || isSending) return;
    const msg = chatDraft.trim();
    setChatDraft('');
    setIsSending(true);
    try {
      await onSendMessage(msg, isInternalNote);
    } finally {
      setIsSending(false);
    }
  };

  const handleQuickReply = (replyText: string) => {
    onSendMessage(replyText, isInternalNote);
  };

  return (
    <div className="space-y-4 flex flex-col h-full">
      {/* Quick Ticket Context Bar */}
      <div className="bg-canvas border border-line rounded-2xl p-3.5 flex items-center justify-between gap-3">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-ink-faint block">
            Reported Symptom
          </span>
          <p className="text-xs font-medium text-ink mt-0.5">{ticket.description}</p>
        </div>
        <div className="text-right shrink-0">
          <span className="text-[10px] font-bold uppercase tracking-wider text-ink-faint block">
            Claimed By
          </span>
          <span className="text-xs font-bold text-ink">
            {ticket.workedBy ?? 'Unassigned'}
          </span>
        </div>
      </div>

      {/* Chat Message Feed */}
      <div className="bg-canvas border border-line rounded-2xl p-4 space-y-3 min-h-[260px] max-h-[340px] overflow-y-auto">
        {messages.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <MessageSquare className="w-7 h-7 text-ink-faint mx-auto" />
            <p className="text-xs font-semibold text-ink">
              No messages with {ticket.requestor} yet
            </p>
            <p className="text-[11px] text-ink-subtle max-w-xs mx-auto">
              Send a quick question or update below. The employee will see your message
              immediately in their &ldquo;My Tickets&rdquo; view.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isIT = msg.senderRole === 'it';
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isIT ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center gap-1.5 mb-1 px-1">
                  <span className="text-[10px] font-bold text-ink-subtle">
                    {msg.senderName}
                  </span>
                  <span
                    className={`text-[9px] font-semibold px-1.5 py-0.2 rounded ${
                      isIT
                        ? 'bg-orange-50 text-[#F97316]'
                        : 'bg-emerald-50 text-emerald-700'
                    }`}
                  >
                    {isIT ? 'IT Support' : 'Employee'}
                  </span>
                  {msg.isInternal && (
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 flex items-center gap-0.5">
                      <Lock className="w-2.5 h-2.5" /> Note
                    </span>
                  )}
                  <span className="text-[10px] font-mono text-ink-faint">
                    {msg.timestamp}
                  </span>
                </div>
                <div
                  className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${
                    msg.isInternal
                      ? 'bg-amber-50 border border-amber-300 text-amber-900 rounded-br-xs shadow-xs'
                      : isIT
                      ? 'bg-[#111315] text-white rounded-br-xs shadow-xs'
                      : 'bg-surface border border-line text-ink rounded-bl-xs shadow-xs'
                  }`}
                >
                  {msg.message}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Quick-Reply Templates for Technician Speed */}
      <div className="space-y-1.5">
        <span className="text-[10px] font-bold uppercase tracking-wider text-ink-subtle">
          One-Click Quick Replies
        </span>
        <div className="flex flex-wrap gap-1.5">
          {IT_QUICK_REPLIES.map((reply) => (
            <button
              key={reply}
              type="button"
              onClick={() => handleQuickReply(reply)}
              className="text-left text-[11px] px-2.5 py-1.5 rounded-xl bg-canvas hover:bg-zinc-100 text-ink border border-line transition-colors press-fx"
            >
              + {reply}
            </button>
          ))}
        </div>
      </div>

      {/* Message Composer with Internal Note Toggle */}
      <form onSubmit={handleSend} className="space-y-2 pt-1">
        <div className="flex items-center justify-between px-1">
          <button
            type="button"
            onClick={() => setIsInternalNote(!isInternalNote)}
            className={`text-[11px] font-semibold inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-colors ${
              isInternalNote
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-600'
                : 'bg-zinc-100 border-zinc-200 text-zinc-500 hover:text-zinc-700'
            }`}
          >
            <Lock className="w-3 h-3" />
            <span>{isInternalNote ? 'Internal IT Note (Hidden from Employee)' : 'Message Employee'}</span>
          </button>
          <span className="text-[10px] text-zinc-400">
            {isInternalNote ? 'Private to IT Specialists' : 'Employee sees in My Tickets'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={chatDraft}
            onChange={(e) => setChatDraft(e.target.value)}
            placeholder={
              isInternalNote
                ? 'Type private internal note for IT team...'
                : `Message ${ticket.requestor} as ${techSenderName}...`
            }
            className={`flex-1 px-3.5 py-2.5 bg-canvas border rounded-xl text-xs text-ink focus:outline-none ${
              isInternalNote
                ? 'border-amber-400 focus:border-amber-500 bg-amber-50/20'
                : 'border-line focus:border-zinc-900'
            }`}
          />
          <button
            type="submit"
            disabled={!chatDraft.trim() || isSending}
            className={`px-4 py-2.5 disabled:opacity-40 text-white text-xs font-semibold rounded-xl inline-flex items-center gap-1.5 transition-colors press-fx shrink-0 shadow-xs ${
              isInternalNote
                ? 'bg-amber-600 hover:bg-amber-700'
                : 'bg-[#F97316] hover:bg-orange-600'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send</span>
          </button>
        </div>
      </form>
    </div>
  );
};
