import { notFound } from "next/navigation";
import PageShell from "@/components/PageShell";
import LinkCard from "@/components/LinkCard";
import { caseFiles, getCaseType, getDistrict } from "@/lib/data";

// -----------------------------------------------------------------------------
// /cases/[caseType]/[district]/case-files
// Lists individual case files. Click one -> case booklet.
// -----------------------------------------------------------------------------
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
      description={`${c.name} · ${d.name} — select a case file to open its booklet.`}
      breadcrumbs={[
        { label: "Cases", href: "/cases" },
        { label: c.name, href: `/cases/${caseType}/district-wise` },
        { label: d.name, href: `${base}/investigation-workspace` },
        { label: "Case Files", href: `${base}/case-files` },
      ]}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {caseFiles.map((f) => (
          <LinkCard
            key={f.id}
            href={`${base}/case-files/${f.id}`}
            title={f.title}
            subtitle={f.status}
          />
        ))}
      </div>
    </PageShell>
  );
}
