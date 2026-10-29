import React from 'react';
import { UserCheck, X, AlertTriangle } from 'lucide-react';

export interface TicketAssignModalProps {
  isOpen: boolean;
  ticketCode: string;
  ticketTask: string;
  techName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const TicketAssignModal: React.FC<TicketAssignModalProps> = ({
  isOpen,
  ticketCode,
  ticketTask,
  techName,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div
        className="fixed inset-0"
        onClick={onCancel}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-[#ECEEF2] overflow-hidden z-10 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#ECEEF2] bg-[#F8F9FA]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-ink">
                Confirm Ticket Assignment
              </h2>
              <p className="text-[11px] text-zinc-500 font-mono">
                {ticketCode}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1 rounded-lg text-zinc-400 hover:text-ink hover:bg-zinc-200/50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-3 p-3.5 bg-orange-50/70 border border-orange-100 rounded-xl text-xs text-orange-950">
            <AlertTriangle className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Reassigning ticket ownership</p>
              <p className="text-zinc-600 mt-0.5 leading-relaxed">
                Are you sure you want to assign ticket{' '}
                <span className="font-mono font-bold text-ink">{ticketCode}</span> (
                <span className="italic">{ticketTask}</span>) to{' '}
                <span className="font-bold text-orange-700">{techName}</span>?
              </p>
            </div>
          </div>

          <div className="text-xs text-zinc-500">
            The assigned IT specialist will be notified and this ticket will be transferred to their active queue.
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#ECEEF2]">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-xs font-semibold text-zinc-600 hover:text-ink hover:bg-zinc-100 rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="px-4 py-2 text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 active:scale-95 rounded-xl shadow-xs transition-all flex items-center gap-1.5"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Confirm Assignment</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
