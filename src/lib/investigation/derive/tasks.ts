// -----------------------------------------------------------------------------
// Investigation Tasks — deterministic, actionable items derived from real
// InvestigationCase data. Two sources, both already real:
//   - "contradiction" tasks: the case's own Contradiction.suggestedNextQuestion
//     (real, citation-backed text from the synthetic dataset's own
//     build_seed.mjs output) — framed here as the recommended next action.
//   - Gap-derived procedural tasks (forensic/seizure/custody): the SAME
//     absence-of-data facts derive/gaps.ts reports, rephrased as an
//     imperative action rather than a passive statement. Not a new fact —
//     "no forensic request exists" (a Gap) becomes "submit evidence for
//     forensic examination" (a Task) — same underlying real absence.
//
// No due dates are fabricated (per the earlier established rule — a real
// due date isn't recorded anywhere in the synthetic dataset, and inventing
// one would be exactly the kind of fabrication this module must avoid).
// Every task's status is honestly "Pending" — there is no "completed task"
// record anywhere in the dataset, so nothing else would be truthful.
// Ordering is fixed and documented (not a proxy for recency, since tasks
// are derived facts, not timestamped events): contradiction-derived tasks
// first (most specific/actionable), then forensic, then seizure, then
// custody.
// -----------------------------------------------------------------------------
import type { InvestigationCase } from "../model";

export type TaskSourceType = "contradiction" | "forensic" | "seizure" | "custody";

export interface InvestigationTask {
  id: string;
  label: string;
  detail: string;
  sourceType: TaskSourceType;
  status: "Pending";
}

export function computeTasks(kase: InvestigationCase): InvestigationTask[] {
  const tasks: InvestigationTask[] = [];

  for (const c of kase.contradictions) {
    tasks.push({
      id: `task-${c.id}`,
      label: c.suggestedNextQuestion,
      detail: c.description,
      sourceType: "contradiction",
      status: "Pending",
    });
  }

  if (kase.forensicRequests.length === 0) {
    tasks.push({
      id: "task-forensic",
      label: "Submit evidence for forensic examination",
      detail: "No forensic/FSL request exists yet for this case in the synthetic dataset.",
      sourceType: "forensic",
      status: "Pending",
    });
  }

  if (kase.searchSeizures.length === 0) {
    tasks.push({
      id: "task-seizure",
      label: "Conduct and document search & seizure",
      detail: "No search or seizure record exists yet for this case in the synthetic dataset.",
      sourceType: "seizure",
      status: "Pending",
    });
  }

  if (kase.evidence.length > 0) {
    tasks.push({
      id: "task-custody",
      label: `Establish chain of custody for ${kase.evidence.length} exhibit${kase.evidence.length === 1 ? "" : "s"}`,
      detail: "No custody transfer history exists for any evidence item in the synthetic dataset.",
      sourceType: "custody",
      status: "Pending",
    });
  }

  return tasks;
}
