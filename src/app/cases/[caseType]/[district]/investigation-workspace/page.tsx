import { notFound } from "next/navigation";
import Breadcrumb from "@/components/ui/Breadcrumb";
import InvestigationWorkspaceClient from "@/components/investigation/InvestigationWorkspaceClient";
import { caseTypes, districts, getCaseType, getDistrict } from "@/lib/data";
import { getInvestigationData } from "@/lib/investigationData";
import { resolveInvestigationCase, listCasesForPair } from "@/lib/investigation/caseResolver";
import { adaptToLegacyTimelineEvents } from "@/lib/investigation/adaptToTimeline";

// Always render live (see district-wise/page.tsx for why).
export const dynamic = "force-dynamic";
export function generateStaticParams() {
  return caseTypes.flatMap((c) =>
    districts.map((d) => ({ caseType: c.slug, district: d.slug }))
  );
}

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

  // Step 3 (Timeline only): the rest of `data` (graph, evidence, ai,
  // entities) is still the mock generator's output, unchanged, pending
  // later steps. Only `timeline` is overridden here with the real,
  // synthetic-dataset-derived timeline for this (caseType, district) pair
  // — resolved with no caseId, the same workspace-level rule Step 2
  // established (deterministic primary = lowest CaseMasterID among all
  // matching FIRs). If no synthetic scenario resolves for this pair, the
  // timeline is explicitly empty — never a fabricated substitute, and
  // TimelinePanel (untouched) already renders an empty list gracefully.
  const lookup = resolveInvestigationCase(caseType, district);
  const timeline = lookup.status === "ok" && lookup.investigationCase
    ? adaptToLegacyTimelineEvents(lookup.investigationCase)
    : [];
  const workspaceData = { ...data, timeline };
  // Real case files for this pair — fixes the dead-end 404: the old fake
  // 3-item list produced links (FIR-1001 etc.) that no longer resolve
  // against the real, caseId-based case-files route.
  const realCaseFiles = listCasesForPair(caseType, district);

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
          data={workspaceData}
          caseTypeName={c.name}
          districtName={d.name}
          base={base}
          caseFiles={realCaseFiles}
          caseTypeSlug={caseType}
          districtSlug={district}
        />
      </div>
    </main>
  );
}
