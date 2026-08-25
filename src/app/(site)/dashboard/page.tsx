import Link from "next/link";
import { FileStack, ShieldCheck, Users, Gauge, Phone } from "lucide-react";
import StatCard from "@/components/dashboard/StatCard";
import CrimeTrendChart from "@/components/dashboard/CrimeTrendChart";
import CategoryDonut from "@/components/dashboard/CategoryDonut";
import HotspotsMini from "@/components/dashboard/HotspotsMini";
import FeaturedInvestigationCard from "@/components/dashboard/FeaturedInvestigationCard";
import AlertsPanel from "@/components/dashboard/AlertsPanel";
import EvidenceFeedStrip from "@/components/dashboard/EvidenceFeedStrip";
import { getSummary, getCaseTypes } from "@/lib/api";
import { getFeaturedScenario, getRealAlerts, getRealEvidenceFeed, districtLabel } from "@/lib/dashboardData";
import DistrictFilter from "@/components/dashboard/DistrictFilter";

// -----------------------------------------------------------------------------
// /dashboard — a dense analytics home behind the shared sidebar shell (see
// (site)/layout.tsx). Distinct from the Home welcome page at "/" (outside
// this route group) - Home is the public landing screen, this is the
// officer-facing analytics view it links into. Every number here is either
// live from Catalyst (via getSummary/getCaseTypes, same fallback-on-error
// pattern as the rest of the site) or real seeded case data (Featured
// Investigation, Alerts, Evidence Feed - see src/lib/dashboardData.ts) -
// nothing fabricated, including no invented "vs last month" deltas the seed
// data can't back.
//
// The default view is statewide - this is SCRB's screen (see
// RESEARCH_AND_PLAN.md 1.2). `?district=<DistrictID>` narrows every number,
// the featured case, alerts and the evidence feed to one district, which is
// the PS's "District-Level Drill-down" ask.
//
// District is a FILTER in the URL, not a role in a cookie. It used to be a
// login-time scope, which implied an access boundary this app does not have
// (there is no signed-in identity - AuthGate is off) and which nobody asked
// for: the PS wants SCRB to drill into districts, not district officers to
// get restricted logins. A URL filter is also shareable and bookmarkable,
// which a cookie mode is not.
// -----------------------------------------------------------------------------
export const metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ district?: string }>;
}) {
  const { district } = await searchParams;
  const parsed = Number(district);
  const districtId = Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;

  const [summary, caseTypes] = await Promise.all([getSummary(districtId), getCaseTypes(districtId)]);

  const featured = getFeaturedScenario(districtId);
  const alerts = getRealAlerts(3, districtId);
  const evidenceFeed = getRealEvidenceFeed(8, districtId);

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 p-6">
      <DistrictFilter districtId={districtId} />

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          label="Total FIRs"
          value={summary.totalCases.toLocaleString("en-IN")}
          hint={districtId !== undefined ? districtLabel(districtId) : "Across all categories"}
          icon={<FileStack size={20} aria-hidden="true" />}
          accent="blue"
          trend={summary.yearlyTrend}
        />
        <StatCard
          label="Solved Cases"
          value={summary.solvedCases.toLocaleString("en-IN")}
          hint="Charge-sheeted or closed"
          icon={<ShieldCheck size={20} aria-hidden="true" />}
          accent="teal"
          trend={summary.yearlySolved}
        />
        <StatCard
          label="Active Investigations"
          value={summary.activeInvestigations.toLocaleString("en-IN")}
          hint="Currently open"
          icon={<Users size={20} aria-hidden="true" />}
          accent="orange"
          trend={summary.yearlyTrend.map((t, i) => t - summary.yearlySolved[i])}
        />
        <StatCard
          label="Crime Detection Rate"
          value={`${summary.detectionRate}%`}
          hint="Solved ÷ registered"
          icon={<Gauge size={20} aria-hidden="true" />}
          accent="purple"
        />
        <StatCard
          label="Emergency Helpline"
          value="112"
          hint="24×7 emergency response"
          icon={<Phone size={20} aria-hidden="true" />}
          accent="pink"
        />
      </div>

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

      {/* Featured investigation + alerts */}
      {(featured || alerts.length > 0) && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.6fr_1fr]">
          {featured ? (
            <FeaturedInvestigationCard scenario={featured} />
          ) : (
            <div className="flex items-center justify-center rounded-xl border border-dashed border-line bg-surface p-8 text-center text-sm text-muted">
              No case currently on record as this district&apos;s own investigation in the seeded dataset — cases
              touching {districtId ? districtLabel(districtId) : "this district"} may be assigned to CID, or run
              jointly with a neighbouring district (see Alerts).
            </div>
          )}
          <AlertsPanel alerts={alerts} />
        </div>
      )}

      {/* Verified evidence feed */}
      <EvidenceFeedStrip items={evidenceFeed} />
    </div>
  );
}
