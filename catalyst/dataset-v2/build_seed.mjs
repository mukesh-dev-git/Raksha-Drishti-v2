// -----------------------------------------------------------------------------
// build_seed.mjs — reads lookups.json + cases.json (hand-authored dataset v2)
// and emits:
//   - catalyst/dataset-v2/out/csv/<Table>.csv   one per Data Store table,
//     ready for `catalyst ds:import --table <Name> <csv>`
//   - catalyst/dataset-v2/out/nosql/<Collection>.json   one per new NoSQL
//     collection (calls/transactions/CCTV/statements/timeline/contradictions),
//     not tables in the FIR schema - see DATA_STORE_SCHEMA.md
//
// Run: node catalyst/dataset-v2/build_seed.mjs
// -----------------------------------------------------------------------------
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

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

reformatDateTimeCols(caseMasterRows, ["IncidentFromDate", "IncidentToDate", "InfoReceivedPSDate"]);
writeCsv("CaseMaster", caseMasterCols, caseMasterRows);
writeCsv("ComplainantDetails", complainantCols, complainantRows);
writeCsv("Victim", victimCols, victimRows);
writeCsv("Accused", accusedCols, accusedRows);
writeCsv("ActSectionAssociation", actSectionCols, actSectionRows);

// --- 3. New NoSQL collections --------------------------------------------------
// Each record gets scenarioId + caseMasterIds so it's traceable back to the
// FIR(s) it belongs to (citation-grounding, features.md #5), and resolvedPersons
// maps each scenario-local personRef (P1, P2, ...) to its real AccusedMasterID/
// VictimMasterID/ComplainantID so a later entity-fusion pass has real IDs to
// merge, not just narrative labels.
console.log("\nNoSQL collections:");

function resolvePersonRefs(c) {
  const map = {};
  for (const x of c.accused || []) if (!map[x.PersonID]) map[x.PersonID] = { type: "Accused", id: x.AccusedMasterID, name: x.AccusedName };
  for (const x of c.victims || []) map["V:" + x.VictimName.split(" ")[0]] = { type: "Victim", id: x.VictimMasterID, name: x.VictimName };
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

console.log(`\nDone. CSVs in ${path.relative(process.cwd(), outCsvDir)}, NoSQL JSON in ${path.relative(process.cwd(), outNoSqlDir)}.`);
