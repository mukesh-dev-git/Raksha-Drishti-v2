import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";

export type AttentionSignal = {
  href: string;
  icon: LucideIcon;
  accent: "purple" | "pink";
  title: string;
  detail: string;
};

const ACCENT = {
  purple: { chip: "bg-dash-purple-bg text-dash-purple", border: "hover:border-dash-purple" },
  pink: { chip: "bg-dash-pink-bg text-dash-pink", border: "hover:border-dash-pink" },
};

// -----------------------------------------------------------------------------
// P2.3 - the dashboard rebuild's actual point: statewide cross-district
// pattern signals (MO clustering, repeat offenders) get surfaced here for
// the first time. Both features have existed as standalone pages since P4.6/
// P4.7 but were never mentioned on the dashboard itself - exactly the PS's
// "Pattern & Trend Discovery... across districts" ask, previously invisible
// on SCRB's actual home screen.
//
// Deliberately statewide, not filtered by ?district= like the rest of this
// page - a cross-district pattern IS the finding; scoping it to one
// district would undercut the point of showing it at all.
// -----------------------------------------------------------------------------
export default function AttentionSignals({ signals }: { signals: AttentionSignal[] }) {
  if (signals.length === 0) return null;
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {signals.map((s) => {
        const a = ACCENT[s.accent];
        const Icon = s.icon;
        return (
          <Link
            key={s.href}
            href={s.href}
            className={`flex items-center gap-3 rounded-xl border border-line bg-surface p-4 shadow-sm transition ${a.border}`}
          >
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${a.chip}`} aria-hidden="true">
              <Icon size={18} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13.5px] font-semibold text-ink">{s.title}</span>
              <span className="block text-xs text-muted">{s.detail}</span>
            </span>
            <ChevronRight size={16} className="shrink-0 text-muted" aria-hidden="true" />
          </Link>
        );
      })}
    </div>
  );
}
