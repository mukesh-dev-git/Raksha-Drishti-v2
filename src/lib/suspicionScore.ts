// -----------------------------------------------------------------------------
// P9.1 (= P5.5) - a real suspicion/flag score, deterministic. Every input is
// a real, computed fact (case count, district span, evidence volume, whether
// this person's OWN cited records appear in a real authored contradiction -
// Contradictions.json, ground truth, not the AI's independent read of it).
// No LLM in this file - the number is never something a model produces,
// matching PLAN.md's original P5.5 framing exactly ("the LLM writes only the
// explanation, never the number"). Today's scope deliberately stops short of
// that LLM explanation step (a live call per person is 10-60s, unsuitable
// for a page render, and a precomputed batch - the AIContradictions.json
// pattern - is real follow-up work, not done here): the "why" shown in the
// UI is the deterministic factor list itself, in plain language, not
// model-generated prose.
//
// This is an illustrative weighted score over real signals, not a validated
// risk-assessment model - labelled as such everywhere it's shown. It is
// evidence-derived (case involvement, corroborated contradictions), never
// demographic - consistent with this project's existing P1.5/P4.5 stance
// that demographic framing needs explicit agreement before it's built at
// all; this doesn't touch that question.
// -----------------------------------------------------------------------------
import { getFusedPerson } from "./personFusion";
import { getWorklistCase } from "./caseWorklist";
import contradictionsSeed from "./nosql-seed/Contradictions.json";

const CONTRADICTIONS = contradictionsSeed as { scenarioId: string; conflictingRecords: string[] }[];

export type SuspicionFactor = { label: string; points: number };
export type SuspicionBand = "Low" | "Moderate" | "Elevated" | "High";

export type SuspicionScore = {
  personId: string;
  score: number; // 0-100, clamped
  band: SuspicionBand;
  factors: SuspicionFactor[];
};

function bandFor(score: number): SuspicionBand {
  if (score >= 75) return "High";
  if (score >= 50) return "Elevated";
  if (score >= 25) return "Moderate";
  return "Low";
}

/** Real, not inferred: does any of this person's own cited evidence record
 *  IDs appear in a real authored contradiction for a scenario they're part
 *  of? (Not the AI's independent read - Contradictions.json is the
 *  scenario author's ground truth.) */
function hasCorroboratedContradiction(personId: string): boolean {
  const person = getFusedPerson(personId);
  if (!person) return false;
  const ownRecordIds = new Set(person.timeline.map((t) => t.id));
  return CONTRADICTIONS.some(
    (c) => person.scenarioIds.includes(c.scenarioId) && c.conflictingRecords.some((r) => ownRecordIds.has(r))
  );
}

const cap = (n: number, max: number) => Math.min(n, max);

export function getSuspicionScore(personId: string): SuspicionScore | null {
  const person = getFusedPerson(personId);
  if (!person) return null;

  const factors: SuspicionFactor[] = [];

  const extraCases = person.caseMasterIds.length - 1;
  if (extraCases > 0) {
    const pts = cap(extraCases * 12, 36);
    factors.push({ label: `Named in ${person.caseMasterIds.length} separate cases`, points: pts });
  }

  const districtCount = new Set(
    person.caseMasterIds.map((id) => getWorklistCase(id)?.districtSlug).filter((s): s is string => !!s)
  ).size;
  const extraDistricts = districtCount - 1;
  if (extraDistricts > 0) {
    const pts = cap(extraDistricts * 10, 30);
    factors.push({ label: `Cases span ${districtCount} different districts`, points: pts });
  }

  if (hasCorroboratedContradiction(personId)) {
    factors.push({ label: "Own cited evidence appears in a verified contradiction", points: 25 });
  }

  const evidenceCount = person.timeline.length;
  if (evidenceCount > 3) {
    const pts = cap(Math.round((evidenceCount - 3) * 2), 15);
    factors.push({ label: `${evidenceCount} linked evidence records`, points: pts });
  }

  const score = cap(
    factors.reduce((sum, f) => sum + f.points, 0),
    100
  );

  return { personId, score, band: bandFor(score), factors };
}
