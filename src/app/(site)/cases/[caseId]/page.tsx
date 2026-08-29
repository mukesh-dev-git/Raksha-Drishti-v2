import { notFound } from "next/navigation";
import Link from "next/link";
import { FolderKanban, MapPin, Building2, Calendar, Users, ShieldAlert, AlertTriangle, Sparkles, CheckCircle2 } from "lucide-react";
import PageShell from "@/components/PageShell";
import CaseStatusPill from "@/components/CaseStatusPill";
import CaseStatusEditor from "@/components/cases/CaseStatusEditor";
import CrossSourceTimeline from "@/components/CrossSourceTimeline";
import CaseRelationshipGraph from "@/components/cases/CaseRelationshipGraph";
import { getWorklistCase, getSiblingCases, caseDetailLink } from "@/lib/caseWorklist";
import { getScenarioTimeline } from "@/lib/personFusion";
import { getCaseRelationshipGraph } from "@/lib/relationshipGraph";
import scenarioMeta from "@/lib/nosql-seed/scenarioMeta.json";
import contradictionsSeed from "@/lib/nosql-seed/Contradictions.json";
import aiContradictionsSeed from "@/lib/nosql-seed/AIContradictions.json";

const META = scenarioMeta as Record<string, { title: string; summary: string; assignedTo?: string; assignmentReason?: string }>;
const CONTRADICTIONS = contradictionsSeed as { scenarioId: string; description: string; conflictingRecords: string[]; suggestedNextQuestion: string }[];
const AI_CONTRADICTIONS = aiContradictionsSeed as {
  scenarios: Record<string, { contradictions: { recordIds: string[]; reasoning: string; confidence: number }[]; matchesAuthored: boolean }>;
};

// -----------------------------------------------------------------------------
// P2 restructure - the real, single-case detail page. Replaces two fake
// terminuses at once: the flipbook at case-files/[caseId] (100% RNG mock,
// investigationData.ts) and the real half of the old investigation-
// workspace (RealEvidenceFeed's live ZCQL call, which can't run in local
// dev and only ever resolved "first scenario matching this crime type +
// district" rather than one specific case).
//
// Keyed by the real CaseMasterID, not a caseType/district/id triple - one
// case, one URL. Evidence comes straight from personFusion's
// getScenarioTimeline (bundled JSON, no ZCQL) filtered to this case's own
// scenario, which is exact rather than "first match".
// -----------------------------------------------------------------------------
export async function generateMetadata({ params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params;
  const c = getWorklistCase(Number(caseId));
  return { title: c ? `${c.crimeNo} — ${c.title}` : "Case not found" };
}

export default async function CaseDetailPage({ params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params;
  const caseMasterId = Number(caseId);
  const c = getWorklistCase(caseMasterId);
  if (!c) notFound();

  const meta = META[c.scenarioId];
  const siblings = getSiblingCases(caseMasterId);
  const evidence = getScenarioTimeline(c.scenarioId);
  const graph = getCaseRelationshipGraph(c.scenarioId);
  const authoredContradiction = CONTRADICTIONS.find((x) => x.scenarioId === c.scenarioId);
  const aiFinding = AI_CONTRADICTIONS.scenarios[c.scenarioId];

  return (
    <PageShell
      title={c.title}
      description={`${c.crimeTypeName} · ${c.districtName} · ${c.crimeNo}`}
      breadcrumbs={[
        { label: "Cases", href: "/cases" },
        { label: c.crimeNo, href: caseDetailLink(caseMasterId) },
      ]}
      actions={<CaseStatusEditor caseMasterId={caseMasterId} statusId={c.statusId} />}
    >
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.1fr_1.4fr] lg:items-start">
        <div className="min-w-0 space-y-5">
          {/* Case facts */}
          <div className="rounded-xl border border-line bg-surface shadow-sm">
            <div className="border-b border-line bg-surface-2/50 px-5 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">Case facts</p>
            </div>
            <div className="divide-y divide-surface-2 px-5">
              <FactRow icon={FolderKanban} label="Crime no." value={c.crimeNo} mono />
              <FactRow icon={Building2} label="Police station" value={c.policeStationName ?? "Unknown"} />
              <FactRow icon={MapPin} label="District" value={c.districtName} />
              <FactRow icon={Calendar} label="Registered" value={c.registeredDate ?? "Unknown"} />
              <FactRow icon={Users} label="Accused" value={c.accusedNames.length ? c.accusedNames.join(", ") : "Unidentified"} />
            </div>
            <div className="px-5 py-4">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">Sections</p>
              <div className="flex flex-wrap gap-1.5">
                {c.sections.map((s) => (
                  <span key={s} className="rounded-md border border-line bg-surface-2 px-2 py-0.5 font-mono text-[11px] text-ink">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Investigation summary */}
          {meta && (
            <div className="rounded-xl border border-line bg-surface p-5 shadow-sm">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">Investigation summary</p>
              <p className="text-[13px] leading-relaxed text-ink">{meta.summary}</p>
              {meta.assignedTo && (
                <p className="mt-3 flex items-center gap-1.5 text-[12px] text-muted">
                  <ShieldAlert size={13} aria-hidden="true" /> Assigned to: {meta.assignedTo}
                  {meta.assignmentReason ? ` — ${meta.assignmentReason}` : ""}
                </p>
              )}
            </div>
          )}

          {/* Sibling FIRs - this scenario spans more than one case */}
          {siblings.length > 0 && (
            <div className="rounded-xl border border-line bg-surface p-5 shadow-sm">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
                Same investigation, {siblings.length} more case{siblings.length === 1 ? "" : "s"}
              </p>
              <div className="space-y-1.5">
                {siblings.map((s) => (
                  <Link
                    key={s.caseMasterId}
                    href={caseDetailLink(s.caseMasterId)}
                    className="flex items-center justify-between gap-2 rounded-lg border border-line px-3 py-2 text-[13px] transition hover:border-navy"
                  >
                    <span className="text-ink">{s.crimeNo} · {s.districtName}</span>
                    <CaseStatusPill statusId={s.statusId} />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="min-w-0 space-y-5">
          {/* Contradiction findings - kept visibly distinct, same discipline
              RealEvidenceFeed uses: authored ground truth vs an independent
              AI read, never conflated. */}
          {(authoredContradiction || (aiFinding && aiFinding.contradictions.length > 0)) && (
            <div className="space-y-3">
              {authoredContradiction && (
                <div className="rounded-xl border border-danger bg-danger-bg p-4">
                  <p className="mb-1 flex items-center gap-1.5 text-[12px] font-semibold text-danger">
                    <AlertTriangle size={14} aria-hidden="true" /> Verified contradiction — case record
                  </p>
                  <p className="text-[13px] leading-relaxed text-ink">{authoredContradiction.description}</p>
                  <p className="mt-2 font-mono text-[11px] text-muted">{authoredContradiction.conflictingRecords.join(" · ")}</p>
                  <p className="mt-2 text-[12px] text-ink">
                    <span className="font-semibold">Next question:</span> {authoredContradiction.suggestedNextQuestion}
                  </p>
                </div>
              )}
              {aiFinding?.contradictions.map((f, i) => (
                <div key={i} className="rounded-xl border border-dash-purple bg-dash-purple-bg p-4">
                  <p className="mb-1 flex items-center gap-1.5 text-[12px] font-semibold text-dash-purple">
                    <Sparkles size={14} aria-hidden="true" /> AI-detected contradiction — GLM-4.7-Flash
                    {aiFinding.matchesAuthored && (
                      <span className="ml-1 inline-flex items-center gap-1 text-[10.5px] font-normal text-dash-purple">
                        <CheckCircle2 size={11} aria-hidden="true" /> matches verified finding
                      </span>
                    )}
                  </p>
                  <p className="text-[13px] leading-relaxed text-ink">{f.reasoning}</p>
                  <p className="mt-2 font-mono text-[11px] text-muted">{f.recordIds.join(" · ")}</p>
                </div>
              ))}
            </div>
          )}

          {/* Relationship graph - real nodes/edges only, see relationshipGraph.ts */}
          <div className="min-w-0 rounded-xl border border-line bg-surface p-5 shadow-sm">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
              Relationship graph · {graph.nodes.length} entities, {graph.edges.length} linked records
            </p>
            <p className="mb-3 text-[12px] text-muted">
              Every person, location and record actually named in this case&apos;s evidence - one edge per real call, transaction, sighting or statement.
            </p>
            <CaseRelationshipGraph key={c.scenarioId} nodes={graph.nodes} edges={graph.edges} />
          </div>

          {/* Cross-source timeline */}
          <div className="rounded-xl border border-line bg-surface p-5 shadow-sm">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
              Cross-source timeline · {evidence.length} records
            </p>
            <p className="mb-3 text-[12px] text-muted">
              Every call, sighting, transaction and statement linked to this investigation, merged in chronological order.
            </p>
            {evidence.length > 0 ? (
              <CrossSourceTimeline items={evidence} />
            ) : (
              <p className="text-[13px] text-muted">No evidence records linked to this case yet.</p>
            )}
          </div>
        </div>
      </div>
    </PageShell>
  );
}

function FactRow({ icon: Icon, label, value, mono }: { icon: typeof FolderKanban; label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 text-[13px]">
      <span className="flex items-center gap-1.5 text-muted">
        <Icon size={13} aria-hidden="true" /> {label}
      </span>
      <span className={`text-right font-medium text-ink ${mono ? "font-mono text-[12px]" : ""}`}>{value}</span>
    </div>
  );
}
