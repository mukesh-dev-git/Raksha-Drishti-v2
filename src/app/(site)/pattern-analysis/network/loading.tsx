import PageShell from "@/components/PageShell";
import { SkelStatRow, SkelChartCard } from "@/components/ui/Skeleton";

export default function StatewideNetworkLoading() {
  return (
    <PageShell
      title="Statewide Network"
      description="Every evidence-linked accused person across all 15 investigated scenarios, and the real FIRs they're named in. A line only exists where P1.1's entity resolution actually ties one real person to one real case file — nothing here is a name-match guess."
      breadcrumbs={[
        { label: "Pattern Analysis", href: "/pattern-analysis" },
        { label: "Statewide Network", href: "/pattern-analysis/network" },
      ]}
    >
      <div className="space-y-5">
        <SkelStatRow />
        <SkelChartCard height="h-[480px]" />
      </div>
    </PageShell>
  );
}
