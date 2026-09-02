import { NextRequest, NextResponse } from "next/server";
import { zcqlAll, pick, fail } from "@/lib/zcql";

export const dynamic = "force-dynamic";

// GET /api/units -> [{ unitId, unitName, districtId }]
//
// P10 Phase 3 (2026-09-02) - real police stations for the create-FIR form's
// station picker. Unit is a small (59-row, P1.7) table with no bundled copy
// in src/ - the generator's karnataka_districts.mjs isn't shipped to the
// client, and this is genuinely write-time reference data (needed once per
// form load, not on every list-page render), so a live read is the right
// call here rather than adding a fourth place stations have to be kept in
// sync (lookups.json, karnataka_districts.mjs, and now this).
export async function GET(req: NextRequest) {
  try {
    const rows = await zcqlAll(req, "SELECT ROWID, UnitID, UnitName, DistrictID FROM Unit");
    const units = rows
      .map((r) => pick(r, "Unit"))
      .map((u) => ({
        unitId: Number(u.UnitID),
        unitName: String(u.UnitName ?? ""),
        districtId: Number(u.DistrictID),
      }))
      .sort((a, b) => a.unitName.localeCompare(b.unitName));
    return NextResponse.json(units);
  } catch (e) {
    return fail(e);
  }
}
