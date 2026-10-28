import React, { useState, useId } from 'react';

export interface SparklinePoint {
  label: string;
  value: number;
}

export interface KpiSparklineWithIndicatorsProps {
  data: SparklinePoint[];
  color: 'orange' | 'emerald' | 'sky' | 'amber';
  unit?: string;
  target?: number;
  targetLabel?: string;
  timeRangeLabel?: string;
}

const COLOR_MAP = {
  orange: {
    stroke: '#F97316',
    fillStart: 'rgba(249, 115, 22, 0.25)',
    fillEnd: 'rgba(249, 115, 22, 0.00)',
    dot: '#EA580C',
    text: 'text-orange-600',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
  },
  emerald: {
    stroke: '#10B981',
    fillStart: 'rgba(16, 185, 129, 0.25)',
    fillEnd: 'rgba(16, 185, 129, 0.00)',
    dot: '#059669',
    text: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
  },
  sky: {
    stroke: '#0284C7',
    fillStart: 'rgba(2, 132, 199, 0.25)',
    fillEnd: 'rgba(2, 132, 199, 0.00)',
    dot: '#0369A1',
    text: 'text-sky-600',
    bg: 'bg-sky-50',
    border: 'border-sky-200',
  },
  amber: {
    stroke: '#F59E0B',
    fillStart: 'rgba(245, 158, 11, 0.25)',
    fillEnd: 'rgba(245, 158, 11, 0.00)',
    dot: '#D97706',
    text: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
  },
};

function buildSmoothPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? 0 : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2 >= points.length ? points.length - 1 : i + 2];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

export const KpiSparklineWithIndicators: React.FC<KpiSparklineWithIndicatorsProps> = ({
  data,
  color,
  unit = '',
  target,
  targetLabel,
  timeRangeLabel,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const gradientId = useId();
  const theme = COLOR_MAP[color] ?? COLOR_MAP.orange;

  const width = 160;
  const height = 42;
  const padX = 6;
  const padY = 6;

  const values = data.map((d) => d.value);
  if (target !== undefined) {
    values.push(target);
  }

  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const minVal = rawMin === rawMax ? rawMin - 1 : rawMin;
  const maxVal = rawMin === rawMax ? rawMax + 1 : rawMax;
  const valRange = maxVal - minVal || 1;

  const points = data.map((d, i) => {
    const x = padX + (i / Math.max(data.length - 1, 1)) * (width - 2 * padX);
    const y = padY + (1 - (d.value - minVal) / valRange) * (height - 2 * padY);
    return { x, y, ...d };
  });

  const linePath = buildSmoothPath(points);
  const areaPath =
    points.length > 0
      ? `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${height} L ${points[0].x.toFixed(1)} ${height} Z`
      : '';

  const targetY =
    target !== undefined
      ? padY + (1 - (target - minVal) / valRange) * (height - 2 * padY)
      : null;

  const activePoint = hoveredIdx !== null ? points[hoveredIdx] : null;

  return (
    <div className="relative group w-full select-none">
      {/* Dynamic Hover Tooltip Badge */}
      {activePoint && (
        <div
          className={`absolute -top-6 transition-all duration-150 pointer-events-none z-20 flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold shadow-sm ${theme.bg} ${theme.text} ${theme.border} border`}
          style={{
            left: `${Math.min(Math.max((activePoint.x / width) * 100, 15), 85)}%`,
            transform: 'translateX(-50%)',
          }}
        >
          <span>{activePoint.label}:</span>
          <span className="font-mono">{activePoint.value}{unit ? ` ${unit}` : ''}</span>
        </div>
      )}

      {/* SVG Canvas with Gridline, Area Gradient & Data Nodes */}
      <div className="relative">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-10 overflow-visible"
          onMouseLeave={() => setHoveredIdx(null)}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={theme.fillStart} />
              <stop offset="100%" stopColor={theme.fillEnd} />
            </linearGradient>
          </defs>

          {/* Optional Dashed Target Line */}
          {targetY !== null && (
            <g>
              <line
                x1={padX}
                y1={targetY}
                x2={width - padX}
                y2={targetY}
                stroke="#94A3B8"
                strokeWidth="1"
                strokeDasharray="2 3"
                opacity="0.6"
              />
              {targetLabel && (
                <text
                  x={width - padX}
                  y={Math.max(targetY - 2, 8)}
                  textAnchor="end"
                  fill="#94A3B8"
                  fontSize="7"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {targetLabel}
                </text>
              )}
            </g>
          )}

          {/* Soft Gradient Area Fill */}
          <path d={areaPath} fill={`url(#${gradientId})`} />

          {/* Smooth Trend Curve Line */}
          <path
            d={linePath}
            fill="none"
            stroke={theme.stroke}
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Interactive Data Point Dots */}
          {points.map((p, idx) => {
            const isLast = idx === points.length - 1;
            const isHovered = hoveredIdx === idx;
            return (
              <g
                key={idx}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIdx(idx)}
              >
                {/* Hit area for easy mouse hover */}
                <circle cx={p.x} cy={p.y} r="8" fill="transparent" />

                {/* Outer halo on latest point */}
                {isLast && (
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r="5.5"
                    fill="none"
                    stroke={theme.stroke}
                    strokeWidth="1.5"
                    opacity="0.45"
                  />
                )}

                {/* Core node dot */}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isHovered ? 4 : isLast ? 3 : 2}
                  fill={isHovered ? '#FFFFFF' : theme.dot}
                  stroke={theme.stroke}
                  strokeWidth={isHovered ? 2 : 1}
                  className="transition-all duration-150"
                />
              </g>
            );
          })}
        </svg>
      </div>

      {/* Timeline Axis Indicators (Bottom labels) */}
      <div className="flex items-center justify-between text-[9px] font-mono font-semibold text-zinc-400 mt-1 px-1 border-t border-zinc-100/80 pt-1">
        <span>{data[0]?.label ?? 'Start'}</span>
        {data.length > 3 && (
          <span className="text-zinc-300">
            {data[Math.floor(data.length / 2)]?.label ?? 'Mid'}
          </span>
        )}
        <span className={`font-bold ${theme.text}`}>
          {data[data.length - 1]?.label ?? 'End'}
        </span>
      </div>

      {/* Sub-label explaining the metric context */}
      {timeRangeLabel && (
        <div className="text-[9px] text-zinc-400 text-right mt-0.5 font-medium">
          {timeRangeLabel}
        </div>
      )}
    </div>
  );
};
