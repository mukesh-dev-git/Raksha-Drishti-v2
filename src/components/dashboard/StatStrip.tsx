import { ReactNode } from "react";

export type StripStat = { label: string; value: string; icon: ReactNode };

// -----------------------------------------------------------------------------
// P2.3 - the demoted version of what used to be 5 full-size StatCards at the
// very top of the page. Same real numbers, just no longer the first thing
// SCRB sees - the attention list (alerts + cross-district pattern signals)
// is. One row, one card, no per-stat sparklines or borders competing for
// attention with what actually needs it.
// -----------------------------------------------------------------------------
export default function StatStrip({ stats }: { stats: StripStat[] }) {
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-xl border border-line bg-surface px-5 py-3.5 shadow-sm">
      {stats.map((s, i) => (
        <div key={s.label} className={`flex items-center gap-2.5 ${i > 0 ? "sm:border-l sm:border-line sm:pl-6" : ""}`}>
          <span className="text-muted" aria-hidden="true">{s.icon}</span>
          <span>
            <span className="block text-[15px] font-semibold leading-tight text-ink">{s.value}</span>
            <span className="block text-[11px] leading-tight text-muted">{s.label}</span>
          </span>
        </div>
      ))}
    </div>
  );
}
