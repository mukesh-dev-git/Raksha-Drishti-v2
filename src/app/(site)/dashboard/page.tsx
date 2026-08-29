import Link from "next/link";
import { FileStack, ShieldCheck, Users, Gauge, Phone, Waypoints, ShieldAlert } from "lucide-react";
import StatStrip, { type StripStat } from "@/components/dashboard/StatStrip";
import AttentionSignals, { type AttentionSignal } from "@/components/dashboard/AttentionSignals";
import CrimeTrendChart from "@/components/dashboard/CrimeTrendChart";
import CategoryDonut from "@/components/dashboard/CategoryDonut";
import HotspotsMini from "@/components/dashboard/HotspotsMini";
import FeaturedInvestigationCard from "@/components/dashboard/FeaturedInvestigationCard";
import AlertsPanel from "@/components/dashboard/AlertsPanel";
import EvidenceFeedStrip from "@/components/dashboard/EvidenceFeedStrip";
import { getSummary, getCaseTypes } from "@/lib/api";
import { getFeaturedScenario, getRealAlerts, getRealEvidenceFeed, districtSetLabel } from "@/lib/dashboardData";
import { getMoPatternClusters } from "@/lib/moPatterns";
import { getRepeatCaseSuspects } from "@/lib/personFusion";
import DistrictFilter from "@/components/dashboard/DistrictFilter";

// -----------------------------------------------------------------------------
// /dashboard — P2.3: rebuilt as an attention list. Alerts and cross-district
// pattern signals come first now; the 5 stat totals that used to open the
// page are demoted to a compact strip underneath them, not the first thing
// SCRB sees. Distinct from the Home welcome page at "/" (outside this route
// group) - Home is the public landing screen, this is the officer-facing
// analytics view it links into. Every number here is either live from
// Catalyst (getSummary/getCaseTypes) or real seeded case data - nothing
// fabricated, including no invented "vs last month" deltas the seed data
// can't back.
//
// The default view is statewide - this is SCRB's screen (see
// RESEARCH_AND_PLAN.md 1.2). `?district=<DistrictID>[,<DistrictID>...]`
// narrows the totals, the featured case, alerts and the evidence feed to
// one district (PS's "District-Level Drill-down") OR a Range's districts
// (X1, RESEARCH_AND_PLAN.md §1.4a - "a coarser filter option", comma-
// separated, not a third role). The two attention-list pattern signals stay
// statewide regardless of the filter (see AttentionSignals.tsx for why - a
// cross-district finding scoped to one district isn't one).
//
// District is a FILTER in the URL, not a role in a cookie - see git history/
// PLAN.md for why a login-time scope was rejected.
// -----------------------------------------------------------------------------
export const metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ district?: string }>;
}) {
  const { district } = await searchParams;
  // X1 - comma-separated for a Range selection (e.g. "4401,4406"), still a
  // single value for a plain district pick (e.g. "4401") - one parse path
  // for both, per RESEARCH_AND_PLAN.md §1.4a's "district-set test".
  const districtIds = district
    ? district.split(",").map(Number).filter((n) => Number.isFinite(n) && n > 0)
    : [];
  const hasFilter = districtIds.length > 0;

  const [summary, caseTypes] = await Promise.all([
    getSummary(hasFilter ? districtIds : undefined),
    getCaseTypes(hasFilter ? districtIds : undefined),
  ]);

  const featured = getFeaturedScenario(hasFilter ? districtIds : undefined);
  const alerts = getRealAlerts(3, hasFilter ? districtIds : undefined);
  const evidenceFeed = getRealEvidenceFeed(8, hasFilter ? districtIds : undefined);

  const clusters = getMoPatternClusters();
  const exactClusters = clusters.filter((c) => c.strength === "exact").length;
  const repeatSubjects = getRepeatCaseSuspects();

  const signals: AttentionSignal[] = [
    ...(clusters.length > 0
      ? [{
          href: "/pattern-analysis",
          icon: Waypoints,
          accent: "purple" as const,
          title: `${clusters.length} MO pattern cluster${clusters.length === 1 ? "" : "s"} found`,
          detail: `${exactClusters} exact section match${exactClusters === 1 ? "" : "es"}, statewide`,
        }]
      : []),
    ...(repeatSubjects.length > 0
      ? [{
          href: "/repeat-offenders",
          icon: ShieldAlert,
          accent: "pink" as const,
          title: `${repeatSubjects.length} repeat subject${repeatSubjects.length === 1 ? "" : "s"} flagged`,
          detail: "Named across 2+ cases, statewide",
        }]
      : []),
  ];

  const stats: StripStat[] = [
    { label: "Total FIRs", value: summary.totalCases.toLocaleString("en-IN"), icon: <FileStack size={18} /> },
    { label: "Solved", value: summary.solvedCases.toLocaleString("en-IN"), icon: <ShieldCheck size={18} /> },
    { label: "Active", value: summary.activeInvestigations.toLocaleString("en-IN"), icon: <Users size={18} /> },
    { label: "Detection Rate", value: `${summary.detectionRate}%`, icon: <Gauge size={18} /> },
    { label: "Emergency Helpline", value: "112", icon: <Phone size={18} /> },
  ];

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 p-6">
      <DistrictFilter districtIds={districtIds} />

      {/* Attention list - alerts and cross-district pattern signals first */}
      <div className="space-y-3">
        <AttentionSignals signals={signals} />
        {(featured || alerts.length > 0) && (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.6fr_1fr]">
            {featured ? (
              <FeaturedInvestigationCard scenario={featured} />
            ) : (
              <div className="flex items-center justify-center rounded-xl border border-dashed border-line bg-surface p-8 text-center text-sm text-muted">
                No case currently on record as this district&apos;s own investigation in the seeded dataset — cases
                touching {hasFilter ? districtSetLabel(districtIds) : "this district"} may be assigned to CID, or run
                jointly with a neighbouring district (see Alerts).
              </div>
            )}
            <AlertsPanel alerts={alerts} />
          </div>
        )}
      </div>

      {/* Totals - demoted to a compact strip */}
      <StatStrip stats={stats} />

      {/* Trend + category + hotspots */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.4fr_1fr_1fr]">
        <div className="rounded-xl border border-line bg-surface p-5 shadow-sm">
          <p className="text-[15px] font-semibold text-ink">Crime Trend Overview</p>
          <p className="text-xs text-muted">Registered vs. solved, by year (real seed data - too small a sample for a monthly view)</p>
          <div className="mt-4">
            <CrimeTrendChart years={summary.years} total={summary.yearlyTrend} solved={summary.yearlySolved} />
          </div>
        </div>

        <div className="rounded-xl border border-line bg-surface p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[15px] font-semibold text-ink">Crime by Category</p>
            <Link href="/crime-count" className="text-xs font-medium text-dash-blue hover:underline">
              View All
            </Link>
          </div>
          <div className="mt-4">
            <CategoryDonut data={caseTypes.map((c) => ({ name: c.name, total: c.total }))} />
          </div>
        </div>

        <HotspotsMini />
      </div>

      {/* Verified evidence feed */}
      <EvidenceFeedStrip items={evidenceFeed} />
    </div>
  );
}
