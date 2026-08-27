// -----------------------------------------------------------------------------
// Real CaseStatusMaster values (catalyst/dataset-v2/lookups.json) - not
// invented labels. See caseWorklist.ts / build_seed.mjs §6 for how the 19
// real FIRs' CaseStatusID values were hand-varied so this is filterable
// against more than one status.
// -----------------------------------------------------------------------------
export type CaseStatusId = 1 | 2 | 3 | 4;

export const CASE_STATUS_LABEL: Record<CaseStatusId, string> = {
  1: "Open",
  2: "Charge Sheeted",
  3: "Closed",
  4: "Under Investigation",
};

/** Semantic bucket for status pill styling - "active" (still being worked)
 *  vs "resolved" (charge sheeted or closed), plus "open" for just-registered. */
export function caseStatusTone(id: CaseStatusId): "open" | "active" | "resolved" {
  if (id === 1) return "open";
  if (id === 4) return "active";
  return "resolved";
}

export function isCaseStatusId(v: number): v is CaseStatusId {
  return v === 1 || v === 2 || v === 3 || v === 4;
}
