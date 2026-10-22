import React, { useState } from 'react';
import { Send, MessageSquare } from 'lucide-react';
import type { Ticket, TicketChatMessage } from '../../../types/ticket';
import { useAppStore } from '../../../store/useAppStore';

export interface TicketConversationProps {
  ticket: Ticket;
}

const QUICK_REPLIES = [
  'Equipment is running normally now, thank you!',
  'Please check printer cutter blade again.',
  'Still not connecting to server.',
  'We are ready for testing.',
];

export const TicketConversation: React.FC<TicketConversationProps> = ({ ticket }) => {
  const sendTicketMessage = useAppStore((state) => state.sendTicketMessage);
  const [chatInput, setChatInput] = useState('');

  // Strictly filter out internal notes for public kiosk safety
  const visibleMessages = (ticket.messages || []).filter((m) => !m.isInternal);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = chatInput.trim();
    if (!trimmed) return;
    sendTicketMessage(
      ticket.id,
      'employee',
      ticket.requestor || 'Terminal Employee',
      trimmed,
      false // strictly public employee message
    );
    setChatInput('');
  };

  const handleQuickReply = (text: string) => {
    sendTicketMessage(
      ticket.id,
      'employee',
      ticket.requestor || 'Terminal Employee',
      text,
      false
    );
  };

  return (
    <div className="bg-surface border border-line rounded-2xl overflow-hidden shadow-card">
      <div className="px-5 py-3.5 bg-canvas border-b border-line flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-bold text-ink">
          <MessageSquare className="w-4 h-4 text-brand" />
          <span>Two-Way Technician Chat</span>
        </div>
        <span className="text-[10px] text-ink-subtle">
          Direct communication with assigned IT Specialist
        </span>
      </div>

      {/* Messages Scroll Feed */}
      <div className="p-4 space-y-3 max-h-72 overflow-y-auto">
        {visibleMessages.length === 0 ? (
          <div className="text-center py-6 text-ink-subtle text-xs">
            No messages yet. Send a message to chat directly with IT Support.
          </div>
        ) : (
          visibleMessages.map((msg: TicketChatMessage) => {
            const isEmployee = msg.senderRole === 'employee';
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isEmployee ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center gap-1.5 text-[10px] text-ink-faint mb-1">
                  <span className="font-semibold text-ink-subtle">{msg.senderName}</span>
                  <span>•</span>
                  <span>{msg.timestamp}</span>
                </div>
                <div
                  className={`max-w-[85%] px-3.5 py-2 rounded-2xl text-xs leading-relaxed ${
                    isEmployee
                      ? 'bg-zinc-900 text-white rounded-br-xs'
                      : 'bg-canvas border border-line text-ink rounded-bl-xs'
                  }`}
                >
                  {msg.message}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Quick Replies */}
      <div className="px-4 py-2 border-t border-line/60 bg-canvas/50 flex items-center gap-1.5 overflow-x-auto pb-2">
        <span className="text-[10px] font-semibold text-ink-faint uppercase shrink-0">Quick:</span>
        {QUICK_REPLIES.map((text, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleQuickReply(text)}
            className="px-2.5 py-1 rounded-lg bg-surface border border-line text-[11px] text-ink-subtle hover:text-ink hover:border-zinc-400 whitespace-nowrap press-fx transition-colors shrink-0"
          >
            {text}
          </button>
        ))}
      </div>

      {/* Chat Composer */}
      <form onSubmit={handleSend} className="p-3 bg-canvas border-t border-line flex items-center gap-2">
        <input
          type="text"
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          placeholder="Reply to IT specialist..."
          className="flex-1 px-3.5 py-2 bg-surface border border-line rounded-xl text-xs text-ink placeholder:text-ink-faint focus:outline-none focus:border-zinc-500"
        />
        <button
          type="submit"
          disabled={!chatInput.trim()}
          className="px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 press-fx shadow-xs"
        >
          <Send className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Send</span>
        </button>
      </form>
    </div>
  );
};
