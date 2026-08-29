// -----------------------------------------------------------------------------
// P7.1 - thin, read-only accessor over the seeded WitnessStatements NoSQL
// collection, scoped by scenarioId (same grain CrossSourceTimeline /
// getScenarioTimeline already use on the case-detail page, so a witness
// statement that shows up in the timeline also shows up here for the same
// case). Deliberately separate from personFusion.ts's fused/summarized
// FusedEvidenceItem: that shape truncates into a one-line `summary` and
// loses the raw `statementText`, which is exactly the field P7.1 needs to
// hand to Zia's Text-to-Audio model untouched.
//
// `statementText` in the current seed is English prose, not Kannada source
// text - there is no Kannada-source field in this collection. This module
// does not fabricate one; it exposes whatever real text field exists and
// lets the caller (the TTS route) request Kannada *synthesis* of that text,
// which demonstrates the pipeline rather than replaying an already-Kannada
// corpus. See RESEARCH_AND_PLAN.md §2.1 and PLAN.md P7.1.
// -----------------------------------------------------------------------------
import witnessStatementsSeed from "./nosql-seed/WitnessStatements.json";

export type WitnessStatementRecord = {
  id: string; // e.g. "C1-WS-1"
  scenarioId: string;
  caseMasterIds: number[];
  witnessName: string;
  statementDate: string; // YYYY-MM-DD
  statementText: string;
  relatedPerson?: string;
};

const ALL = witnessStatementsSeed as unknown as WitnessStatementRecord[];

/** Every witness statement belonging to a scenario, oldest first - same
 *  scope `getScenarioTimeline(scenarioId)` uses elsewhere on the case-detail
 *  page, so this list and the cross-source timeline agree on "this case". */
export function getWitnessStatementsForScenario(scenarioId: string): WitnessStatementRecord[] {
  return ALL.filter((r) => r.scenarioId === scenarioId).sort((a, b) => a.statementDate.localeCompare(b.statementDate));
}
