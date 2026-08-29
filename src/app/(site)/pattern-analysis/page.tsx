import Link from "next/link";
import { Waypoints, ArrowRight, Link2 } from "lucide-react";
import PageShell from "@/components/PageShell";
import StatusBadge from "@/components/ui/StatusBadge";
import { getMoPatternClusters } from "@/lib/moPatterns";

// -----------------------------------------------------------------------------
// P4.6 - MO pattern-clustering. Real, deterministic (moPatterns.ts), computed
// from Act/Section data that was seeded into the Data Store but read nowhere
// in src/ until now (Part 5 of RESEARCH_AND_PLAN.md). No LLM involved.
//
// Honest about scale: 19 real cases -> 3 real clusters today. That's the
// actual number, not a placeholder - see moPatterns.ts's module comment for
// the clustering rule and why a looser one produced a useless mega-cluster.
// -----------------------------------------------------------------------------
export const metadata = { title: "Pattern Analysis" };

export default function PatternAnalysisPage() {
  const clusters = getMoPatternClusters();

  return (
    <PageShell
      title="Pattern Analysis"
      description="Cases from different investigations that share a distinctive method — same combination of charged sections, not just the same crime type. Every cluster below links records that were never compared to each other until now."
      breadcrumbs={[{ label: "Pattern Analysis", href: "/pattern-analysis" }]}
      heroImageSrc="/page-hero/pattern-analysis.png"
    >
      {clusters.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-surface p-8 text-center text-sm text-muted">
          No cross-case pattern found in the current seeded dataset.
        </div>
      ) : (
        <div className="space-y-6">
          <p className="text-sm text-muted">
            {clusters.length} pattern{clusters.length === 1 ? "" : "s"} found across {clusters.reduce((n, c) => n + c.members.length, 0)} cases,
            from independently-authored investigations — none of these cases reference each other.
          </p>

          {clusters.map((cluster) => (
            <div key={cluster.id} className="overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface-2/50 px-5 py-4">
                <div className="flex items-center gap-2.5">
                  <Waypoints size={18} className="text-navy" aria-hidden="true" />
                  <p className="text-[15px] font-semibold text-navy">
                    {cluster.members.length} linked cases
                  </p>
                  <StatusBadge
                    status={cluster.strength === "exact" ? "verified" : "pending"}
                    label={cluster.strength === "exact" ? "Exact method match" : "Shared distinctive elements"}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Link2 size={13} className="text-muted" aria-hidden="true" />
                  {cluster.linkingSections.map((s) => (
                    <span
                      key={s}
                      className="rounded-sm border border-line bg-surface px-2 py-0.5 font-mono text-[12px] text-ink"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 divide-y divide-line sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-3">
                {cluster.members.map((m) => {
                  const card = (
                    <div className="flex h-full flex-col gap-2 p-5">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[15px] font-semibold text-ink">{m.scenarioTitle}</p>
                        {m.link && <ArrowRight size={15} className="mt-1 shrink-0 text-muted" aria-hidden="true" />}
                      </div>
                      <p className="text-[13px] text-muted">
                        {m.crimeTypeName} · {m.districtName} · Case {m.caseMasterId}
                      </p>
                      <div className="mt-auto flex flex-wrap gap-1.5 pt-2">
                        {m.sections.map((s) => (
                          <span
                            key={s}
                            className={`rounded-sm px-1.5 py-0.5 font-mono text-[11px] ${
                              cluster.linkingSections.includes(s)
                                ? "bg-navy/10 text-navy"
                                : "bg-surface-2 text-muted"
                            }`}
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                  return m.link ? (
                    <Link key={m.caseMasterId} href={m.link} className="transition hover:bg-surface-2/40">
                      {card}
                    </Link>
                  ) : (
                    <div key={m.caseMasterId}>{card}</div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </PageShell>
  );
}
