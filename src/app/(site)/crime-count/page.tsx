import PageShell from "@/components/PageShell";
import MapEmbed from "@/components/MapEmbed";
import { BASE_PATH } from "@/lib/basePath";

// -----------------------------------------------------------------------------
// /crime-count
// -----------------------------------------------------------------------------
export const metadata = { title: "Crime Count" };

export default function CrimeCountPage() {
  return (
    <PageShell
      title="Crime Count"
      description="Total registered crime, broken down by category, time period, and region. Use the interactive map below to explore totals across Bengaluru."
      breadcrumbs={[{ label: "Crime Count", href: "/crime-count" }]}
    >
      <MapEmbed src={`${BASE_PATH}/crime-map/map.html`} title="Bengaluru crime map" />
    </PageShell>
  );
}
