// -----------------------------------------------------------------------------
// adaptToInvestigation — composes the case-level Investigation tab view:
// Status, Activities, Case Diary, Tasks, Gaps, Recommended Next Actions.
// Entirely from InvestigationCase (Step 1) plus the small derive/ modules —
// no RNG, no fabrication. Every activity/diary entry already traces back to
// a real TimelineEvent (see normalize.ts's buildActivities/buildDiaryEntries);
// this adapter only resolves display names (officer, persons, evidence) for
// presentation, it does not invent new facts.
// -----------------------------------------------------------------------------
import type { InvestigationCase } from "./model";
import { computeInvestigationProgress, type InvestigationProgress } from "./derive/progress";
import { computeTopGaps, type InvestigationGap } from "./derive/gaps";
import { computeTasks, type InvestigationTask } from "./derive/tasks";

export interface ActivityView {
  id: string;
  methodType: string;
  status: string;
  date: string;
  time: string;
  findings: string;
  assignedOfficer: string;
  evidenceRefs: string[];
}

export interface DiaryEntryView {
  id: string;
  date: string;
  time: string;
  officer: string;
  activity: string;
  observation: string;
  personsInvolved: string[];
  evidenceRefs: string[];
}

export interface InvestigationTabData {
  caseStatus: string;
  progress: InvestigationProgress;
  activities: ActivityView[];
  diary: DiaryEntryView[];
  tasks: InvestigationTask[];
  recommendedActions: InvestigationTask[];
  gaps: InvestigationGap[];
}

function personName(kase: InvestigationCase, id: string | undefined): string {
  return (id && kase.persons.find((p) => p.id === id)?.name) || "Not recorded";
}

function evidenceTitle(kase: InvestigationCase, id: string): string {
  return kase.evidence.find((e) => e.id === id)?.title ?? id;
}

export function adaptToInvestigation(kase: InvestigationCase, firCaseMasterId: number): InvestigationTabData {
  const fir = kase.firs.find((f) => f.caseMasterId === firCaseMasterId) ?? kase.firs[0];

  const activities: ActivityView[] = kase.activities.map((a) => {
    const [date, time] = a.startTime.split("T");
    return {
      id: a.id,
      methodType: a.methodType,
      status: a.status,
      date: date ?? a.startTime,
      time: time ? time.slice(0, 5) : "",
      findings: a.findings,
      assignedOfficer: personName(kase, a.assignedOfficer),
      evidenceRefs: a.evidenceGenerated.map((id) => evidenceTitle(kase, id)),
    };
  });

  const diary: DiaryEntryView[] = kase.diaryEntries.map((d) => ({
    id: d.id,
    date: d.date,
    time: d.time,
    // d.officer is a Person id (e.g. "IO-5004"), not a display name — resolve
    // it the same way activities.assignedOfficer already is, above.
    officer: personName(kase, d.officer),
    activity: d.activity,
    observation: d.observation,
    personsInvolved: d.personsInvolved.map((id) => personName(kase, id)),
    evidenceRefs: d.evidenceGenerated.map((id) => evidenceTitle(kase, id)),
  }));

  const allTasks = computeTasks(kase);

  return {
    caseStatus: fir.caseStatusName ?? "Not recorded",
    progress: computeInvestigationProgress(kase),
    activities,
    diary,
    tasks: allTasks.filter((t) => t.sourceType !== "contradiction"),
    recommendedActions: allTasks.filter((t) => t.sourceType === "contradiction"),
    gaps: computeTopGaps(kase),
  };
}
