import PageShell from "@/components/PageShell";
import { SkelBlock, SkelCard } from "@/components/ui/Skeleton";

export default function PatternAnalysisLoading() {
  return (
    <PageShell
      title="Pattern Analysis"
      description="Cases from different investigations that share a distinctive method — same combination of charged sections, not just the same crime type. Every cluster below links records that were never compared to each other until now."
      breadcrumbs={[{ label: "Pattern Analysis", href: "/pattern-analysis" }]}
    >
      <div className="space-y-6">
        <SkelBlock className="h-4 w-96 max-w-full" />
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="grid grid-cols-1 gap-0 divide-y divide-line rounded-xl border border-line bg-surface shadow-sm sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j} className="p-5">
                <SkelCard lines={2} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </PageShell>
  );
}
