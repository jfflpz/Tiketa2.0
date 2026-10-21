// @spec FR-QUEUE-03: Status Pill Matrix (Open, In Progress, Resolved, Closed)
import React from 'react';
import { TicketStatus } from '../../types/ticket';

interface StatusBadgeProps {
  status: TicketStatus;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const styles: Record<TicketStatus, { bg: string; text: string; dot: string; label: string }> = {
    OPEN: {
      bg: 'bg-zinc-100 border-zinc-200',
      text: 'text-zinc-700',
      dot: 'bg-zinc-500',
      label: 'Open',
    },
    PROG: {
      bg: 'bg-lav border-indigo-200/80',
      text: 'text-lav-text',
      dot: 'bg-indigo-600',
      label: 'In Progress',
    },
    RESL: {
      bg: 'bg-peach border-orange-200/80',
      text: 'text-peach-text',
      dot: 'bg-orange-500 animate-pulse',
      label: 'Needs Verification',
    },
    CLSD: {
      bg: 'bg-mint border-emerald-200/80',
      text: 'text-mint-text',
      dot: 'bg-emerald-600',
      label: 'Closed',
    },
  };

  const s = styles[status];
  const pad = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${s.bg} ${s.text} ${pad}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
};
