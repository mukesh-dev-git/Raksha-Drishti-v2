import { NextResponse } from "next/server";
import districtMap from "@/lib/real-data/districtMap.json";
import { getDistrictStats } from "@/lib/districtStats";

// -----------------------------------------------------------------------------
// Real district polygons for the SCRB district map (choropleth.html).
// Geometry, Census 2011 population and real KSP IPC counts/rates come
// pre-joined from catalyst/real-data/district-map/build.mjs - see that file
// for every source and limitation. The one live addition here is the app's
// own case data (count + clearance rate), summed per polygon so Ballari's
// polygon carries Ballari + Vijayanagara, matching its real-data figures.
// That part is the demo case dataset, and the map labels it as such.
// -----------------------------------------------------------------------------
export const dynamic = "force-dynamic";

type Props = { appDistricts: { slug: string }[] } & Record<string, unknown>;

export async function GET() {
  const stats = new Map((await getDistrictStats()).map((d) => [d.slug, d]));

  const features = districtMap.features.map((f) => {
    const props = f.properties as unknown as Props;
    let cases = 0;
    let cleared = 0;
    for (const { slug } of props.appDistricts) {
      const s = stats.get(slug);
      if (!s) continue;
      cases += s.totalCases;
      cleared += Math.round((s.clearanceRate / 100) * s.totalCases);
    }
    return {
      ...f,
      properties: {
        ...props,
        demoCases: cases,
        demoClearanceRate: cases > 0 ? Math.round((cleared / cases) * 100) : null,
      },
    };
  });

  return NextResponse.json({ ...districtMap, features });
}
