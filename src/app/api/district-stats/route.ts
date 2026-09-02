import { NextRequest, NextResponse } from "next/server";
import { zcqlAll, pick, fail } from "@/lib/zcql";

export const dynamic = "force-dynamic";

const TREND_YEARS = [2022, 2023, 2024, 2025, 2026];
const CLEARED_STATUS = new Set([2, 3]); // Charge Sheeted, Closed

// GET /api/district-stats?crime=<CrimeSubHeadID>
// -> [{ dbId, count, trend[5], clearanceRate }]
export async function GET(req: NextRequest) {
  const crime = parseInt(req.nextUrl.searchParams.get("crime") || "", 10);
  if (!crime) {
    return NextResponse.json({ error: "crime (CrimeSubHeadID) required" }, { status: 400 });
  }
  try {
    const [units, cases] = await Promise.all([
      zcqlAll(req, "SELECT ROWID, UnitID, DistrictID FROM Unit"),
      zcqlAll(
        req,
        `SELECT ROWID, CaseMasterID, CrimeRegisteredDate, CaseStatusID, PoliceStationID
         FROM CaseMaster WHERE CrimeMinorHeadID = ${crime}`
      ),
    ]);

    const districtByUnit = new Map<number, number>(
      units.map((r) => {
        const u = pick(r, "Unit");
        return [Number(u.UnitID), Number(u.DistrictID)];
      })
    );

    const agg = new Map<number, { count: number; cleared: number; byYear: Record<number, number> }>();
    for (const row of cases) {
      const cm = pick(row, "CaseMaster");
      const did = districtByUnit.get(Number(cm.PoliceStationID));
      if (!did) continue;
      const year = parseInt(String(cm.CrimeRegisteredDate).slice(0, 4), 10);
      const status = Number(cm.CaseStatusID);
      if (!agg.has(did)) agg.set(did, { count: 0, cleared: 0, byYear: {} });
      const a = agg.get(did)!;
      a.count += 1;
      if (CLEARED_STATUS.has(status)) a.cleared += 1;
      a.byYear[year] = (a.byYear[year] || 0) + 1;
    }

    return NextResponse.json(
      [...agg.entries()].map(([dbId, a]) => ({
        dbId,
        count: a.count,
        trend: TREND_YEARS.map((y) => a.byYear[y] || 0),
        clearanceRate: a.count ? Math.round((a.cleared / a.count) * 100) : 0,
      }))
    );
  } catch (e) {
    return fail(e);
  }
}
