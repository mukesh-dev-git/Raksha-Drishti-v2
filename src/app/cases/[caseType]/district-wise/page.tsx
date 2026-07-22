import { notFound } from "next/navigation";
import PageShell from "@/components/PageShell";
import DistrictWiseClient from "@/components/cases/DistrictWiseClient";
import { districts, getCaseType, trendYears } from "@/lib/data";

// -----------------------------------------------------------------------------
// /cases/[caseType]/district-wise
// District-wise count for the selected case, searchable and filterable by
// clearance rate and trend direction. Each row opens the district's
// investigation workspace.
// -----------------------------------------------------------------------------
export async function generateMetadata({
  params,
}: {
  params: Promise<{ caseType: string }>;
}) {
  const { caseType } = await params;
  const c = getCaseType(caseType);
  return { title: c ? `${c.name} — District-wise` : "District-wise" };
}

export default async function DistrictWisePage({
  params,
}: {
  params: Promise<{ caseType: string }>;
}) {
  const { caseType } = await params;
  const c = getCaseType(caseType);
  if (!c) notFound();

  return (
    <PageShell
      title={`${c.name} — District-wise`}
      description="Search or filter districts by clearance rate and trend. Select a district to open its investigation workspace."
      breadcrumbs={[
        { label: "Cases", href: "/cases" },
        { label: c.name, href: `/cases/${caseType}/district-wise` },
      ]}
    >
      <DistrictWiseClient
        districts={districts}
        caseTypeSlug={caseType}
        caseTypeName={c.name}
        firstYear={trendYears[0]}
        lastYear={trendYears[trendYears.length - 1]}
      />
    </PageShell>
  );
}
