import { NextRequest, NextResponse } from "next/server";
import { zcql, pick, fail } from "@/lib/zcql";
import { createCase, type CreateCaseInput } from "@/lib/caseCreate";
import { districts, caseTypes } from "@/lib/data";
import { getEmployee } from "@/lib/employees";

export const dynamic = "force-dynamic";

// POST /api/cases  -> { ok: true, caseMasterId, crimeNo, caseNo }
//
// P10 Phase 3 (2026-09-02) - the first CREATE anywhere in this app. Every
// prior write (P2.4) only updated 2 columns of one existing row; this
// inserts a genuinely new FIR - CaseMaster + a mandatory Complainant, plus
// an optional Victim and Accused. See src/lib/caseCreate.ts for the real
// insert logic (id-minting bands, live CrimeNo/CaseNo generation) and its
// header note on what's deliberately out of scope (ActSectionAssociation).
//
// Same discipline as the existing status/officer PATCH endpoints: every
// field is checked against real, known-good values BEFORE any live call -
// district/crime-type against the real bundled registers, police station
// and officer against a live Unit/Employee check - so a malformed request
// never reaches an insert.
//
// Karnataka bounding box for latitude/longitude - same range P1.7's own
// district-locality data was verified against this session (11.5-18.6N,
// 74.0-78.7E). A coordinate outside it is almost certainly a typo, not a
// real incident location - rejected rather than silently accepted, matching
// P1.3's original "coordinates must land on a real place" standard.
const KA_BBOX = { latMin: 11.5, latMax: 18.6, lngMin: 74.0, lngMax: 78.7 };

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return badRequest("Request body must be JSON");

    const districtId = Number(body.districtId);
    const district = districts.find((d) => d.dbId === districtId);
    if (!district) return badRequest(`districtId ${body.districtId} is not a real district`);

    const policeStationId = Number(body.policeStationId);
    if (!Number.isFinite(policeStationId)) return badRequest("policeStationId is required");
    // No bundled Unit list in src/ (P1.7 added 46 new stations only to the
    // generator, not a client-side copy) - a real, live check rather than
    // trusting the client's dropdown selection.
    const unitRows = await zcql(req, `SELECT ROWID FROM Unit WHERE UnitID = ${policeStationId} AND DistrictID = ${districtId}`);
    if (!unitRows.length) return badRequest(`policeStationId ${policeStationId} is not a real station in district ${districtId}`);

    const crimeMinorHeadId = Number(body.crimeMinorHeadId);
    if (!caseTypes.some((c) => c.dbId === crimeMinorHeadId)) {
      return badRequest(`crimeMinorHeadId must be one of: ${caseTypes.map((c) => c.dbId).join(", ")}`);
    }

    const gravityOffenceId = Number(body.gravityOffenceId);
    if (gravityOffenceId !== 1 && gravityOffenceId !== 2) return badRequest("gravityOffenceId must be 1 (Heinous) or 2 (Non-Heinous)");

    const incidentFrom = String(body.incidentFrom ?? "");
    const incidentTo = String(body.incidentTo ?? "");
    const fromDate = new Date(incidentFrom);
    const toDate = new Date(incidentTo);
    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) return badRequest("incidentFrom/incidentTo must be valid dates");
    if (fromDate.getTime() > toDate.getTime()) return badRequest("incidentFrom must not be after incidentTo");
    if (fromDate.getTime() > Date.now()) return badRequest("incidentFrom cannot be in the future");

    const latitude = Number(body.latitude);
    const longitude = Number(body.longitude);
    if (!isFiniteNumber(latitude) || !isFiniteNumber(longitude)) return badRequest("latitude/longitude are required real numbers");
    if (latitude < KA_BBOX.latMin || latitude > KA_BBOX.latMax || longitude < KA_BBOX.lngMin || longitude > KA_BBOX.lngMax) {
      return badRequest("latitude/longitude must be inside Karnataka");
    }

    const briefFacts = String(body.briefFacts ?? "").trim();
    if (!briefFacts) return badRequest("briefFacts is required");
    if (briefFacts.length > 9000) return badRequest("briefFacts is too long (max ~9000 characters)"); // column cap is 10000; headroom for the rest of the row

    const policePersonId = Number(body.policePersonId);
    if (!getEmployee(policePersonId)) return badRequest(`policePersonId ${policePersonId} is not a real officer`);

    const complainant = body.complainant ?? {};
    const complainantName = String(complainant.name ?? "").trim();
    const complainantAge = Number(complainant.age);
    const complainantGenderId = Number(complainant.genderId);
    if (!complainantName) return badRequest("complainant.name is required");
    if (!Number.isInteger(complainantAge) || complainantAge < 1 || complainantAge > 120) return badRequest("complainant.age must be 1-120");
    if (complainantGenderId !== 1 && complainantGenderId !== 2) return badRequest("complainant.genderId must be 1 or 2");
    const occupationId = Number.isInteger(Number(complainant.occupationId)) ? Number(complainant.occupationId) : 0;
    const religionId = Number.isInteger(Number(complainant.religionId)) ? Number(complainant.religionId) : 0;

    let victim: CreateCaseInput["victim"] = null;
    if (body.victim && String(body.victim.name ?? "").trim()) {
      const name = String(body.victim.name).trim();
      const age = Number(body.victim.age);
      const genderId = Number(body.victim.genderId);
      if (!Number.isInteger(age) || age < 0 || age > 120) return badRequest("victim.age must be 0-120");
      if (genderId !== 1 && genderId !== 2) return badRequest("victim.genderId must be 1 or 2");
      victim = { name, age, genderId: genderId as 1 | 2 };
    }

    let accused: CreateCaseInput["accused"] = null;
    if (body.accused && String(body.accused.name ?? "").trim()) {
      const name = String(body.accused.name).trim();
      const age = Number(body.accused.age);
      const genderId = Number(body.accused.genderId);
      if (!Number.isInteger(age) || age < 0 || age > 120) return badRequest("accused.age must be 0-120");
      if (genderId !== 1 && genderId !== 2) return badRequest("accused.genderId must be 1 or 2");
      accused = { name, age, genderId: genderId as 1 | 2 };
    }

    const created = await createCase({
      districtId,
      policeStationId,
      crimeMinorHeadId,
      gravityOffenceId: gravityOffenceId as 1 | 2,
      incidentFrom,
      incidentTo,
      latitude,
      longitude,
      briefFacts,
      policePersonId,
      complainant: { name: complainantName, age: complainantAge, genderId: complainantGenderId as 1 | 2, occupationId, religionId },
      victim,
      accused,
    });

    return NextResponse.json({ ok: true, ...created });
  } catch (e) {
    return fail(e);
  }
}
