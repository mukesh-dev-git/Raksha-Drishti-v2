import { NextRequest, NextResponse } from "next/server";
import { zcql, zcqlAggregate, zcqlCount, pick, fail } from "@/lib/zcql";

export const dynamic = "force-dynamic";

const TREND_YEARS = [2022, 2023, 2024, 2025, 2026];
// Same "cleared" status set as /api/district-stats (Charge Sheeted, Closed).
const CLEARED_STATUS = new Set([2, 3]);

// GET /api/summary[?district=<DistrictID>]
// -> { totalCases, crimeCategories, districtsCovered, solvedCases,
//      activeInvestigations, detectionRate, years, yearlyTrend, yearlySolved }
//
// REWRITTEN 2026-09-02 to use real ZCQL aggregates. This route used to pull
// every CaseMaster row through zcqlAll() and count them in JS - at 12,000
// cases that is 40 sequential paginated round trips to produce nine numbers.
// It now issues ~8 COUNT/GROUP BY queries instead, none of which return more
// than a handful of rows.
//
// That was only possible because a long-standing belief in this codebase was
// wrong: zcql.ts asserted that "COUNT(...) AS alias silently returns 0 on
// this Data Store". It doesn't. ZCQL drops the `AS` alias, so the old code
// read `row.total`, got undefined, and recorded 0 - which hardened into "no
// aggregates" and pushed every analytics page onto the bundled snapshot.
// Verified live against this project's own Data Store before this rewrite:
//   SELECT COUNT(ROWID) FROM CaseMaster                    -> 12000 (exact)
//   SELECT CaseStatusID, COUNT(ROWID) ... GROUP BY ...     -> full breakdown
//   ... WHERE CrimeRegisteredDate >= 'x' AND <= 'y'        -> works
//   ... WHERE PoliceStationID IN (...)                     -> works
//
// A SIDE EFFECT WORTH KNOWING: this also fixed a real bug, here and
// everywhere else. zcqlAll() used to return exactly one duplicate row
// whenever a table's row count was an exact multiple of the 300-row page
// size (confirmed live: `LIMIT 12000,300` on a 12,000-row CaseMaster
// returned the table's last row again instead of an empty page - a genuine
// ZCQL boundary bug, not application code). This route no longer calls
// zcqlAll() at all, but the root cause is now fixed IN zcqlAll() itself
// (2026-09-02, src/lib/zcql.ts) - it dedupes by ROWID as it paginates,
// which is correct regardless of whether this exact boundary case or some
// other unordered-pagination hazard is the cause. Every other caller
// (casetypes, district-stats, districts, investigation) had this same bug
// and is fixed by the same change - P10.2 / issue #5's zcqlAll() item is
// closed, not just worked around for this one route.
//
// TWO ZCQL LIMITS SHAPE THE QUERIES BELOW, both confirmed live, neither
// worked around silently:
//   1. There is no YEAR() function ("The function you have used is not
//      supported"), so the trend is one date-ranged query per year rather
//      than a single GROUP BY YEAR(...). Five small queries, run in parallel.
//   2. JOINs need a declared Lookup relationship, and CaseMaster's
//      PoliceStationID is a plain Number column - "No relationship between
//      tables Unit and CaseMaster". So a district filter resolves its unit
//      IDs first and then uses `PoliceStationID IN (...)`, which is two
//      cheap queries instead of one join. Converting the FK columns to real
//      Lookups (still open, see catalyst/README.md) would allow the join.
export async function GET(req: NextRequest) {
  const districtParam = req.nextUrl.searchParams.get("district");
  const districtIds = districtParam
    ? districtParam.split(",").map((s) => parseInt(s, 10)).filter((n) => Number.isFinite(n))
    : [];

  try {
    // --- district scope -----------------------------------------------------
    // No join available (see limit 2 above): resolve this district's stations
    // first, then scope every count by PoliceStationID. Unit is 59 rows, so
    // this is a single cheap read, not a walk.
    let scope = "";
    if (districtIds.length > 0) {
      const unitRows = await zcql(
        req,
        `SELECT UnitID FROM Unit WHERE DistrictID IN (${districtIds.join(",")})`
      );
      const unitIds = unitRows
        .map((r: unknown) => Number(pick(r, "Unit").UnitID))
        .filter((n: number) => Number.isFinite(n));

      // A real district with no stations seeded would otherwise produce
      // `IN ()`, which is a syntax error - return an honest set of zeroes
      // rather than a 500 or, worse, statewide numbers under a district label.
      if (unitIds.length === 0) {
        return NextResponse.json({
          totalCases: 0,
          crimeCategories: await zcqlCount(req, "SELECT COUNT(ROWID) FROM CrimeSubHead", "CrimeSubHead"),
          districtsCovered: districtIds.length,
          solvedCases: 0,
          activeInvestigations: 0,
          detectionRate: 0,
          years: TREND_YEARS,
          yearlyTrend: TREND_YEARS.map(() => 0),
          yearlySolved: TREND_YEARS.map(() => 0),
        });
      }
      scope = ` WHERE PoliceStationID IN (${unitIds.join(",")})`;
    }

    // `scope` already carries its own WHERE, so a year filter has to chain
    // with AND rather than opening a second WHERE.
    const withYear = (year: number) => {
      const range = `CrimeRegisteredDate >= '${year}-01-01' AND CrimeRegisteredDate <= '${year}-12-31'`;
      return scope ? `${scope} AND ${range}` : ` WHERE ${range}`;
    };

    const [statusRows, cats, dists, yearRows] = await Promise.all([
      // Totals and the cleared split, in one grouped query.
      zcqlAggregate(
        req,
        `SELECT CaseStatusID, COUNT(ROWID) FROM CaseMaster${scope} GROUP BY CaseStatusID`,
        "CaseMaster",
        "CaseStatusID"
      ),
      zcqlCount(req, "SELECT COUNT(ROWID) FROM CrimeSubHead", "CrimeSubHead"),
      zcqlCount(req, "SELECT COUNT(ROWID) FROM District", "District"),
      // One grouped query per year - each returns at most 4 rows.
      Promise.all(
        TREND_YEARS.map((y) =>
          zcqlAggregate(
            req,
            `SELECT CaseStatusID, COUNT(ROWID) FROM CaseMaster${withYear(y)} GROUP BY CaseStatusID`,
            "CaseMaster",
            "CaseStatusID"
          )
        )
      ),
    ]);

    // CaseStatusID comes back as a STRING ("2"), not a number - coerce before
    // testing membership, or every case reads as unsolved.
    const sumCleared = (rows: { key: string | null; count: number }[]) =>
      rows.reduce((n, r) => (CLEARED_STATUS.has(Number(r.key)) ? n + r.count : n), 0);
    const sumAll = (rows: { key: string | null; count: number }[]) =>
      rows.reduce((n, r) => n + r.count, 0);

    const totalCases = sumAll(statusRows);
    const solvedCases = sumCleared(statusRows);

    return NextResponse.json({
      totalCases,
      crimeCategories: cats,
      districtsCovered: districtIds.length > 0 ? districtIds.length : dists,
      solvedCases,
      activeInvestigations: totalCases - solvedCases,
      detectionRate: totalCases ? Math.round((solvedCases / totalCases) * 1000) / 10 : 0,
      years: TREND_YEARS,
      yearlyTrend: yearRows.map(sumAll),
      yearlySolved: yearRows.map(sumCleared),
    });
  } catch (e) {
    return fail(e);
  }
}
