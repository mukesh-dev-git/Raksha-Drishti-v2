import { NextResponse } from "next/server";
import { getDistrictStats } from "@/lib/districtStats";
import { getDistrictCentroids } from "@/lib/districtGeo";

// -----------------------------------------------------------------------------
// Real per-district points for the /crime-hotspots choropleth map. Unlike
// districtGeo.ts's projectSchematic() (a fake 0-100 grid, used by the old
// SVG-based DistrictChoropleth), this serves the REAL lat/lng centroid
// (getDistrictCentroids() - the mean of each district's real case
// coordinates) so it can be plotted on an actual map. No boundary polygon is
// invented here either - a real point on a real basemap, not a fabricated
// shape, same honesty constraint the schematic view already followed.
// -----------------------------------------------------------------------------
export const dynamic = "force-dynamic";

export async function GET() {
  const stats = getDistrictStats();
  const centroids = new Map(getDistrictCentroids().map((c) => [c.slug, c]));

  const districts = stats
    .map((d) => {
      const c = centroids.get(d.slug);
      if (!c || c.sampleSize === 0) return null;
      return {
        slug: d.slug,
        name: d.name,
        lat: c.lat,
        lng: c.lng,
        totalCases: d.totalCases,
        clearanceRate: d.clearanceRate,
        repeatSubjectCount: d.repeatSubjectCount,
      };
    })
    .filter((d): d is NonNullable<typeof d> => d !== null);

  return NextResponse.json({ districts });
}
