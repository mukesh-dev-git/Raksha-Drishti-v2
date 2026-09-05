import { Waypoints, ShieldAlert, ShieldCheck, ShieldQuestion, Info, BookOpen } from "lucide-react";
import PageShell from "@/components/PageShell";
import StatTile from "@/components/ui/StatTile";
import PatternClusterCard from "@/components/patterns/PatternClusterCard";
import { getMoPatternClusters } from "@/lib/moPatterns";
import { getPatternClusterSummaries } from "@/lib/patternSummary";
import { getOffenderPhotoUrl } from "@/lib/offenderPhotos";

export const metadata = { title: "Pattern Analysis" };

export default async function PatternAnalysisPage() {
  const clusters = await getMoPatternClusters();
  const summaries = await getPatternClusterSummaries(clusters);

  const totalCases = clusters.reduce((n, c) => n + c.members.length, 0);
  const exact = clusters.filter((c) => c.strength === "exact").length;
  const partial = clusters.filter((c) => c.strength === "partial").length;

  const clientClusters = clusters.map((c) => ({
    ...c,
    members: c.members.map((m) => ({
      ...m,
      accused: m.accused.map((a) => ({
        ...a,
        photoUrl: getOffenderPhotoUrl(a.personId),
      })),
    })),
  }));

  return (
    <PageShell
      title="Pattern Analysis"
      description="Cross-investigation MO clustering — cases from independent investigations that share distinctive legal charge signatures, surfaced by deterministic section-overlap analysis."
      breadcrumbs={[{ label: "Pattern Analysis", href: "/pattern-analysis" }]}
      heroImageSrc="/page-hero/pattern-analysis.png"
    >
      {/* Stats row */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile
          label="Total Patterns"
          value={String(clusters.length)}
          hint="Cross-case clusters detected"
          icon={<Waypoints size={20} />}
        />
        <StatTile
          label="Cases Linked"
          value={String(totalCases)}
          hint="Across all pattern clusters"
          icon={<ShieldAlert size={20} />}
        />
        <StatTile
          label="Exact Matches"
          value={String(exact)}
          hint="Identical charge signatures"
          icon={<ShieldCheck size={20} />}
        />
        <StatTile
          label="Partial Matches"
          value={String(partial)}
          hint="Shared distinctive sections"
          icon={<ShieldQuestion size={20} />}
        />
      </div>

      {clusters.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-surface p-8 text-center text-sm text-muted">
          No cross-case pattern found in the current dataset.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8 xl:grid-cols-[1fr_300px]">
          {/* Main content */}
          <div className="space-y-6">
            <p className="text-sm text-muted">
              {clusters.length} pattern{clusters.length === 1 ? "" : "s"} found across{" "}
              {totalCases} cases from independently-authored investigations — none of
              these cases reference each other.
            </p>

            {clientClusters.map((cluster, i) => {
              const s = summaries.get(cluster.id);
              return (
                <PatternClusterCard
                  key={cluster.id}
                  cluster={cluster}
                  summary={s?.text ?? ""}
                  isGlm={s?.isGlm ?? false}
                  defaultExpanded={i === 0}
                />
              );
            })}
          </div>

          {/* Sidebar */}
          <aside className="hidden space-y-5 xl:block">
            <div className="sticky top-24 space-y-5">
              {/* How to read */}
              <div className="rounded-xl border border-line bg-surface p-5 shadow-sm">
                <div className="mb-3 flex items-center gap-2">
                  <BookOpen size={16} className="text-navy" />
                  <p className="text-sm font-semibold text-navy">How to read this page</p>
                </div>
                <ul className="space-y-2 text-xs leading-relaxed text-muted">
                  <li>Each card groups cases that were <strong className="text-ink">never compared</strong> to each other until this analysis.</li>
                  <li>Shared sections highlighted in <span className="rounded bg-navy/10 px-1 font-mono text-navy">navy</span> are the linking evidence.</li>
                  <li>Click a case to view its full investigation.</li>
                  <li>Expand a card to see the AI-generated analytical summary.</li>
                </ul>
              </div>

              {/* Confidence legend */}
              <div className="rounded-xl border border-line bg-surface p-5 shadow-sm">
                <div className="mb-3 flex items-center gap-2">
                  <Info size={16} className="text-navy" />
                  <p className="text-sm font-semibold text-navy">Match confidence</p>
                </div>
                <div className="space-y-3 text-xs">
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-success" />
                    <div>
                      <p className="font-semibold text-ink">Exact match</p>
                      <p className="text-muted">Identical legal charge signature across cases</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-warning" />
                    <div>
                      <p className="font-semibold text-ink">Distinctive overlap</p>
                      <p className="text-muted">2+ shared sections, at least one rare (≤3 occurrences)</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section code legend */}
              <div className="rounded-xl border border-line bg-surface p-5 shadow-sm">
                <div className="mb-3 flex items-center gap-2">
                  <Info size={16} className="text-navy" />
                  <p className="text-sm font-semibold text-navy">Section codes</p>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-navy/10 px-1.5 py-0.5 font-mono text-navy">IPC-420</span>
                    <span className="text-muted">= shared / linking</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-muted">IPC-120B</span>
                    <span className="text-muted">= case-specific only</span>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}
    </PageShell>
  );
}
