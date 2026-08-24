import { ReactNode } from "react";
import Sparkline from "./Sparkline";

type Accent = "blue" | "purple" | "orange" | "teal" | "pink";

const ACCENT_CLASS: Record<Accent, { chip: string; icon: string; line: string }> = {
  blue: { chip: "bg-dash-blue-bg", icon: "text-dash-blue", line: "var(--dash-blue)" },
  purple: { chip: "bg-dash-purple-bg", icon: "text-dash-purple", line: "var(--dash-purple)" },
  orange: { chip: "bg-dash-orange-bg", icon: "text-dash-orange", line: "var(--dash-orange)" },
  teal: { chip: "bg-dash-teal-bg", icon: "text-dash-teal", line: "var(--dash-teal)" },
  pink: { chip: "bg-dash-pink-bg", icon: "text-dash-pink", line: "var(--dash-pink)" },
};

// -----------------------------------------------------------------------------
// A single dashboard stat card - icon chip, label, big value, and an optional
// real sparkline (year-over-year shape from the same data as the value,
// never a fabricated "+N% vs last month" delta we have no data to back).
// -----------------------------------------------------------------------------
export default function StatCard({
  label,
  value,
  hint,
  icon,
  accent,
  trend,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: ReactNode;
  accent: Accent;
  trend?: number[];
}) {
  const a = ACCENT_CLASS[accent];
  return (
    <div className="rounded-xl border border-line bg-surface p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${a.chip} ${a.icon}`} aria-hidden="true">
          {icon}
        </span>
        {trend && trend.length > 1 && <Sparkline values={trend} color={a.line} />}
      </div>
      <p className="mt-3 text-2xl font-semibold text-ink">{value}</p>
      <p className="text-[13px] text-muted">{label}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}
