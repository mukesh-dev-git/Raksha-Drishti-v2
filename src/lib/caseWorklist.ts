// -----------------------------------------------------------------------------
// P2 restructure - the real FIR Index. One row per real FIR (19 today),
// built entirely from bundled seed JSON - no RNG, no placeholder rows. This
// replaces data.ts's `caseFiles` (3 hardcoded FIR-100x entries shown
// unfiltered under every case type + district) as the thing `/cases`
// actually lists.
// -----------------------------------------------------------------------------
import caseFactsRaw from "./nosql-seed/caseFacts.json";
import scenarioMeta from "./nosql-seed/scenarioMeta.json";
import accusedRaw from "./nosql-seed/accused.json";
import { caseTypes, districts } from "./data";
import { fuseAllPersons } from "./personFusion";
import { CASE_STATUS_LABEL, isCaseStatusId, type CaseStatusId } from "./caseStatus";

type RawAccused = { caseMasterId: number; personId: string; name: string; caseCount: number; linked: boolean };
const RAW_ACCUSED = accusedRaw as RawAccused[];

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
  incidentToDate: string | null;
  crimeRegisteredDate: string | null;
  gravityOffenceId: number;
  caseStatusId: number;
  complainantNames: string[];
  /** Real per-FIR incident coordinates (P4.1) - straight from CaseMaster's
   *  latitude/longitude, added to caseFacts.json by build_seed.mjs. Nullable
   *  because a handful of hand-authored rows predating this field could in
   *  principle be missing it - never fabricated when absent. */
  latitude: number | null;
  longitude: number | null;
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
   *  several callers already depend on the plain string[] shape.
   *
   *  `linked` (P1.2) - whether personId resolves to a real, evidence-fused
   *  /persons/[personId] profile. True for every one of the 15 authored
   *  scenarios' accused (unchanged). False for a P1.2 bulk case's accused:
   *  a real, stable, cross-case personId (see accused.json/bulk_cases.mjs),
   *  but no evidence-backed profile exists to link to - so the UI must not
   *  render them as a link. */
  accused: { personId: string; name: string; caseCount: number; linked: boolean }[];
  sections: string[];
  policeStationName: string | null;
  policePersonId: number | null;
  /** P4 analytics additions - real fields straight from caseFacts.json that
   *  nothing read before now. crimeMinorHeadId is the raw CrimeSubHeadID
   *  (1 Theft/2 Assault/3 Fraud/4 Burglary) alongside the existing name/slug,
   *  for grouping without a second lookup. gravityOffenceId is 1 Heinous/
   *  2 Non-Heinous. incidentFromDate/incidentToDate are the raw stored
   *  datetimes - isPeriodOffence() in incidentTime.ts must be checked before
   *  treating incidentFromDate as a real time-of-day (see that file). */
  crimeMinorHeadId: number;
  gravityOffenceId: number;
  incidentFromDate: string | null;
  incidentToDate: string | null;
  /** Real per-FIR incident coordinates (P4.1) - see CaseFact above. */
  latitude: number | null;
  longitude: number | null;
};

let cache: WorklistCase[] | null = null;

/** Every real FIR in the seeded dataset, one row each - the FIR Index. */
export function getCaseWorklist(): WorklistCase[] {
  if (cache) return cache;

  // caseMasterId -> accused, reusing the same fused-person register
  // repeat-offenders/pattern-analysis already trust, rather than a third
  // way of reading Accused rows.
  const accusedByCase = new Map<number, string[]>();
  const accusedDetailByCase = new Map<number, { personId: string; name: string; caseCount: number; linked: boolean }[]>();
  for (const p of fuseAllPersons().values()) {
    for (const cid of p.caseMasterIds) {
      const list = accusedByCase.get(cid) ?? [];
      if (!list.includes(p.name)) list.push(p.name);
      accusedByCase.set(cid, list);

      const detailList = accusedDetailByCase.get(cid) ?? [];
      detailList.push({ personId: p.personId, name: p.name, caseCount: p.caseMasterIds.length, linked: true });
      accusedDetailByCase.set(cid, detailList);
    }
  }

  // P1.2 fallback - a bulk case has no evidence records, so it's absent from
  // fuseAllPersons() entirely (by design, see bulk_cases.mjs). Fill in from
  // the flat, un-fused accused.json instead - real names/personIds/case
  // counts, just not evidence-linked. Only used for cases the fused map
  // didn't already cover, so the 15 authored scenarios are untouched.
  for (const a of RAW_ACCUSED) {
    if (accusedDetailByCase.has(a.caseMasterId)) continue;
    const list = accusedByCase.get(a.caseMasterId) ?? [];
    if (!list.includes(a.name)) list.push(a.name);
    accusedByCase.set(a.caseMasterId, list);

    const detailList = accusedDetailByCase.get(a.caseMasterId) ?? [];
    detailList.push({ personId: a.personId, name: a.name, caseCount: a.caseCount, linked: a.linked });
    accusedDetailByCase.set(a.caseMasterId, detailList);
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
      crimeMinorHeadId: f.crimeMinorHeadId,
      gravityOffenceId: f.gravityOffenceId,
      incidentFromDate: f.incidentFromDate,
      incidentToDate: f.incidentToDate,
      latitude: f.latitude ?? null,
      longitude: f.longitude ?? null,
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
