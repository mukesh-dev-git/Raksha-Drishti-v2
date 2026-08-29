"use client";

import { useState } from "react";
import type { CategoryBreakdown } from "@/lib/socioEconomicStats";
import { CRIME_TYPE_COLOR_CLASS, crimeTypeColor } from "@/components/crimeCount/colors";

// -----------------------------------------------------------------------------
// P4.5 - the PS's "Socio-Economic Correlation" ask, built under the framing
// agreed in PLAN.md P1.5/P4.5: aggregate-only, victim/complainant side, every
// number carries its own real denominator, never presented as an
// offender-propensity signal.
//
// Two things enforce that in the UI, not just in the data layer:
//   - Every card leads with "N complainants" and states how many had no
//     value recorded, rather than silently excluding them from view.
//   - There is no per-case or per-person drill-down anywhere on this page -
//     socioEconomicStats.ts doesn't even expose a function that could feed
//     one. This is a statewide/crime-type rollup, full stop.
//
// Crime-type toggle follows the same pattern as TrendControlChart.tsx (one
// series computed per type, switched client-side, not a page reload).
// -----------------------------------------------------------------------------

export type SocioEconomicSeries = {
  crimeTypeSlug: string | null; // null = statewide, every crime type
  crimeTypeName: string;
  caseCount: number;
  occupation: CategoryBreakdown;
  religion: CategoryBreakdown;
};

function BreakdownBars({ title, data }: { title: string; data: CategoryBreakdown }) {
  const max = Math.max(...data.categories.map((c) => c.count), 1);
  return (
    <div className="rounded border border-line bg-surface p-5 shadow-sm">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-medium text-ink">{title}</p>
        <p className="text-xs text-muted">
          N={data.totalKnown.toLocaleString("en-IN")} complainants
          {data.notSpecified > 0 && ` · ${data.notSpecified.toLocaleString("en-IN")} not specified, excluded from %`}
        </p>
      </div>
      {data.categories.length === 0 ? (
        <p className="mt-4 text-sm text-muted">No complainants recorded for this selection.</p>
      ) : (
        <ul className="mt-4 space-y-2.5">
          {data.categories.map((c) => (
            <li key={c.id} className="text-[13px]">
              <div className="flex items-center justify-between">
                <span className="text-ink">{c.name}</span>
                <span className="font-medium text-ink">
                  {c.count.toLocaleString("en-IN")} <span className="text-muted">({c.pct}%)</span>
                </span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-surface-2">
                <div className="h-1.5 rounded-full bg-navy" style={{ width: `${(c.count / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function SocioEconomicPanel({ series }: { series: SocioEconomicSeries[] }) {
  const [selected, setSelected] = useState<string | null>(series[0]?.crimeTypeSlug ?? null);
  const s = series.find((x) => x.crimeTypeSlug === selected) ?? series[0];
  if (!s) return null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          Victim/complainant demographics, for outreach and victim-support planning — not an offender signal. The Accused table
          carries no religion, caste, or occupation field; this view cannot and does not report on offenders.
        </p>
        <div className="flex flex-wrap gap-1.5">
          {series.map((x) => (
            <button
              key={x.crimeTypeSlug ?? "all"}
              onClick={() => setSelected(x.crimeTypeSlug)}
              className={`rounded-full px-3 py-1 text-[12px] font-medium transition ${
                x.crimeTypeSlug === s.crimeTypeSlug
                  ? x.crimeTypeSlug
                    ? `${CRIME_TYPE_COLOR_CLASS[x.crimeTypeSlug]} text-white`
                    : "bg-navy text-white"
                  : "bg-surface-2 text-muted hover:text-ink"
              }`}
            >
              {x.crimeTypeName}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-muted">
        {s.caseCount.toLocaleString("en-IN")} case{s.caseCount === 1 ? "" : "s"} in this selection
        {s.crimeTypeSlug && (
          <span className="ml-1.5 inline-block h-2 w-2 rounded-full align-middle" style={{ backgroundColor: crimeTypeColor(s.crimeTypeSlug) }} />
        )}
      </p>

      <div className="grid gap-5 lg:grid-cols-2">
        <BreakdownBars title="By occupation" data={s.occupation} />
        <BreakdownBars title="By religion" data={s.religion} />
      </div>
    </div>
  );
}
