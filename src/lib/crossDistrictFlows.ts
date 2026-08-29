// -----------------------------------------------------------------------------
// P4.9 - cross-district flow map data. Real cross-district investigations:
// a scenario whose FIRs were registered in 2+ different districts, per
// scenarioMeta.json's `districtIds` (built in catalyst/dataset-v2/
// build_seed.mjs §5, e.g. C1's Yeshwanthpur Fencing Ring: Bengaluru Urban ->
// Tumakuru, districtIds [4401, 4406]).
//
// Deliberately sourced from the 15 hand-authored scenarios only, NOT the
// 5,000 P1.2 bulk cases - bulk_cases.mjs's own header comment explains why:
// each bulk case is a single, standalone FIR with no cross-case or
// cross-district signal at all, so folding it in here would fabricate arcs
// that don't exist in the data.
// -----------------------------------------------------------------------------
import scenarioMetaRaw from "./nosql-seed/scenarioMeta.json";
import { caseTypes, districts } from "./data";

type ScenarioMeta = {
  title: string;
  summary: string;
  crimeMinorHeadID: number;
  districtId: number;
  districtIds: number[];
  assignedTo: string;
  assignmentReason: string;
  caseMasterIds: number[];
};
const SCENARIOS = scenarioMetaRaw as Record<string, ScenarioMeta>;

export type CrossDistrictFlow = {
  scenarioId: string;
  title: string;
  crimeTypeName: string;
  fromDistrictSlug: string;
  fromDistrictName: string;
  toDistrictSlug: string;
  toDistrictName: string;
  assignedTo: string;
  assignmentReason: string;
  caseMasterIds: number[];
};

let cache: CrossDistrictFlow[] | null = null;

/** Every real scenario whose FIRs span 2+ districts, one flow per scenario.
 *  Every real multi-district scenario today spans exactly 2 districts, so
 *  this takes districtIds[0] -> districtIds[1] as the arc; a future 3+
 *  district scenario would need a real multi-hop rendering, not silently
 *  dropped or collapsed. */
export function getCrossDistrictFlows(): CrossDistrictFlow[] {
  if (cache) return cache;
  cache = Object.entries(SCENARIOS)
    .filter(([, s]) => s.districtIds.length > 1)
    .map(([scenarioId, s]) => {
      const [fromId, toId] = s.districtIds;
      const from = districts.find((d) => d.dbId === fromId);
      const to = districts.find((d) => d.dbId === toId);
      const crimeType = caseTypes.find((c) => c.dbId === s.crimeMinorHeadID);
      return {
        scenarioId,
        title: s.title,
        crimeTypeName: crimeType?.name ?? "Unknown",
        fromDistrictSlug: from?.slug ?? "unknown",
        fromDistrictName: from?.name ?? "Unknown",
        toDistrictSlug: to?.slug ?? "unknown",
        toDistrictName: to?.name ?? "Unknown",
        assignedTo: s.assignedTo,
        assignmentReason: s.assignmentReason,
        caseMasterIds: s.caseMasterIds,
      };
    });
  return cache;
}
