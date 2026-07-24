import PageShell from "@/components/PageShell";
import MapEmbed from "@/components/MapEmbed";
import { BASE_PATH } from "@/lib/basePath";

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
      <MapEmbed
        src={`${BASE_PATH}/crime-map/spatiotemporal.html`}
        title="Bengaluru spatiotemporal crime clusters"
      />
    </PageShell>
  );
}
