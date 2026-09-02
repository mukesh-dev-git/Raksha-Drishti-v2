// -----------------------------------------------------------------------------
// P10 Phase 4 (2026-09-02) - a live, cached replacement for caseFacts.json,
// the one file that fans out into 13 different modules (getCaseWorklist()'s
// 11 downstream consumers, plus moPatterns.ts and statewideNetwork.ts, which
// each import it directly too). Building ONE shared live-fetch here, rather
// than migrating 13 read paths independently, is what makes Phase 4
// tractable at all in the time available.
//
// WHY THIS IS FIVE PARALLEL TABLE WALKS, NOT ONE QUERY: caseFacts.json's
// shape isn't a single table's columns.
//   - `districtId`/`policeStationName` need Unit (PoliceStationID has no
//     declared Lookup relationship - confirmed live this session via
//     /api/summary's own district-scoping fix - so this is a resolve-then-
//     match, not a join).
//   - `sections` needs ActSectionAssociation cross-referenced against Act
//     and Section (ActID/SectionID are now real bigint ROWIDs, fixed this
//     session - reconstructing "IPC-379" back out of them needs both
//     lookup tables in memory).
//   - `complainantNames`/`Occupation`/`ReligionID` need the whole
//     ComplainantDetails table.
// CaseMaster, ComplainantDetails and ActSectionAssociation are all
// 12,000-16,000 rows - each a ~40-55 page zcqlAll() walk. Run in parallel
// (Promise.all), not sequentially, so a cold cache costs roughly the
// SLOWEST single walk, not the sum of all five.
//
// HONEST COST, stated plainly rather than hidden: a cold-cache rebuild is a
// genuinely slow operation - realistically several seconds, not
// milliseconds. This is exactly the kind of latency issue #4 (loading
// skeletons, not yet built) exists to make legible rather than confusing.
// Mitigated three ways: (1) module-scope cache with a TTL, so this cost is
// paid once per window PER INSTANCE, not per request - same accepted
// tradeoff llm.ts's token cache already documents for this app; (2) a
// single-flight lock, so concurrent requests hitting the SAME instance
// during a rebuild share one fetch rather than each starting their own;
// (3) falls back to the bundled snapshot on ANY failure - a live outage
// degrades this app to what it already was before Phase 4, never to a
// broken one.
//
// LIVE-MEASURED, NOT ASSUMED (2026-09-02, deployed): the "per instance"
// caveat above matters more in practice than expected. Four back-to-back
// requests to /districts (a 31-row page, not a large render) took
// 10.9s/8.8s/3.3s/5.5s - only the 3rd request was clearly a cache hit. This
// Data Store's Slate/AppSail runtime evidently spreads requests across
// multiple concurrent instances without session affinity, and this cache
// is module-scope (per-instance) - so a meaningful fraction of requests
// land on an instance whose cache hasn't been warmed, even within the 90s
// TTL window. The cache still helps (it is not doing nothing - some
// requests genuinely are fast), but "TTL cache means this cost is paid
// once per 90s" is NOT what actually happens here. A real fix would need a
// cache shared ACROSS instances, not per-instance - Catalyst's own Cache
// service (the "Cache" MCP tool group, confirmed to exist this session but
// not yet used anywhere in this app) is the natural candidate, not
// implemented here. Until then: every page reading getLiveCaseFacts() has
// real, unavoidable multi-second latency on a meaningful fraction of
// requests - which is exactly the case issue #4 (loading skeletons, not
// yet built) exists for, more so now than before this phase.
//
// TWO REAL, DOCUMENTED LIMITATIONS OF THIS RECONSTRUCTION:
//   - `scenarioId` for the 19 hand-authored scenarios comes from the tiny,
//     static caseScenarioMap.json (19 entries) - there is no ScenarioID
//     column in the live schema at all, so this one piece is necessarily
//     still bundled. Harmless: those 19 mappings are curated metadata, not
//     case facts that change.
//   - A case's REPEAT-OFFENDER cross-reference (accused.json, used by
//     caseWorklist.ts's bulk-accused fallback) is NOT rebuilt live here -
//     it stays exactly as bundled. Rebuilding it would mean scanning all
//     ~7,000 Accused rows to recompute personId->caseCount, a materially
//     different aggregation problem from "reconstruct one case's facts".
//     Practical consequence: a case created via P10 Phase 3 has a real,
//     stable personId for its accused (see caseCreate.ts's mintPersonId),
//     but won't appear in the repeat-subject index until the bundled
//     snapshot is next regenerated. Stated here, not hidden.
// -----------------------------------------------------------------------------
import { headers } from "next/headers";
import { zcql, zcqlAll, pick } from "./zcql";
import caseScenarioMap from "./nosql-seed/caseScenarioMap.json";

export type CaseFact = {
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
  complainantOccupationIds: number[];
  complainantReligionIds: number[];
  latitude: number | null;
  longitude: number | null;
};

const SCENARIO_MAP = caseScenarioMap as Record<string, string>;
const TTL_MS = 90_000;

let cache: { data: Record<string, CaseFact>; expiresAt: number } | null = null;
let inFlight: Promise<Record<string, CaseFact>> | null = null;

async function h() {
  return { headers: await headers() };
}

async function buildLiveCaseFacts(): Promise<Record<string, CaseFact>> {
  const src = await h();

  const [caseRows, complainantRows, sectionAssocRows, actRows, sectionRows, unitRows] = await Promise.all([
    zcqlAll(
      src,
      "SELECT ROWID, CaseMasterID, CrimeNo, CrimeMinorHeadID, PoliceStationID, CaseStatusID, CrimeRegisteredDate, PolicePersonID, GravityOffenceID, IncidentFromDate, IncidentToDate, latitude, longitude FROM CaseMaster"
    ),
    zcqlAll(src, "SELECT ROWID, CaseMasterID, ComplainantName, OccupationID, ReligionID FROM ComplainantDetails"),
    zcqlAll(src, "SELECT ROWID, CaseMasterID, ActID, SectionID FROM ActSectionAssociation"),
    zcql(src, "SELECT ROWID, ActCode FROM Act"),
    zcql(src, "SELECT ROWID, SectionCode FROM Section"),
    zcql(src, "SELECT ROWID, UnitID, UnitName, DistrictID FROM Unit"),
  ]);

  const actCodeByRowId = new Map<string, string>();
  for (const r of actRows) {
    const a = pick(r, "Act");
    actCodeByRowId.set(String(a.ROWID), String(a.ActCode ?? ""));
  }
  const sectionCodeByRowId = new Map<string, string>();
  for (const r of sectionRows) {
    const s = pick(r, "Section");
    sectionCodeByRowId.set(String(s.ROWID), String(s.SectionCode ?? ""));
  }
  const unitById = new Map<number, { name: string; districtId: number }>();
  for (const r of unitRows) {
    const u = pick(r, "Unit");
    unitById.set(Number(u.UnitID), { name: String(u.UnitName ?? ""), districtId: Number(u.DistrictID) });
  }

  const sectionsByCase = new Map<number, string[]>();
  for (const r of sectionAssocRows) {
    const a = pick(r as unknown, "ActSectionAssociation") as { CaseMasterID?: unknown; ActID?: unknown; SectionID?: unknown };
    const caseId = Number(a.CaseMasterID);
    const actCode = actCodeByRowId.get(String(a.ActID));
    const sectionCode = sectionCodeByRowId.get(String(a.SectionID));
    if (!actCode || !sectionCode) continue; // an association row whose lookup didn't resolve - skip rather than render a broken "undefined-undefined" section
    const list = sectionsByCase.get(caseId) ?? [];
    list.push(`${actCode}-${sectionCode}`);
    sectionsByCase.set(caseId, list);
  }

  const complainantNamesByCase = new Map<number, string[]>();
  const complainantOccByCase = new Map<number, number[]>();
  const complainantRelByCase = new Map<number, number[]>();
  for (const r of complainantRows) {
    const c = pick(r as unknown, "ComplainantDetails") as { CaseMasterID?: unknown; ComplainantName?: unknown; OccupationID?: unknown; ReligionID?: unknown };
    const caseId = Number(c.CaseMasterID);
    (complainantNamesByCase.get(caseId) ?? complainantNamesByCase.set(caseId, []).get(caseId)!).push(String(c.ComplainantName ?? ""));
    (complainantOccByCase.get(caseId) ?? complainantOccByCase.set(caseId, []).get(caseId)!).push(Number(c.OccupationID));
    (complainantRelByCase.get(caseId) ?? complainantRelByCase.set(caseId, []).get(caseId)!).push(Number(c.ReligionID));
  }

  const facts: Record<string, CaseFact> = {};
  for (const r of caseRows) {
    const cm = pick(r as unknown, "CaseMaster") as Record<string, unknown>;
    const caseMasterId = Number(cm.CaseMasterID);
    const policeStationId = Number(cm.PoliceStationID);
    const unit = unitById.get(policeStationId) ?? null;
    facts[String(caseMasterId)] = {
      caseMasterId,
      scenarioId: SCENARIO_MAP[String(caseMasterId)] ?? `BULK-${caseMasterId}`,
      crimeNo: String(cm.CrimeNo ?? ""),
      crimeMinorHeadId: Number(cm.CrimeMinorHeadID),
      districtId: unit ? unit.districtId : null,
      policeStationId: Number.isFinite(policeStationId) ? policeStationId : null,
      policeStationName: unit ? unit.name : null,
      policePersonId: Number.isFinite(Number(cm.PolicePersonID)) ? Number(cm.PolicePersonID) : null,
      sections: sectionsByCase.get(caseMasterId) ?? [],
      incidentFromDate: cm.IncidentFromDate ? String(cm.IncidentFromDate) : null,
      incidentToDate: cm.IncidentToDate ? String(cm.IncidentToDate) : null,
      crimeRegisteredDate: cm.CrimeRegisteredDate ? String(cm.CrimeRegisteredDate) : null,
      gravityOffenceId: Number(cm.GravityOffenceID),
      caseStatusId: Number(cm.CaseStatusID),
      complainantNames: complainantNamesByCase.get(caseMasterId) ?? [],
      complainantOccupationIds: complainantOccByCase.get(caseMasterId) ?? [],
      complainantReligionIds: complainantRelByCase.get(caseMasterId) ?? [],
      latitude: Number.isFinite(Number(cm.latitude)) ? Number(cm.latitude) : null,
      longitude: Number.isFinite(Number(cm.longitude)) ? Number(cm.longitude) : null,
    };
  }
  return facts;
}

/** Live, cached case-facts register - the shared source every P10 Phase 4
 *  consumer reads instead of caseFacts.json. Returns null (never throws) on
 *  any failure - local dev, a genuine outage - so every caller can fall back
 *  to the bundled snapshot exactly as it did before this existed. */
export async function getLiveCaseFacts(): Promise<Record<string, CaseFact> | null> {
  const now = Date.now();
  if (cache && cache.expiresAt > now) return cache.data;
  if (inFlight) return inFlight.catch(() => null);

  inFlight = buildLiveCaseFacts();
  try {
    const data = await inFlight;
    cache = { data, expiresAt: Date.now() + TTL_MS };
    return data;
  } catch (e) {
    console.warn("[liveCaseFacts] live rebuild failed - callers fall back to the bundled snapshot", e);
    return null;
  } finally {
    inFlight = null;
  }
}
