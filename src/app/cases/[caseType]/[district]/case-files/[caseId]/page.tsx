import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FolderOpen } from "lucide-react";
import Breadcrumb from "@/components/ui/Breadcrumb";
import CaseFileFlipbook from "@/components/flipbook/CaseFileFlipbook";
import { getCaseFile, getCaseType, getDistrict } from "@/lib/data";
import { getCaseFileContent } from "@/lib/investigationData";

// -----------------------------------------------------------------------------
// /cases/[caseType]/[district]/case-files/[caseId]
// Digital Case File — rendered as a page-turning flipbook instead of a
// static booklet/PDF viewer.
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
  const content = getCaseFileContent(caseType, district, f.id);

  return (
    <main className="min-h-screen bg-paper px-4 py-2 sm:px-6 lg:px-8">
      <div className="w-full">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Breadcrumb
            backHref={`${base}/case-files`}
            backLabel="Back to case files"
            items={[
              { label: "Cases", href: "/cases" },
              { label: c.name, href: `/cases/${caseType}/district-wise` },
              { label: d.name, href: `${base}/investigation-workspace` },
              { label: "Case Files", href: `${base}/case-files` },
              { label: f.id, href: `${base}/case-files/${f.id}` },
            ]}
          />
          <div className="flex gap-2 pb-4">
            <Link
              href={`${base}/investigation-workspace`}
              className="flex items-center gap-1.5 rounded-sm border border-line bg-surface px-3 py-1.5 text-xs text-ink transition hover:border-navy hover:text-navy"
            >
              <ArrowLeft size={12} /> Investigation Board
            </Link>
            <Link
              href={`${base}/case-files`}
              className="flex items-center gap-1.5 rounded-sm border border-line bg-surface px-3 py-1.5 text-xs text-ink transition hover:border-navy hover:text-navy"
            >
              <FolderOpen size={12} /> All Case Files
            </Link>
          </div>
        </div>

        <CaseFileFlipbook content={content} />
      </div>
    </main>
  );
}
