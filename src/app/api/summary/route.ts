import { NextRequest, NextResponse } from "next/server";
import { zcqlAll, pick, fail } from "@/lib/zcql";

export const dynamic = "force-dynamic";

const TREND_YEARS = [2022, 2023, 2024, 2025, 2026];
// Same "cleared" status set as /api/district-stats (Charge Sheeted, Closed).
const CLEARED_STATUS = new Set([2, 3]);

// GET /api/summary[?district=<DistrictID>]
// -> { totalCases, crimeCategories, districtsCovered, solvedCases,
//      activeInvestigations, detectionRate, years, yearlyTrend, yearlySolved }
//
// yearlyTrend/yearlySolved are real, but yearly (not monthly) - the seed
// dataset is only 19 FIRs, nowhere near enough volume for a meaningful
// month-by-month curve, so the dashboard's trend chart works at the
// granularity the data actually supports instead of interpolating a false
// monthly shape.
//
// `district` scopes every count to one real district (via the same
// CaseMaster/Unit PoliceStationID join used by /api/district-stats) - the
// Dashboard's "Viewing as: District Officer" mode uses this so the numbers
// shown are genuinely that district's, not the whole state's with a label
// change. crimeCategories stays statewide (categories are a fixed lookup
// table, not something a district "has fewer of"); districtsCovered
// becomes 1 when scoped, since that's literally true.
export async function GET(req: NextRequest) {
  const districtParam = req.nextUrl.searchParams.get("district");
  const districtId = districtParam ? parseInt(districtParam, 10) : null;

  try {
    const [cases, cats, dists, units] = await Promise.all([
      zcqlAll(req, "SELECT CaseMasterID, CrimeRegisteredDate, CaseStatusID, PoliceStationID FROM CaseMaster"),
      zcqlAll(req, "SELECT CrimeSubHeadID FROM CrimeSubHead"),
      zcqlAll(req, "SELECT DistrictID FROM District"),
      districtId ? zcqlAll(req, "SELECT UnitID, DistrictID FROM Unit") : Promise.resolve([]),
    ]);

    const districtByUnit = new Map<number, number>(
      units.map((r) => {
        const u = pick(r, "Unit");
        return [Number(u.UnitID), Number(u.DistrictID)];
      })
    );

    let solvedCases = 0;
    let totalCases = 0;
    const byYear: Record<number, number> = {};
    const solvedByYear: Record<number, number> = {};
    for (const row of cases) {
      const cm = pick(row, "CaseMaster");
      if (districtId && districtByUnit.get(Number(cm.PoliceStationID)) !== districtId) continue;
      totalCases += 1;
      const year = parseInt(String(cm.CrimeRegisteredDate).slice(0, 4), 10);
      const cleared = CLEARED_STATUS.has(Number(cm.CaseStatusID));
      byYear[year] = (byYear[year] || 0) + 1;
      if (cleared) {
        solvedCases += 1;
        solvedByYear[year] = (solvedByYear[year] || 0) + 1;
      }
    }

    return NextResponse.json({
      totalCases,
      crimeCategories: cats.length,
      districtsCovered: districtId ? 1 : dists.length,
      solvedCases,
      activeInvestigations: totalCases - solvedCases,
      detectionRate: totalCases ? Math.round((solvedCases / totalCases) * 1000) / 10 : 0,
      years: TREND_YEARS,
      yearlyTrend: TREND_YEARS.map((y) => byYear[y] || 0),
      yearlySolved: TREND_YEARS.map((y) => solvedByYear[y] || 0),
    });
  } catch (e) {
    return fail(e);
  }
}
