import { notFound } from "next/navigation";
import PageShell from "@/components/PageShell";
import LinkCard from "@/components/LinkCard";
import { districts, getCaseType } from "@/lib/data";

// -----------------------------------------------------------------------------
// /cases/[caseType]/district-wise
// District-wise count for the selected case. Click a district -> workspace.
// -----------------------------------------------------------------------------
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
      description="Case counts per district. Select a district to open its investigation workspace."
      breadcrumbs={[
        { label: "Cases", href: "/cases" },
        { label: c.name, href: `/cases/${caseType}/district-wise` },
      ]}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {districts.map((d) => (
          <LinkCard
            key={d.slug}
            href={`/cases/${caseType}/${d.slug}/investigation-workspace`}
            title={d.name}
            subtitle={`${d.count} ${c.name.toLowerCase()} cases`}
          />
        ))}
      </div>
    </PageShell>
  );
}
