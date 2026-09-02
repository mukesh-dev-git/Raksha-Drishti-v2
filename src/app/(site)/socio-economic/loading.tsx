import PageShell from "@/components/PageShell";
import { SkelBlock, SkelChartGrid } from "@/components/ui/Skeleton";

export default function SocioEconomicLoading() {
  return (
    <PageShell
      title="Socio-Economic Correlation"
      description="Victim and complainant demographic profile across the real 5,000-case FIR Index — for victim-support and outreach planning, never as an offender signal."
      breadcrumbs={[{ label: "Socio-Economic Correlation", href: "/socio-economic" }]}
    >
      <div className="space-y-5">
        <SkelBlock className="h-9 w-64" />
        <SkelChartGrid count={4} />
      </div>
    </PageShell>
  );
}
