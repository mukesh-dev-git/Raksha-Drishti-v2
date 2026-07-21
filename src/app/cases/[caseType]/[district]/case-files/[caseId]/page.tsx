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
    <main className="min-h-screen bg-slate-950 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <nav className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <Link href="/dashboard" className="hover:text-slate-300">Dashboard</Link>
            <span>/</span>
            <Link href="/cases" className="hover:text-slate-300">Cases</Link>
            <span>/</span>
            <Link href={`/cases/${caseType}/district-wise`} className="hover:text-slate-300">{c.name}</Link>
            <span>/</span>
            <Link href={`${base}/investigation-workspace`} className="hover:text-slate-300">{d.name}</Link>
            <span>/</span>
            <Link href={`${base}/case-files`} className="hover:text-slate-300">Case Files</Link>
            <span>/</span>
            <span className="text-slate-300">{f.id}</span>
          </div>
          <div className="flex gap-2">
            <Link
              href={`${base}/investigation-workspace`}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-slate-300 transition hover:border-white/20 hover:text-white"
            >
              <ArrowLeft size={12} /> Investigation Board
            </Link>
            <Link
              href={`${base}/case-files`}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-slate-300 transition hover:border-white/20 hover:text-white"
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
