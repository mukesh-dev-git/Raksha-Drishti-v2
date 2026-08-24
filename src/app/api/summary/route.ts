import { NextRequest, NextResponse } from "next/server";
import { zcqlAll, fail } from "@/lib/zcql";

export const dynamic = "force-dynamic";

// GET /api/summary -> { totalCases, crimeCategories, districtsCovered }
export async function GET(req: NextRequest) {
  try {
    const [cases, cats, dists] = await Promise.all([
      zcqlAll(req, "SELECT CaseMasterID FROM CaseMaster"),
      zcqlAll(req, "SELECT CrimeSubHeadID FROM CrimeSubHead"),
      zcqlAll(req, "SELECT DistrictID FROM District"),
    ]);
    return NextResponse.json({
      totalCases: cases.length,
      crimeCategories: cats.length,
      districtsCovered: dists.length,
    });
  } catch (e) {
    return fail(e);
  }
}
