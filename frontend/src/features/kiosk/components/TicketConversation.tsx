import React, { useState, useEffect, useCallback } from 'react';
import { Send, MessageSquare, AlertCircle, Loader2 } from 'lucide-react';
import type { Ticket, TicketChatMessage } from '../../../types/ticket';
import { ticketsApi, extractApiErrorMessage } from '../../../api/client';
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
  const addToast = useAppStore((state) => state.addToast);
  const [chatInput, setChatInput] = useState('');
  const [comments, setComments] = useState<TicketChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const loadComments = useCallback(async () => {
    if (!ticket.id || ticket.id.startsWith('t-') || ticket.id.startsWith('tracked-')) {
      setComments((ticket.messages || []).filter((m) => !m.isInternal));
      return;
    }

    try {
      const items = await ticketsApi.getComments(ticket.id);
      if (Array.isArray(items)) {
        const mapped: TicketChatMessage[] = items
          .filter((item) => !item.is_internal)
          .map((item) => ({
            id: item.id,
            senderRole: (item.author_role === 'employee' || item.sender_role === 'employee') ? 'employee' : 'it',
            senderName: item.author_name || item.sender_name || 'IT Support',
            message: item.body,
            timestamp: item.created_at
              ? new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : '',
            isInternal: false,
          }));
        setComments(mapped);
      }
    } catch {
      // Fallback to local messages if server comments unavailable
      setComments((ticket.messages || []).filter((m) => !m.isInternal));
    }
  }, [ticket.id, ticket.messages]);

  useEffect(() => {
    setIsLoading(true);
    loadComments().finally(() => setIsLoading(false));
    const interval = setInterval(loadComments, 5000);
    return () => clearInterval(interval);
  }, [loadComments]);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isSending) return;

    setIsSending(true);
    setSendError(null);

    try {
      if (!ticket.id.startsWith('t-') && !ticket.id.startsWith('tracked-')) {
        await ticketsApi.addComment(ticket.id, {
          body: trimmed,
          is_internal: false,
        });
      }

      const optimisticMsg: TicketChatMessage = {
        id: 'msg-' + Date.now(),
        senderRole: 'employee',
        senderName: ticket.requestor || 'Employee',
        message: trimmed,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isInternal: false,
      };
      setComments((prev) => [...prev, optimisticMsg]);
      setChatInput('');
      await loadComments();
    } catch (err: unknown) {
      const msg = extractApiErrorMessage(err, 'Message delivery failed.');
      setSendError(msg);
      addToast('Chat Delivery Failed', msg, 'warning');
    } finally {
      setIsSending(false);
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(chatInput);
  };

  const handleQuickReply = (text: string) => {
    sendMessage(text);
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
        {isLoading && comments.length === 0 ? (
          <div className="text-center py-6 text-ink-subtle text-xs flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
            <span>Loading conversation...</span>
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-6 text-ink-subtle text-xs">
            No messages yet. Send a message to chat directly with IT Support.
          </div>
        ) : (
          comments.map((msg: TicketChatMessage) => {
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
            disabled={isSending}
            className="px-2.5 py-1 rounded-lg bg-surface border border-line text-[11px] text-ink-subtle hover:text-ink hover:border-zinc-400 whitespace-nowrap press-fx transition-colors shrink-0 disabled:opacity-50"
          >
            {text}
          </button>
        ))}
      </div>

      {/* Delivery Error Alert */}
      {sendError && (
        <div className="px-4 py-2 bg-rose-50 border-t border-rose-200 text-xs text-rose-700 flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
          <span>Delivery failed: {sendError}</span>
        </div>
      )}

      {/* Chat Composer */}
      <form onSubmit={handleSend} className="p-3 bg-canvas border-t border-line flex items-center gap-2">
        <input
          type="text"
          value={chatInput}
          onChange={(e) => {
            setChatInput(e.target.value);
            if (sendError) setSendError(null);
          }}
          disabled={isSending}
          placeholder="Reply to IT specialist..."
          className="flex-1 px-3.5 py-2 bg-surface border border-line rounded-xl text-xs text-ink placeholder:text-ink-faint focus:outline-none focus:border-zinc-500"
        />
        <button
          type="submit"
          disabled={!chatInput.trim() || isSending}
          className="px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 press-fx shadow-xs"
        >
          {isSending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Send className="w-3.5 h-3.5" />
          )}
          <span className="hidden sm:inline">Send</span>
        </button>
      </form>
    </div>
  );
};
