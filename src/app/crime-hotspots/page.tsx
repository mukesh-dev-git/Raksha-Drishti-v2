import PageShell from "@/components/PageShell";

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
      <div className="h-[80vh] w-full overflow-hidden rounded border border-line">
        <iframe
          src="/crime-map/spatiotemporal.html"
          title="Bengaluru spatiotemporal crime clusters"
          className="h-full w-full border-0"
        />
      </div>
    </PageShell>
  );
}
