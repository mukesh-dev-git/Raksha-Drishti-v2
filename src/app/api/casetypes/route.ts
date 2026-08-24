import { NextRequest, NextResponse } from "next/server";
import { zcqlAll, pick, fail } from "@/lib/zcql";

export const dynamic = "force-dynamic";

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// GET /api/casetypes -> [{ slug, name, total, dbId }]
export async function GET(req: NextRequest) {
  try {
    const subs = await zcqlAll(req, "SELECT CrimeSubHeadID, CrimeHeadName FROM CrimeSubHead");
    const cases = await zcqlAll(req, "SELECT CrimeMinorHeadID FROM CaseMaster");
    const countBy = new Map<number, number>();
    for (const row of cases) {
      const id = Number(pick(row, "CaseMaster").CrimeMinorHeadID);
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
