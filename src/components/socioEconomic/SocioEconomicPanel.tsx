"use client";

import { useState } from "react";
import { Users, Briefcase, Landmark, MapPin, ShieldAlert } from "lucide-react";
import type { CategoryBreakdown } from "@/lib/socioEconomicStats";
import { CRIME_TYPE_COLOR_CLASS, crimeTypeColor } from "@/components/crimeCount/colors";

// -----------------------------------------------------------------------------
// P4.5 - the PS's "Socio-Economic Correlation" ask, built under the framing
// agreed in PLAN.md P1.5/P4.5: aggregate-only, victim/complainant side, every
// number carries its own real denominator, never presented as an
// offender-propensity signal.
//
// Redesigned 2026-08-30 per direct feedback: the first pass rendered every
// bar in one flat navy, which read as monochrome and didn't distinguish
// categories from each other. This reuses the app's own existing
// categorical palette (--dash-blue/purple/orange/teal/pink, colors.ts -
// already used by the crime-type charts) rather than inventing new colors,
// so a "Hindu" segment and a "Muslim" segment are visually distinct, same
// idiom the rest of the app already uses for category charts.
//
// Two things still enforce the framing, unchanged from the first pass:
//   - No per-case or per-person drill-down anywhere on this page -
//     socioEconomicStats.ts doesn't expose a function that could feed one.
//   - Every card leads with its own real N and "not specified" count.
//
// Deliberately NOT included, both on request but not built here:
//   - A header illustration (top-right hero graphic) - needs an actual
//     asset, not a fabricated one; wire in once supplied.
//   - A "Download Report" button - no real export exists yet, and this
//     app's own P0.2 rule is that every visible affordance goes somewhere
//     real, not a decorative dead button.
// -----------------------------------------------------------------------------

export type SocioEconomicSeries = {
  crimeTypeSlug: string | null; // null = statewide, every crime type
  crimeTypeName: string;
  caseCount: number;
  occupation: CategoryBreakdown;
  religion: CategoryBreakdown;
  district: CategoryBreakdown;
};

// One shared categorical palette across occupation/religion/district, so
// "position 1 in the list" always reads the same color family regardless of
// which panel it's in - a viewer learns the palette once.
const PALETTE = [
  "var(--dash-blue)",
  "var(--dash-purple)",
  "var(--dash-teal)",
  "var(--dash-orange)",
  "var(--dash-pink)",
];
function colorAt(i: number): string {
  return PALETTE[i % PALETTE.length];
}

function StatChip({
  icon,
  color,
  bg,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  color: string;
  bg: string;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded border border-line bg-surface p-4 shadow-sm">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: bg, color }}>
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-xs text-muted">{label}</p>
        <p className="truncate text-base font-semibold text-ink">{value}</p>
        <p className="text-[11px] text-muted">{hint}</p>
      </div>
    </div>
  );
}

/** A ring made of one arc per category, same colors/order as the bars below
 *  it. `stroke-dasharray`/`-dashoffset` on stacked circles - the standard
 *  no-library SVG donut technique, consistent with every other chart in
 *  this app (TrendControlChart, CaseFlowSankey) being raw SVG. */
function BreakdownRing({ data }: { data: CategoryBreakdown }) {
  const R = 40;
  const C = 2 * Math.PI * R;
  let offset = 0;
  const top = data.categories[0];
  return (
    <div className="relative h-[108px] w-[108px] shrink-0">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle cx="50" cy="50" r={R} fill="none" stroke="var(--surface-2)" strokeWidth="14" />
        {data.categories.map((c, i) => {
          const frac = data.totalKnown > 0 ? c.count / data.totalKnown : 0;
          const len = frac * C;
          const el = (
            <circle
              key={c.id}
              cx="50"
              cy="50"
              r={R}
              fill="none"
              stroke={colorAt(i)}
              strokeWidth="14"
              strokeDasharray={`${len} ${C - len}`}
              strokeDashoffset={-offset}
              strokeLinecap={data.categories.length === 1 ? "butt" : "round"}
            />
          );
          offset += len;
          return el;
        })}
      </svg>
      {top && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center leading-tight">
          <span className="text-base font-semibold text-ink">{top.pct}%</span>
          <span className="max-w-[70px] truncate text-[10px] text-muted">{top.name}</span>
        </div>
      )}
    </div>
  );
}

function BreakdownCard({ title, data }: { title: string; data: CategoryBreakdown }) {
  const max = Math.max(...data.categories.map((c) => c.count), 1);
  return (
    <div className="rounded border border-line bg-surface p-5 shadow-sm">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-medium text-ink">{title}</p>
        <p className="text-xs text-muted">
          N={data.totalKnown.toLocaleString("en-IN")}
          {data.notSpecified > 0 && ` · ${data.notSpecified.toLocaleString("en-IN")} not specified, excluded from %`}
        </p>
      </div>
      {data.categories.length === 0 ? (
        <p className="mt-4 text-sm text-muted">No complainants recorded for this selection.</p>
      ) : (
        <div className="mt-4 flex flex-col gap-5 sm:flex-row sm:items-center">
          <BreakdownRing data={data} />
          <ul className="min-w-0 flex-1 space-y-2.5">
            {data.categories.map((c, i) => (
              <li key={c.id} className="text-[13px]">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-1.5 text-ink">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: colorAt(i) }} />
                    <span className="truncate">{c.name}</span>
                  </span>
                  <span className="shrink-0 font-medium text-ink">
                    {c.count.toLocaleString("en-IN")} <span className="text-muted">({c.pct}%)</span>
                  </span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-surface-2">
                  <div className="h-1.5 rounded-full" style={{ width: `${(c.count / max) * 100}%`, backgroundColor: colorAt(i) }} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function SocioEconomicPanel({ series }: { series: SocioEconomicSeries[] }) {
  const [selected, setSelected] = useState<string | null>(series[0]?.crimeTypeSlug ?? null);
  const s = series.find((x) => x.crimeTypeSlug === selected) ?? series[0];
  if (!s) return null;

  const topOcc = s.occupation.categories[0];
  const topRel = s.religion.categories[0];
  const topDist = s.district.categories[0];

  return (
    <div className="space-y-5">
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

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatChip
          icon={<Users size={18} aria-hidden="true" />}
          color="var(--dash-blue)"
          bg="var(--dash-blue-bg)"
          label="Complainants analyzed"
          value={s.occupation.totalKnown.toLocaleString("en-IN")}
          hint={`${s.caseCount.toLocaleString("en-IN")} case${s.caseCount === 1 ? "" : "s"} in this selection`}
        />
        <StatChip
          icon={<Briefcase size={18} aria-hidden="true" />}
          color="var(--dash-teal)"
          bg="var(--dash-teal-bg)"
          label="Top occupation"
          value={topOcc?.name ?? "—"}
          hint={topOcc ? `${topOcc.pct}% of known` : "No data"}
        />
        <StatChip
          icon={<Landmark size={18} aria-hidden="true" />}
          color="var(--dash-purple)"
          bg="var(--dash-purple-bg)"
          label="Top religion"
          value={topRel?.name ?? "—"}
          hint={topRel ? `${topRel.pct}% of known` : "No data"}
        />
        <StatChip
          icon={<MapPin size={18} aria-hidden="true" />}
          color="var(--dash-orange)"
          bg="var(--dash-orange-bg)"
          label="Top district"
          value={topDist?.name ?? "—"}
          hint={topDist ? `${topDist.count.toLocaleString("en-IN")} cases (${topDist.pct}%)` : "No data"}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <BreakdownCard title="By occupation" data={s.occupation} />
        <BreakdownCard title="By religion" data={s.religion} />
      </div>

      <BreakdownCard title="By district (top 10)" data={s.district} />

      <p className="flex items-start gap-2 rounded border border-line bg-surface-2 p-3 text-[12px] text-muted">
        <ShieldAlert size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
        No caste data is shown — the taxonomy for that category is a separate, still-open decision (see PLAN.md P1.5), not built
        into this dataset yet.
      </p>
    </div>
  );
}
