import PageShell from "@/components/PageShell";
import MapEmbed from "@/components/MapEmbed";

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
        src="/crime-map/spatiotemporal.html"
        title="Bengaluru spatiotemporal crime clusters"
      />
    </PageShell>
  );
}
