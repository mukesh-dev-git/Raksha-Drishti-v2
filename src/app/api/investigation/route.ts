import { NextRequest, NextResponse } from "next/server";
import { zcqlAll, pick, fail } from "@/lib/zcql";
import { getCaseType, getDistrict } from "@/lib/data";
import caseScenarioMap from "@/lib/nosql-seed/caseScenarioMap.json";
import callRecords from "@/lib/nosql-seed/CallRecords.json";
import transactions from "@/lib/nosql-seed/Transactions.json";
import cctvSightings from "@/lib/nosql-seed/CCTVSightings.json";
import witnessStatements from "@/lib/nosql-seed/WitnessStatements.json";
import timelineEvents from "@/lib/nosql-seed/TimelineEvents.json";
import contradictionsSeed from "@/lib/nosql-seed/Contradictions.json";
import aiContradictions from "@/lib/nosql-seed/AIContradictions.json";

export const dynamic = "force-dynamic";

// GET /api/investigation?caseType=<slug>&district=<slug>
// -> real seeded evidence (calls/transactions/CCTV/witness statements/
// timeline/contradiction) for the first authored scenario whose CaseMaster
// row matches this crime type + district, or `{ scenario: null }` if none of
// the 15 seeded scenarios happen to fall in this particular combination -
// the frontend falls back to the mock generator in that case, same pattern
// as every other live-data call in the app (see catalyst/README.md §3).
//
// `aiFindings` (P5.2b/P5.4) is GLM's OWN independent read of this
// scenario's evidence, pre-computed once via detectScenarioContradictions()
// and bundled as AIContradictions.json - not a live call per page load
// (each call takes 10-60s and this endpoint needs to stay responsive), and
// not the same thing as `contradiction`, which is the scenario author's
// ground truth. Keep them visibly distinct in the UI - see
// RealEvidenceFeed.tsx. `matchesAuthored` records whether GLM's citations
// happened to fully cover the authored contradiction's records; it is not
// itself shown as a general "AI accuracy" claim (RESEARCH_AND_PLAN.md
// Part 6 - the real number is 2/15 across all scenarios, and it varies
// run to run since this is a live model, not a deterministic function).
//
// scenarioId resolution: ZCQL (relational) CrimeMinorHeadID + District, via
// the same CaseMaster/Unit join used by /api/district-stats, to get real
// CaseMasterIDs, then a static CaseMasterID -> scenarioId lookup baked at
// seed time (build_seed.mjs, from cases.json's FIR lists).
//
// The 6 evidence collections themselves are read from the bundled seed JSON
// (src/lib/nosql-seed/*.json, filtered by each record's own scenarioId
// field) rather than a live NoSQL queryTable() call - discovered live
// (2026-08-24) that these tables' schema (partition key "id", no sort key)
// only allows the EQUALS operator in a key_condition ("PartitionKey
// operator must be equal" - queryTable rejects BEGINS_WITH here even
// though it's a documented operator, because it needs a sort key to do a
// prefix/range scan and these tables don't have one). The 6 NoSQL tables in
// Catalyst remain the system of record and are seeded/verified there
// (catalyst/README.md §2b) - exact-key operations (EQUALS-based
// fetch/update/delete) work fine and are what a future CRUD/edit endpoint
// would use - this read path just isn't one of those, so it uses the
// identical bundled content instead of fighting the schema for a query
// shape it can't do.
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

    const byScenario = <T extends { scenarioId: string }>(rows: T[]) =>
      rows.filter((r) => r.scenarioId === scenarioId);

    return NextResponse.json({
      scenario: scenarioId,
      calls: byScenario(callRecords),
      transactions: byScenario(transactions),
      cctv: byScenario(cctvSightings),
      witnessStatements: byScenario(witnessStatements),
      timeline: byScenario(timelineEvents),
      contradiction: byScenario(contradictionsSeed)[0] || null,
      aiFindings: (aiContradictions.scenarios as Record<string, unknown>)[scenarioId] ?? null,
    });
  } catch (e) {
    return fail(e);
  }
}
