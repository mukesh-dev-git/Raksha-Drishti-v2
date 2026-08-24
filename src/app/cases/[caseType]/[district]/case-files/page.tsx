import { notFound } from "next/navigation";
import PageShell from "@/components/PageShell";
import CaseFilesListClient from "@/components/cases/CaseFilesListClient";
import { caseTypes, districts, getCaseType, getDistrict } from "@/lib/data";
import { listCasesForPair } from "@/lib/investigation/caseResolver";

// Always render live (see district-wise/page.tsx for why).
export const dynamic = "force-dynamic";
export function generateStaticParams() {
  return caseTypes.flatMap((c) =>
    districts.map((d) => ({ caseType: c.slug, district: d.slug }))
  );
}

// -----------------------------------------------------------------------------
// /cases/[caseType]/[district]/case-files
// Searchable list of individual case files for this case type + district.
// Each opens the digital case-file booklet.
// -----------------------------------------------------------------------------
export const metadata = { title: "Case Files" };

export default async function CaseFilesPage({
  params,
}: {
  params: Promise<{ caseType: string; district: string }>;
}) {
  const { caseType, district } = await params;
  const c = getCaseType(caseType);
  const d = getDistrict(district);
  if (!c || !d) notFound();

  const base = `/cases/${caseType}/${district}`;
  // Real case files for this pair, resolved against the synthetic seeded
  // dataset — never the old fake 3-item list. An empty result here means
  // this (caseType, district) pair genuinely has no synthetic case, and
  // CaseFilesListClient already renders a clean "no case files" state for
  // an empty list, not a dead-end 404.
  const files = listCasesForPair(caseType, district);

  return (
    <PageShell
      title="Case Files"
      description={`${c.name} · ${d.name}. Search or browse case files, then open one to view its full case workspace.`}
      breadcrumbs={[
        { label: "Cases", href: "/cases" },
        { label: c.name, href: `/cases/${caseType}/district-wise` },
        { label: d.name, href: `${base}/investigation-workspace` },
        { label: "Case Files", href: `${base}/case-files` },
      ]}
    >
      <CaseFilesListClient caseFiles={files} base={base} />
    </PageShell>
  );
}
