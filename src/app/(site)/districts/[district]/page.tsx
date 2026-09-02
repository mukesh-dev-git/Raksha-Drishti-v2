import { notFound } from "next/navigation";
import { FolderKanban, ShieldAlert, PieChart } from "lucide-react";
import PageShell from "@/components/PageShell";
import CaseWorklistClient from "@/components/cases/CaseWorklistClient";
import { getDistrictStat } from "@/lib/districtStats";

// -----------------------------------------------------------------------------
// P2.1b - a single district's real case list and pendency, replacing the
// case-type-gated investigation-workspace. Crime type is a filter on the
// case list below (reusing CaseWorklistClient, pre-scoped to this
// district), not a path segment above this page.
// -----------------------------------------------------------------------------
export async function generateMetadata({ params }: { params: Promise<{ district: string }> }) {
  const { district } = await params;
  const d = await getDistrictStat(district);
  return { title: d ? d.name : "District not found" };
}

export default async function DistrictDetailPage({ params }: { params: Promise<{ district: string }> }) {
  const { district } = await params;
  const d = await getDistrictStat(district);
  if (!d) notFound();

  return (
    <PageShell
      title={d.name}
      description="Real case list and pendency for this district — every crime type, not gated by one."
      breadcrumbs={[
        { label: "Districts", href: "/districts" },
        { label: d.name, href: `/districts/${d.slug}` },
      ]}
    >
      {/* CaseWorklistClient below already shows total / status-breakdown
          tiles for whatever `cases` it's given - these two are the district-
          specific numbers it doesn't have: clearance rate and repeat
          subjects (cross-referenced against personFusion's repeat-offender
          register, not just this district's own case count). */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:w-1/2">
        <StatTile icon={PieChart} label="Clearance rate" value={`${d.clearanceRate}%`} hint="Charge-sheeted or closed" />
        <StatTile icon={ShieldAlert} label="Repeat subjects" value={String(d.repeatSubjectCount)} hint="Named across 2+ cases" />
      </div>

      {d.totalCases === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-surface p-8 text-center text-sm text-muted">
          No cases on file for {d.name} in the current seeded dataset.
        </div>
      ) : (
        <CaseWorklistClient cases={d.cases} hideDistrictFilter />
      )}
    </PageShell>
  );
}

function StatTile({ icon: Icon, label, value, hint }: { icon: typeof FolderKanban; label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-line bg-surface p-3.5 shadow-sm">
      <span className="flex items-center gap-1.5 text-[11.5px] text-muted">
        <Icon size={13} aria-hidden="true" /> {label}
      </span>
      <p className="mt-1 text-xl font-semibold text-navy tabular-nums">{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-muted">{hint}</p>}
    </div>
  );
}
