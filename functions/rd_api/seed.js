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
// vs boolean (bare true/false keyword — Catalyst's Boolean type rejects a
// plain 0/1) — matches catalyst/DATA_STORE_SCHEMA.md exactly.
const TABLES = [
  {
    name: "District",
    file: "District.csv",
    numberCols: ["DistrictID", "StateID"],
    boolCols: ["Active"],
  },
  {
    name: "Unit",
    file: "Unit.csv",
    numberCols: ["UnitID", "TypeID", "DistrictID", "StateID"],
    boolCols: ["Active"],
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

function buildInsert(tableName, row, numberCols, boolCols = []) {
  const cols = Object.keys(row);
  const values = cols.map((c) => {
    const v = row[c];
    if (v === "" || v === undefined) return "NULL";
    if (boolCols.includes(c)) return String(v) === "1" || /^true$/i.test(v) ? "true" : "false";
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
  const BATCH = 5; // Catalyst enforces a concurrency limit — 20 was too many
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // Idempotency guard: this endpoint has no upsert/dedup, so re-running it
  // against an already-seeded table would duplicate every row. Skip any table
  // that already has data instead.
  const pkCol = table.numberCols[0];
  try {
    const countRows = await run(`SELECT COUNT(${pkCol}) AS c FROM ${table.name}`);
    const existing = Number(countRows?.[0]?.[table.name]?.c || 0);
    if (existing > 0) {
      result.skipped = true;
      result.existingRows = existing;
      return result;
    }
  } catch {
    // If the count check itself fails, fall through and attempt the insert —
    // worst case we get the same clear per-row errors as before.
  }

  // Concurrency-limit errors are transient — worth a couple of retries with
  // backoff before giving up and recording it as a real failure.
  async function runWithRetry(query, attempt = 1) {
    try {
      return await run(query);
    } catch (e) {
      const msg = (e && e.message ? e.message : String(e)).toLowerCase();
      if (attempt < 3 && msg.includes("concurrency limit")) {
        await sleep(300 * attempt);
        return runWithRetry(query, attempt + 1);
      }
      throw e;
    }
  }

  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const outcomes = await Promise.allSettled(
      batch.map((row) => runWithRetry(buildInsert(table.name, row, table.numberCols, table.boolCols)))
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
    await sleep(120); // small gap between batches, extra headroom against the limit
  }
  return result;
}

module.exports = { TABLES, seedTable };
