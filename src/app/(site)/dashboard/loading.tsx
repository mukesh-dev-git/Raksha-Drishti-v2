import { SkelBlock, SkelStatRow, SkelChartCard } from "@/components/ui/Skeleton";

// Custom shape, not PageShell - matches dashboard/page.tsx's own wrapper
// (mx-auto max-w-[1400px] space-y-6 p-6) and section order: attention
// list, stat strip, trend/category/hotspots row, evidence feed.
export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-[1400px] space-y-6 p-6">
      <SkelBlock className="h-10 w-72" />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.6fr_1fr]">
        <SkelBlock className="h-56 w-full" />
        <SkelBlock className="h-56 w-full" />
      </div>

      <SkelStatRow count={5} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.4fr_1fr_1fr]">
        <SkelChartCard height="h-64" />
        <SkelChartCard height="h-64" />
        <SkelChartCard height="h-64" />
      </div>

      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkelBlock key={i} className="h-28 w-56 shrink-0" />
        ))}
      </div>
    </div>
  );
}
