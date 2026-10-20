// @spec FR-DASH-01: 5-Column KPI Metric Card matching reference screenshot
import React from 'react';

interface MetricCardProps {
  label: string;
  value: string | number;
  subLabel?: string;
  icon?: React.ReactNode;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  subLabel,
  icon,
}) => {
  return (
    <div className="bg-surface border border-line rounded-2xl p-4 shadow-card hover:border-line-dark transition-all duration-150 flex flex-col justify-between min-h-[96px]">
      <div className="flex items-center gap-2.5 mb-2.5">
        <div className="w-6 h-6 rounded-md bg-zinc-100 border border-line flex items-center justify-center text-ink shrink-0">
          {icon ?? (
            <span className="font-bold text-[11px] leading-none tracking-tighter">
              T<sup className="text-[7px] text-emerald-600">•</sup>
            </span>
          )}
        </div>
        <span className="text-[13px] font-medium text-ink-subtle truncate">
          {label}
        </span>
      </div>
      <div className="flex items-baseline justify-between gap-2 pl-1">
        <span className="text-[22px] font-semibold tracking-tight text-ink tabular-nums">
          {value}
        </span>
        {subLabel && (
          <span className="text-[11px] font-medium text-ink-faint truncate">
            {subLabel}
          </span>
        )}
      </div>
    </div>
  );
};
