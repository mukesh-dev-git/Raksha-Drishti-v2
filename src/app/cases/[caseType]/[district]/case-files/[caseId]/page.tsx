import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FolderOpen } from "lucide-react";
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
    <main className="min-h-screen bg-paper px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <nav className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
            <Link href="/dashboard" className="hover:text-navy hover:underline">Dashboard</Link>
            <span>/</span>
            <Link href="/cases" className="hover:text-navy hover:underline">Cases</Link>
            <span>/</span>
            <Link href={`/cases/${caseType}/district-wise`} className="hover:text-navy hover:underline">{c.name}</Link>
            <span>/</span>
            <Link href={`${base}/investigation-workspace`} className="hover:text-navy hover:underline">{d.name}</Link>
            <span>/</span>
            <Link href={`${base}/case-files`} className="hover:text-navy hover:underline">Case Files</Link>
            <span>/</span>
            <span className="font-medium text-ink">{f.id}</span>
          </div>
          <div className="flex gap-2">
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
        </nav>

        <CaseFileFlipbook content={content} />
      </div>
    </main>
  );
}
