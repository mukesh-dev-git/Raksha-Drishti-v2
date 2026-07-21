import PageShell from "@/components/PageShell";
import Placeholder from "@/components/Placeholder";

// -----------------------------------------------------------------------------
// /crime-hotspots
// -----------------------------------------------------------------------------
export default function CrimeHotspotsPage() {
  return (
    <PageShell
      title="Crime Hotspots"
      description="Geographic concentration of incidents — identify high-risk areas."
      breadcrumbs={[{ label: "Crime Hotspots", href: "/crime-hotspots" }]}
    >
      <Placeholder label="Hotspot map / heatmap">
        Add a map component here (e.g. Leaflet / Mapbox) with a heatmap layer,
        clusters, and filters by crime type and date range.
      </Placeholder>
    </PageShell>
  );
}
