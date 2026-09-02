import PageShell from "@/components/PageShell";
import { SkelStatRow, SkelFilterBar, SkelTable } from "@/components/ui/Skeleton";

// Title/description are static copy, not data - shown for real immediately
// (matches cases/page.tsx exactly) so only the worklist itself, which
// depends on the live getCaseWorklist() fetch, shows as loading.
export default function CasesLoading() {
  return (
    <PageShell
      title="Cases"
      description="Every registered case, searchable and filterable — open a row for the full case record. Not a category picker."
      breadcrumbs={[{ label: "Cases", href: "/cases" }]}
    >
      <div className="space-y-5">
        <SkelStatRow />
        <SkelFilterBar selects={2} />
        <SkelTable rows={10} cols={6} />
      </div>
    </PageShell>
  );
}
