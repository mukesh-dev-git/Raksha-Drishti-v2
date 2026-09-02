// -----------------------------------------------------------------------------
// P10 Phase 3 (2026-09-02) - the first real "create" anywhere in this app.
// Everything before this could only update 2 columns of CaseMaster; this
// inserts a genuinely new FIR: CaseMaster + a mandatory Complainant, plus an
// optional Victim and an optional Accused.
//
// SCOPE DECISION, stated explicitly: does NOT insert ActSectionAssociation
// rows (charge sections) for the new case. Nothing in the app reads that
// table (confirmed - see catalyst/README.md §2's fix note), so there is no
// user-visible gap left by skipping it, and it was the exact table that
// needed a schema fix this session for silently truncating data - not
// worth re-touching without a real reader to verify against.
//
// COLUMN CONSTRAINTS - confirmed live via CatalystbyZoho_List_All_Columns
// before writing any of this, not assumed from DATA_STORE_SCHEMA.md's
// intent:
//   CaseMaster.CaseMasterID     int(10), UNIQUE, mandatory
//   CaseMaster.CrimeNo          varchar(20), UNIQUE, mandatory
//   CaseMaster.latitude/longitude  double, mandatory (no default - a real
//     coordinate must be supplied, there is no station-locality table in
//     src/ to derive one from; the form requires it)
//   ComplainantDetails.ComplainantID / Victim.VictimMasterID /
//     Accused.AccusedMasterID   all int(10), UNIQUE, mandatory
//   Accused.PersonID            varchar(50), mandatory, NOT unique-
//     constrained by the DB - collision safety is this module's job, not
//     the schema's (see mintPersonId below)
//
// ID STRATEGY: every *MasterID column here is `int` with `max_length: 10`.
// A timestamp-based id (Date.now() is 13 digits as of 2026) would silently
// truncate - the EXACT bug just fixed in ActSectionAssociation this same
// session. Deliberately NOT reusing that mistake: ids are random within a
// safe band, comfortably under the 10-digit cap and clear of every existing
// range (authored 9001-9019, bulk 100001-111981), with the database's own
// `is_unique` constraint as the real backstop - insertRow() throwing on a
// collision is treated as "roll a new id and retry a few times", not as an
// error path to swallow.
//
// CrimeNo is different: it must look like a real CCTNS number
// (`1{district4}{unit4}{year4}{serial5}`, confirmed format - see
// bulk_cases.mjs's own fix note this session) and the serial has to be the
// real next one for that station+year, or it wouldn't be recognisable as a
// genuine FIR number. That needs a live read first (nextCrimeSerial below),
// not a random guess.
// -----------------------------------------------------------------------------
import { headers } from "next/headers";
import { zcql, zcqlAll, insertRow, pick } from "./zcql";

export type CreateComplainant = {
  name: string;
  age: number;
  genderId: 1 | 2;
  occupationId: number; // 0 = not specified, matches OccupationMaster
  religionId: number; // 0 = not specified, matches ReligionMaster
};

export type CreateVictim = { name: string; age: number; genderId: 1 | 2 };
export type CreateAccused = { name: string; age: number; genderId: 1 | 2 };

export type CreateCaseInput = {
  districtId: number;
  policeStationId: number;
  crimeMinorHeadId: number; // 1 Theft / 2 Assault / 3 Fraud / 4 Burglary - matches data.ts's caseTypes
  gravityOffenceId: 1 | 2; // 1 Heinous / 2 Non-Heinous
  incidentFrom: string; // "YYYY-MM-DDTHH:mm" from a datetime-local input
  incidentTo: string;
  latitude: number;
  longitude: number;
  briefFacts: string;
  policePersonId: number;
  complainant: CreateComplainant;
  victim: CreateVictim | null;
  accused: CreateAccused | null;
};

export type CreatedCase = {
  caseMasterId: number;
  crimeNo: string;
  caseNo: string;
};

// Existing real ranges: authored 9001-9019, bulk 100001-111981 (P1.7's
// BULK_ID_BASE). This band starts comfortably above both and stays inside
// int(10)'s real headroom.
const ID_BAND_LOW = 500_000;
const ID_BAND_HIGH = 900_000;
function randomId(): number {
  return ID_BAND_LOW + Math.floor(Math.random() * (ID_BAND_HIGH - ID_BAND_LOW));
}

// Real accused PersonIds run KA-P0001..KA-P5943ish (see personIdentity's
// range this session). Prefixing with an extra "9" keeps every newly-minted
// id visibly out of that range without needing a live uniqueness check -
// PersonID isn't DB-unique-constrained, so this module supplies the safety
// margin itself rather than relying on a constraint that isn't there.
function mintPersonId(): string {
  const n = 900_000 + Math.floor(Math.random() * 99_999);
  return `KA-P9${n}`;
}

async function h() {
  return { headers: await headers() };
}

/** Real next FIR serial for one station+year, so a newly-minted CrimeNo
 *  reads as a genuine CCTNS number, not an arbitrary one. Small, WHERE-
 *  scoped live read (a station sees dozens of cases a year, not thousands) -
 *  not the kind of full-table walk zcqlAll() exists to guard against, but
 *  still routed through it for the same ROWID-dedup safety net. */
async function nextCrimeSerial(policeStationId: number, year: number): Promise<number> {
  const src = await h();
  const rows = await zcqlAll(
    src,
    `SELECT ROWID, CrimeNo FROM CaseMaster WHERE PoliceStationID = ${policeStationId} AND CrimeRegisteredDate >= '${year}-01-01' AND CrimeRegisteredDate <= '${year}-12-31'`
  );
  let max = 0;
  for (const row of rows) {
    const crimeNo = String(pick(row, "CaseMaster").CrimeNo ?? "");
    const serial = Number(crimeNo.slice(-5));
    if (Number.isFinite(serial) && serial > max) max = serial;
  }
  return max + 1;
}

function pad(n: number, len: number): string {
  return String(n).padStart(len, "0");
}

function toSqlDate(v: string): string {
  // Server derives this from real Date parsing, not a raw pass-through of
  // client input - never trust a client-supplied string straight into a
  // query without normalising its shape first.
  const d = new Date(v);
  const p2 = (x: number) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
}
function toSqlDateTime(v: string): string {
  const d = new Date(v);
  const p2 = (x: number) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())} ${p2(d.getHours())}:${p2(d.getMinutes())}:00`;
}

/** Inserts a real CaseMaster row (+ Complainant, optional Victim/Accused).
 *  Retries the CaseMasterID/ComplainantID/etc. bands on a live uniqueness
 *  collision (extremely unlikely given the band size, but the DB enforces
 *  it, so this respects that rather than assuming it away). Throws on any
 *  other failure - callers (the Route Handler) decide how to report it. */
export async function createCase(input: CreateCaseInput): Promise<CreatedCase> {
  const src = await h();
  const now = new Date();
  const year = now.getFullYear();

  const unitSegment = String(input.policeStationId).slice(-4);
  const serial = await nextCrimeSerial(input.policeStationId, year);
  const crimeNo = `1${input.districtId}${unitSegment}${year}${pad(serial, 5)}`;
  const caseNo = `${year}${pad(serial, 5)}`;

  // Court is district-scoped, 1:1, and this app has no bundled district->
  // court map (only the generator does, and it isn't shipped to src/) - a
  // single small live read rather than duplicating that table client-side.
  const courtRows = await zcql(src, `SELECT ROWID, CourtID FROM Court WHERE DistrictID = ${input.districtId}`);
  if (!courtRows.length) throw new Error(`No court on file for DistrictID ${input.districtId}`);
  const courtId = Number(pick(courtRows[0], "Court").CourtID);

  let caseMasterId = randomId();
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      await insertRow(src, "CaseMaster", {
        CaseMasterID: caseMasterId,
        CrimeNo: crimeNo,
        CaseNo: caseNo,
        CrimeRegisteredDate: toSqlDate(now.toISOString()),
        PolicePersonID: input.policePersonId,
        PoliceStationID: input.policeStationId,
        CaseCategoryID: 1, // FIR
        GravityOffenceID: input.gravityOffenceId,
        // Matches every one of the 12,000 existing rows' own real value -
        // see this file's header note on why 1 is used unconditionally.
        CrimeMajorHeadID: 1,
        CrimeMinorHeadID: input.crimeMinorHeadId,
        CaseStatusID: 1, // Open - a brand-new FIR always starts here, not user-selectable at creation
        CourtID: courtId,
        IncidentFromDate: toSqlDateTime(input.incidentFrom),
        IncidentToDate: toSqlDateTime(input.incidentTo),
        InfoReceivedPSDate: toSqlDateTime(now.toISOString()),
        latitude: input.latitude,
        longitude: input.longitude,
        BriefFacts: input.briefFacts,
      });
      break;
    } catch (e) {
      if (attempt === 4) throw e;
      caseMasterId = randomId(); // collided (or transient) - try a fresh id
    }
  }

  // A real FIR needs a complainant - mandatory in this app's own create
  // flow, matching real practice (CCTNS never has a complainant-less FIR).
  let complainantId = randomId();
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      await insertRow(src, "ComplainantDetails", {
        ComplainantID: complainantId,
        CaseMasterID: caseMasterId,
        ComplainantName: input.complainant.name,
        AgeYear: input.complainant.age,
        OccupationID: input.complainant.occupationId,
        ReligionID: input.complainant.religionId,
        CasteID: 0, // "not specified" - matches every bulk row; caste taxonomy is a real, still-open project decision (see PLAN.md P1.5), not resolved here
        GenderID: input.complainant.genderId,
      });
      break;
    } catch (e) {
      if (attempt === 4) throw e;
      complainantId = randomId();
    }
  }

  if (input.victim) {
    let victimId = randomId();
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        await insertRow(src, "Victim", {
          VictimMasterID: victimId,
          CaseMasterID: caseMasterId,
          VictimName: input.victim.name,
          AgeYear: input.victim.age,
          GenderID: input.victim.genderId,
          VictimPolice: "No", // matches the authored rows' convention (cases.json) over bulk's inconsistent numeric 0
        });
        break;
      } catch (e) {
        if (attempt === 4) throw e;
        victimId = randomId();
      }
    }
  }

  if (input.accused) {
    let accusedId = randomId();
    const personId = mintPersonId();
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        await insertRow(src, "Accused", {
          AccusedMasterID: accusedId,
          CaseMasterID: caseMasterId,
          AccusedName: input.accused.name,
          AgeYear: input.accused.age,
          GenderID: input.accused.genderId,
          PersonID: personId,
        });
        break;
      } catch (e) {
        if (attempt === 4) throw e;
        accusedId = randomId();
      }
    }
  }

  return { caseMasterId, crimeNo, caseNo };
}
