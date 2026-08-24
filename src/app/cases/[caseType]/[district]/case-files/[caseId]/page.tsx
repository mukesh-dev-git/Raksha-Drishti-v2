import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FolderOpen } from "lucide-react";
import Breadcrumb from "@/components/ui/Breadcrumb";
import CaseWorkspaceShell from "@/components/investigation/CaseWorkspaceShell";
import { caseTypes, districts, getCaseType, getDistrict } from "@/lib/data";
import { resolveInvestigationCase, listCasesForPair } from "@/lib/investigation/caseResolver";
import { adaptToOverview } from "@/lib/investigation/adaptToOverview";
import { adaptToTimelineDetail } from "@/lib/investigation/adaptToTimeline";
import { adaptToInvestigation } from "@/lib/investigation/adaptToInvestigation";
import { adaptToCaseFileRecord } from "@/lib/investigation/adaptToCaseFileRecord";
import { adaptToPeople } from "@/lib/investigation/adaptToPeople";
import { adaptToEvidence } from "@/lib/investigation/adaptToEvidence";
import { adaptToMore } from "@/lib/investigation/adaptToMore";

// Always render live (see district-wise/page.tsx for why).
export const dynamic = "force-dynamic";
export function generateStaticParams() {
  // Real (caseType, district, caseId) combinations only — the old version
  // of this list paired every district with the same 3 fake FIR ids
  // regardless of whether they actually existed there.
  return caseTypes.flatMap((c) =>
    districts.flatMap((d) =>
      listCasesForPair(c.slug, d.slug).map((f) => ({ caseType: c.slug, district: d.slug, caseId: f.id }))
    )
  );
}

// -----------------------------------------------------------------------------
// /cases/[caseType]/[district]/case-files/[caseId]
// The case-level workspace shell (Overview | Timeline | Investigation |
// People | Evidence | Case Files | More). Case Files renders the structured
// case-file record (CaseFileRecordPanel), not the older flipbook.
// -----------------------------------------------------------------------------
export default async function CaseBookletPage({
  params,
}: {
  params: Promise<{ caseType: string; district: string; caseId: string }>;
}) {
  const { caseType, district, caseId } = await params;
  const c = getCaseType(caseType);
  const d = getDistrict(district);
  if (!c || !d) notFound();

  // Resolves against the synthetic seeded development dataset only — no RNG,
  // no fabricated substitute. An unsupported (caseType, district) pair or a
  // caseId that doesn't match one of that pair's real FIRs both fall through
  // to the same notFound() the route already used for an invalid caseId,
  // reusing the existing not-found UI rather than inventing a new one.
  const lookup = resolveInvestigationCase(caseType, district, caseId);
  if (lookup.status !== "ok" || !lookup.investigationCase || lookup.primaryFirCaseMasterId === undefined) {
    notFound();
  }

  const base = `/cases/${caseType}/${district}`;
  const overview = adaptToOverview(lookup.investigationCase, lookup.primaryFirCaseMasterId);
  const timeline = adaptToTimelineDetail(lookup.investigationCase);
  const investigation = adaptToInvestigation(lookup.investigationCase, lookup.primaryFirCaseMasterId);
  const caseFileRecord = adaptToCaseFileRecord(lookup.investigationCase, lookup.primaryFirCaseMasterId);
  const people = adaptToPeople(lookup.investigationCase);
  const evidence = adaptToEvidence(lookup.investigationCase);
  const more = adaptToMore(lookup.investigationCase);

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
              { label: caseId, href: `${base}/case-files/${caseId}` },
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

        <CaseWorkspaceShell
          overview={overview}
          timeline={timeline}
          investigation={investigation}
          caseFileRecord={caseFileRecord}
          people={people}
          evidence={evidence}
          more={more}
        />
      </div>
    </main>
  );
}
