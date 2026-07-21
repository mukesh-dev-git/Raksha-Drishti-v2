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
    <main className="min-h-screen bg-paper px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px]">
        <nav className="mb-4 flex flex-wrap items-center gap-2 text-xs text-muted">
          <Link href="/dashboard" className="hover:text-navy hover:underline">
            Dashboard
          </Link>
          <span>/</span>
          <Link href="/cases" className="hover:text-navy hover:underline">
            Cases
          </Link>
          <span>/</span>
          <Link href={`/cases/${caseType}/district-wise`} className="hover:text-navy hover:underline">
            {c.name}
          </Link>
          <span>/</span>
          <span className="font-medium text-ink">{d.name}</span>
          <Link
            href={`/cases/${caseType}/district-wise`}
            className="ml-2 flex items-center gap-1 rounded-sm border border-line px-2 py-0.5 text-muted transition hover:border-navy hover:text-navy"
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
