// @spec UI-CRAFT-01: Signature vertical tick barcode meter & rhythm divider
import React from 'react';

interface TickMeterProps {
  total?: number;
  filled?: number;
  height?: number;
  className?: string;
}

export const TickMeter: React.FC<TickMeterProps> = ({
  total = 44,
  filled = 31,
  height = 24,
  className = '',
}) => {
  return (
    <div
      className={`flex items-center justify-between gap-[2px] w-full overflow-hidden ${className}`}
      role="progressbar"
      aria-valuenow={filled}
      aria-valuemin={0}
      aria-valuemax={total}
    >
      {Array.from({ length: total }).map((_, idx) => (
        <span
          key={idx}
          style={{ height: `${height}px` }}
          className={`w-[3px] shrink-0 rounded-[1px] transition-colors duration-200 ${
            idx < filled ? 'bg-zinc-600' : 'bg-zinc-200'
          }`}
        />
      ))}
    </div>
  );
};

interface BarcodeDividerProps {
  count?: number;
  className?: string;
}

export const BarcodeDivider: React.FC<BarcodeDividerProps> = ({
  count = 42,
  className = '',
}) => {
  return (
    <div
      className={`flex items-center justify-between w-full overflow-hidden select-none pointer-events-none my-2.5 ${className}`}
      aria-hidden="true"
    >
      {Array.from({ length: count }).map((_, idx) => (
        <span
          key={idx}
          className="h-2.5 w-[1.5px] bg-zinc-300/80 rounded-full shrink-0"
        />
      ))}
    </div>
  );
};
