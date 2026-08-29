import PageShell from "@/components/PageShell";
import CrimeHotspotsTabs from "@/components/crime-hotspots/CrimeHotspotsTabs";
import { BASE_PATH } from "@/lib/basePath";

// -----------------------------------------------------------------------------
// /crime-hotspots — P4.1 (real statewide hotspot map, real 4-type crime
// filter, real clustering + kernel-density) + P4.9's district choropleth and
// cross-district flow map, all three real MapLibre basemaps as of 2026-08-30
// (the latter two were plain SVG schematics before - direct feedback that
// they didn't read as real maps). Every figure traces back to
// getCaseWorklist()/getDistrictStats()/getCrossDistrictFlows() via the
// /crime-map/data/*.json Route Handlers each embed fetches.
// -----------------------------------------------------------------------------
export const metadata = { title: "Crime Hotspots" };

export default function CrimeHotspotsPage() {
  return (
    <PageShell
      title="Crime Hotspots"
      description="Real geographic concentration of registered FIRs across Karnataka - hex-binned clusters, a kernel-density surface, a district choropleth, and cross-district investigation flows. Every figure traces back to a real case."
      breadcrumbs={[{ label: "Crime Hotspots", href: "/crime-hotspots" }]}
      heroImageSrc="/page-hero/crime-hotspots.png"
    >
      <CrimeHotspotsTabs
        mapSrc={`${BASE_PATH}/crime-map/hotspots.html`}
        choroplethSrc={`${BASE_PATH}/crime-map/choropleth.html`}
        flowsSrc={`${BASE_PATH}/crime-map/flows.html`}
      />
    </PageShell>
  );
}
