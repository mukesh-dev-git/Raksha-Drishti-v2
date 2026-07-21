import PageShell from "@/components/PageShell";
import Placeholder from "@/components/Placeholder";

// -----------------------------------------------------------------------------
// /crime-count
// -----------------------------------------------------------------------------
export default function CrimeCountPage() {
  return (
    <PageShell
      title="Crime Count"
      description="Total crime counts and trends — by category, time period, and region."
      breadcrumbs={[{ label: "Crime Count", href: "/crime-count" }]}
    >
      <Placeholder label="Crime count visualisations">
        Add charts/tables here: total counts per crime type, month-over-month
        trend lines, year comparisons, and summary KPI tiles.
      </Placeholder>
    </PageShell>
  );
}
