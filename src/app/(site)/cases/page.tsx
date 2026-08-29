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
    >
      <CaseWorklistClient cases={cases} />
    </PageShell>
  );
}
