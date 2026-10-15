import PageShell from "@/components/PageShell";
import CrimeHotspotsTabs from "@/components/crime-hotspots/CrimeHotspotsTabs";
import CrimeInsightPanel from "@/components/crimeCount/CrimeInsightPanel";
import { BASE_PATH } from "@/lib/basePath";

// -----------------------------------------------------------------------------
// /crime-hotspots — P4.1 (real statewide hotspot map, real 4-type crime
// filter, real clustering + kernel-density) + P4.9's district choropleth and
// cross-district flow map, all three real MapLibre basemaps as of 2026-08-30
// (the latter two were plain SVG schematics before - direct feedback that
// they didn't read as real maps). Every figure traces back to
// getCaseWorklist()/getDistrictStats()/getCrossDistrictFlows() via the
// /crime-map/data/*.json Route Handlers each embed fetches.
//
// P5.7 (2026-09-03) adds the AI Insight panel below the map, shared with
// /crime-count - see CrimeInsightPanel.tsx / crimeInsights.ts.
// -----------------------------------------------------------------------------
export const metadata = { title: "Crime Hotspots" };

export default function CrimeHotspotsPage() {
  return (
    <PageShell
      title="Crime Hotspots"
      description="Where crime is rising across Karnataka's districts, and where it concentrates inside each one. District rates and trend alerts use real Karnataka State Police figures; the hotspot drill-down uses the app's case records."
      breadcrumbs={[{ label: "Crime Hotspots", href: "/crime-hotspots" }]}
      heroImageSrc="/page-hero/crime-hotspots.png"
    >
      <CrimeHotspotsTabs
        districtMapSrc={`${BASE_PATH}/crime-map/choropleth.html`}
        hotspotMapSrc={`${BASE_PATH}/crime-map/hotspots.html`}
      />
      <div className="mt-6">
        <CrimeInsightPanel />
      </div>
    </PageShell>
  );
}
