// -----------------------------------------------------------------------------
// Related Cases — deterministic, derived from real shared attributes across
// the 15 synthetic scenarios, never a fabricated similarity score. Two
// signals, both genuinely present in the seeded Employee/Unit data:
//   - "Same Investigating Officer": another FIR (in a DIFFERENT scenario)
//     whose PolicePersonID resolves to the same real IO Person as one of
//     this case's own FIRs.
//   - "Same Police Station": another FIR whose PoliceStationID resolves to
//     the same real station name as one of this case's own FIRs.
// Both are real, structural facts already present in lookups.Employee/Unit
// (several officers/stations genuinely handle more than one of the 15
// scenarios) — not an invented similarity percentage. A case with no
// matching FIR anywhere else returns an empty list, honestly.
// -----------------------------------------------------------------------------
import { getScenarioIds } from "../seedData";
import { normalizeInvestigationCase } from "../normalize";
import type { InvestigationCase } from "../model";

export interface RelatedCaseView {
  scenarioId: string;
  caseMasterId: number;
  crimeNo: string;
  title: string;
  crimeType: string;
  district: string;
  reasons: string[];
}

export function computeRelatedCases(kase: InvestigationCase): RelatedCaseView[] {
  const ioIds = new Set(kase.firs.map((f) => f.ioPersonId).filter((x): x is string => !!x));
  const stationNames = new Set(kase.firs.map((f) => f.policeStationName).filter((x): x is string => !!x));

  const results: RelatedCaseView[] = [];
  for (const scenarioId of getScenarioIds()) {
    if (scenarioId === kase.id) continue; // never "related" to itself
    const other = normalizeInvestigationCase(scenarioId);
    if (!other) continue;
    for (const fir of other.firs) {
      const reasons: string[] = [];
      if (fir.ioPersonId && ioIds.has(fir.ioPersonId)) reasons.push("Same Investigating Officer");
      if (fir.policeStationName && stationNames.has(fir.policeStationName)) reasons.push("Same Police Station");
      if (reasons.length === 0) continue;
      results.push({
        scenarioId: other.id,
        caseMasterId: fir.caseMasterId,
        crimeNo: fir.crimeNo,
        title: other.title,
        crimeType: fir.crimeTypeName ?? "Not recorded",
        district: fir.districtName ?? "Not recorded",
        reasons,
      });
    }
  }
  return results.sort((a, b) => a.caseMasterId - b.caseMasterId);
}
