import { Users, HeartHandshake, Eye, Phone, Camera } from "lucide-react";

// Compact entity ledger for the featured scenario - real entity/record
// counts, not a decorative diagram. Replaces the earlier bubble-and-spoke
// MiniRelationshipGraph: a literal node/edge cartoon reads well as a deep-
// dive tool (see CaseRelationshipGraph.tsx on /cases/[caseId], which stays
// as-is), but as a dashboard-card glance summary it read as a toy. This
// favours the same "encode state in form, not just number" idea - a
// proportion bar per row, tabular counts, icon chips in a tinted square -
// the same live-source pulse-dot convention used elsewhere in the app,
// reused here rather than inventing a new one.
const ROWS: { key: string; label: string; icon: typeof Users; color: string; bg: string }[] = [
  { key: "suspects", label: "Suspects", icon: Users, color: "var(--dash-pink)", bg: "var(--dash-pink-bg)" },
  { key: "victims", label: "Victims", icon: HeartHandshake, color: "var(--dash-orange)", bg: "var(--dash-orange-bg)" },
  { key: "witnesses", label: "Witnesses", icon: Eye, color: "var(--dash-purple)", bg: "var(--dash-purple-bg)" },
  { key: "calls", label: "Calls", icon: Phone, color: "var(--dash-blue)", bg: "var(--dash-blue-bg)" },
  { key: "cctv", label: "CCTV sightings", icon: Camera, color: "var(--dash-teal)", bg: "var(--dash-teal-bg)" },
];

export default function CaseBoardSummary({ counts }: { counts: Record<string, number> }) {
  const active = ROWS.filter((r) => (counts[r.key] || 0) > 0);
  const max = Math.max(1, ...active.map((r) => counts[r.key] || 0));

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Linked entities</p>
        <span className="flex items-center gap-1.5 text-[10.5px] font-medium text-muted">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-600" aria-hidden="true" /> Live
        </span>
      </div>

      <div className="space-y-3">
        {active.map((row) => {
          const Icon = row.icon;
          const count = counts[row.key] || 0;
          const pct = Math.round((count / max) * 100);
          return (
            <div key={row.key}>
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-[12.5px] font-medium text-ink">
                  <span
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
                    style={{ backgroundColor: row.bg, color: row.color }}
                  >
                    <Icon size={13} aria-hidden="true" />
                  </span>
                  {row.label}
                </span>
                <span className="font-mono text-[13px] font-semibold tabular-nums text-ink">{count}</span>
              </div>
              <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-surface-2">
                <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: row.color }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
