import Link from "next/link";
import { FilePlus2 } from "lucide-react";
import PageShell from "@/components/PageShell";
import CaseWorklistClient from "@/components/cases/CaseWorklistClient";
import { getCaseWorklist } from "@/lib/caseWorklist";

// -----------------------------------------------------------------------------
// P2 restructure - /cases is now the FIR Index: every real case, one flat
// searchable/filterable list, not a "pick a crime type first" gate. This is
// the SHO's real worklist concept (see the CCTNS research this restructure
// was grounded in) - crime type, district and status are filters on this
// page, not path segments, per PLAN.md P2.1.
//
// Replaces the old case-type picker (CasesListClient, deleted) AND the fake
// case-files list (data.ts's caseFiles - 3 hardcoded FIR-100x rows shown
// unfiltered under every case type + district, deleted along with the
// [caseType] route tree it lived under - see caseWorklist.ts).
// -----------------------------------------------------------------------------
export const metadata = { title: "Cases" };

export default function CasesPage() {
  const cases = getCaseWorklist();
  return (
    <PageShell
      title="Cases"
      description="Every registered case, searchable and filterable — open a row for the full case record. Not a category picker."
      breadcrumbs={[{ label: "Cases", href: "/cases" }]}
      heroImageSrc="/page-hero/cases.png"
      actions={
        <Link
          href="/cases/new"
          className="flex items-center gap-1.5 rounded-sm bg-navy px-3 py-1.5 text-[12.5px] font-medium text-white hover:bg-navy-hover"
        >
          <FilePlus2 size={13} aria-hidden="true" /> New FIR
        </Link>
      }
    >
      <CaseWorklistClient cases={cases} />
    </PageShell>
  );
}
