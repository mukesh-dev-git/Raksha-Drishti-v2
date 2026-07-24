"use strict";

// -----------------------------------------------------------------------------
// One-time Data Store seeding — reads the bundled CSVs (seed/*.csv, copied from
// catalyst/seed/) and bulk-inserts every row via ZCQL INSERT statements. Exists
// because the Catalyst console here has no CSV-import UI and the ZCQL Console
// only runs one statement at a time — 406 CaseMaster rows can't reasonably be
// pasted in by hand. Wired up as a token-gated route in index.js; delete that
// route (and this file) once seeding is done.
// -----------------------------------------------------------------------------

const fs = require("fs");
const path = require("path");

// Minimal, quote-aware CSV parser (handles "quoted, fields" and "" escapes) —
// no external dependency needed for this one-time job.
function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  if (rows.length && rows[rows.length - 1].length === 1 && rows[rows.length - 1][0] === "") {
    rows.pop();
  }
  const header = rows[0];
  return rows.slice(1).map((r) => {
    const obj = {};
    header.forEach((h, idx) => {
      obj[h] = r[idx];
    });
    return obj;
  });
}

function loadCSV(fileName) {
  const text = fs.readFileSync(path.join(__dirname, "seed", fileName), "utf8");
  return parseCSV(text);
}

function sqlString(v) {
  return `'${String(v).replace(/'/g, "''")}'`;
}

// Which columns are numeric (bare in the INSERT) vs text/date (single-quoted)
// — matches catalyst/DATA_STORE_SCHEMA.md exactly.
const TABLES = [
  {
    name: "District",
    file: "District.csv",
    numberCols: ["DistrictID", "StateID", "Active"],
  },
  {
    name: "Unit",
    file: "Unit.csv",
    numberCols: ["UnitID", "TypeID", "DistrictID", "StateID", "Active"],
  },
  {
    name: "CrimeSubHead",
    file: "CrimeSubHead.csv",
    numberCols: ["CrimeSubHeadID", "CrimeHeadID", "SeqID"],
  },
  {
    name: "CaseMaster",
    file: "CaseMaster.csv",
    numberCols: [
      "CaseMasterID",
      "PolicePersonID",
      "PoliceStationID",
      "CaseCategoryID",
      "GravityOffenceID",
      "CrimeMajorHeadID",
      "CrimeMinorHeadID",
      "CaseStatusID",
      "CourtID",
      "latitude",
      "longitude",
    ],
  },
];

function buildInsert(tableName, row, numberCols) {
  const cols = Object.keys(row);
  const values = cols.map((c) => {
    const v = row[c];
    if (v === "" || v === undefined) return "NULL";
    return numberCols.includes(c) ? v : sqlString(v);
  });
  return `INSERT INTO ${tableName} (${cols.join(", ")}) VALUES (${values.join(", ")})`;
}

// `run(query)` is a caller-supplied function that executes one ZCQL statement
// (rejects on failure) — keeps this module decoupled from how the Catalyst SDK
// is initialized.
async function seedTable(run, table) {
  const rows = loadCSV(table.file);
  const result = { table: table.name, total: rows.length, inserted: 0, errors: [] };
  const BATCH = 20;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const outcomes = await Promise.allSettled(
      batch.map((row) => run(buildInsert(table.name, row, table.numberCols)))
    );
    outcomes.forEach((o, idx) => {
      if (o.status === "fulfilled") {
        result.inserted += 1;
      } else {
        const reason = o.reason;
        result.errors.push({
          row: i + idx,
          error: reason && reason.message ? reason.message : String(reason),
        });
      }
    });
  }
  return result;
}

module.exports = { TABLES, seedTable };
