// -----------------------------------------------------------------------------
// P10 Phase 2 + Phase 3 (2026-09-02). Two related, genuinely distinct gaps
// closed here:
//
// getLiveCaseOverrides() - Phase 2. A write to CaseMaster (status, officer)
// succeeded against the live Data Store and stayed invisible everywhere,
// because /cases/[caseId] reads only the bundled snapshot (caseWorklist.ts
// -> caseFacts.json, compiled at build time). Fetches ONLY the two columns
// this app can write, by exact CaseMasterID, to merge OVER a bundled
// WorklistCase. See the function's own comment for the fallback contract.
//
// getLiveOnlyCase() - Phase 3, added after Phase 3's own live test exposed a
// real integration gap: a case created via POST /api/cases has NO bundled
// entry at all (the snapshot is compiled at build time; a live write can't
// retroactively appear in it), so /cases/[caseId] called notFound() before
// getLiveCaseOverrides() above ever ran - a real create followed by a 404 on
// its own page, confirmed live (case 827077, the actual verification case
// this function was built to fix). This constructs a full WorklistCase-
// shaped object straight from live CaseMaster/Accused/ComplainantDetails
// rows, so a brand-new case has somewhere to render at all.
//
// scenarioId is set to a synthetic `LIVE-<id>` tag, deliberately following
// the SAME convention P1.2's bulk cases already use (`BULK-<id>`) - every
// scenario-keyed lookup on the case page (getScenarioTimeline,
// getCaseRelationshipGraph, getMoPatternClusters().find, CONTRADICTIONS,
// suggestNextQuestion, getWitnessStatementsForScenario) already has to
// degrade to "no evidence" for an unmatched scenarioId, because 11,981 of
// 12,000 existing cases have exactly that shape. A live-only case reuses
// that already-proven path rather than needing new empty-state handling
// anywhere else on the page.
// -----------------------------------------------------------------------------
import { headers } from "next/headers";
import { zcql, pick } from "./zcql";
import { isCaseStatusId, type CaseStatusId } from "./caseStatus";
import { caseTypes, districts } from "./data";
import type { WorklistCase } from "./caseWorklist";

export type LiveCaseOverrides = {
  statusId: CaseStatusId;
  policePersonId: number | null;
};

export async function getLiveCaseOverrides(caseMasterId: number): Promise<LiveCaseOverrides | null> {
  try {
    const h = await headers();
    const rows = await zcql(
      { headers: h },
      `SELECT CaseStatusID, PolicePersonID FROM CaseMaster WHERE CaseMasterID = ${caseMasterId}`
    );
    if (!rows.length) return null; // not found live - stay on the bundled value, don't 404 a page that otherwise renders fine
    const cols = pick(rows[0], "CaseMaster");
    const rawStatus = Number(cols.CaseStatusID);
    if (!isCaseStatusId(rawStatus)) return null; // unexpected shape - don't trust it, fall back
    const rawOfficer = Number(cols.PolicePersonID);
    return {
      statusId: rawStatus,
      policePersonId: Number.isFinite(rawOfficer) ? rawOfficer : null,
    };
  } catch (e) {
    // Expected locally (no Catalyst request context) - log for the live
    // case (a genuine failure worth knowing about) without ever throwing.
    console.warn("[liveCaseOverrides] getLiveCaseOverrides failed - falling back to bundled data", e);
    return null;
  }
}

/** Full case record for a CaseMasterID that exists live but has no bundled
 *  entry - i.e. a case created after this build was compiled. Returns null
 *  on anything not found or any live-fetch failure (local dev included);
 *  the caller's existing notFound() is still the right outcome for a
 *  genuinely nonexistent case. */
export async function getLiveOnlyCase(caseMasterId: number): Promise<WorklistCase | null> {
  try {
    const h = await headers();
    const src = { headers: h };

    const caseRows = await zcql(
      src,
      `SELECT CaseMasterID, CrimeNo, CrimeMinorHeadID, PoliceStationID, CaseStatusID, CrimeRegisteredDate, PolicePersonID, GravityOffenceID, IncidentFromDate, IncidentToDate, latitude, longitude
       FROM CaseMaster WHERE CaseMasterID = ${caseMasterId}`
    );
    if (!caseRows.length) return null;
    const cm = pick(caseRows[0], "CaseMaster");

    const policeStationId = Number(cm.PoliceStationID);
    const unitRows = await zcql(src, `SELECT UnitName, DistrictID FROM Unit WHERE UnitID = ${policeStationId}`);
    const unit = unitRows.length ? pick(unitRows[0], "Unit") : null;
    const districtId = unit ? Number(unit.DistrictID) : null;
    const district = districtId !== null ? districts.find((d) => d.dbId === districtId) : undefined;

    const crimeType = caseTypes.find((c) => c.dbId === Number(cm.CrimeMinorHeadID));

    const statusIdRaw = Number(cm.CaseStatusID);
    const statusId = isCaseStatusId(statusIdRaw) ? statusIdRaw : 1;

    const accusedRows = await zcql(src, `SELECT AccusedName, PersonID FROM Accused WHERE CaseMasterID = ${caseMasterId}`);
    const accusedNames: string[] = [];
    const accused: WorklistCase["accused"] = [];
    for (const r of accusedRows) {
      const a = pick(r, "Accused");
      const name = String(a.AccusedName ?? "");
      if (name) accusedNames.push(name);
      // linked: false - same reasoning as a P1.2 bulk case's accused: a
      // real personId (see caseCreate.ts's mintPersonId), but no evidence-
      // fused profile to link to. caseCount is unknown without a
      // cross-case scan this function deliberately doesn't do (a live-only
      // case's accused have no repeat-offender history to compute yet).
      accused.push({ personId: String(a.PersonID ?? ""), name, caseCount: 1, linked: false });
    }

    const complainantRows = await zcql(src, `SELECT OccupationID, ReligionID FROM ComplainantDetails WHERE CaseMasterID = ${caseMasterId}`);
    const complainantOccupationIds = complainantRows.map((r: unknown) => Number(pick(r, "ComplainantDetails").OccupationID));
    const complainantReligionIds = complainantRows.map((r: unknown) => Number(pick(r, "ComplainantDetails").ReligionID));

    return {
      caseMasterId,
      scenarioId: `LIVE-${caseMasterId}`,
      crimeNo: String(cm.CrimeNo ?? ""),
      title: `Case ${caseMasterId}`,
      crimeTypeName: crimeType?.name ?? "Unknown",
      crimeTypeSlug: crimeType?.slug ?? "unknown",
      districtId,
      districtName: district?.name ?? "Unknown",
      districtSlug: district?.slug ?? "unknown",
      statusId,
      statusLabel: "", // CaseStatusPill/CaseStatusEditor render from statusId directly - never read on this page
      registeredDate: cm.CrimeRegisteredDate ? String(cm.CrimeRegisteredDate) : null,
      accusedNames,
      accused,
      sections: [], // ActSectionAssociation deliberately not inserted for a new case - see caseCreate.ts's header note
      policeStationName: unit ? String(unit.UnitName ?? "") : null,
      policePersonId: Number.isFinite(Number(cm.PolicePersonID)) ? Number(cm.PolicePersonID) : null,
      crimeMinorHeadId: Number(cm.CrimeMinorHeadID),
      gravityOffenceId: Number(cm.GravityOffenceID),
      incidentFromDate: cm.IncidentFromDate ? String(cm.IncidentFromDate) : null,
      incidentToDate: cm.IncidentToDate ? String(cm.IncidentToDate) : null,
      complainantOccupationIds,
      complainantReligionIds,
      latitude: Number.isFinite(Number(cm.latitude)) ? Number(cm.latitude) : null,
      longitude: Number.isFinite(Number(cm.longitude)) ? Number(cm.longitude) : null,
    };
  } catch (e) {
    console.warn("[liveCaseOverrides] getLiveOnlyCase failed", e);
    return null;
  }
}
