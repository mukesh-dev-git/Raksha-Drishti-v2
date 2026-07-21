import Link from "next/link";
import { notFound } from "next/navigation";
import { FileText, ArrowRight } from "lucide-react";
import PageShell from "@/components/PageShell";
import StatusBadge from "@/components/ui/StatusBadge";
import { caseFiles, getCaseType, getDistrict } from "@/lib/data";

// -----------------------------------------------------------------------------
// /cases/[caseType]/[district]/case-files
// Lists individual case files for this case type + district. Each opens the
// digital case-file booklet.
// -----------------------------------------------------------------------------
export const metadata = { title: "Case Files" };

// Map free-text status to the muted, functional status system.
function statusFor(raw: string): "verified" | "pending" | "alert" {
  const s = raw.toLowerCase();
  if (s.includes("closed")) return "verified";
  if (s.includes("investigation") || s.includes("open")) return "pending";
  return "pending";
}

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
      description={`${c.name} · ${d.name}. Select a case file to open its full booklet.`}
      breadcrumbs={[
        { label: "Cases", href: "/cases" },
        { label: c.name, href: `/cases/${caseType}/district-wise` },
        { label: d.name, href: `${base}/investigation-workspace` },
        { label: "Case Files", href: `${base}/case-files` },
      ]}
    >
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {caseFiles.map((f) => (
          <li key={f.id}>
            <Link
              href={`${base}/case-files/${f.id}`}
              className="group flex h-full flex-col rounded border border-line bg-surface p-5 shadow-sm hover:border-navy hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-sm bg-navy/10 text-navy"
                  aria-hidden="true"
                >
                  <FileText size={20} />
                </span>
                <StatusBadge status={statusFor(f.status)} label={f.status} />
              </div>
              <h3 className="mt-4 text-base font-semibold text-navy">{f.id}</h3>
              <p className="mt-1 text-sm text-muted">{f.title}</p>
              <span className="mt-auto flex items-center gap-1 pt-4 text-sm font-medium text-navy">
                Open booklet
                <ArrowRight size={14} aria-hidden="true" className="group-hover:translate-x-0.5" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </PageShell>
  );
}
