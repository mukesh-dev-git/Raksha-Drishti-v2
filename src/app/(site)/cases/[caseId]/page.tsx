import { notFound } from "next/navigation";
import Link from "next/link";
import { FolderKanban, MapPin, Building2, Calendar, Users, ShieldAlert, AlertTriangle, Sparkles, CheckCircle2, Waypoints, MessageCircleQuestion, MessageSquareQuote } from "lucide-react";
import PageShell from "@/components/PageShell";
import CaseStatusPill from "@/components/CaseStatusPill";
import CaseStatusEditor from "@/components/cases/CaseStatusEditor";
import IOAssignmentEditor from "@/components/cases/IOAssignmentEditor";
import CrossSourceTimeline from "@/components/CrossSourceTimeline";
import CaseRelationshipGraph from "@/components/cases/CaseRelationshipGraph";
import StatementAudioPlayer from "@/components/evidence/StatementAudioPlayer";
import { getWorklistCase, getSiblingCases, caseDetailLink } from "@/lib/caseWorklist";
import { getLiveCaseOverrides } from "@/lib/liveCaseOverrides";
import { getScenarioTimeline } from "@/lib/personFusion";
import { getMoPatternClusters } from "@/lib/moPatterns";
import { getEmployeesByDistrict } from "@/lib/employees";
import { getCaseRelationshipGraph } from "@/lib/relationshipGraph";
import { suggestNextQuestion } from "@/lib/nextQuestion";
import { getWitnessStatementsForScenario } from "@/lib/witnessStatements";
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

  // P10 Phase 2 - the fix for a write being invisible on the very page it
  // was made from. CaseStatusEditor/IOAssignmentEditor already call
  // router.refresh() after a successful PATCH (P2.4) - that plumbing was
  // always correct, it was just re-running this Server Component against
  // `c` above, which only ever reads the bundled snapshot. Merging a live
  // override for JUST the two columns this app can write (status, officer)
  // means that same refresh now shows the real value. Falls back to `c`'s
  // bundled value on any live-fetch failure (local dev, a real error) -
  // never blocks the page, see liveCaseOverrides.ts's own note. Deliberately
  // NOT extended to `getSiblingCases()`'s rows below (line ~181) - each
  // would need its own live fetch, and those are a different case's status
  // shown in a small cross-reference list, not this page's own editable
  // state; left on bundled data as a known, scoped limitation.
  const liveOverrides = await getLiveCaseOverrides(caseMasterId);
  const statusId = liveOverrides?.statusId ?? c.statusId;
  const policePersonId = liveOverrides?.policePersonId ?? c.policePersonId;

  const meta = META[c.scenarioId];
  const siblings = getSiblingCases(caseMasterId);
  const evidence = getScenarioTimeline(c.scenarioId);
  const graph = getCaseRelationshipGraph(c.scenarioId);
  const authoredContradiction = CONTRADICTIONS.find((x) => x.scenarioId === c.scenarioId);
  const aiFinding = AI_CONTRADICTIONS.scenarios[c.scenarioId];
  // P9.3 - real cross-link into P4.6's already-verified MO clustering:
  // does this specific FIR belong to a real pattern cluster?
  const patternCluster = getMoPatternClusters().find((cl) => cl.members.some((m) => m.caseMasterId === caseMasterId));
  const officers = getEmployeesByDistrict(c.districtId);
  // P5.4 - "next question to ask", a live GLM call grounded in this case's
  // own evidence (see src/lib/nextQuestion.ts). Only attempted for the
  // scenarios that have real fused evidence at all (the 15 authored
  // scenarios - see personFusion.getScenarioTimeline) - the 5,000 bulk P1.2
  // cases have none, so this is skipped for them rather than showing a fake
  // "no suggestion available" card. Never throws; renders nothing on any
  // failure (missing config, network/timeout, or a fully-hallucinated
  // citation dropped by nextQuestion.ts's own guardrail).
  const nextQuestion = evidence.length > 0 ? await suggestNextQuestion(c.scenarioId) : null;
  // P7.1 - real witness statements for this case's scenario, wired to Zia's
  // Trained NLP Models Text-to-Audio via StatementAudioPlayer/api/tts.
  const witnessStatements = getWitnessStatementsForScenario(c.scenarioId);

  return (
    <PageShell
      title={c.title}
      description={`${c.crimeTypeName} · ${c.districtName} · ${c.crimeNo}`}
      breadcrumbs={[
        { label: "Cases", href: "/cases" },
        { label: c.crimeNo, href: caseDetailLink(caseMasterId) },
      ]}
      actions={<CaseStatusEditor caseMasterId={caseMasterId} statusId={statusId} />}
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
            </div>
            <div className="border-t border-surface-2 px-5 py-4">
              <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
                <Users size={12} aria-hidden="true" /> Accused
              </p>
              {c.accused.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {c.accused.map((a) => {
                    const pillClass = "flex items-center gap-1.5 rounded-full border border-line bg-surface-2 py-1 pl-1 pr-2.5 text-[12.5px] text-ink";
                    const pillContent = (
                      <>
                        <span className="rounded-full bg-dash-blue-bg px-2 py-0.5 text-[11px] font-medium text-dash-blue">
                          {a.name}
                        </span>
                        {a.caseCount > 1 && (
                          <span className="flex items-center gap-0.5 text-[10.5px] font-medium text-dash-pink">
                            <ShieldAlert size={10} aria-hidden="true" /> Repeat ({a.caseCount})
                          </span>
                        )}
                      </>
                    );
                    // P1.2 - a bulk case's accused has a real, stable
                    // personId but no evidence-fused /persons profile (see
                    // caseWorklist.ts's `linked`), so it renders as plain
                    // text rather than a link that would 404.
                    return a.linked ? (
                      <Link key={a.personId} href={`/persons/${a.personId}`} className={`${pillClass} transition hover:border-navy`}>
                        {pillContent}
                      </Link>
                    ) : (
                      <span key={a.personId} className={pillClass} title="Named in this FIR - no cross-case evidence profile yet">
                        {pillContent}
                      </span>
                    );
                  })}
                </div>
              ) : (
                <p className="text-[13px] text-ink">Unidentified</p>
              )}
            </div>
            <div className="border-t border-surface-2 px-5 py-4">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">Sections</p>
              <div className="flex flex-wrap gap-1.5">
                {c.sections.map((s) => (
                  <span key={s} className="rounded-md border border-line bg-surface-2 px-2 py-0.5 font-mono text-[11px] text-ink">
                    {s}
                  </span>
                ))}
              </div>
            </div>
            <div className="border-t border-surface-2 px-5 py-4">
              <IOAssignmentEditor caseMasterId={caseMasterId} currentEmployeeId={policePersonId} officers={officers} />
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

          {/* MO pattern cluster - real cross-link into P4.6's clustering */}
          {patternCluster && (
            <div className="rounded-xl border border-dash-purple bg-dash-purple-bg p-5">
              <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-dash-purple">
                <Waypoints size={12} aria-hidden="true" /> Part of an MO pattern cluster
              </p>
              <p className="mb-3 text-[12.5px] text-ink">
                Linked to {patternCluster.members.length - 1} other case{patternCluster.members.length - 1 === 1 ? "" : "s"} by
                shared sections {patternCluster.linkingSections.join(", ")} — {patternCluster.strength === "exact" ? "exact match" : "partial match"}.
              </p>
              <Link
                href="/pattern-analysis"
                className="inline-flex items-center gap-1 text-[12.5px] font-medium text-dash-purple hover:underline"
              >
                View the full cluster on Pattern Analysis →
              </Link>
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

          {/* P5.4 - AI-suggested next question, kept visibly distinct from
              both the "Verified contradiction" (red) and "AI-detected
              contradiction" (purple) cards above - own accent (teal) so all
              three read as separate claims at a glance, same "AI vs authored
              ground truth, kept visibly distinct" discipline. A live call
              (src/lib/nextQuestion.ts), not a seeded finding like
              AIContradictions.json, so the caption says so explicitly. */}
          {nextQuestion?.ok && (
            <div className="rounded-xl border border-dash-teal bg-dash-teal-bg p-4">
              <p className="mb-1 flex items-center gap-1.5 text-[12px] font-semibold text-dash-teal">
                <MessageCircleQuestion size={14} aria-hidden="true" /> AI-suggested next question — GLM-4.7-Flash
              </p>
              <p className="text-[13px] leading-relaxed text-ink">{nextQuestion.question}</p>
              <p className="mt-1.5 text-[12px] text-muted">{nextQuestion.rationale}</p>
              <p className="mt-2 font-mono text-[11px] text-muted">{nextQuestion.citedRecordIds.join(" · ")}</p>
              <p className="mt-2 text-[10.5px] text-muted">Generated live for this page, grounded in this case&apos;s own evidence - not a stored finding.</p>
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

          {/* P7.1 - Kannada Text-to-Audio on real witness statements (Zia
              Trained NLP Models). New, self-contained section - see
              StatementAudioPlayer.tsx / /api/tts for the honest
              verification-status note on this endpoint. */}
          {witnessStatements.length > 0 && (
            <div className="rounded-xl border border-line bg-surface p-5 shadow-sm">
              <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
                <MessageSquareQuote size={12} aria-hidden="true" /> Witness statements · Kannada audio ({witnessStatements.length})
              </p>
              <p className="mb-3 text-[12px] text-muted">
                Real statement text from this case, read aloud via Zia&apos;s Trained NLP Models Text-to-Audio Synthesis - Karnataka&apos;s official language, spoken.
              </p>
              <div className="space-y-3">
                {witnessStatements.map((w) => (
                  <div key={w.id} className="rounded-lg border border-line/70 p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-[12.5px] font-semibold text-ink">{w.witnessName}</p>
                      <span className="font-mono text-[10.5px] text-muted">{w.id} · {w.statementDate}</span>
                    </div>
                    <p className="mb-2 text-[13px] leading-relaxed text-ink">&ldquo;{w.statementText}&rdquo;</p>
                    <StatementAudioPlayer statementId={w.id} text={w.statementText} />
                  </div>
                ))}
              </div>
            </div>
          )}
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
