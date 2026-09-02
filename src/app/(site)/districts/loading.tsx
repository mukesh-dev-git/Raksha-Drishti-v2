import PageShell from "@/components/PageShell";
import { SkelListRows } from "@/components/ui/Skeleton";

export default function DistrictsLoading() {
  return (
    <PageShell
      title="Districts"
      description="Pendency and clearance across every district, real cases only. Open one for its full case list."
      breadcrumbs={[{ label: "Districts", href: "/districts" }]}
    >
      <SkelListRows count={12} />
    </PageShell>
  );
}
