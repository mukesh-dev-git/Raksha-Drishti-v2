import Link from "next/link";
import { MapPin, FolderKanban, ShieldAlert } from "lucide-react";
import PageShell from "@/components/PageShell";
import { getDistrictStats } from "@/lib/districtStats";

// -----------------------------------------------------------------------------
// P2.1b - the district-first analytics lens: pendency and clearance per
// district, decoupled from crime type (crime type is a filter on the
// district's own case list, not a path segment above it). Replaces the
// real half of the old case-type-scoped district-wise page.
// -----------------------------------------------------------------------------
export const metadata = { title: "Districts" };

export default async function DistrictsIndexPage() {
  const districts = await getDistrictStats();

  return (
    <PageShell
      title="Districts"
      description="Pendency and clearance across every district, real cases only. Open one for its full case list."
      breadcrumbs={[{ label: "Districts", href: "/districts" }]}
      heroImageSrc="/page-hero/districts.png"
    >
      <div className="space-y-1.5">
        {districts.map((d) => (
          <Link
            key={d.slug}
            href={`/districts/${d.slug}`}
            className="flex items-center gap-4 rounded-xl border border-line bg-surface px-4 py-3.5 shadow-sm transition hover:border-navy"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-dash-blue-bg text-[12px] font-semibold text-dash-blue">
              {d.name.slice(0, 2).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-medium text-navy">{d.name}</span>
              <span className="mt-0.5 flex flex-wrap items-center gap-3 text-[12px] text-muted">
                <span className="flex items-center gap-1"><FolderKanban size={12} aria-hidden="true" /> {d.totalCases} cases</span>
                <span className="flex items-center gap-1"><MapPin size={12} aria-hidden="true" /> {d.clearanceRate}% clearance</span>
              </span>
            </span>
            {d.repeatSubjectCount > 0 && (
              <span className="flex shrink-0 items-center gap-1 rounded-full bg-dash-pink-bg px-2.5 py-1 text-[11px] font-medium text-dash-pink">
                <ShieldAlert size={12} aria-hidden="true" /> {d.repeatSubjectCount} repeat subject{d.repeatSubjectCount === 1 ? "" : "s"}
              </span>
            )}
          </Link>
        ))}
      </div>
    </PageShell>
  );
}
