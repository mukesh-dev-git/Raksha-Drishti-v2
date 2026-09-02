import PageShell from "@/components/PageShell";
import { SkelBlock, SkelStatRow, SkelChartGrid, SkelChartCard } from "@/components/ui/Skeleton";

export default function CrimeCountLoading() {
  return (
    <PageShell
      title="Crime Count"
      description="Total registered crime, broken down by category, time period, and region. Use the interactive map below to explore totals across Bengaluru."
      breadcrumbs={[{ label: "Crime Count", href: "/crime-count" }]}
    >
      {/* MapEmbed's own real height, so the page doesn't jump when the map replaces this block. */}
      <SkelBlock className="h-[420px] w-full" />

      <div className="mt-10 space-y-6">
        <SkelStatRow />
        <SkelChartCard height="h-56" />
        <SkelChartGrid count={2} />
        <SkelChartCard height="h-72" />
      </div>
    </PageShell>
  );
}
