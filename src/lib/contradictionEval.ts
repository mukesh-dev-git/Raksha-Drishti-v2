// -----------------------------------------------------------------------------
// P5.3 - evaluate the P5.2b scenario-level detector against the 15
// hand-authored contradictions in Contradictions.json. These are ground
// truth, not a fixture: each scenario was written around exactly one
// intended contradiction, so "did the detector independently find the same
// records" is a real, honest measure - detectScenarioContradictions() never
// reads Contradictions.json.
//
// Report the real hit rate INCLUDING misses (PLAN.md P5.3's own wording) -
// this module returns full per-scenario rows precisely so a caller can show
// "found N of 15, here are the ones it missed" rather than a bare percentage.
//
// v2 of this eval - the first pass ran detectContradictions() per PERSON,
// via a findOwner() lookup for whichever person's timeline happened to
// contain every ground-truth id. That structurally could not pass on 13 of
// 15 scenarios, because their contradictions cite records belonging to two
// different people (verified on C2 - RESEARCH_AND_PLAN.md Part 6), which no
// single person's timeline contains. This version runs
// detectScenarioContradictions() directly against each ground truth row's
// own `scenarioId` instead - no lookup needed, since the scenario is
// already known, and scenario-level evidence is exactly where a
// cross-person finding can actually appear.
// -----------------------------------------------------------------------------
import contradictionsData from "./nosql-seed/Contradictions.json";
import { detectScenarioContradictions, type DetectedContradiction, type DetectionResult } from "./contradictionDetector";

type GroundTruth = {
  id: string;
  scenarioId: string;
  description: string;
  conflictingRecords: string[]; // authored as 2-4 in practice, not always 2 - see contradictionDetector.ts's module comment
  suggestedNextQuestion?: string;
};

export type EvalRow = {
  scenarioId: string;
  contradictionId: string;
  groundTruth: { recordIds: string[]; description: string };
  detectorRan: boolean;
  detectorError?: string;
  hit: boolean; // true iff some detector finding's recordIds set fully covers the ground-truth set
  matchedReasoning?: string;
  allFindings: DetectedContradiction[]; // every finding the detector produced for this scenario, hit or not - misses are informative
};

// "Hit" = one finding's recordIds set fully COVERS the ground-truth set (it
// may cite extra ids too - still a hit, not a false positive, since every
// extra id was already checked real by the citation guardrail in
// contradictionDetector.ts). A known, stated limitation, not engineered
// around: if the model reports the conflict as two separate smaller
// findings instead of one group that covers everything, this scores a
// miss even though it found the right records split across findings.
function coversGroundTruth(groundTruthIds: string[], f: DetectedContradiction): boolean {
  const cited = new Set(f.recordIds);
  return groundTruthIds.every((id) => cited.has(id));
}

/** Runs the full 15-scenario eval. Sequential, not parallel - this endpoint
 *  has a real queue (RESEARCH_AND_PLAN.md §2.2). One detector call per
 *  scenario (15 total - down from the first pass's person-lookup
 *  indirection, since there's exactly one ground-truth contradiction per
 *  scenario in this dataset). */
export async function runContradictionEval(): Promise<EvalRow[]> {
  const rows: EvalRow[] = [];

  for (const gt of contradictionsData as GroundTruth[]) {
    const result: DetectionResult = await detectScenarioContradictions(gt.scenarioId);

    if (!result.ok) {
      rows.push({
        scenarioId: gt.scenarioId,
        contradictionId: gt.id,
        groundTruth: { recordIds: gt.conflictingRecords, description: gt.description },
        detectorRan: false,
        detectorError: result.error,
        hit: false,
        allFindings: [],
      });
      continue;
    }

    const matched = result.contradictions.find((f) => coversGroundTruth(gt.conflictingRecords, f));
    rows.push({
      scenarioId: gt.scenarioId,
      contradictionId: gt.id,
      groundTruth: { recordIds: gt.conflictingRecords, description: gt.description },
      detectorRan: true,
      hit: !!matched,
      matchedReasoning: matched?.reasoning,
      allFindings: result.contradictions,
    });
  }

  return rows;
}

export function summarizeEval(rows: EvalRow[]) {
  const hits = rows.filter((r) => r.hit).length;
  return {
    total: rows.length,
    hits,
    misses: rows.length - hits,
    hitRate: rows.length ? hits / rows.length : 0,
    missedRows: rows.filter((r) => !r.hit), // deliberately included, not just the count - "found N of 15, here are the ones it missed"
  };
}
