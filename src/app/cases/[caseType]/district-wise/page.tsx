import { notFound } from "next/navigation";
import PageShell from "@/components/PageShell";
import DistrictWiseClient from "@/components/cases/DistrictWiseClient";
import { caseTypes, getCaseType, trendYears } from "@/lib/data";
import { getDistrictStats } from "@/lib/api";

// Pre-render every case type at build time; fall back to live SSR for any
// param not in this list (dynamicParams defaults to true) - needed for real
// dynamic serving on Slate/OpenNext, not just the old static-export path.
export function generateStaticParams() {
  return caseTypes.map((c) => ({ caseType: c.slug }));
}

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

  // Live from Catalyst Data Store when configured; bundled sample otherwise.
  const districts = await getDistrictStats(caseType);

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
