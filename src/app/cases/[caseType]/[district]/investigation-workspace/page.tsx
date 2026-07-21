import { notFound } from "next/navigation";
import Breadcrumb from "@/components/ui/Breadcrumb";
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
    <main className="min-h-screen bg-paper px-4 py-2 sm:px-6 lg:px-8">
      <div className="w-full">
        <Breadcrumb
          backHref={`/cases/${caseType}/district-wise`}
          backLabel={`Back to ${c.name} districts`}
          items={[
            { label: "Cases", href: "/cases" },
            { label: c.name, href: `/cases/${caseType}/district-wise` },
            { label: d.name, href: `/cases/${caseType}/${district}/investigation-workspace` },
          ]}
        />

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
