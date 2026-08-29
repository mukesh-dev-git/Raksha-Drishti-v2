import { NextRequest, NextResponse } from "next/server";
import { zcqlAll, pick, fail } from "@/lib/zcql";

export const dynamic = "force-dynamic";

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// GET /api/casetypes[?district=<DistrictID>[,<DistrictID>...]] -> [{ slug, name, total, dbId }]
// `district` scopes each category's count to one or more real districts,
// comma-separated (via the CaseMaster/Unit PoliceStationID join, same
// pattern as /api/summary) - used by the Dashboard's drill-down filter,
// including X1's Range option.
export async function GET(req: NextRequest) {
  const districtParam = req.nextUrl.searchParams.get("district");
  const districtIds = districtParam
    ? districtParam.split(",").map((s) => parseInt(s, 10)).filter((n) => Number.isFinite(n))
    : [];

  try {
    const [subs, cases, units] = await Promise.all([
      zcqlAll(req, "SELECT CrimeSubHeadID, CrimeHeadName FROM CrimeSubHead"),
      zcqlAll(req, "SELECT CrimeMinorHeadID, PoliceStationID FROM CaseMaster"),
      districtIds.length > 0 ? zcqlAll(req, "SELECT UnitID, DistrictID FROM Unit") : Promise.resolve([]),
    ]);

    const districtByUnit = new Map<number, number>(
      units.map((r) => {
        const u = pick(r, "Unit");
        return [Number(u.UnitID), Number(u.DistrictID)];
      })
    );

    const countBy = new Map<number, number>();
    for (const row of cases) {
      const cm = pick(row, "CaseMaster");
      if (districtIds.length > 0 && !districtIds.includes(districtByUnit.get(Number(cm.PoliceStationID)) ?? -1)) continue;
      const id = Number(cm.CrimeMinorHeadID);
      countBy.set(id, (countBy.get(id) || 0) + 1);
    }
    return NextResponse.json(
      subs.map((r) => {
        const s = pick(r, "CrimeSubHead");
        return {
          dbId: Number(s.CrimeSubHeadID),
          name: s.CrimeHeadName,
          slug: slugify(s.CrimeHeadName),
          total: countBy.get(Number(s.CrimeSubHeadID)) || 0,
        };
      })
    );
  } catch (e) {
    return fail(e);
  }
}
