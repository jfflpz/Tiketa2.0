import React from 'react';
import { REPORT_TABS } from '../types/reportSchemas';

export interface ReportTabSelectorProps {
  activeReportId: number;
  onSelectReportId: (id: number) => void;
  variant?: 'tabs' | 'pills';
}

export const ReportTabSelector: React.FC<ReportTabSelectorProps> = ({
  activeReportId,
  onSelectReportId,
  variant = 'tabs',
}) => {
  if (variant === 'pills') {
    return (
      <div className="flex flex-wrap gap-1.5 bg-canvas p-1.5 rounded-2xl border border-line">
        {REPORT_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSelectReportId(tab.id)}
            className={`px-3 py-1.5 rounded-xl text-xs transition-all press-fx ${
              activeReportId === tab.id
                ? 'bg-zinc-900 text-white font-semibold shadow-sm'
                : 'text-ink-subtle hover:text-ink font-medium'
            }`}
          >
            {tab.title}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="bg-surface border border-line rounded-2xl p-2 shadow-sm flex items-center gap-1.5 overflow-x-auto">
      {REPORT_TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = tab.id === activeReportId;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSelectReportId(tab.id)}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all press-fx flex items-center gap-2 whitespace-nowrap ${
              isActive
                ? 'bg-zinc-900 text-white shadow-sm'
                : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100/70'
            }`}
          >
            <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-orange-400' : 'text-zinc-400'}`} />
            <span>{tab.shortTitle}</span>
            <span
              className={`font-mono text-[9px] px-1.5 py-0.2 rounded-md ${
                isActive ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-100 text-zinc-500'
              }`}
            >
              #{tab.id}
            </span>
          </button>
        );
      })}
    </div>
  );
};
