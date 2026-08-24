import { NextRequest, NextResponse } from "next/server";
import { zcqlAll, pick, fail, serializeError, nosqlByScenarioPrefix } from "@/lib/zcql";
import { getCaseType, getDistrict } from "@/lib/data";
import caseScenarioMap from "@/lib/nosql-seed/caseScenarioMap.json";

export const dynamic = "force-dynamic";
// Extend the function timeout if the platform honors this Next.js route
// segment config (Slate/OpenNext support unconfirmed - harmless if ignored).
// This route makes up to 8 sequential/parallel Catalyst API round-trips
// (2 ZCQL + 6 NoSQL), which may exceed a short default on cold start.
export const maxDuration = 60;

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
      zcqlAll(req, `SELECT CaseMasterID, PoliceStationID FROM CaseMaster WHERE CrimeMinorHeadID = ${c.dbId}`),
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

    // ?debug=1 short-circuits before any NoSQL calls - isolates whether a
    // failure is in the ZCQL join/scenario-mapping step or the NoSQL step.
    if (req.nextUrl.searchParams.get("debug") === "1") {
      return NextResponse.json({ scenario: scenarioId, debug: "resolved scenario, skipped NoSQL" });
    }

    // Promise.allSettled (not .all) + per-table try/catch inside
    // nosqlByScenarioPrefix's caller here: one bad/slow table shouldn't take
    // the whole response down, and a rejection reason is visible in the
    // response instead of only in platform logs we can't easily reach.
    const tables: [string, string][] = [
      ["calls", "CallRecords"],
      ["transactions", "Transactions"],
      ["cctv", "CCTVSightings"],
      ["witnessStatements", "WitnessStatements"],
      ["timeline", "TimelineEvents"],
      ["contradictions", "Contradictions"],
    ];
    const settled = await Promise.allSettled(
      tables.map(([, table]) => nosqlByScenarioPrefix(req, table, scenarioId!))
    );
    const result: Record<string, unknown> = { scenario: scenarioId };
    const errors: Record<string, unknown> = {};
    settled.forEach((s, i) => {
      const [key] = tables[i];
      if (s.status === "fulfilled") result[key] = s.value;
      else {
        result[key] = [];
        errors[key] = serializeError(s.reason);
      }
    });
    const contradictions = (result.contradictions as unknown[]) || [];
    result.contradiction = contradictions[0] || null;
    delete result.contradictions;
    if (Object.keys(errors).length) result.nosqlErrors = errors;

    return NextResponse.json(result);
  } catch (e) {
    return fail(e);
  }
}
