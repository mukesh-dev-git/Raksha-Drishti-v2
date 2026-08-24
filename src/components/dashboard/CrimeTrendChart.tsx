"use client";

import { useId, useState } from "react";

// -----------------------------------------------------------------------------
// Hand-rolled SVG line chart, no charting dependency. Real yearly totals vs
// solved cases from /api/summary - deliberately yearly, not monthly: the
// seed dataset is 19 FIRs total, nowhere near enough volume for a real
// month-by-month curve, so this works at the granularity the data actually
// supports (see catalyst/README.md and the route's own comment).
// -----------------------------------------------------------------------------
export default function CrimeTrendChart({
  years,
  total,
  solved,
  compact = false,
}: {
  years: number[];
  total: number[];
  solved: number[];
  // Drops the "Total Crimes / Solved Cases" legend row - for the Home
  // hero's narrow side-by-side panel, where it wraps awkwardly at ~150px.
  compact?: boolean;
}) {
  const gradId = useId();
  const [hover, setHover] = useState<number | null>(null);

  const W = 640;
  const H = 220;
  const PAD_L = 32;
  const PAD_B = 24;
  const PAD_T = 12;
  const maxV = Math.max(...total, 1);
  const xStep = (W - PAD_L - 8) / Math.max(years.length - 1, 1);
  const yFor = (v: number) => H - PAD_B - (v / maxV) * (H - PAD_B - PAD_T);
  const xFor = (i: number) => PAD_L + i * xStep;

  const linePath = (vals: number[]) => vals.map((v, i) => `${i === 0 ? "M" : "L"}${xFor(i)},${yFor(v)}`).join(" ");
  const areaPath = (vals: number[]) =>
    `${linePath(vals)} L${xFor(vals.length - 1)},${H - PAD_B} L${xFor(0)},${H - PAD_B} Z`;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Crime trend by year, total vs solved">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--dash-blue)" stopOpacity="0.18" />
            <stop offset="100%" stopColor="var(--dash-blue)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* gridlines */}
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <line
            key={f}
            x1={PAD_L}
            x2={W}
            y1={PAD_T + f * (H - PAD_B - PAD_T)}
            y2={PAD_T + f * (H - PAD_B - PAD_T)}
            stroke="var(--line)"
            strokeWidth={1}
          />
        ))}

        <path d={areaPath(total)} fill={`url(#${gradId})`} />
        <path d={linePath(total)} fill="none" stroke="var(--dash-blue)" strokeWidth={2.5} />
        <path d={linePath(solved)} fill="none" stroke="var(--dash-teal)" strokeWidth={2.5} strokeDasharray="0" />

        {years.map((y, i) => (
          <g key={y}>
            <circle cx={xFor(i)} cy={yFor(total[i])} r={hover === i ? 5 : 3.5} fill="var(--dash-blue)" />
            <circle cx={xFor(i)} cy={yFor(solved[i])} r={hover === i ? 5 : 3.5} fill="var(--dash-teal)" />
            <rect
              x={xFor(i) - xStep / 2}
              y={0}
              width={xStep}
              height={H}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            />
            <text x={xFor(i)} y={H - 6} textAnchor="middle" fontSize={11} fill="var(--muted)">
              {y}
            </text>
          </g>
        ))}
      </svg>

      {hover !== null && (
        <div className="pointer-events-none absolute left-1/2 top-1 -translate-x-1/2 rounded-md border border-line bg-surface px-3 py-2 text-xs shadow-md">
          <p className="font-semibold text-ink">{years[hover]}</p>
          <p className="text-dash-blue">Total: {total[hover]}</p>
          <p className="text-dash-teal">Solved: {solved[hover]}</p>
        </div>
      )}

      <div className={`mt-2 flex items-center gap-5 text-xs text-muted ${compact ? "hidden" : ""}`}>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-dash-blue" /> Total Crimes
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-dash-teal" /> Solved Cases
        </span>
      </div>
    </div>
  );
}
