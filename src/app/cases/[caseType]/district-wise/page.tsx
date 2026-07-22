import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, TrendingUp, TrendingDown } from "lucide-react";
import PageShell from "@/components/PageShell";
import Sparkline from "@/components/ui/Sparkline";
import StatusBadge from "@/components/ui/StatusBadge";
import { districts, getCaseType, trendYears } from "@/lib/data";

// Clearance rate thresholds — mirrors the muted, functional status system
// used throughout the portal (StatusBadge). Never colour alone: each badge
// pairs an icon with the rate as text.
function clearanceStatus(rate: number): "verified" | "pending" | "alert" {
  if (rate >= 60) return "verified";
  if (rate >= 35) return "pending";
  return "alert";
}

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
  const firstYear = trendYears[0];
  const lastYear = trendYears[trendYears.length - 1];

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
                Trend {firstYear}–{lastYear}
              </th>
              <th scope="col" className="hidden px-4 py-3 font-medium md:table-cell">
                Clearance Rate
              </th>
              <th scope="col" className="px-4 py-3 text-right font-medium">
                <span className="sr-only">Open workspace</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((d) => {
              const first = d.trend[0];
              const last = d.trend[d.trend.length - 1];
              const pct = Math.round(((last - first) / first) * 100);
              const up = pct >= 0;
              const TrendIcon = up ? TrendingUp : TrendingDown;
              return (
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
                  <div className="flex items-center gap-3">
                    <Sparkline
                      data={d.trend}
                      width={96}
                      height={28}
                      ariaLabel={`${d.name} ${c.name.toLowerCase()} cases went from ${first} in ${firstYear} to ${last} in ${lastYear}, ${up ? "up" : "down"} ${Math.abs(pct)} percent.`}
                    />
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-ink">
                      <TrendIcon size={14} aria-hidden="true" />
                      {up ? "+" : "−"}{Math.abs(pct)}%
                    </span>
                  </div>
                </td>
                <td className="hidden px-4 py-3 md:table-cell">
                  <StatusBadge
                    status={clearanceStatus(d.clearanceRate)}
                    label={`${d.clearanceRate}% cleared`}
                  />
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
              );
            })}
          </tbody>
        </table>
      </div>
    </PageShell>
  );
}
