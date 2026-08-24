import { FileStack, ShieldCheck, Users, Gauge } from "lucide-react";
import Sparkline from "@/components/dashboard/Sparkline";
import CrimeTrendChart from "@/components/dashboard/CrimeTrendChart";
import HotspotsMini from "@/components/dashboard/HotspotsMini";
import type { Summary } from "@/lib/api";

const TILES = (s: Summary) => [
  { label: "Total Cases", value: s.totalCases, trend: s.yearlyTrend, icon: FileStack },
  { label: "Solved Cases", value: s.solvedCases, trend: s.yearlySolved, icon: ShieldCheck },
  {
    label: "Active Investigations",
    value: s.activeInvestigations,
    trend: s.yearlyTrend.map((t, i) => t - s.yearlySolved[i]),
    icon: Users,
  },
  { label: "Detection Rate", value: `${s.detectionRate}%`, trend: undefined, icon: Gauge },
];

// -----------------------------------------------------------------------------
// The dark "Live Overview" glass panel embedded in the Home hero - real
// numbers (same getSummary() everything else on the site uses), a real
// yearly trend chart, and the actual live Crime Hotspots mini-map
// (HotspotsMini, reused as-is - its white card look nested inside this dark
// panel matches the reference design's own treatment of that sub-panel).
//
// CrimeTrendChart reads var(--line)/var(--muted) for its gridlines/axis text,
// which resolve to the site's light-theme colours - invisible on a dark
// panel. Rather than fork the component, the wrapping div below locally
// overrides those two CSS custom properties (they cascade normally, so this
// only affects the chart inside it, nothing else on the page).
// -----------------------------------------------------------------------------
export default function HeroLiveOverview({ summary }: { summary: Summary }) {
  const tiles = TILES(summary);

  return (
    <div className="w-full max-w-md rounded-2xl border border-white/15 bg-ink/70 p-5 shadow-2xl backdrop-blur-md">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-white">Live Overview</p>
        <span className="text-xs text-white/50">Year to date</span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-lg border border-white/10 bg-white/5 p-3">
            <div className="flex items-center justify-between">
              <t.icon size={16} className="text-white/60" aria-hidden="true" />
              {t.trend && <Sparkline values={t.trend} color="#60a5fa" width={56} height={18} />}
            </div>
            <p className="mt-1.5 text-xl font-semibold text-white">
              {typeof t.value === "number" ? t.value.toLocaleString("en-IN") : t.value}
            </p>
            <p className="text-[11px] text-white/55">{t.label}</p>
          </div>
        ))}
      </div>

      {/* Crime Trend + Crime Hotspots side by side (not stacked) - keeps the
          whole panel, and so the hero above the KPI stat strip, compact
          instead of pushing that strip far down the page. */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-white/10 bg-white/5 p-3">
          <p className="mb-1 text-xs font-medium text-white/70">Crime Trend</p>
          <div style={{ ["--line" as string]: "rgba(255,255,255,0.15)", ["--muted" as string]: "rgba(255,255,255,0.65)" }}>
            <CrimeTrendChart years={summary.years} total={summary.yearlyTrend} solved={summary.yearlySolved} compact />
          </div>
        </div>

        <div
          className="rounded-lg border border-white/10 bg-white/5 p-3"
          style={{
            ["--ink" as string]: "#fff",
            ["--muted" as string]: "rgba(255,255,255,0.65)",
            ["--line" as string]: "rgba(255,255,255,0.15)",
          }}
        >
          <HotspotsMini bare title="Crime Hotspots" />
        </div>
      </div>
    </div>
  );
}
