import { notFound } from "next/navigation";
import PageShell from "@/components/PageShell";
import Placeholder from "@/components/Placeholder";
import { getCaseFile, getCaseType, getDistrict } from "@/lib/data";

// -----------------------------------------------------------------------------
// /cases/[caseType]/[district]/case-files/[caseId]
// Case Booklet — full detail of a single case file.
// -----------------------------------------------------------------------------
export default async function CaseBookletPage({
  params,
}: {
  params: Promise<{ caseType: string; district: string; caseId: string }>;
}) {
  const { caseType, district, caseId } = await params;
  const c = getCaseType(caseType);
  const d = getDistrict(district);
  const f = getCaseFile(caseId);
  if (!c || !d || !f) notFound();

  const base = `/cases/${caseType}/${district}`;

  return (
    <PageShell
      title={`Case Booklet — ${f.id}`}
      description={`${c.name} · ${d.name} · Status: ${f.status}`}
      breadcrumbs={[
        { label: "Cases", href: "/cases" },
        { label: c.name, href: `/cases/${caseType}/district-wise` },
        { label: d.name, href: `${base}/investigation-workspace` },
        { label: "Case Files", href: `${base}/case-files` },
        { label: f.id, href: `${base}/case-files/${f.id}` },
      ]}
    >
      <div className="grid gap-6">
        <Placeholder label="FIR details">
          Add the FIR summary: complainant, date/time, location, sections
          invoked, and a narrative description.
        </Placeholder>
        <Placeholder label="Timeline of events">
          Add a chronological timeline of the incident and investigation
          milestones.
        </Placeholder>
        <Placeholder label="Suspects & accused">
          Add suspect profiles, links to related cases, and status.
        </Placeholder>
        <Placeholder label="Evidence & attachments">
          Add evidence log, seized items, forensic reports, and file uploads.
        </Placeholder>
      </div>
    </PageShell>
  );
}
