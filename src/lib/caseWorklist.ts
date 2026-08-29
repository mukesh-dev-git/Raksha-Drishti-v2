// -----------------------------------------------------------------------------
// P2 restructure - the real FIR Index. One row per real FIR (19 today),
// built entirely from bundled seed JSON - no RNG, no placeholder rows. This
// replaces data.ts's `caseFiles` (3 hardcoded FIR-100x entries shown
// unfiltered under every case type + district) as the thing `/cases`
// actually lists.
// -----------------------------------------------------------------------------
import caseFactsRaw from "./nosql-seed/caseFacts.json";
import scenarioMeta from "./nosql-seed/scenarioMeta.json";
import { caseTypes, districts } from "./data";
import { fuseAllPersons } from "./personFusion";
import { CASE_STATUS_LABEL, isCaseStatusId, type CaseStatusId } from "./caseStatus";

type CaseFact = {
  caseMasterId: number;
  scenarioId: string;
  crimeNo: string;
  crimeMinorHeadId: number;
  districtId: number | null;
  policeStationId: number | null;
  policeStationName: string | null;
  policePersonId: number | null;
  sections: string[];
  incidentFromDate: string | null;
  crimeRegisteredDate: string | null;
  gravityOffenceId: number;
  caseStatusId: number;
  complainantNames: string[];
};
const FACTS = caseFactsRaw as Record<string, CaseFact>;
const TITLES = scenarioMeta as Record<string, { title: string }>;

export type WorklistCase = {
  caseMasterId: number;
  scenarioId: string;
  crimeNo: string;
  title: string;
  crimeTypeName: string;
  crimeTypeSlug: string;
  districtId: number | null;
  districtName: string;
  districtSlug: string;
  statusId: CaseStatusId;
  statusLabel: string;
  registeredDate: string | null;
  accusedNames: string[];
  /** Same accused, but with the real global personId attached - added for
   *  P9.3 (linking a case's accused to their real /persons/[personId]
   *  profile and repeat-subject flag). accusedNames stays as-is since
   *  several callers already depend on the plain string[] shape. */
  accused: { personId: string; name: string; caseCount: number }[];
  sections: string[];
  policeStationName: string | null;
  policePersonId: number | null;
};

let cache: WorklistCase[] | null = null;

/** Every real FIR in the seeded dataset, one row each - the FIR Index. */
export function getCaseWorklist(): WorklistCase[] {
  if (cache) return cache;

  // caseMasterId -> accused, reusing the same fused-person register
  // repeat-offenders/pattern-analysis already trust, rather than a third
  // way of reading Accused rows.
  const accusedByCase = new Map<number, string[]>();
  const accusedDetailByCase = new Map<number, { personId: string; name: string; caseCount: number }[]>();
  for (const p of fuseAllPersons().values()) {
    for (const cid of p.caseMasterIds) {
      const list = accusedByCase.get(cid) ?? [];
      if (!list.includes(p.name)) list.push(p.name);
      accusedByCase.set(cid, list);

      const detailList = accusedDetailByCase.get(cid) ?? [];
      detailList.push({ personId: p.personId, name: p.name, caseCount: p.caseMasterIds.length });
      accusedDetailByCase.set(cid, detailList);
    }
  }

  cache = Object.values(FACTS).map((f) => {
    const meta = TITLES[f.scenarioId];
    const crimeType = caseTypes.find((c) => c.dbId === f.crimeMinorHeadId);
    const district = districts.find((d) => d.dbId === f.districtId);
    const statusId = isCaseStatusId(f.caseStatusId) ? f.caseStatusId : 4;
    return {
      caseMasterId: f.caseMasterId,
      scenarioId: f.scenarioId,
      crimeNo: f.crimeNo,
      title: meta?.title ?? `Case ${f.caseMasterId}`,
      crimeTypeName: crimeType?.name ?? "Unknown",
      crimeTypeSlug: crimeType?.slug ?? "unknown",
      districtId: f.districtId,
      districtName: district?.name ?? "Unknown",
      districtSlug: district?.slug ?? "unknown",
      statusId,
      statusLabel: CASE_STATUS_LABEL[statusId],
      registeredDate: f.crimeRegisteredDate,
      accusedNames: accusedByCase.get(f.caseMasterId) ?? [],
      accused: accusedDetailByCase.get(f.caseMasterId) ?? [],
      sections: f.sections,
      policeStationName: f.policeStationName,
      policePersonId: f.policePersonId,
    };
  }).sort((a, b) => (b.registeredDate ?? "").localeCompare(a.registeredDate ?? ""));

  return cache;
}

export function getWorklistCase(caseMasterId: number): WorklistCase | null {
  return getCaseWorklist().find((c) => c.caseMasterId === caseMasterId) ?? null;
}

/** Every FIR belonging to the same scenario as `caseMasterId`, excluding
 *  itself - a scenario can span 2+ real FIRs (e.g. C1's 9001+9002), and a
 *  case-detail page should say so rather than silently showing one FIR as
 *  if it were the whole investigation. */
export function getSiblingCases(caseMasterId: number): WorklistCase[] {
  const c = getWorklistCase(caseMasterId);
  if (!c) return [];
  return getCaseWorklist().filter((x) => x.scenarioId === c.scenarioId && x.caseMasterId !== caseMasterId);
}

export function caseDetailLink(caseMasterId: number): string {
  return `/cases/${caseMasterId}`;
}
