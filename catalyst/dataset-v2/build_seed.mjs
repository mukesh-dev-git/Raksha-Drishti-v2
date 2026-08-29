// -----------------------------------------------------------------------------
// build_seed.mjs — reads lookups.json + cases.json (hand-authored dataset v2)
// and emits:
//   - catalyst/dataset-v2/out/csv/<Table>.csv   one per Data Store table,
//     ready for `catalyst ds:import --table <Name> <csv>`
//   - catalyst/dataset-v2/out/nosql/<Collection>.json   one per new NoSQL
//     collection (calls/transactions/CCTV/statements/timeline/contradictions/
//     PersonIdentity), not tables in the FIR schema - see DATA_STORE_SCHEMA.md
//
// Run: node catalyst/dataset-v2/build_seed.mjs
// -----------------------------------------------------------------------------
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";
import { generateBulkCases } from "./bulk_cases.mjs";

const dir = path.dirname(fileURLToPath(import.meta.url));
const lookups = JSON.parse(readFileSync(path.join(dir, "lookups.json"), "utf-8"));
const dataset = JSON.parse(readFileSync(path.join(dir, "cases.json"), "utf-8"));

const outCsvDir = path.join(dir, "out", "csv");
const outNoSqlDir = path.join(dir, "out", "nosql");
mkdirSync(outCsvDir, { recursive: true });
mkdirSync(outNoSqlDir, { recursive: true });

// --- CSV helpers -------------------------------------------------------------
function csvEscape(v) {
  if (v === null || v === undefined) return "";
  if (typeof v === "boolean") return v ? "true" : "false";
  const s = String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

// Catalyst's ds:import rejects ISO 8601 "T"-separated datetimes for DateTime
// columns ("Invalid input value for IncidentFromDate. datetime value
// expected") - confirmed against a live import error report, 2026-08-22.
// It wants a plain space-separated "YYYY-MM-DD HH:mm:ss". Plain Date columns
// (e.g. CrimeRegisteredDate) are unaffected - already "YYYY-MM-DD" in
// cases.json and imported fine as-is.
function toDateTime(v) {
  if (typeof v !== "string") return v;
  return v.replace("T", " ");
}

// Apply toDateTime to specific columns of every row before writeCsv.
function reformatDateTimeCols(rows, cols) {
  for (const row of rows) for (const c of cols) if (row[c] !== undefined) row[c] = toDateTime(row[c]);
}

function writeCsv(tableName, columns, rows) {
  const lines = [columns.join(",")];
  for (const row of rows) {
    lines.push(columns.map((c) => csvEscape(row[c])).join(","));
  }
  const filePath = path.join(outCsvDir, `${tableName}.csv`);
  writeFileSync(filePath, lines.join("\n") + "\n", "utf-8");
  console.log(`  ${tableName}.csv`.padEnd(28), `${rows.length} rows`);
}

// --- 1. Lookup tables (straight passthrough) ---------------------------------
console.log("Lookup tables:");
const lookupColumns = {
  State: ["StateID", "StateName", "NationalityID", "Active"],
  District: ["DistrictID", "DistrictName", "StateID", "Active"],
  UnitType: ["UnitTypeID", "UnitTypeName", "CityDistState", "Hierarchy", "Active"],
  Unit: ["UnitID", "UnitName", "TypeID", "ParentUnit", "NationalityID", "DistrictID", "StateID", "Active"],
  Rank: ["RankID", "RankName", "Hierarchy", "Active"],
  Designation: ["DesignationID", "DesignationName", "SortOrder", "Active"],
  Employee: ["EmployeeID", "DistrictID", "UnitID", "RankID", "DesignationID", "KGID", "FirstName", "EmployeeDOB", "GenderID", "BloodGroupID", "PhysicallyChallenged", "AppointmentDate"],
  Court: ["CourtID", "CourtName", "DistrictID", "StateID", "Active"],
  CaseCategory: ["CaseCategoryID", "LookupValue"],
  GravityOffence: ["GravityOffenceID", "LookupValue"],
  CaseStatusMaster: ["CaseStatusID", "CaseStatusName"],
  CrimeHead: ["CrimeHeadID", "CrimeGroupName", "Active"],
  CrimeSubHead: ["CrimeSubHeadID", "CrimeHeadID", "CrimeHeadName", "SeqID"],
  Act: ["ActCode", "ActDescription", "ShortName", "Active"],
  Section: ["ActCode", "SectionCode", "SectionDescription", "Active"],
};
// Unit's ParentUnit/NationalityID, and Employee's BloodGroupID/
// PhysicallyChallenged, are Mandatory in the live schema (found by checking
// the console directly, 2026-08-24 - both imports had been silently landing
// 0 rows because these required columns were never populated).
for (const u of lookups.Unit) {
  if (u.ParentUnit === undefined) u.ParentUnit = 0; // "no parent" - top-level police stations
  if (u.NationalityID === undefined) u.NationalityID = 1; // India, same constant as State
}
for (const e of lookups.Employee) {
  if (e.BloodGroupID === undefined) e.BloodGroupID = 1; // no real blood-group data authored - placeholder lookup value
  if (e.PhysicallyChallenged === undefined) e.PhysicallyChallenged = false;
}

for (const [table, columns] of Object.entries(lookupColumns)) {
  writeCsv(table, columns, lookups[table]);
}

// --- 2. Case-derived Data Store tables -----------------------------------------
console.log("\nCase-derived tables:");
const caseMasterCols = [
  "CaseMasterID", "CrimeNo", "CaseNo", "CrimeRegisteredDate", "PolicePersonID",
  "PoliceStationID", "CaseCategoryID", "GravityOffenceID", "CrimeMajorHeadID",
  "CrimeMinorHeadID", "CaseStatusID", "CourtID", "IncidentFromDate",
  "IncidentToDate", "InfoReceivedPSDate", "latitude", "longitude", "BriefFacts",
];
const complainantCols = ["ComplainantID", "CaseMasterID", "ComplainantName", "AgeYear", "OccupationID", "ReligionID", "CasteID", "GenderID"];
const victimCols = ["VictimMasterID", "CaseMasterID", "VictimName", "AgeYear", "GenderID", "VictimPolice"];
const accusedCols = ["AccusedMasterID", "CaseMasterID", "AccusedName", "AgeYear", "GenderID", "PersonID"];
const actSectionCols = ["CaseMasterID", "ActID", "SectionID", "ActOrderID", "SectionOrderID"];
const chargesheetCols = ["CSID", "CaseMasterID", "csdate", "cstype", "PolicePersonID"];

const caseMasterRows = [];
const complainantRows = [];
const victimRows = [];
const accusedRows = [];
const actSectionRows = [];

for (const c of dataset.cases) {
  for (const fir of c.firs) caseMasterRows.push(fir);
  for (const x of c.complainants || []) complainantRows.push(x);
  for (const x of c.victims || []) victimRows.push(x);
  for (const x of c.accused || []) accusedRows.push(x);
  for (const x of c.actSections || []) actSectionRows.push(x);
}

// --- 2b. P1.2 - the broad half. See bulk_cases.mjs's own header for the full
// reasoning (real relational volume; deliberately no evidence layer). ID
// ranges are hand-picked to never collide with the 15 scenarios' own:
// CaseMasterID 9001-9019, AccusedMasterID 8000s, VictimMasterID 7000s,
// ComplainantID 6000s, global PersonID up to KA-P0047 - bulk starts at 1/1/
// 1/1/48 respectively and stays well under those floors.
// 4981 bulk + 19 authored = 5000 total - scaled up from the original 390/409
// per user request: SCRB handles statewide volume, and 409 cases undersold
// that. 5,000 was picked as the largest step that stays comfortably inside
// "bundle a JSON file" (a few MB, still fast to build/parse) rather than
// needing a paginated API/DB read - see PLAN.md P1.2 for the full tradeoff
// (~20k+ would mean minified JSON and a closer look at build time; ~100k+
// stops being a static-bundle problem at all).
const BULK_CASE_COUNT = 4981;
const bulk = generateBulkCases(lookups, {
  count: BULK_CASE_COUNT,
  startCaseMasterId: 1,
  startAccusedMasterId: 1,
  startVictimMasterId: 1,
  startComplainantId: 1,
  startPersonNumber: 48,
  today: "2026-08-29",
});
caseMasterRows.push(...bulk.caseMasterRows);
complainantRows.push(...bulk.complainantRows);
victimRows.push(...bulk.victimRows);
accusedRows.push(...bulk.accusedRows);
actSectionRows.push(...bulk.actSectionRows);
console.log(`  (+ ${bulk.caseMasterRows.length} bulk cases from bulk_cases.mjs, ${bulk.accusedRows.length} with a named accused)`);

reformatDateTimeCols(caseMasterRows, ["IncidentFromDate", "IncidentToDate", "InfoReceivedPSDate"]);
writeCsv("CaseMaster", caseMasterCols, caseMasterRows);
writeCsv("ComplainantDetails", complainantCols, complainantRows);
writeCsv("Victim", victimCols, victimRows);
writeCsv("Accused", accusedCols, accusedRows);
writeCsv("ActSectionAssociation", actSectionCols, actSectionRows);

// ChargesheetDetails - a table the 15-scenario dataset never emitted at all
// (ported the SHAPE from catalyst/seed/ChargesheetDetails.csv, per P1.2's
// scope - not its rows, which carry the old generator's real defects, see
// PLAN.md P1.2). One row per case whose CaseStatusID is Charge Sheeted (2),
// scenario FIRs included - a charge-sheeted FIR without a chargesheet
// record on file is a real inconsistency, not just a bulk-data gap.
const chargesheetRows = [];
let csid = 1;
for (const row of caseMasterRows) {
  if (row.CaseStatusID !== 2) continue;
  // Filed a real 30-120 days after registration - deterministic per case.
  const r = ((row.CaseMasterID * 2654435761) >>> 0) / 4294967296;
  const delayDays = 30 + Math.floor(r * 90);
  const csDate = new Date(row.CrimeRegisteredDate + "T00:00:00");
  csDate.setDate(csDate.getDate() + delayDays);
  chargesheetRows.push({
    CSID: csid++,
    CaseMasterID: row.CaseMasterID,
    csdate: `${csDate.toISOString().slice(0, 10)} 10:00:00`,
    cstype: "A", // "A" = the only chargesheet type either dataset ever used
    PolicePersonID: row.PolicePersonID,
  });
}
writeCsv("ChargesheetDetails", chargesheetCols, chargesheetRows);

// P4.4 - the same chargesheetRows bundled for src/ as a small NoSQL-style
// lookup (CaseMasterID -> csdate), so the app can compute chargesheet rate +
// time-to-chargesheet without shipping the whole CSV or re-deriving the
// delay-days formula client-side. One row per case actually charge-sheeted
// (CaseStatusID 2) - a case absent from this map was never charge-sheeted.
const chargesheetDates = {};
for (const row of chargesheetRows) chargesheetDates[row.CaseMasterID] = row.csdate;
writeFileSync(
  path.join(outNoSqlDir, "chargesheetDates.json"),
  JSON.stringify(chargesheetDates),
  "utf-8"
);
console.log(`chargesheetDates.json`.padEnd(30), `${Object.keys(chargesheetDates).length} charge-sheeted cases`);

// --- 3. New NoSQL collections --------------------------------------------------
// Each record gets scenarioId + caseMasterIds so it's traceable back to the
// FIR(s) it belongs to (citation-grounding, features.md #5), and resolvedPersons
// maps each scenario-local personRef (P1, P2, ...) to its real AccusedMasterID/
// VictimMasterID/ComplainantID so a later entity-fusion pass has real IDs to
// merge, not just narrative labels.
console.log("\nNoSQL collections:");

// Keyed by the token the evidence records ACTUALLY cite. Until P1.1 this map
// was keyed by the scenario-local Accused.PersonID ("A1".."A4") while every
// call/CCTV/statement/timeline record cites the narrative token ("P1".."P4") -
// so resolvedPersons resolved 0 of the 47 person citations in the dataset and
// the citation-grounding this map exists to provide was never actually wired
// up. cases.json's per-scenario "personIndex" is the bridge: token -> global
// Accused.PersonID ("KA-Pnnnn", unique and stable dataset-wide).
//
// One entry per distinct person (NOT one per key alias) - dashboardData.ts
// counts suspects with Object.values(resolvedPersons), so keying the same
// person under both its token and its global ID would double every count.
function resolvePersonRefs(c) {
  const map = {};

  // Group this scenario's accused rows by global PersonID. A person spanning
  // two FIRs has two rows under one ID, deliberately under different name
  // spellings (e.g. "Suresh Naik" / "Suresh N.") - that alias pair is the
  // entity-fusion signal P3.1 exists to catch, so keep every spelling and
  // treat the fullest one as canonical rather than silently taking the first.
  const byPersonId = {};
  for (const x of c.accused || []) {
    const p = (byPersonId[x.PersonID] ||= {
      type: "Accused",
      personId: x.PersonID,
      name: x.AccusedName,
      aliases: [],
      accusedMasterIds: [],
      caseMasterIds: [],
    });
    if (!p.aliases.includes(x.AccusedName)) p.aliases.push(x.AccusedName);
    if (x.AccusedName.length > p.name.length) p.name = x.AccusedName;
    p.accusedMasterIds.push(x.AccusedMasterID);
    if (!p.caseMasterIds.includes(x.CaseMasterID)) p.caseMasterIds.push(x.CaseMasterID);
  }
  // `id` kept for backwards compatibility with readers written against the old
  // shape; it's the person's first AccusedMasterID.
  for (const p of Object.values(byPersonId)) p.id = p.accusedMasterIds[0];

  for (const [token, personId] of Object.entries(c.personIndex || {})) {
    const p = byPersonId[personId];
    if (!p) throw new Error(`${c.scenarioId}: personIndex ${token} -> ${personId} has no matching accused row`);
    map[token] = p;
  }

  // Victims have no PersonID column in the FIR schema, so they can't join to
  // the global register - they're keyed by name and carried for the person
  // counts in dashboardData.ts. No evidence record cites a victim token today.
  for (const x of c.victims || []) {
    map["V:" + x.VictimName.split(" ")[0]] = { type: "Victim", id: x.VictimMasterID, name: x.VictimName };
  }
  return map;
}

function writeNoSqlCollection(name, extractor) {
  const records = [];
  for (const c of dataset.cases) {
    const personMap = resolvePersonRefs(c);
    const caseMasterIds = c.firs.map((f) => f.CaseMasterID);
    for (const rec of extractor(c) || []) {
      records.push({ scenarioId: c.scenarioId, caseMasterIds, resolvedPersons: personMap, ...rec });
    }
  }
  const filePath = path.join(outNoSqlDir, `${name}.json`);
  writeFileSync(filePath, JSON.stringify(records, null, 2), "utf-8");
  console.log(`  ${name}.json`.padEnd(28), `${records.length} records`);
}

writeNoSqlCollection("CallRecords", (c) => c.calls);
writeNoSqlCollection("Transactions", (c) => c.transactions);
writeNoSqlCollection("CCTVSightings", (c) => c.cctv);
writeNoSqlCollection("WitnessStatements", (c) => c.witnessStatements);
writeNoSqlCollection("TimelineEvents", (c) => c.timeline);
// Unlike every other collection, the source contradiction object has no id
// field of its own (there's only ever one per scenario) - synthesize one so
// it has the same "id" partition key every NoSQL table uses. Found via a
// live import: every other collection's rows had a real "id" and inserted
// fine; Contradictions failed all 15/15 with "Mandatory Key id is missing".
writeNoSqlCollection("Contradictions", (c) =>
  c.contradiction ? [{ id: `${c.scenarioId}-CD-1`, ...c.contradiction }] : []
);

// --- 4. CaseMasterID -> scenarioId map ------------------------------------------
// Bridges the relational side (Data Store CaseMaster rows, resolved at
// request time via ZCQL) to the NoSQL scenario data (partitioned by
// scenarioId prefix, e.g. "C1-CL-1"). This is static seed-time information
// (which FIRs belong to which authored scenario) so it's baked once here
// rather than queried live - see src/app/api/investigation/route.ts.
const caseScenarioMap = {};
for (const c of dataset.cases) {
  for (const fir of c.firs) caseScenarioMap[fir.CaseMasterID] = c.scenarioId;
}
writeFileSync(
  path.join(outNoSqlDir, "caseScenarioMap.json"),
  JSON.stringify(caseScenarioMap, null, 2),
  "utf-8"
);
console.log(`\ncaseScenarioMap.json`.padEnd(30), `${Object.keys(caseScenarioMap).length} CaseMasterIDs -> ${dataset.cases.length} scenarios`);

// --- 5. Scenario metadata (title/summary/crimeType/district for cards) ---------
// Lets a Route Handler or server component show a real "featured scenario"
// card (dashboard, alerts, etc.) without re-deriving it from cases.json,
// which isn't bundled into the app (only the generated JSON under out/ is).
// caseTypeSlug/districtSlug aren't resolved here - build_seed.mjs doesn't
// have data.ts's slug tables - callers resolve dbId -> slug via data.ts.
// assignedTo/assignmentReason are hand-authored per scenario in cases.json,
// NOT derived. An earlier version of this file inferred them
// (districtIds.length > 1 ? "State CID" : "District"), which was wrong:
// Karnataka CID takes a case by explicit assignment - order of the State
// Government, the DGP, or the High Court/Supreme Court - plus category
// triggers (Economic Offences Wing above Rs.1 crore, the Cyber Crimes and
// Narcotics Wing, the Forest Cell, human trafficking) and one automatic
// trigger, custodial death. How many districts a case's FIRs touch has
// nothing to do with it: two district SPs coordinating across a boundary,
// or their Range IGP coordinating them, is the ordinary path (see C1, C7).
// Ref: https://cid.karnataka.gov.in/2/organisation/en
const scenarioMeta = {};
for (const c of dataset.cases) {
  const firstFir = c.firs[0];
  const districtIds = c.districts || [];
  scenarioMeta[c.scenarioId] = {
    title: c.title,
    summary: c.summary,
    crimeMinorHeadID: firstFir.CrimeMinorHeadID,
    districtId: districtIds[0] || null,
    districtIds,
    assignedTo: c.assignedTo,
    assignmentReason: c.assignmentReason,
    caseMasterIds: c.firs.map((f) => f.CaseMasterID),
  };
}
writeFileSync(
  path.join(outNoSqlDir, "scenarioMeta.json"),
  JSON.stringify(scenarioMeta, null, 2),
  "utf-8"
);
console.log(`scenarioMeta.json`.padEnd(30), `${Object.keys(scenarioMeta).length} scenarios`);

// --- 6. Per-FIR case facts (Act/Section, district, crime type - for P4.6) ----
// ActSectionAssociation is seeded into the Data Store (§2 above) but was
// confirmed (Part 5 of RESEARCH_AND_PLAN.md) to be read nowhere in src/ -
// this is what makes it readable, bundled the same way scenarioMeta.json is
// rather than requiring a live ZCQL join (which can't be exercised locally -
// see catalyst/README.md on why local dev has no Catalyst request context).
// One row per real FIR (19 today), not per scenario - MO clustering needs
// each case's own section signature and district, not the scenario summary.
//
// Extended for the P2 cases restructure (case worklist / case detail): now
// also carries caseStatusId, the registered date, and the resolved police
// station name - the fields a real FIR Index and a real case-detail page
// actually need, so neither has to re-import lookups.json or cases.json
// itself (which aren't bundled into src/).
//
// caseStatusId is real CaseStatusMaster data (1 Open / 2 Charge Sheeted /
// 3 Closed / 4 Under Investigation) that was sitting unused: every one of
// the 19 real FIRs was hardcoded to 4 in cases.json, so a real status-
// filterable worklist would have shown one status for every case. Hand-
// varied 6 of the 19 by registered-date age relative to today (2026-08-27)
// before this run - the 2 oldest (9008, Jan 18; 9003, Feb 2) to Closed, 3
// more from Feb-Mar to Charge Sheeted (9001, 9002, 9012), the newest
// past-dated one (9011, Aug 1) to Open - so the worklist has a real,
// defensible spread instead of 19 identical pills. The other 13 stay
// Under Investigation, which is realistic - most active cases sit there.
const unitToDistrict = new Map(lookups.Unit.map((u) => [u.UnitID, u.DistrictID]));
const unitById = new Map(lookups.Unit.map((u) => [u.UnitID, u]));
const caseFacts = {};
for (const c of dataset.cases) {
  for (const fir of c.firs) {
    const sections = [
      ...new Set(
        (c.actSections || [])
          .filter((a) => a.CaseMasterID === fir.CaseMasterID)
          .map((a) => `${a.ActID}-${a.SectionID}`)
      ),
    ];
    const firComplainants = (c.complainants || []).filter((x) => x.CaseMasterID === fir.CaseMasterID);
    const complainantNames = firComplainants.map((x) => x.ComplainantName);
    const unit = unitById.get(fir.PoliceStationID);
    caseFacts[fir.CaseMasterID] = {
      caseMasterId: fir.CaseMasterID,
      scenarioId: c.scenarioId,
      crimeNo: fir.CrimeNo,
      crimeMinorHeadId: fir.CrimeMinorHeadID,
      districtId: unit?.DistrictID ?? unitToDistrict.get(fir.PoliceStationID) ?? null,
      policeStationId: fir.PoliceStationID,
      policeStationName: unit?.UnitName ?? null,
      policePersonId: fir.PolicePersonID ?? null,
      sections,
      incidentFromDate: fir.IncidentFromDate,
      // P4.2 - needed alongside incidentFromDate so src/ can call the same
      // isPeriodOffence(from, to) test geo_time.mjs uses at generation time,
      // without which a multi-week offence's stored 00:00 would look like a
      // real midnight incident to any hour-of-day analysis.
      incidentToDate: fir.IncidentToDate,
      crimeRegisteredDate: fir.CrimeRegisteredDate,
      gravityOffenceId: fir.GravityOffenceID,
      caseStatusId: fir.CaseStatusID,
      complainantNames,
      // P4.5 - same parallel-array convention as complainantNames, same
      // index. Victim/complainant side only - Accused has no demographic
      // columns at all (see DATA_STORE_SCHEMA.md), so there is nowhere an
      // offender-side value could end up even by mistake. CasteID isn't
      // carried yet - that taxonomy is still an open decision (PLAN.md P1.5).
      complainantOccupationIds: firComplainants.map((x) => x.OccupationID),
      complainantReligionIds: firComplainants.map((x) => x.ReligionID),
      // P4.1 (hotspot map) - the real per-FIR coordinates were already on
      // CaseMaster (see caseMasterCols above) but never carried into the
      // bundled facts file, so nothing in src/ could plot a real map. Same
      // field, same source, just also exposed here rather than requiring a
      // live ZCQL join for every page that needs a point on a map.
      latitude: fir.latitude ?? null,
      longitude: fir.longitude ?? null,
    };
  }
}
// P1.2's bulk cases, same shape - `scenarioId: "BULK-<id>"` (unique per
// case, never shared) rather than null, so every reader that keys or groups
// by scenarioId (getSiblingCases, the case-detail page's `meta &&` guards)
// keeps working with no special-casing: a bulk case correctly has no
// siblings and no scenario meta card, exactly like a real single-FIR
// investigation with nothing else attached. moPatterns.ts filters this
// prefix out explicitly before clustering - see its own comment on why.
for (const fir of bulk.caseMasterRows) {
  const sections = bulk.actSectionRows.filter((a) => a.CaseMasterID === fir.CaseMasterID).map((a) => `${a.ActID}-${a.SectionID}`);
  const firComplainants = bulk.complainantRows.filter((x) => x.CaseMasterID === fir.CaseMasterID);
  const complainantNames = firComplainants.map((x) => x.ComplainantName);
  const unit = unitById.get(fir.PoliceStationID);
  caseFacts[fir.CaseMasterID] = {
    caseMasterId: fir.CaseMasterID,
    scenarioId: `BULK-${fir.CaseMasterID}`,
    crimeNo: fir.CrimeNo,
    crimeMinorHeadId: fir.CrimeMinorHeadID,
    districtId: unit?.DistrictID ?? unitToDistrict.get(fir.PoliceStationID) ?? null,
    policeStationId: fir.PoliceStationID,
    policeStationName: unit?.UnitName ?? null,
    policePersonId: fir.PolicePersonID ?? null,
    sections,
    incidentFromDate: fir.IncidentFromDate,
    incidentToDate: fir.IncidentToDate,
    crimeRegisteredDate: fir.CrimeRegisteredDate,
    gravityOffenceId: fir.GravityOffenceID,
    caseStatusId: fir.CaseStatusID,
    complainantNames,
    // See the authored-case loop above - same field, same reasoning.
    complainantOccupationIds: firComplainants.map((x) => x.OccupationID),
    complainantReligionIds: firComplainants.map((x) => x.ReligionID),
    latitude: fir.latitude ?? null,
    longitude: fir.longitude ?? null,
  };
}
// Minified, not pretty-printed - this is the one file whose size scales
// directly with case count (5000 FIRs = ~2.4MB pretty vs ~1.3MB minified),
// and it's bundled straight into the Next.js app, not just a build
// artefact meant for manual reading like scenarioMeta.json/employees.json
// stay pretty. Re-run build_seed.mjs and diff the CSVs if you need to
// inspect a specific case's facts by hand.
writeFileSync(
  path.join(outNoSqlDir, "caseFacts.json"),
  JSON.stringify(caseFacts),
  "utf-8"
);
console.log(`caseFacts.json`.padEnd(30), `${Object.keys(caseFacts).length} FIRs`);

// --- 7. Person identity - synthetic KYC-style fields (Aadhaar/phone/address) -
// The real FIR schema has nothing to build this from: `Accused` is only
// AccusedMasterID/CaseMasterID/AccusedName/AgeYear/GenderID/PersonID -
// confirmed by grepping DATA_STORE_SCHEMA.md, zero matches for
// Aadhaar/phone/address anywhere in the 21-table backbone OR the 6 extended
// tables not yet built. But a reviewer WILL expect a suspect record to carry
// this (it's what a real arrest memo / personal-search actually collects),
// so this is fully synthetic - fabricated here, once, and baked to JSON,
// not left for the UI to invent per-render.
//
// Deliberately NOT the investigationData.ts pattern (a seeded-RNG mock
// GENERATOR that runs at request time, explicitly flagged there as a
// placeholder pending real API data). This is meant to read as real, stored
// identity data attached to the person register - so it has to be stable
// across renders and re-deploys, which only baking it to a file gives you.
//
// Deterministic per PersonID (hash-seeded PRNG, not Math.random) - re-running
// this generator reproduces the exact same Aadhaar/phone/address for
// KA-P0001 every time, same discipline every other generator in this file
// follows.
//
// Aadhaar is MASKED on write (first 8 digits never leave this script, only
// "XXXX XXXX 4821" does) - the same convention UIDAI's own masked-Aadhaar
// display uses. No reason for a repeat-offender list view to expose a full
// 12-digit number, fake or not.
//
// Address is grounded in one real fact: the district the person's FIRST
// FIR was actually registered in (via caseFacts, computed above), plus a
// fabricated door number/locality/cross. PIN prefixes are the real postal
// prefix for each of the 8 districts the seeded dataset actually touches -
// illustrative, not a real locality-level lookup.
console.log("\nPerson identity:");

const DISTRICT_PIN_PREFIX = {
  4401: "560", // Bengaluru Urban
  4402: "570", // Mysuru
  4403: "590", // Belagavi
  4404: "585", // Kalaburagi
  4405: "575", // Dakshina Kannada
  4406: "572", // Tumakuru
  4407: "583", // Ballari
  4408: "577", // Shivamogga
};
const LOCALITY_WORDS = [
  "Gandhi Nagar", "Kuvempu Nagar", "Vidyaranyapura", "Shanti Nagar",
  "Ashok Nagar", "Nehru Colony", "Basaveshwara Nagar", "Ganesh Layout",
  "Sri Ram Colony", "Vivekananda Nagar", "Anand Nagar", "Rajiv Gandhi Nagar",
];
const ORDINALS = ["th", "st", "nd", "rd"];
function ordinal(n) {
  const rem = n % 100;
  return n + (ORDINALS[(rem - 20) % 10] || ORDINALS[rem] || ORDINALS[0]);
}

function seededHash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (Math.imul(h, 31) + str.charCodeAt(i)) >>> 0;
  return h;
}
// xorshift32 - a few more independent-looking deterministic digits than one
// hash alone gives, still fully reproducible from personId.
function makeRng(seed) {
  let s = seed || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}
function digits(rng, n) {
  let out = "";
  for (let i = 0; i < n; i++) out += Math.floor(rng() * 10);
  return out;
}

// Canonical name per person - same "longest spelling wins" rule
// resolvePersonRefs (§3) uses, so this file's name matches what the app
// actually displays.
const personName = new Map();
for (const c of dataset.cases) {
  for (const a of c.accused || []) {
    const cur = personName.get(a.PersonID);
    if (!cur || a.AccusedName.length > cur.length) personName.set(a.PersonID, a.AccusedName);
  }
}

// Person -> their FIRST-registered FIR's CaseMasterID (by appearance order
// in cases.json, which is chronological), for district grounding.
const personFirstCase = new Map();
for (const c of dataset.cases) {
  for (const fir of c.firs) {
    for (const a of (c.accused || []).filter((x) => x.CaseMasterID === fir.CaseMasterID)) {
      if (!personFirstCase.has(a.PersonID)) personFirstCase.set(a.PersonID, fir.CaseMasterID);
    }
  }
}

const personIdentity = {};
for (const [personId, name] of personName.entries()) {
  const rng = makeRng(seededHash(personId));
  const aadhaarFull = digits(rng, 12);
  const phoneFirst = "6789"[Math.floor(rng() * 4)]; // valid Indian mobile prefixes
  const phoneRest = digits(rng, 9);
  const doorNo = 1 + Math.floor(rng() * 180);
  const crossNo = 1 + Math.floor(rng() * 9);
  const locality = LOCALITY_WORDS[Math.floor(rng() * LOCALITY_WORDS.length)];

  const firstCaseId = personFirstCase.get(personId);
  const cf = firstCaseId != null ? caseFacts[firstCaseId] : null;
  const districtId = cf?.districtId ?? null;
  const districtName = districtId != null ? lookups.District.find((d) => d.DistrictID === districtId)?.DistrictName ?? null : null;
  const pinPrefix = districtId != null ? DISTRICT_PIN_PREFIX[districtId] : null;
  const pin = pinPrefix ? `${pinPrefix}${digits(rng, 3)}` : null;

  personIdentity[personId] = {
    personId,
    name,
    aadhaarMasked: `XXXX XXXX ${aadhaarFull.slice(8)}`,
    phone: `+91 ${phoneFirst}${phoneRest.slice(0, 4)} ${phoneRest.slice(4)}`,
    address: districtName
      ? `No. ${doorNo}, ${ordinal(crossNo)} Cross, ${locality}, ${districtName}, Karnataka - ${pin}`
      : null,
    districtId,
    districtName,
  };
}
writeFileSync(
  path.join(outNoSqlDir, "PersonIdentity.json"),
  JSON.stringify(personIdentity, null, 2),
  "utf-8"
);
console.log(`PersonIdentity.json`.padEnd(30), `${Object.keys(personIdentity).length} people`);

// --- 8. Employees - real seeded roster, for IO assignment (P9.2) ------------
// Employee/Rank/Designation are real, already-imported Data Store tables
// (catalyst/README.md §2) - this isn't fabricated data, just bundled the
// same way scenarioMeta.json/caseFacts.json are, so the assignment picker
// doesn't need a live query to show a real officer's name/rank/district.
// 12 employees total, real coverage of every one of the 8 districts the
// seeded dataset actually uses (checked: min 1 per district, Bengaluru
// Urban has 3). If IDs/names/counts ever change in a live re-import
// (P1.6), rerun this generator - nothing here is hand-maintained separately.
const rankById = new Map(lookups.Rank.map((r) => [r.RankID, r.RankName]));
const designationById = new Map(lookups.Designation.map((d) => [d.DesignationID, d.DesignationName]));
const districtById = new Map(lookups.District.map((d) => [d.DistrictID, d.DistrictName]));
const employees = lookups.Employee.map((e) => ({
  employeeId: e.EmployeeID,
  name: e.FirstName,
  rankName: rankById.get(e.RankID) ?? "Unknown",
  designationName: designationById.get(e.DesignationID) ?? "Unknown",
  districtId: e.DistrictID,
  districtName: districtById.get(e.DistrictID) ?? "Unknown",
}));
writeFileSync(
  path.join(outNoSqlDir, "employees.json"),
  JSON.stringify(employees, null, 2),
  "utf-8"
);
console.log(`employees.json`.padEnd(30), `${employees.length} officers`);

// --- 9. Accused, bundled flat (P1.2) ----------------------------------------
// personFusion.ts's fuseAllPersons() (P3.1) builds its person register
// entirely from the evidence collections (§3 above) - real, but scoped to
// the 15 authored scenarios, which is deliberate (see bulk_cases.mjs's top
// comment). That leaves caseWorklist.ts with no source for a bulk case's
// accused at all, even though real Accused rows exist for the charge-sheeted
// /closed ones. This is that source: every Accused row, scenario and bulk
// together, flat.
//
// `linked` marks whether personId falls in P1.1's original 1-47 register
// (fully fused: aliases, cross-scenario merge, a real /persons/[personId]
// profile) or was minted by bulk_cases.mjs (48+): a real, stable, dataset-
// wide id and a real cross-case count, but no evidence-backed profile to
// link to. caseWorklist.ts uses this to decide whether an accused pill is
// clickable - never linking to a profile page that doesn't exist for them.
const allAccused = [...accusedRows];
const caseCountByPerson = new Map();
for (const a of allAccused) caseCountByPerson.set(a.PersonID, (caseCountByPerson.get(a.PersonID) ?? new Set()).add(a.CaseMasterID));
const accusedFlat = allAccused.map((a) => {
  const num = parseInt(String(a.PersonID).replace("KA-P", ""), 10);
  return {
    caseMasterId: a.CaseMasterID,
    personId: a.PersonID,
    name: a.AccusedName,
    caseCount: caseCountByPerson.get(a.PersonID).size,
    linked: Number.isFinite(num) && num <= 47,
  };
});
writeFileSync(
  path.join(outNoSqlDir, "accused.json"),
  JSON.stringify(accusedFlat), // minified - same reasoning as caseFacts.json above
  "utf-8"
);
console.log(`accused.json`.padEnd(30), `${accusedFlat.length} rows (${accusedFlat.filter((a) => !a.linked).length} bulk, un-linked)`);

console.log(`\nDone. CSVs in ${path.relative(process.cwd(), outCsvDir)}, NoSQL JSON in ${path.relative(process.cwd(), outNoSqlDir)}.`);
