"use client";

import { useState } from "react";

const COLORS = ["var(--dash-blue)", "var(--dash-teal)", "var(--dash-orange)", "var(--dash-purple)", "var(--dash-pink)", "var(--muted)"];

// -----------------------------------------------------------------------------
// Hand-rolled SVG donut - real per-category totals from /api/casetypes.
// -----------------------------------------------------------------------------
export default function CategoryDonut({ data }: { data: { name: string; total: number }[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const sum = data.reduce((s, d) => s + d.total, 0) || 1;

  const R = 70;
  const CX = 90;
  const CY = 90;
  const STROKE = 26;
  const CIRC = 2 * Math.PI * R;

  let offset = 0;
  const segments = data.map((d, i) => {
    const frac = d.total / sum;
    const dash = frac * CIRC;
    const seg = { ...d, i, dash, gap: CIRC - dash, offset, color: COLORS[i % COLORS.length], pct: Math.round(frac * 1000) / 10 };
    offset += dash;
    return seg;
  });

  return (
    <div className="flex items-center gap-6">
      <div className="relative shrink-0">
        <svg width={180} height={180} viewBox="0 0 180 180">
          <circle cx={CX} cy={CY} r={R} fill="none" stroke="var(--surface-2)" strokeWidth={STROKE} />
          {segments.map((s) => (
            <circle
              key={s.name}
              cx={CX}
              cy={CY}
              r={R}
              fill="none"
              stroke={s.color}
              strokeWidth={hover === s.i ? STROKE + 4 : STROKE}
              strokeDasharray={`${s.dash} ${s.gap}`}
              strokeDashoffset={-s.offset}
              transform={`rotate(-90 ${CX} ${CY})`}
              style={{ transition: "stroke-width 120ms" }}
              onMouseEnter={() => setHover(s.i)}
              onMouseLeave={() => setHover(null)}
            />
          ))}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-2xl font-semibold text-ink">{sum.toLocaleString("en-IN")}</p>
          <p className="text-xs text-muted">Total Crimes</p>
        </div>
      </div>
      <ul className="space-y-2.5 text-[13px]">
        {segments.map((s) => (
          <li
            key={s.name}
            className="flex items-center gap-2"
            onMouseEnter={() => setHover(s.i)}
            onMouseLeave={() => setHover(null)}
          >
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
            <span className="text-ink">{s.name}</span>
            <span className="text-muted">
              {s.total} ({s.pct}%)
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
