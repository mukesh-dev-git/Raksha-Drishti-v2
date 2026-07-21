import Link from "next/link";
import { ArrowRight } from "lucide-react";
import PageShell from "@/components/PageShell";
import { caseTypes } from "@/lib/data";

// -----------------------------------------------------------------------------
// /cases — lists case types. Presented as a clean, scannable grid of official
// cards. Click one to see its district-wise breakdown.
// -----------------------------------------------------------------------------
export const metadata = { title: "Cases" };

export default function CasesPage() {
  return (
    <PageShell
      title="Cases"
      description="Select a crime category to view how cases are distributed across districts, then drill into a district's investigation workspace."
      breadcrumbs={[{ label: "Cases", href: "/cases" }]}
    >
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {caseTypes.map((c) => (
          <li key={c.slug}>
            <Link
              href={`/cases/${c.slug}/district-wise`}
              className="group flex items-center justify-between rounded border border-line bg-surface p-5 shadow-sm hover:border-navy hover:shadow-md"
            >
              <span>
                <span className="block text-base font-semibold text-navy">
                  {c.name}
                </span>
                <span className="mt-1 block text-sm text-muted">
                  {c.total.toLocaleString("en-IN")} registered cases
                </span>
              </span>
              <ArrowRight
                size={18}
                aria-hidden="true"
                className="text-line-strong group-hover:text-navy"
              />
            </Link>
          </li>
        ))}
      </ul>
    </PageShell>
  );
}
