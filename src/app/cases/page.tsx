import PageShell from "@/components/PageShell";
import CasesListClient from "@/components/cases/CasesListClient";
import { caseTypes } from "@/lib/data";

// -----------------------------------------------------------------------------
// /cases — searchable list of case types. Select one to view its district-wise
// breakdown.
// -----------------------------------------------------------------------------
export const metadata = { title: "Cases" };

export default function CasesPage() {
  return (
    <PageShell
      title="Cases"
      description="Search or browse a crime category to view how cases are distributed across districts, then drill into a district's investigation workspace."
      breadcrumbs={[{ label: "Cases", href: "/cases" }]}
    >
      <CasesListClient caseTypes={caseTypes} />
    </PageShell>
  );
}
