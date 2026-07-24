"use strict";

// -----------------------------------------------------------------------------
// rd_api — Catalyst Advanced I/O (Node) Function.
// REST endpoints that query the FIR Data Store (ZCQL) and return the exact
// shapes the Raksha-Drishti frontend expects. Read-only, GET only.
//
//   GET /summary                    -> { totalCases, crimeCategories, districtsCovered }
//   GET /casetypes                  -> [{ slug, name, total, dbId }]
//   GET /districts                  -> [{ dbId, name }]
//   GET /district-stats?crime=<id>  -> [{ dbId, count, trend[5], clearanceRate }]
//
// Trend years are fixed 2022–2026. Clearance = share of cases with status
// Charge Sheeted(2) or Closed(3).
// -----------------------------------------------------------------------------

const express = require("express");
const catalyst = require("zcatalyst-sdk-node");

const app = express();

const TREND_YEARS = [2022, 2023, 2024, 2025, 2026];
const CLEARED_STATUS = new Set([2, 3]); // Charge Sheeted, Closed

// Permissive read-only CORS so the statically-hosted client can call this.
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Accept");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// ZCQL rows come back as [{ TableName: {col: val}, ... }]. Flatten a table out.
async function zcql(req, query) {
  const capp = catalyst.initialize(req);
  const rows = await capp.zcql().executeZCQLQuery(query);
  return rows;
}
const pick = (row, table) => row[table] || {};

// ZCQL caps any SELECT without its own LIMIT at 300 rows (confirmed: /summary
// read 300 out of CaseMaster's real 406 until this was added) — paginate past
// it, accumulating every row.
const ZCQL_PAGE_SIZE = 300;
async function zcqlAll(req, baseQuery) {
  let offset = 0;
  let all = [];
  for (;;) {
    const page = await zcql(req, `${baseQuery} LIMIT ${offset},${ZCQL_PAGE_SIZE}`);
    all = all.concat(page);
    if (page.length < ZCQL_PAGE_SIZE) break;
    offset += ZCQL_PAGE_SIZE;
  }
  return all;
}

// String(e) on a plain (non-Error) object just gives "[object Object]" — the
// zcatalyst SDK throws plain error objects, not Error instances, so pull every
// own property into something JSON can actually show, and log the raw object
// server-side too (visible in the Catalyst console's Function Logs).
function serializeError(e) {
  if (e instanceof Error) {
    return { message: e.message, name: e.name };
  }
  try {
    const plain = {};
    for (const key of Object.getOwnPropertyNames(Object(e))) {
      plain[key] = e[key];
    }
    return Object.keys(plain).length ? plain : { raw: String(e) };
  } catch {
    return { raw: String(e) };
  }
}
function fail(res, e) {
  console.error("rd_api error:", e);
  res.status(500).json({ error: serializeError(e) });
}

app.get("/summary", async (req, res) => {
  try {
    // Plain SELECT + JS .length instead of ZCQL COUNT(...) AS alias — the
    // alias form was silently returning 0 regardless of actual row count on
    // this Data Store; this is the same proven shape /district-stats already
    // uses successfully. zcqlAll paginates past ZCQL's 300-row cap.
    const [cases, cats, dists] = await Promise.all([
      zcqlAll(req, "SELECT CaseMasterID FROM CaseMaster"),
      zcqlAll(req, "SELECT CrimeSubHeadID FROM CrimeSubHead"),
      zcqlAll(req, "SELECT DistrictID FROM District"),
    ]);
    res.json({
      totalCases: cases.length,
      crimeCategories: cats.length,
      districtsCovered: dists.length,
    });
  } catch (e) {
    fail(res, e);
  }
});

app.get("/casetypes", async (req, res) => {
  try {
    const subs = await zcqlAll(
      req,
      "SELECT CrimeSubHeadID, CrimeHeadName FROM CrimeSubHead"
    );
    // Same fix as /summary: plain SELECT + count-in-JS instead of
    // COUNT(...) AS alias / GROUP BY, which wasn't returning real counts.
    const cases = await zcqlAll(req, "SELECT CrimeMinorHeadID FROM CaseMaster");
    const countBy = new Map();
    for (const row of cases) {
      const id = Number(pick(row, "CaseMaster").CrimeMinorHeadID);
      countBy.set(id, (countBy.get(id) || 0) + 1);
    }
    const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    res.json(
      subs.map((r) => {
        const s = pick(r, "CrimeSubHead");
        return {
          dbId: Number(s.CrimeSubHeadID),
          name: s.CrimeHeadName,
          slug: slug(s.CrimeHeadName),
          total: countBy.get(Number(s.CrimeSubHeadID)) || 0,
        };
      })
    );
  } catch (e) {
    fail(res, e);
  }
});

app.get("/districts", async (req, res) => {
  try {
    const rows = await zcqlAll(
      req,
      "SELECT DistrictID, DistrictName FROM District"
    );
    res.json(
      rows.map((r) => {
        const d = pick(r, "District");
        return { dbId: Number(d.DistrictID), name: d.DistrictName };
      })
    );
  } catch (e) {
    fail(res, e);
  }
});

app.get("/district-stats", async (req, res) => {
  const crime = parseInt(req.query.crime, 10);
  if (!crime) return res.status(400).json({ error: "crime (CrimeSubHeadID) required" });
  try {
    // Two plain single-table queries + an in-memory join, instead of a ZCQL
    // JOIN — keeps this to the most basic, reliably-supported ZCQL shape
    // (SELECT ... WHERE) rather than depending on Catalyst's Lookup/JOIN
    // semantics, which weren't testable against a live Data Store beforehand.
    const [units, cases] = await Promise.all([
      zcqlAll(req, "SELECT UnitID, DistrictID FROM Unit"),
      zcqlAll(
        req,
        `SELECT CaseMasterID, CrimeRegisteredDate, CaseStatusID, PoliceStationID
         FROM CaseMaster WHERE CrimeMinorHeadID = ${crime}`
      ),
    ]);

    const districtByUnit = new Map(
      units.map((r) => {
        const u = pick(r, "Unit");
        return [Number(u.UnitID), Number(u.DistrictID)];
      })
    );

    // Aggregate in JS: per district → count, per-year trend, clearance rate.
    const agg = new Map(); // districtId -> { count, cleared, byYear }
    for (const row of cases) {
      const cm = pick(row, "CaseMaster");
      const did = districtByUnit.get(Number(cm.PoliceStationID));
      if (!did) continue;
      const year = parseInt(String(cm.CrimeRegisteredDate).slice(0, 4), 10);
      const status = Number(cm.CaseStatusID);
      if (!agg.has(did)) agg.set(did, { count: 0, cleared: 0, byYear: {} });
      const a = agg.get(did);
      a.count += 1;
      if (CLEARED_STATUS.has(status)) a.cleared += 1;
      a.byYear[year] = (a.byYear[year] || 0) + 1;
    }

    res.json(
      [...agg.entries()].map(([dbId, a]) => ({
        dbId,
        count: a.count,
        trend: TREND_YEARS.map((y) => a.byYear[y] || 0),
        clearanceRate: a.count ? Math.round((a.cleared / a.count) * 100) : 0,
      }))
    );
  } catch (e) {
    fail(res, e);
  }
});

app.get("/", (_req, res) => res.json({ service: "rd_api", ok: true }));

module.exports = app;
