import { NextRequest, NextResponse } from "next/server";
import { zcqlAll, pick, fail, nosqlByScenarioPrefix } from "@/lib/zcql";
import { getCaseType, getDistrict } from "@/lib/data";
import caseScenarioMap from "@/lib/nosql-seed/caseScenarioMap.json";

export const dynamic = "force-dynamic";

// GET /api/investigation?caseType=<slug>&district=<slug>
// -> real seeded evidence (calls/transactions/CCTV/witness statements/
// timeline/contradiction) for the first authored scenario whose CaseMaster
// row matches this crime type + district, or `{ scenario: null }` if none of
// the 15 seeded scenarios happen to fall in this particular combination -
// the frontend falls back to the mock generator in that case, same pattern
// as every other live-data call in the app (see catalyst/README.md §3).
//
// Resolution is two-step because the two data stores use different keys:
//   1. ZCQL (relational): CrimeMinorHeadID + District, via the same
//      CaseMaster/Unit join used by /api/district-stats, to get the real
//      CaseMasterIDs for this route.
//   2. Static lookup (catalyst/dataset-v2/build_seed.mjs bakes this from
//      cases.json at seed time): CaseMasterID -> scenarioId, since NoSQL
//      only supports key_condition queries (no arbitrary field scan) - see
//      nosqlByScenarioPrefix() in src/lib/zcql.ts.
export async function GET(req: NextRequest) {
  const caseTypeSlug = req.nextUrl.searchParams.get("caseType") || "";
  const districtSlug = req.nextUrl.searchParams.get("district") || "";
  const c = getCaseType(caseTypeSlug);
  const d = getDistrict(districtSlug);
  if (!c || !d) {
    return NextResponse.json({ error: "unknown caseType or district" }, { status: 400 });
  }

  try {
    const [units, cases] = await Promise.all([
      zcqlAll(req, "SELECT UnitID, DistrictID FROM Unit"),
      zcqlAll(req, `SELECT CaseMasterID FROM CaseMaster WHERE CrimeMinorHeadID = ${c.dbId}`),
    ]);

    const districtByUnit = new Map<number, number>(
      units.map((r) => {
        const u = pick(r, "Unit");
        return [Number(u.UnitID), Number(u.DistrictID)];
      })
    );

    const map: Record<string, string> = caseScenarioMap;
    let scenarioId: string | null = null;
    for (const row of cases) {
      const cm = pick(row, "CaseMaster");
      // PoliceStationID doubles as the Unit key in this seed data (see
      // build_seed.mjs / DATA_STORE_SCHEMA.md) - same join used in
      // /api/district-stats.
      if (districtByUnit.get(Number(cm.PoliceStationID)) !== d.dbId) continue;
      const sid = map[String(cm.CaseMasterID)];
      if (sid) {
        scenarioId = sid;
        break;
      }
    }

    if (!scenarioId) {
      return NextResponse.json({ scenario: null });
    }

    const [calls, transactions, cctv, witnessStatements, timeline, contradictions] = await Promise.all([
      nosqlByScenarioPrefix(req, "CallRecords", scenarioId),
      nosqlByScenarioPrefix(req, "Transactions", scenarioId),
      nosqlByScenarioPrefix(req, "CCTVSightings", scenarioId),
      nosqlByScenarioPrefix(req, "WitnessStatements", scenarioId),
      nosqlByScenarioPrefix(req, "TimelineEvents", scenarioId),
      nosqlByScenarioPrefix(req, "Contradictions", scenarioId),
    ]);

    return NextResponse.json({
      scenario: scenarioId,
      calls,
      transactions,
      cctv,
      witnessStatements,
      timeline,
      contradiction: contradictions[0] || null,
    });
  } catch (e) {
    return fail(e);
  }
}
