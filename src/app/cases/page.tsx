import PageShell from "@/components/PageShell";
import LinkCard from "@/components/LinkCard";
import { caseTypes } from "@/lib/data";

// -----------------------------------------------------------------------------
// /cases — lists case types (Theft, Assault, ...). Click one -> district-wise.
// -----------------------------------------------------------------------------
export default function CasesPage() {
  return (
    <PageShell
      title="Cases"
      description="Select a case type to view its district-wise breakdown."
      breadcrumbs={[{ label: "Cases", href: "/cases" }]}
    >
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {caseTypes.map((c) => (
          <LinkCard
            key={c.slug}
            href={`/cases/${c.slug}/district-wise`}
            title={c.name}
            subtitle={`${c.total} total cases`}
          />
        ))}
      </div>
    </PageShell>
  );
}
