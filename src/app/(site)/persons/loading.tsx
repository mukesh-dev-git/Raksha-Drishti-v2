import PageShell from "@/components/PageShell";
import { SkelBlock, SkelListRows } from "@/components/ui/Skeleton";

export default function PersonsLoading() {
  return (
    <PageShell
      title="Persons"
      description="Every person in the criminal record register, searchable by name. Repeat subjects (2+ cases) are flagged automatically."
      breadcrumbs={[{ label: "Persons", href: "/persons" }]}
    >
      <div className="space-y-4">
        <SkelBlock className="h-10 max-w-sm" />
        <SkelListRows count={12} withAvatar />
      </div>
    </PageShell>
  );
}
