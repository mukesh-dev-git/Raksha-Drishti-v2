import { NextRequest, NextResponse } from "next/server";
import { zcqlAll, pick, fail } from "@/lib/zcql";

export const dynamic = "force-dynamic";

const TREND_YEARS = [2022, 2023, 2024, 2025, 2026];
// Same "cleared" status set as /api/district-stats (Charge Sheeted, Closed).
const CLEARED_STATUS = new Set([2, 3]);

// GET /api/summary
// -> { totalCases, crimeCategories, districtsCovered, solvedCases,
//      activeInvestigations, detectionRate, years, yearlyTrend, yearlySolved }
//
// yearlyTrend/yearlySolved are real, but yearly (not monthly) - the seed
// dataset is only 19 FIRs, nowhere near enough volume for a meaningful
// month-by-month curve, so the dashboard's trend chart works at the
// granularity the data actually supports instead of interpolating a false
// monthly shape.
export async function GET(req: NextRequest) {
  try {
    const [cases, cats, dists] = await Promise.all([
      zcqlAll(req, "SELECT CaseMasterID, CrimeRegisteredDate, CaseStatusID FROM CaseMaster"),
      zcqlAll(req, "SELECT CrimeSubHeadID FROM CrimeSubHead"),
      zcqlAll(req, "SELECT DistrictID FROM District"),
    ]);

    let solvedCases = 0;
    const byYear: Record<number, number> = {};
    const solvedByYear: Record<number, number> = {};
    for (const row of cases) {
      const cm = pick(row, "CaseMaster");
      const year = parseInt(String(cm.CrimeRegisteredDate).slice(0, 4), 10);
      const cleared = CLEARED_STATUS.has(Number(cm.CaseStatusID));
      byYear[year] = (byYear[year] || 0) + 1;
      if (cleared) {
        solvedCases += 1;
        solvedByYear[year] = (solvedByYear[year] || 0) + 1;
      }
    }

    const totalCases = cases.length;
    return NextResponse.json({
      totalCases,
      crimeCategories: cats.length,
      districtsCovered: dists.length,
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
