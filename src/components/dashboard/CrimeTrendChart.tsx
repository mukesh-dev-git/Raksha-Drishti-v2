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
}: {
  years: number[];
  total: number[];
  solved: number[];
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

  // Smooth cubic-bezier curve through the real points (Catmull-Rom ->
  // Bezier conversion), instead of straight segments - reads much closer
  // to a real trend line while still passing exactly through every real
  // value (no smoothing that would misrepresent a data point's position).
  const smoothPath = (vals: number[]) => {
    const pts = vals.map((v, i) => ({ x: xFor(i), y: yFor(v) }));
    if (pts.length < 2) return "";
    let d = `M${pts[0].x},${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2] || p2;
      const c1x = p1.x + (p2.x - p0.x) / 6;
      const c1y = p1.y + (p2.y - p0.y) / 6;
      const c2x = p2.x - (p3.x - p1.x) / 6;
      const c2y = p2.y - (p3.y - p1.y) / 6;
      d += ` C${c1x},${c1y} ${c2x},${c2y} ${p2.x},${p2.y}`;
    }
    return d;
  };
  const areaPath = (vals: number[]) =>
    `${smoothPath(vals)} L${xFor(vals.length - 1)},${H - PAD_B} L${xFor(0)},${H - PAD_B} Z`;

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
        <path d={smoothPath(total)} fill="none" stroke="var(--dash-blue)" strokeWidth={2.5} strokeLinecap="round" />
        <path d={smoothPath(solved)} fill="none" stroke="var(--dash-teal)" strokeWidth={2.5} strokeLinecap="round" />

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

      <div className="mt-2 flex items-center gap-5 text-xs text-muted">
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
