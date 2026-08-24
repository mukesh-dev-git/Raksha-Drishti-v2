// -----------------------------------------------------------------------------
// A small, honestly-scoped set of rule-based Investigation Gaps for the
// Overview card. This is NOT the full Investigation Gaps engine described
// in the Investigation Module plan (§15) — that belongs to the Investigation
// tab, a later step. This covers only the gaps Overview needs to show a
// compact "what's pending" card, using rules against real, already-modeled
// data. Every rule is deterministic; the same case always produces the same
// gaps.
// -----------------------------------------------------------------------------
import type { InvestigationCase } from "../model";

export interface InvestigationGap {
  key: string;
  label: string;
  detail: string;
}

export function computeTopGaps(kase: InvestigationCase): InvestigationGap[] {
  const gaps: InvestigationGap[] = [];

  if (kase.forensicRequests.length === 0) {
    gaps.push({
      key: "forensic",
      label: "No forensic examination on record",
      detail: "No FSL/forensic request exists for this case in the synthetic dataset.",
    });
  }

  if (kase.searchSeizures.length === 0) {
    gaps.push({
      key: "seizure",
      label: "No search & seizure record",
      detail: "No search or seizure operation is recorded for this case.",
    });
  }

  if (kase.evidence.length > 0) {
    gaps.push({
      key: "custody",
      label: `Chain of custody not on record for ${kase.evidence.length} exhibit${kase.evidence.length === 1 ? "" : "s"}`,
      detail: "No custody transfer history exists for any evidence item in the synthetic dataset.",
    });
  }

  for (const c of kase.contradictions) {
    gaps.push({
      key: `contradiction-${c.id}`,
      label: "Unresolved lead requires follow-up",
      detail: c.suggestedNextQuestion,
    });
  }

  return gaps;
}
