import { NextRequest, NextResponse } from "next/server";
import { zcqlAll, pick, fail } from "@/lib/zcql";

export const dynamic = "force-dynamic";

// GET /api/districts -> [{ dbId, name }]
export async function GET(req: NextRequest) {
  try {
    const rows = await zcqlAll(req, "SELECT ROWID, DistrictID, DistrictName FROM District");
    return NextResponse.json(
      rows.map((r) => {
        const d = pick(r, "District");
        return { dbId: Number(d.DistrictID), name: d.DistrictName };
      })
    );
  } catch (e) {
    return fail(e);
  }
}
