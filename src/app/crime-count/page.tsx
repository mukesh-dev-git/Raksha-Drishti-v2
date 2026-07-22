import PageShell from "@/components/PageShell";

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
      <div className="h-[80vh] w-full overflow-hidden rounded border border-line">
        <iframe
          src="/crime-map/map.html"
          title="Bengaluru crime map"
          className="h-full w-full border-0"
        />
      </div>
    </PageShell>
  );
}
