import PageShell from "@/components/PageShell";
import Placeholder from "@/components/Placeholder";

// -----------------------------------------------------------------------------
// /crime-hotspots
// -----------------------------------------------------------------------------
export const metadata = { title: "Crime Hotspots" };

export default function CrimeHotspotsPage() {
  return (
    <PageShell
      title="Crime Hotspots"
      description="Geographic concentration of reported incidents. Use the map to identify high-risk areas, direct patrols, and monitor how hotspots shift over time."
      breadcrumbs={[{ label: "Crime Hotspots", href: "/crime-hotspots" }]}
    >
      <Placeholder label="Hotspot map">
        Add an interactive map here (for example Leaflet or MapLibre) with a
        heatmap layer and incident clusters. Include filters by crime type and
        date range, and a legend that does not rely on colour alone.
      </Placeholder>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Placeholder label="Top hotspot areas">
          Add a ranked list of the highest-incident localities with counts and a
          link through to the relevant district investigation view.
        </Placeholder>
        <Placeholder label="Time-of-day pattern">
          Add a chart showing when incidents occur, to support patrol planning.
        </Placeholder>
      </div>
    </PageShell>
  );
}
