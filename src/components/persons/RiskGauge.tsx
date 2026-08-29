import { AlertTriangle } from "lucide-react";
import type { SuspicionScore, SuspicionBand } from "@/lib/suspicionScore";

const BAND_STYLE: Record<SuspicionBand, { text: string; bg: string; bar: string }> = {
  Low: { text: "text-success", bg: "bg-success-bg", bar: "bg-success" },
  Moderate: { text: "text-dash-blue", bg: "bg-dash-blue-bg", bar: "bg-dash-blue" },
  Elevated: { text: "text-warning", bg: "bg-warning-bg", bar: "bg-warning" },
  High: { text: "text-danger", bg: "bg-danger-bg", bar: "bg-danger" },
};

// -----------------------------------------------------------------------------
// P9.1 - the real-signals suspicion gauge. Deliberately not a dial/arc: a
// flat bar reads faster and doesn't invent visual precision (a needle angle)
// the underlying score doesn't have (it's an illustrative weighted sum, not
// a calibrated instrument). The factor list underneath IS the explanation -
// every point on the bar traces to one of these real, named reasons.
// -----------------------------------------------------------------------------
export default function RiskGauge({ score }: { score: SuspicionScore }) {
  const s = BAND_STYLE[score.band];
  return (
    <div className="rounded-xl border border-line bg-surface p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
          <AlertTriangle size={12} aria-hidden="true" /> Flag score
        </p>
        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${s.bg} ${s.text}`}>{score.band}</span>
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-[26px] font-semibold text-navy tabular-nums">{score.score}</span>
        <span className="text-[13px] text-muted">/ 100</span>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface-2">
        <div className={`h-full rounded-full ${s.bar}`} style={{ width: `${score.score}%` }} />
      </div>

      {score.factors.length > 0 ? (
        <ul className="mt-4 space-y-1.5 text-[12.5px]">
          {score.factors.map((f) => (
            <li key={f.label} className="flex items-center justify-between gap-3 text-ink">
              <span className="min-w-0">{f.label}</span>
              <span className="shrink-0 font-mono text-[11px] text-muted">+{f.points}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-[12.5px] text-muted">No contributing factors on file — a single, uncorroborated case.</p>
      )}

      <p className="mt-4 border-t border-line pt-3 text-[11px] leading-relaxed text-muted">
        An illustrative weighted score over real, evidence-derived signals (case count, district span, corroborated
        contradictions, evidence volume) — not a validated risk-assessment model, and never based on demographics.
      </p>
    </div>
  );
}
