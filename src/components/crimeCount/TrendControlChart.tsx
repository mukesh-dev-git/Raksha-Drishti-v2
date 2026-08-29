"use client";

import { useState } from "react";
import type { ControlChartSeries } from "@/lib/crimeCountStats";
import { crimeTypeColor, CRIME_TYPE_COLOR_CLASS } from "./colors";

// -----------------------------------------------------------------------------
// P4.3 + P4.9 - emerging-trend detection as a real control chart: each crime
// type's own monthly mean + 2*stddev baseline (computed in
// getTrendControlChartData(), no LLM, no arbitrary "spike" threshold), with
// months that actually exceed it highlighted red. Bars, not a smoothed line -
// a statistical outlier reads more honestly as "this bar crossed the line"
// than as a curve.
// -----------------------------------------------------------------------------
export default function TrendControlChart({ series }: { series: ControlChartSeries[] }) {
  const [selected, setSelected] = useState(series[0]?.crimeTypeSlug);
  const s = series.find((x) => x.crimeTypeSlug === selected) ?? series[0];
  if (!s) return null;

  const W = 900;
  const H = 240;
  const PAD_L = 34;
  const PAD_B = 26;
  const PAD_T = 14;
  const plotW = W - PAD_L - 8;
  const plotH = H - PAD_B - PAD_T;
  const maxVal = Math.max(...s.counts, s.upperBand, 1) * 1.12;
  const n = s.months.length;
  const barGap = 1.5;
  const barW = Math.max(plotW / n - barGap, 1.2);

  const xFor = (i: number) => PAD_L + i * (plotW / n);
  const yFor = (v: number) => PAD_T + plotH - (v / maxVal) * plotH;
  const heightFor = (v: number) => (v / maxVal) * plotH;

  const flaggedSet = new Set(s.flaggedMonths);
  const color = crimeTypeColor(s.crimeTypeSlug);

  // Label every 6th month to keep the axis legible across ~4.5 years.
  const labelStep = Math.max(Math.ceil(n / 12), 1);

  return (
    <div className="rounded border border-line bg-surface p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-medium text-ink">Monthly volume vs. baseline, by crime type</p>
        <div className="flex flex-wrap gap-1.5">
          {series.map((x) => (
            <button
              key={x.crimeTypeSlug}
              onClick={() => setSelected(x.crimeTypeSlug)}
              className={`rounded-full px-3 py-1 text-[12px] font-medium transition ${
                x.crimeTypeSlug === s.crimeTypeSlug ? `${CRIME_TYPE_COLOR_CLASS[x.crimeTypeSlug]} text-white` : "bg-surface-2 text-muted hover:text-ink"
              }`}
            >
              {x.crimeTypeName}
              {x.flaggedMonths.length > 0 && (
                <span className="ml-1.5 rounded-full bg-danger px-1.5 text-[10px] text-white">{x.flaggedMonths.length}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="mt-4 w-full" role="img" aria-label={`Monthly ${s.crimeTypeName} case volume with baseline`}>
        {/* gridlines */}
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <line key={f} x1={PAD_L} x2={W} y1={PAD_T + f * plotH} y2={PAD_T + f * plotH} stroke="var(--line)" strokeWidth={1} />
        ))}

        {/* baseline band: mean to upperBand (mean + 2 std-dev) */}
        <rect x={PAD_L} y={yFor(s.upperBand)} width={plotW} height={Math.max(yFor(s.mean) - yFor(s.upperBand), 0)} fill="var(--muted)" opacity={0.12} />
        <line x1={PAD_L} x2={W} y1={yFor(s.mean)} y2={yFor(s.mean)} stroke="var(--muted)" strokeWidth={1} strokeDasharray="3 3" />
        <line x1={PAD_L} x2={W} y1={yFor(s.upperBand)} y2={yFor(s.upperBand)} stroke="var(--danger)" strokeWidth={1} strokeDasharray="3 3" />

        {/* bars */}
        {s.months.map((m, i) => {
          const flagged = flaggedSet.has(m);
          return (
            <rect
              key={m}
              x={xFor(i)}
              y={yFor(s.counts[i])}
              width={barW}
              height={heightFor(s.counts[i])}
              fill={flagged ? "var(--danger)" : color}
              rx={1}
            >
              <title>
                {m}: {s.counts[i]} cases{flagged ? " — flagged: >2σ above baseline" : ""}
              </title>
            </rect>
          );
        })}

        {/* x-axis month labels */}
        {s.months.map((m, i) =>
          i % labelStep === 0 ? (
            <text key={m} x={xFor(i)} y={H - 8} fontSize={10} fill="var(--muted)">
              {m}
            </text>
          ) : null
        )}
      </svg>

      <div className="mt-2 flex flex-wrap items-center gap-4 text-[11px] text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} /> Monthly cases
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-danger" /> Flagged (&gt;2&sigma; above baseline)
        </span>
        <span>
          Baseline: mean {s.mean} &plusmn; 2&sigma; ({s.stdDev}) &rarr; flag above {s.upperBand}
        </span>
      </div>
    </div>
  );
}
