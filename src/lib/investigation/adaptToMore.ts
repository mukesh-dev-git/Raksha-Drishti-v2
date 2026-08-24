// -----------------------------------------------------------------------------
// adaptToMore — the More tab's data: Crime Scene, Forensics, Search &
// Seizure, Related Cases. No RNG, no fabrication:
//   - Crime Scene is real (location, briefFacts, coordinates from the FIR)
//     plus the scenario's real CCTV evidence, honestly labeled as
//     investigation-wide CCTV footage (there is no explicit scene->evidence
//     foreign key in the synthetic dataset, so this does not claim a
//     scene-specific link beyond what's real).
//   - Forensics and Search & Seizure are always empty — the synthetic
//     dataset has zero records of either for any of the 15 scenarios (see
//     model.ts's forensicRequests/searchSeizures comments) — rendered as an
//     explicit "not recorded" state, never invented.
//   - Related Cases reuses derive/relatedCases.ts's real shared-IO/station
//     derivation.
// -----------------------------------------------------------------------------
import type { InvestigationCase } from "./model";
import { computeRelatedCases, type RelatedCaseView } from "./derive/relatedCases";

export interface CrimeSceneView {
  firCaseMasterId: number;
  crimeNo: string;
  location: string;
  briefFacts: string;
  latitude?: number;
  longitude?: number;
  hasCoordinates: boolean;
}

export interface SceneEvidenceView {
  id: string;
  title: string;
  description: string;
  date: string;
}

export interface MoreTabData {
  crimeScenes: CrimeSceneView[];
  sceneEvidence: SceneEvidenceView[]; // CCTV footage, investigation-wide
  forensicsAvailable: boolean;
  searchSeizureAvailable: boolean;
  relatedCases: RelatedCaseView[];
}

export function adaptToMore(kase: InvestigationCase): MoreTabData {
  const crimeScenes: CrimeSceneView[] = kase.crimeScenes.map((s) => {
    const fir = kase.firs.find((f) => f.caseMasterId === s.firCaseMasterId);
    return {
      firCaseMasterId: s.firCaseMasterId,
      crimeNo: fir?.crimeNo ?? String(s.firCaseMasterId),
      location: s.location,
      briefFacts: s.briefFacts,
      latitude: s.latitude,
      longitude: s.longitude,
      hasCoordinates: s.latitude !== undefined && s.longitude !== undefined,
    };
  });

  const sceneEvidence: SceneEvidenceView[] = kase.evidence
    .filter((e) => e.type === "CCTV Footage")
    .map((e) => ({
      id: e.id,
      title: e.title,
      description: e.description,
      date: e.timestamp.split("T")[0] ?? e.timestamp,
    }));

  return {
    crimeScenes,
    sceneEvidence,
    forensicsAvailable: kase.forensicRequests.length > 0,
    searchSeizureAvailable: kase.searchSeizures.length > 0,
    relatedCases: computeRelatedCases(kase),
  };
}
