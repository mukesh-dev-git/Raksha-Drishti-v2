import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import InvestigationWorkspaceClient from "@/components/investigation/InvestigationWorkspaceClient";
import { getCaseType, getDistrict } from "@/lib/data";
import { getInvestigationData } from "@/lib/investigationData";

// -----------------------------------------------------------------------------
// /cases/[caseType]/[district]/investigation-workspace
// The investigation "desk": relationship graph, timeline, evidence locker,
// and AI panel for this case type + district. Opens into the case files
// list, whose entries open into the digital case-file flipbook.
// -----------------------------------------------------------------------------
export default async function InvestigationWorkspacePage({
  params,
}: {
  params: Promise<{ caseType: string; district: string }>;
}) {
  const { caseType, district } = await params;
  const c = getCaseType(caseType);
  const d = getDistrict(district);
  if (!c || !d) notFound();

  const base = `/cases/${caseType}/${district}`;
  const data = getInvestigationData(caseType, district);

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px]">
        <nav className="mb-4 flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <Link href="/dashboard" className="hover:text-slate-300">
            Dashboard
          </Link>
          <span>/</span>
          <Link href="/cases" className="hover:text-slate-300">
            Cases
          </Link>
          <span>/</span>
          <Link href={`/cases/${caseType}/district-wise`} className="hover:text-slate-300">
            {c.name}
          </Link>
          <span>/</span>
          <span className="text-slate-300">{d.name}</span>
          <Link
            href={`/cases/${caseType}/district-wise`}
            className="ml-2 flex items-center gap-1 rounded-full border border-white/10 px-2 py-0.5 text-slate-400 transition hover:border-white/20 hover:text-slate-200"
          >
            <ArrowLeft size={11} /> Districts
          </Link>
        </nav>

        <InvestigationWorkspaceClient
          data={data}
          caseTypeName={c.name}
          districtName={d.name}
          base={base}
        />
      </div>
    </main>
  );
}
