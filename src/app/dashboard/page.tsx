import PageShell from "@/components/PageShell";
import LinkCard from "@/components/LinkCard";

// -----------------------------------------------------------------------------
// /dashboard — the app home. Three box-template links.
// -----------------------------------------------------------------------------
export default function DashboardPage() {
  return (
    <PageShell
      title="Raksha-Drishti Dashboard"
      description="Central hub for crime analytics and investigation. Choose a module below."
    >
      <div className="grid gap-6 sm:grid-cols-3">
        <LinkCard
          href="/crime-count"
          title="Crime Count"
          subtitle="Totals & trends across crime categories."
        />
        <LinkCard
          href="/crime-hotspots"
          title="Crime Hotspots"
          subtitle="Geographic concentration of incidents."
        />
        <LinkCard
          href="/cases"
          title="Cases"
          subtitle="Browse case types and drill into investigations."
        />
      </div>
    </PageShell>
  );
}
