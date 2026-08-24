import { FileStack, ShieldCheck, Users, Gauge } from "lucide-react";
import Sparkline from "@/components/dashboard/Sparkline";
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
// numbers (same getSummary() everything else on the site uses). Used to
// also carry a Crime Trend chart + a Crime Hotspots panel below the stat
// tiles; both were dropped per a follow-up request (they were making the
// hero - and so everything above the KPI stat strip below it - too tall).
// The real trend chart and hotspots map are still one click away, on
// /dashboard and /crime-hotspots respectively.
// -----------------------------------------------------------------------------
export default function HeroLiveOverview({ summary }: { summary: Summary }) {
  const tiles = TILES(summary);

  return (
    <div className="w-full max-w-md rounded-2xl border border-white/15 bg-ink/70 p-4 shadow-2xl backdrop-blur-md">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-white">Live Overview</p>
        <span className="text-xs text-white/50">Year to date</span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2.5">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-lg border border-white/10 bg-white/5 p-2.5">
            <div className="flex items-center justify-between">
              <t.icon size={16} className="text-white/60" aria-hidden="true" />
              {t.trend && <Sparkline values={t.trend} color="#60a5fa" width={56} height={18} />}
            </div>
            <p className="mt-1 text-lg font-semibold text-white">
              {typeof t.value === "number" ? t.value.toLocaleString("en-IN") : t.value}
            </p>
            <p className="text-[11px] text-white/55">{t.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
