// -----------------------------------------------------------------------------
// adaptToOverview — composes the case-level Overview command-center view
// from InvestigationCase, entirely from the synthetic seeded development
// dataset plus the small derived-logic modules in ./derive. No RNG, no
// fabrication: every field is DIRECT (copied from a real record), DERIVED
// (a documented, deterministic computation over real fields — progress,
// health, gaps, evidence tally), or an explicit empty value the UI renders
// as a clean empty state.
//
// This is a NEW output shape (OverviewData) — unlike adaptToCaseFileContent
// and adaptToTimeline, there is no legacy shape to match, since Overview is
// a new surface. It is still deliberately plain data (no React, no JSX) so
// swapping the synthetic source for a real backend later only touches this
// function's inputs, not CaseOverviewPanel.tsx.
// -----------------------------------------------------------------------------
import type { InvestigationCase, FIRSummary, Person } from "./model";
import { computeInvestigationProgress, type InvestigationProgress } from "./derive/progress";
import { computeInvestigationHealth, type InvestigationHealth } from "./derive/health";
import { computeTopGaps, type InvestigationGap } from "./derive/gaps";
import { adaptToLegacyTimelineEvents } from "./adaptToTimeline";

export interface OverviewPerson {
  id: string;
  role: Person["role"];
  name: string;
}

export interface OverviewRecentEvent {
  id: string;
  date: string;
  time: string;
  title: string;
  description: string;
}

export interface OverviewEvidenceSummary {
  total: number;
  byType: { type: string; count: number }[];
}

export interface OverviewAiSummary {
  available: boolean;
  headline: string;
  insights: string[];
  recommendedActions: string[];
  disclaimer: string;
}

export interface OverviewData {
  scenarioTitle: string;
  fir: {
    caseMasterId: number;
    crimeNo: string;
    caseType: string;
    district: string;
    policeStation: string;
    status: string;
    officerInCharge: string;
    dateFiled: string;
    incidentDate: string;
    incidentTime: string;
    sections: string[];
  };
  progress: InvestigationProgress;
  health: InvestigationHealth;
  recentEvents: OverviewRecentEvent[];
  keyPeople: OverviewPerson[];
  evidenceSummary: OverviewEvidenceSummary;
  gaps: InvestigationGap[];
  ai: OverviewAiSummary;
}

const AI_DISCLAIMER =
  "AI-generated decision support based on synthetic case data. Verify against official case records before taking action.";

function personName(kase: InvestigationCase, id: string | undefined): string | undefined {
  return id ? kase.persons.find((p) => p.id === id)?.name : undefined;
}

export function adaptToOverview(kase: InvestigationCase, firCaseMasterId: number): OverviewData {
  const fir: FIRSummary = kase.firs.find((f) => f.caseMasterId === firCaseMasterId) ?? kase.firs[0];

  // Key people: complainant + victim + accused named on THIS FIR — a
  // curated subset (not the full People roster, which belongs to the
  // People tab), capped so Overview stays scannable.
  const keyPeople: OverviewPerson[] = kase.persons
    .filter((p) => p.caseMasterIds.includes(fir.caseMasterId) && p.role !== "io")
    .slice(0, 6)
    .map((p) => ({ id: p.id, role: p.role, name: p.name }));

  const recentEvents: OverviewRecentEvent[] = adaptToLegacyTimelineEvents(kase)
    .slice(-4)
    .reverse()
    .map((e) => ({ id: e.id, date: e.date, time: e.time, title: e.title, description: e.description }));

  const byTypeMap = new Map<string, number>();
  for (const e of kase.evidence) byTypeMap.set(e.type, (byTypeMap.get(e.type) ?? 0) + 1);
  const evidenceSummary: OverviewEvidenceSummary = {
    total: kase.evidence.length,
    byType: Array.from(byTypeMap.entries()).map(([type, count]) => ({ type, count })),
  };

  const gaps = computeTopGaps(kase).slice(0, 3);

  const ai: OverviewAiSummary = {
    available: kase.contradictions.length > 0 || !!kase.summary,
    headline: kase.summary,
    insights: kase.contradictions.map((c) => c.description).slice(0, 2),
    recommendedActions: kase.contradictions.map((c) => c.suggestedNextQuestion).slice(0, 2),
    disclaimer: AI_DISCLAIMER,
  };

  return {
    scenarioTitle: kase.title,
    fir: {
      caseMasterId: fir.caseMasterId,
      crimeNo: fir.crimeNo,
      caseType: fir.crimeTypeName ?? "Not recorded",
      district: fir.districtName ?? "Not recorded",
      policeStation: fir.policeStationName ?? "Not recorded",
      status: fir.caseStatusName ?? "Not recorded",
      officerInCharge: personName(kase, fir.ioPersonId) ?? "Not recorded",
      dateFiled: fir.crimeRegisteredDate,
      incidentDate: fir.incidentFromDate.split("T")[0] ?? fir.incidentFromDate,
      incidentTime: fir.incidentFromDate.split("T")[1]?.slice(0, 5) ?? "",
      sections: fir.sections,
    },
    progress: computeInvestigationProgress(kase),
    health: computeInvestigationHealth(kase),
    recentEvents,
    keyPeople,
    evidenceSummary,
    gaps,
    ai,
  };
}
