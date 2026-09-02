// -----------------------------------------------------------------------------
// prep_asa_import.mjs — P1.6 import helper for ActSectionAssociation.
//
// WHY THIS EXISTS. `ActSectionAssociation.ActID` and `.SectionID` are real
// Catalyst **Lookup** columns, and a Lookup column stores the referenced row's
// ROWID — an integer minted by Catalyst when that row was created. The
// generator emits the semantic keys instead (`ActID: "IPC"`,
// `SectionID: "379"`), because those are the values that actually mean
// something and are stable across environments. Importing them directly fails
// every row with:
//
//     Invalid input value for ActID. int value expected
//
// which is exactly why this table sat at 0 rows in the live Data Store while
// every other table imported fine — found 2026-09-02 during P1.6, not a
// regression from P1.7. (Catalyst's own `fk_mapping` import option is meant
// for precisely this and would be the tidier fix, but it did not resolve the
// lookups on a real 200-row trial against this project, so this does the join
// explicitly rather than relying on behaviour that didn't work.)
//
// WHY IT'S A SEPARATE STEP, NOT PART OF build_seed.mjs. ROWIDs are
// environment-specific: the Development and Production Data Stores mint
// different ones, and a table rebuilt in the console mints new ones again.
// Baking them into `out/csv/` would make the generated dataset silently
// wrong anywhere but this one environment. So `out/csv/ActSectionAssociation.csv`
// stays portable (ActCode/SectionCode), and the ROWID join happens here, at
// import time, against a live export of that same environment.
//
// USAGE:
//   1. catalyst ds:export --table Act      (unzip -> Table-Act.csv)
//   2. catalyst ds:export --table Section  (unzip -> Table-Section.csv)
//   3. node catalyst/dataset-v2/prep_asa_import.mjs <dir-with-those-csvs> <out.csv>
//   4. catalyst ds:import --table ActSectionAssociation <out.csv>
//
// Re-run steps 1-3 whenever the target environment changes. The script fails
// loudly on any unresolved code rather than emitting a partially-mapped file.
// -----------------------------------------------------------------------------
import { readFileSync, writeFileSync } from "fs";
import path from "path";

function parseCsv(text) {
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); field = ""; rows.push(row); row = []; }
    else if (c !== "\r") field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

function readTable(file) {
  const rows = parseCsv(readFileSync(file, "utf-8"));
  const header = rows[0];
  return rows.slice(1)
    .filter((r) => r.length > 1)
    .map((r) => Object.fromEntries(header.map((h, i) => [h, (r[i] ?? "").trim()])));
}

const [, , liveDir, outFile] = process.argv;
if (!liveDir || !outFile) {
  console.error("usage: node prep_asa_import.mjs <dir-with-Table-Act.csv-and-Table-Section.csv> <out.csv>");
  process.exit(1);
}

const dir = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const srcCsv = path.join(dir, "out", "csv", "ActSectionAssociation.csv");

const acts = readTable(path.join(liveDir, "Table-Act.csv"));
const sections = readTable(path.join(liveDir, "Table-Section.csv"));

// ActCode -> ROWID. SectionCode -> ROWID (section codes are unique across the
// seeded Section table; asserted below rather than assumed).
const actRowId = new Map(acts.map((a) => [a.ActCode, a.ROWID]));
const sectionRowId = new Map();
for (const s of sections) {
  if (sectionRowId.has(s.SectionCode)) {
    throw new Error(`SectionCode "${s.SectionCode}" is not unique in the live Section table - the join below would be ambiguous.`);
  }
  sectionRowId.set(s.SectionCode, s.ROWID);
}
console.log(`live lookups: ${actRowId.size} acts, ${sectionRowId.size} sections`);

const rows = readTable(srcCsv);
const out = ["CaseMasterID,ActID,SectionID,ActOrderID,SectionOrderID"];
const unresolved = new Map();
for (const r of rows) {
  const aid = actRowId.get(r.ActID);
  const sid = sectionRowId.get(r.SectionID);
  if (!aid) unresolved.set(`Act:${r.ActID}`, (unresolved.get(`Act:${r.ActID}`) ?? 0) + 1);
  if (!sid) unresolved.set(`Section:${r.SectionID}`, (unresolved.get(`Section:${r.SectionID}`) ?? 0) + 1);
  if (aid && sid) out.push(`${r.CaseMasterID},${aid},${sid},${r.ActOrderID},${r.SectionOrderID}`);
}

if (unresolved.size) {
  console.error("Unresolved lookup codes - these exist in the generated CSV but not in the live Act/Section tables:");
  for (const [k, n] of unresolved) console.error(`  ${k}  (${n} rows)`);
  throw new Error("refusing to emit a partially-mapped import file - import the Act/Section lookup tables first");
}

writeFileSync(outFile, out.join("\n") + "\n", "utf-8");
console.log(`wrote ${outFile}: ${out.length - 1} rows, all lookups resolved to live ROWIDs`);
