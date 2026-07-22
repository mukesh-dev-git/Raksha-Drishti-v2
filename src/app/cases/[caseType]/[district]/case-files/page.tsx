import { notFound } from "next/navigation";
import PageShell from "@/components/PageShell";
import CaseFilesListClient from "@/components/cases/CaseFilesListClient";
import { caseFiles, getCaseType, getDistrict } from "@/lib/data";

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

  return (
    <PageShell
      title="Case Files"
      description={`${c.name} · ${d.name}. Search or browse case files, then open one to view its full booklet.`}
      breadcrumbs={[
        { label: "Cases", href: "/cases" },
        { label: c.name, href: `/cases/${caseType}/district-wise` },
        { label: d.name, href: `${base}/investigation-workspace` },
        { label: "Case Files", href: `${base}/case-files` },
      ]}
    >
      <CaseFilesListClient caseFiles={caseFiles} base={base} />
    </PageShell>
  );
}
