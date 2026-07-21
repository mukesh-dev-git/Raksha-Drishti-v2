import PageShell from "@/components/PageShell";
import Placeholder from "@/components/Placeholder";
import StatTile from "@/components/ui/StatTile";
import { caseTypes } from "@/lib/data";

// -----------------------------------------------------------------------------
// /crime-count
// -----------------------------------------------------------------------------
export const metadata = { title: "Crime Count" };

const total = caseTypes.reduce((s, c) => s + c.total, 0);

export default function CrimeCountPage() {
  return (
    <PageShell
      title="Crime Count"
      description="Total registered crime, broken down by category, time period, and region. Use this section to understand the overall crime picture across the state."
      breadcrumbs={[{ label: "Crime Count", href: "/crime-count" }]}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile label="Total registered cases" value={total.toLocaleString("en-IN")} />
        <StatTile label="Highest category" value="Theft" hint="1,240 cases" />
        <StatTile label="Reporting period" value="2026" hint="Year to date" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Placeholder label="Cases by category">
          Add a bar chart comparing total counts per crime type (Theft, Assault,
          Fraud, Burglary…), with the ability to sort and filter.
        </Placeholder>
        <Placeholder label="Trend over time">
          Add a line chart of month-over-month and year-over-year crime volume,
          with selectable date ranges.
        </Placeholder>
        <Placeholder label="Regional comparison">
          Add a district-wise comparison table with per-capita normalisation.
        </Placeholder>
        <Placeholder label="Summary KPIs">
          Add headline indicators: clearance rate, average time to registration,
          and change vs. previous period.
        </Placeholder>
      </div>
    </PageShell>
  );
}
