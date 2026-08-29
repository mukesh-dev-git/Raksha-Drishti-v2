import StatTile from "@/components/ui/StatTile";
import CaseStatusPill from "@/components/CaseStatusPill";
import type { CaseStatusId } from "@/lib/caseStatus";
import type { CrimeCountSummary } from "@/lib/crimeCountStats";
import { crimeTypeColor } from "./colors";

// -----------------------------------------------------------------------------
// P4.8 baseline - real totals from getCrimeCountSummary() (getCaseWorklist()
// under the hood), not data.ts's stale caseTypes[].total placeholders.
// -----------------------------------------------------------------------------
export default function CrimeCountStatCards({ summary }: { summary: CrimeCountSummary }) {
  const maxTypeTotal = Math.max(...summary.byCrimeType.map((t) => t.total), 1);
  const maxStatusTotal = Math.max(...summary.byStatus.map((s) => s.total), 1);

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <StatTile label="Total registered cases" value={summary.totalCases.toLocaleString("en-IN")} hint="All real FIRs in the seeded Data Store" />

      <div className="rounded border border-line bg-surface p-5 shadow-sm">
        <p className="text-sm text-muted">By crime type</p>
        <ul className="mt-3 space-y-2.5">
          {summary.byCrimeType.map((t) => (
            <li key={t.slug} className="text-[13px]">
              <div className="flex items-center justify-between">
                <span className="text-ink">{t.name}</span>
                <span className="font-medium text-ink">{t.total.toLocaleString("en-IN")}</span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-surface-2">
                <div
                  className="h-1.5 rounded-full"
                  style={{ width: `${(t.total / maxTypeTotal) * 100}%`, backgroundColor: crimeTypeColor(t.slug) }}
                />
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded border border-line bg-surface p-5 shadow-sm">
        <p className="text-sm text-muted">By status</p>
        <ul className="mt-3 space-y-2.5">
          {summary.byStatus.map((s) => (
            <li key={s.statusId} className="text-[13px]">
              <div className="flex items-center justify-between gap-2">
                <CaseStatusPill statusId={s.statusId as CaseStatusId} />
                <span className="font-medium text-ink">{s.total.toLocaleString("en-IN")}</span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-surface-2">
                <div className="h-1.5 rounded-full bg-navy" style={{ width: `${(s.total / maxStatusTotal) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
