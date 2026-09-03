import { NextResponse } from "next/server";
import { getSummary, getCaseTypes } from "@/lib/api";
import { getDistrictStats } from "@/lib/districtStats";
import { generateCrimeInsight } from "@/lib/crimeInsights";

export const dynamic = "force-dynamic";

// GET /api/crime-insight[?district=<id>[,<id>...]] -> { ok, text } | { ok: false, error }
//
// P5.7 (2026-09-03). Called on-demand from CrimeInsightPanel.tsx, not on
// page load - see crimeInsights.ts's own header for why this is a live call
// every time, not a build-time-baked one. `district` mirrors the dashboard's
// own drill-down filter (X1) for consistency, though neither /crime-count
// nor /crime-hotspots currently expose that control themselves.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const districtParam = searchParams.get("district");
  const districtIds = districtParam
    ? districtParam.split(",").map(Number).filter((n) => Number.isFinite(n) && n > 0)
    : undefined;

  const [summary, caseTypes, districtStats] = await Promise.all([
    getSummary(districtIds),
    getCaseTypes(districtIds),
    getDistrictStats(),
  ]);

  const result = await generateCrimeInsight(summary, caseTypes, districtStats);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 502 });
  }
  return NextResponse.json({ ok: true, text: result.text });
}
