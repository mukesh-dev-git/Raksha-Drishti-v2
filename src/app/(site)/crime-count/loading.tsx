import PageShell from "@/components/PageShell";
import { SkelStatRow, SkelChartGrid, SkelChartCard } from "@/components/ui/Skeleton";

export default function CrimeCountLoading() {
  return (
    <PageShell
      title="Crime Count"
      description="Total registered crime, broken down by category, time period, and region. For the district map and trend alerts, see Crime Hotspots."
      breadcrumbs={[{ label: "Crime Count", href: "/crime-count" }]}
    >
      <div className="space-y-6">
        <SkelStatRow />
        <SkelChartCard height="h-56" />
        <SkelChartGrid count={2} />
        <SkelChartCard height="h-72" />
      </div>
    </PageShell>
  );
}
