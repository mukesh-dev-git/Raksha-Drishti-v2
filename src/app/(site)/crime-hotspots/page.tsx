import PageShell from "@/components/PageShell";
import CrimeHotspotsTabs from "@/components/crime-hotspots/CrimeHotspotsTabs";
import { BASE_PATH } from "@/lib/basePath";
import { getDistrictStats } from "@/lib/districtStats";
import { getDistrictCentroids, projectSchematic } from "@/lib/districtGeo";
import { getCrossDistrictFlows } from "@/lib/crossDistrictFlows";

// -----------------------------------------------------------------------------
// /crime-hotspots — P4.1 (real statewide hotspot map, real 4-type crime
// filter, real clustering) + three P4.9 items behind the same page as tabs:
// a district choropleth, a kernel-density heatmap (built into the map tab
// as a view-mode toggle - see hotspots.html), and a cross-district flow map.
//
// Previously: a bare MapEmbed of a Bengaluru-only synthetic demo (16
// hardcoded localities, fake crime types, a "Simulated data" disclaimer) -
// nothing on this page read real data at all. Every number here now traces
// back to getCaseWorklist()/getDistrictStats(), the same functions /cases
// and /districts already trust, so this page can't disagree with them.
// -----------------------------------------------------------------------------
export const metadata = { title: "Crime Hotspots" };

export default function CrimeHotspotsPage() {
  const districtStats = getDistrictStats();
  const centroids = getDistrictCentroids();
  const positions = projectSchematic(centroids);

  const choroplethDistricts = districtStats.map((d) => {
    const pos = positions.get(d.slug) ?? { x: 50, y: 50 };
    return {
      slug: d.slug,
      name: d.name,
      x: pos.x,
      y: pos.y,
      totalCases: d.totalCases,
      clearanceRate: d.clearanceRate,
      repeatSubjectCount: d.repeatSubjectCount,
    };
  });

  const flowDistricts = centroids
    .filter((c) => c.sampleSize > 0)
    .map((c) => {
      const pos = positions.get(c.slug) ?? { x: 50, y: 50 };
      return { slug: c.slug, name: c.name, x: pos.x, y: pos.y };
    });

  const flows = getCrossDistrictFlows();

  return (
    <PageShell
      title="Crime Hotspots"
      description="Real geographic concentration of registered FIRs across Karnataka - hex-binned clusters, a kernel-density surface, a district choropleth, and cross-district investigation flows. Every figure traces back to a real case."
      breadcrumbs={[{ label: "Crime Hotspots", href: "/crime-hotspots" }]}
    >
      <CrimeHotspotsTabs
        mapSrc={`${BASE_PATH}/crime-map/hotspots.html`}
        choroplethDistricts={choroplethDistricts}
        flowDistricts={flowDistricts}
        flows={flows}
      />
    </PageShell>
  );
}
