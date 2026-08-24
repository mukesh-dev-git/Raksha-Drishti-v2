// -----------------------------------------------------------------------------
// Investigation Progress — a deterministic milestone checklist computed from
// real fields already present on InvestigationCase. No fabrication: every
// milestone is a plain boolean check against a real array's length or a real
// field's presence. Two milestones (forensic examination, search & seizure)
// are honestly unmet for every one of the 15 synthetic scenarios today,
// because the synthetic dataset has no supporting records for either — that
// is a correct reflection of the data, not a bug.
//
// BACKEND REQUIREMENT: once forensicRequests/searchSeizures have real
// records (see model.ts), milestones 7/8 below will start reporting true —
// no change needed here, the check functions already read those arrays.
// -----------------------------------------------------------------------------
import type { InvestigationCase } from "../model";

export interface ProgressMilestone {
  key: string;
  label: string;
  met: boolean;
}

export interface InvestigationProgress {
  percent: number;
  milestones: ProgressMilestone[];
}

const MILESTONES: { key: string; label: string; check: (k: InvestigationCase) => boolean }[] = [
  { key: "fir", label: "FIR Registered", check: (k) => k.firs.length > 0 },
  { key: "io", label: "Investigating Officer Assigned", check: (k) => k.firs.some((f) => !!f.ioPersonId) },
  { key: "timeline", label: "Timeline Documented", check: (k) => k.timelineEvents.length > 0 },
  { key: "evidence", label: "Evidence Collected", check: (k) => k.evidence.length > 0 },
  { key: "witness", label: "Witness Statement Recorded", check: (k) => k.witnessStatements.length > 0 },
  { key: "lead", label: "Key Lead / Contradiction Identified", check: (k) => k.contradictions.length > 0 },
  { key: "forensic", label: "Forensic Examination Completed", check: (k) => k.forensicRequests.length > 0 },
  { key: "seizure", label: "Search & Seizure Conducted", check: (k) => k.searchSeizures.length > 0 },
];

export function computeInvestigationProgress(kase: InvestigationCase): InvestigationProgress {
  const milestones = MILESTONES.map((m) => ({ key: m.key, label: m.label, met: m.check(kase) }));
  const metCount = milestones.filter((m) => m.met).length;
  const percent = Math.round((metCount / milestones.length) * 100);
  return { percent, milestones };
}
