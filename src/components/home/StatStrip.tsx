import { ShieldCheck, CheckCircle2, Search, Phone, Users } from "lucide-react";
import type { Summary } from "@/lib/api";

// -----------------------------------------------------------------------------
// Light stat strip under the hero. Reference design's fifth tile was
// "Emergency Calls: 12,430" - there's no real call-volume data source
// anywhere in this app, so rather than invent a number, this tile shows the
// same honest static "112 · 24×7 emergency response" used elsewhere
// (Dashboard's stat cards, the old Home page) instead.
// -----------------------------------------------------------------------------
export default function StatStrip({ summary }: { summary: Summary }) {
  const tiles = [
    { label: "Total Cases", value: summary.totalCases.toLocaleString("en-IN"), icon: ShieldCheck, accent: "blue" as const },
    { label: "Solved Cases", value: summary.solvedCases.toLocaleString("en-IN"), icon: CheckCircle2, accent: "teal" as const },
    { label: "Active Investigations", value: summary.activeInvestigations.toLocaleString("en-IN"), icon: Search, accent: "orange" as const },
    { label: "Emergency Helpline", value: "112", icon: Phone, accent: "pink" as const },
    { label: "Districts Covered", value: String(summary.districtsCovered), icon: Users, accent: "purple" as const },
  ];

  const CHIP: Record<string, string> = {
    blue: "bg-dash-blue-bg text-dash-blue",
    teal: "bg-dash-teal-bg text-dash-teal",
    orange: "bg-dash-orange-bg text-dash-orange",
    pink: "bg-dash-pink-bg text-dash-pink",
    purple: "bg-dash-purple-bg text-dash-purple",
  };

  return (
    <section className="border-b border-line bg-surface">
      <div className="mx-auto grid max-w-[1400px] grid-cols-2 gap-6 px-6 py-8 sm:grid-cols-3 lg:grid-cols-5">
        {tiles.map((t) => (
          <div key={t.label} className="flex items-center gap-3">
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${CHIP[t.accent]}`}>
              <t.icon size={19} aria-hidden="true" />
            </span>
            <div>
              <p className="text-xl font-semibold text-ink">{t.value}</p>
              <p className="text-xs text-muted">{t.label}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
