import { NextResponse } from "next/server";
import { getCrossDistrictFlows } from "@/lib/crossDistrictFlows";
import { getDistrictCentroids } from "@/lib/districtGeo";

// -----------------------------------------------------------------------------
// Real cross-district flow arcs for the /crime-hotspots flow map, resolved to
// real lat/lng centroids (getDistrictCentroids()) instead of the schematic
// 0-100 grid the old SVG-based CrossDistrictFlowMap used. Same source data
// as before (getCrossDistrictFlows() - the 15 authored scenarios only, never
// the bulk cases, which have no cross-district signal by construction), just
// plotted on a real map instead of an abstract diagram.
// -----------------------------------------------------------------------------
export const dynamic = "force-dynamic";

export async function GET() {
  const centroids = new Map(getDistrictCentroids().map((c) => [c.slug, c]));
  const flows = getCrossDistrictFlows()
    .map((f) => {
      const from = centroids.get(f.fromDistrictSlug);
      const to = centroids.get(f.toDistrictSlug);
      if (!from || !to || from.sampleSize === 0 || to.sampleSize === 0) return null;
      return {
        scenarioId: f.scenarioId,
        title: f.title,
        crimeTypeName: f.crimeTypeName,
        fromSlug: f.fromDistrictSlug,
        fromName: f.fromDistrictName,
        fromLat: from.lat,
        fromLng: from.lng,
        toSlug: f.toDistrictSlug,
        toName: f.toDistrictName,
        toLat: to.lat,
        toLng: to.lng,
        assignedTo: f.assignedTo,
        assignmentReason: f.assignmentReason,
      };
    })
    .filter((f): f is NonNullable<typeof f> => f !== null);

  const points = new Map<string, { slug: string; name: string; lat: number; lng: number }>();
  for (const f of flows) {
    points.set(f.fromSlug, { slug: f.fromSlug, name: f.fromName, lat: f.fromLat, lng: f.fromLng });
    points.set(f.toSlug, { slug: f.toSlug, name: f.toName, lat: f.toLat, lng: f.toLng });
  }

  return NextResponse.json({ flows, points: [...points.values()] });
}
