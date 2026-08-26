import Link from "next/link";
import { ShieldAlert, Layers, FolderKanban, Clock } from "lucide-react";
import PageShell from "@/components/PageShell";
import { getRepeatCaseSuspects } from "@/lib/personFusion";
import { scenarioLink } from "@/lib/dashboardData";
import scenarioMeta from "@/lib/nosql-seed/scenarioMeta.json";

const TITLES = scenarioMeta as Record<string, { title: string }>;

// -----------------------------------------------------------------------------
// P4.7 - the discovery surface the PS's "Repeat Offender Tracking... across
// different jurisdictions" ask needs and didn't have. The computation
// (getRepeatCaseSuspects, personFusion.ts) already existed from P3.1; this
// is its first UI surface anywhere in the app.
//
// Honest about scale, same discipline as pattern-analysis: real seeded data
// gives 6 people who span 2+ CaseMasterIDs, all within one scenario each -
// zero people span two different scenarios yet (see PLAN.md P4.7 / P3.1).
// Shipped against the data that's actually real today, not an empty page
// waiting for a hypothetical dataset.
// -----------------------------------------------------------------------------
export const metadata = { title: "Repeat Offenders" };

export default function RepeatOffendersPage() {
  const people = getRepeatCaseSuspects();

  return (
    <PageShell
      title="Repeat Offenders"
      description="People named across more than one case file, ranked by how many. Every case link is a real investigation — not a name match, a shared record ID."
      breadcrumbs={[{ label: "Repeat Offenders", href: "/repeat-offenders" }]}
    >
      {people.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-surface p-8 text-center text-sm text-muted">
          No one in the current seeded dataset appears in more than one case.
        </div>
      ) : (
        <div className="space-y-5">
          <p className="text-sm text-muted">
            {people.length} people appear in 2 or more cases in the current seeded dataset.
          </p>

          {people.map((p) => {
            const scenarios = [...new Set(p.timeline.map((t) => t.scenarioId))];

            return (
              <div key={p.personId} className="overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface-2/50 px-5 py-4">
                  <div className="flex items-center gap-2.5">
                    <ShieldAlert size={18} className="text-navy" aria-hidden="true" />
                    <div>
                      <p className="text-[15px] font-semibold text-navy">{p.name}</p>
                      {p.aliases.length > 1 && (
                        <p className="text-[12px] text-muted">
                          Also recorded as: {p.aliases.filter((a) => a !== p.name).join(", ")}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-[13px] text-muted">
                    <span className="flex items-center gap-1.5">
                      <FolderKanban size={14} aria-hidden="true" /> {p.caseMasterIds.length} cases
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Layers size={14} aria-hidden="true" /> {scenarios.length} investigation{scenarios.length === 1 ? "" : "s"}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock size={14} aria-hidden="true" /> {p.timeline.length} linked records
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-[1fr_1.4fr]">
                  {/* Cases */}
                  <div>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">Cases</p>
                    <div className="space-y-1.5">
                      {scenarios.map((sid) => {
                        const link = scenarioLink(sid);
                        const title = TITLES[sid]?.title ?? sid;
                        const content = (
                          <div className="flex items-center justify-between gap-2 rounded-lg border border-line px-3 py-2 text-[13px] transition hover:border-navy">
                            <span className="min-w-0 truncate text-ink">{title}</span>
                            <span className="shrink-0 font-mono text-[11px] text-muted">{sid}</span>
                          </div>
                        );
                        return link ? (
                          <Link key={sid} href={link}>
                            {content}
                          </Link>
                        ) : (
                          <div key={sid}>{content}</div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Fused timeline preview */}
                  <div>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
                      Cross-source timeline
                    </p>
                    <ul className="space-y-1.5">
                      {p.timeline.slice(0, 5).map((t) => (
                        <li key={t.id} className="flex gap-2 text-[13px] leading-relaxed">
                          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-navy/50" />
                          <span className="min-w-0">
                            <span className="font-mono text-[11px] text-muted">{t.id}</span>{" "}
                            <span className="text-ink">{t.summary}</span>
                          </span>
                        </li>
                      ))}
                      {p.timeline.length > 5 && (
                        <li className="pl-3.5 text-[12px] text-muted">+ {p.timeline.length - 5} more records</li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}
