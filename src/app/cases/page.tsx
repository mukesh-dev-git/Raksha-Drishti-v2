import PageShell from "@/components/PageShell";
import CasesListClient from "@/components/cases/CasesListClient";
import { getCaseTypes } from "@/lib/api";

// -----------------------------------------------------------------------------
// /cases — searchable list of case types. Select one to view its district-wise
// breakdown.
// -----------------------------------------------------------------------------
export const metadata = { title: "Cases" };

// Live from Catalyst Data Store; bundled sample as fallback on any error.
// This page previously imported `caseTypes` straight from data.ts and never
// called the live endpoint at all, even though rd_api/api/casetypes has
// always existed - just never wired up here. Fixed now that the endpoint
// runs as a Route Handler in this same deployment.
export const dynamic = "force-dynamic";

export default async function CasesPage() {
  const caseTypes = await getCaseTypes();
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
