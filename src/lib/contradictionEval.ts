// -----------------------------------------------------------------------------
// P5.3 - evaluate the P5.2 detector against the 15 hand-authored
// contradictions in Contradictions.json. These are ground truth, not a
// fixture: each scenario was written around exactly one intended
// contradiction, so "did the detector independently find the same records"
// is a real, honest measure - not the detector "finding what it was told",
// since detectContradictions() never reads Contradictions.json.
//
// Report the real hit rate INCLUDING misses (PLAN.md P5.3's own wording) -
// this module returns full per-scenario rows precisely so a caller can show
// "found N of 15, here are the ones it missed" rather than a bare percentage.
// -----------------------------------------------------------------------------
import contradictionsData from "./nosql-seed/Contradictions.json";
import { fuseAllPersons } from "./personFusion";
import { detectContradictions, type DetectedContradiction, type DetectionResult } from "./contradictionDetector";

type GroundTruth = {
  id: string;
  scenarioId: string;
  description: string;
  // Authored as 2-4 in practice, not always 2 - a first pass here assumed
  // exactly 2 and threw out 13 of the 15 scenarios before ever running the
  // detector on them. See contradictionDetector.ts's module comment for the
  // schema change that came out of finding this.
  conflictingRecords: string[];
  suggestedNextQuestion?: string;
};

export type EvalRow = {
  scenarioId: string;
  contradictionId: string;
  groundTruth: { recordIds: string[]; description: string };
  ownerPersonId: string | null; // the person whose fused timeline contains every ground-truth record id
  detectorRan: boolean;
  detectorError?: string;
  hit: boolean; // true iff some detector finding's recordIds set fully covers the ground-truth set
  matchedReasoning?: string;
  allFindings: DetectedContradiction[]; // every finding the detector produced for this person, hit or not - misses are informative
};

function findOwner(groundTruthIds: string[]): string | null {
  for (const p of fuseAllPersons().values()) {
    const ids = new Set(p.timeline.map((t) => t.id));
    if (groundTruthIds.every((id) => ids.has(id))) return p.personId;
  }
  return null;
}

// "Hit" = one finding's recordIds set fully COVERS the ground-truth set (it
// may cite extra ids too - still a hit, not a false positive, since every
// extra id was already checked real by the citation guardrail in
// contradictionDetector.ts). A known, stated limitation, not engineered
// around: if the model reports a 3-record conflict as two separate
// 2-record findings instead of one 3-record group, this scores it a miss
// even though it found the right records.
function coversGroundTruth(groundTruthIds: string[], f: DetectedContradiction): boolean {
  const cited = new Set(f.recordIds);
  return groundTruthIds.every((id) => cited.has(id));
}

/** Runs the full 15-scenario eval. Sequential, not parallel - this endpoint
 *  has a real queue (RESEARCH_AND_PLAN.md §2.2), and 15 concurrent calls
 *  against a token-minting client that caches one shared token is more
 *  likely to trip something than 15 in a row. One detector call is reused
 *  if two ground-truth entries happen to share an owner (none do today,
 *  but cheap to guard rather than assume). */
export async function runContradictionEval(): Promise<EvalRow[]> {
  const rows: EvalRow[] = [];
  const cache = new Map<string, DetectionResult>();

  for (const gt of contradictionsData as GroundTruth[]) {
    const recordIds = gt.conflictingRecords;
    const owner = findOwner(recordIds);
    if (!owner) {
      rows.push({
        scenarioId: gt.scenarioId,
        contradictionId: gt.id,
        groundTruth: { recordIds, description: gt.description },
        ownerPersonId: null,
        detectorRan: false,
        detectorError: "no fused person's timeline contains every ground-truth record id",
        hit: false,
        allFindings: [],
      });
      continue;
    }

    let result = cache.get(owner);
    if (!result) {
      result = await detectContradictions(owner);
      cache.set(owner, result);
    }

    if (!result.ok) {
      rows.push({
        scenarioId: gt.scenarioId,
        contradictionId: gt.id,
        groundTruth: { recordIds, description: gt.description },
        ownerPersonId: owner,
        detectorRan: false,
        detectorError: result.error,
        hit: false,
        allFindings: [],
      });
      continue;
    }

    const matched = result.contradictions.find((f) => coversGroundTruth(recordIds, f));
    rows.push({
      scenarioId: gt.scenarioId,
      contradictionId: gt.id,
      groundTruth: { recordIds, description: gt.description },
      ownerPersonId: owner,
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
