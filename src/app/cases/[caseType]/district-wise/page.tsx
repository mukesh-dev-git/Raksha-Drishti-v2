import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import PageShell from "@/components/PageShell";
import { districts, getCaseType } from "@/lib/data";

// -----------------------------------------------------------------------------
// /cases/[caseType]/district-wise
// District-wise count for the selected case, shown as an ordered, scannable
// table. Each row opens that district's investigation workspace.
// -----------------------------------------------------------------------------
export async function generateMetadata({
  params,
}: {
  params: Promise<{ caseType: string }>;
}) {
  const { caseType } = await params;
  const c = getCaseType(caseType);
  return { title: c ? `${c.name} — District-wise` : "District-wise" };
}

export default async function DistrictWisePage({
  params,
}: {
  params: Promise<{ caseType: string }>;
}) {
  const { caseType } = await params;
  const c = getCaseType(caseType);
  if (!c) notFound();

  const ranked = [...districts].sort((a, b) => b.count - a.count);
  const max = ranked[0]?.count ?? 1;

  return (
    <PageShell
      title={`${c.name} — District-wise`}
      description="Case counts for each district. Select a district to open its investigation workspace."
      breadcrumbs={[
        { label: "Cases", href: "/cases" },
        { label: c.name, href: `/cases/${caseType}/district-wise` },
      ]}
    >
      <div className="overflow-hidden rounded border border-line bg-surface shadow-sm">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">
            {c.name} cases by district, ranked highest to lowest
          </caption>
          <thead>
            <tr className="border-b border-line bg-surface-2 text-xs uppercase tracking-wide text-muted">
              <th scope="col" className="px-4 py-3 font-medium">District</th>
              <th scope="col" className="px-4 py-3 font-medium">Cases</th>
              <th scope="col" className="hidden px-4 py-3 font-medium sm:table-cell">
                Share
              </th>
              <th scope="col" className="px-4 py-3 text-right font-medium">
                <span className="sr-only">Open workspace</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((d) => (
              <tr key={d.slug} className="border-b border-line last:border-0 hover:bg-surface-2">
                <th scope="row" className="px-4 py-3 font-medium text-navy">
                  <Link
                    href={`/cases/${caseType}/${d.slug}/investigation-workspace`}
                    className="hover:underline"
                  >
                    {d.name}
                  </Link>
                </th>
                <td className="px-4 py-3 tabular-nums text-ink">
                  {d.count.toLocaleString("en-IN")}
                </td>
                <td className="hidden px-4 py-3 sm:table-cell">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-32 overflow-hidden rounded-sm bg-surface-2">
                      <span
                        className="block h-full bg-navy"
                        style={{ width: `${Math.round((d.count / max) * 100)}%` }}
                      />
                    </span>
                    <span className="text-xs text-muted">
                      {Math.round((d.count / max) * 100)}%
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/cases/${caseType}/${d.slug}/investigation-workspace`}
                    className="inline-flex items-center gap-1 rounded-sm border border-line px-3 py-1.5 text-xs font-medium text-navy hover:border-navy"
                  >
                    Open workspace
                    <ArrowRight size={14} aria-hidden="true" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageShell>
  );
}
