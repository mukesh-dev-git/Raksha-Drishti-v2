import { NextResponse } from "next/server";
import { getCaseWorklist } from "@/lib/caseWorklist";
import { caseTypes } from "@/lib/data";

// -----------------------------------------------------------------------------
// P4.1 - real per-FIR points for the /crime-hotspots map. Served as a Route
// Handler (not a static public/ JSON file) so it always reads straight from
// getCaseWorklist() - the exact same function the FIR Index, /districts and
// every other real-data page trust - and can never drift out of sync with
// what those pages show. force-dynamic for the same reason map.html/route.ts
// and spatiotemporal.html/route.ts are: this is genuinely static per build,
// but there's no real cost to computing it live, and it avoids the
// prerendered/static route-classification bug class that session already
// hit once on Slate/OpenNext.
//
// Real hour-of-day / day-of-week, not randomised: incidentFromDate is a real
// "YYYY-MM-DD HH:mm:ss" string (build_seed.mjs), parsed here without going
// through the Date constructor's local-timezone conversion (which would
// silently shift the hour) - the HH is read straight off the string, and
// day-of-week is computed via a UTC-anchored Date.UTC(y, m, d) so only the
// calendar date (never a time-of-day) feeds that calculation.
// -----------------------------------------------------------------------------
export const dynamic = "force-dynamic";

type Point = {
  lat: number;
  lng: number;
  crimeType: string; // caseTypes slug: theft | assault | fraud | burglary
  district: string; // districts slug
  hour: number | null; // 0-23, null when the FIR has no parseable incident timestamp
  weekend: 0 | 1 | null;
  status: number; // CaseStatusId 1-4
};

function parseIncidentTimestamp(raw: string | null): { hour: number; weekend: 0 | 1 } | null {
  if (!raw) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/.exec(raw);
  if (!m) return null;
  const [, y, mo, d, h] = m;
  const dow = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d))).getUTCDay(); // 0=Sun..6=Sat
  return { hour: Number(h), weekend: dow === 0 || dow === 6 ? 1 : 0 };
}

export async function GET() {
  const worklist = await getCaseWorklist();
  const points: Point[] = [];
  let missingCoords = 0;

  for (const c of worklist) {
    if (c.latitude == null || c.longitude == null) {
      missingCoords++;
      continue;
    }
    const t = parseIncidentTimestamp(c.incidentFromDate);
    points.push({
      lat: c.latitude,
      lng: c.longitude,
      crimeType: c.crimeTypeSlug,
      district: c.districtSlug,
      hour: t?.hour ?? null,
      weekend: t?.weekend ?? null,
      status: c.statusId,
    });
  }

  return NextResponse.json({
    total: worklist.length,
    plotted: points.length,
    missingCoords,
    crimeTypes: caseTypes.map((c) => ({ slug: c.slug, name: c.name })),
    points,
  });
}
