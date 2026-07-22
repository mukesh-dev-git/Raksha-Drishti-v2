import { BarChart3, MapPin, FolderKanban } from "lucide-react";
import LinkCard from "@/components/LinkCard";
import StatTile from "@/components/ui/StatTile";
import ScrollZoomHero from "@/components/dashboard/ScrollZoomHero";
import { caseTypes, districts } from "@/lib/data";

// -----------------------------------------------------------------------------
// /dashboard — portal home. Animated photographic hero, a summary stat row,
// and the three primary modules as solid cards.
// -----------------------------------------------------------------------------
export const metadata = { title: "Home" };

const totalCases = caseTypes.reduce((sum, c) => sum + c.total, 0);

export default function DashboardPage() {
  return (
    <main id="dashboard">
      <ScrollZoomHero />

      <div className="mx-auto max-w-content px-4">
        {/* Summary stats */}
        <section aria-label="Summary statistics" className="mt-10">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile label="Registered cases" value={totalCases.toLocaleString("en-IN")} hint="Across all categories" />
            <StatTile label="Crime categories" value={String(caseTypes.length)} hint="Tracked case types" />
            <StatTile label="Districts covered" value={String(districts.length)} hint="Statewide reporting" />
            <StatTile label="Helpline" value="112" hint="24×7 emergency response" />
          </div>
        </section>

        {/* Primary modules */}
        <section aria-labelledby="modules-heading" className="mt-12">
          <h2 id="modules-heading" className="text-xl font-semibold text-navy">
            Explore the portal
          </h2>
          <p className="mt-1 text-muted">Choose a module to get started.</p>

          <div className="mt-6 grid gap-6 sm:grid-cols-3">
            <LinkCard
              href="/crime-count"
              title="Crime Count"
              icon={<BarChart3 size={20} />}
              subtitle="Totals and trends across crime categories, time periods, and regions."
            />
            <LinkCard
              href="/crime-hotspots"
              title="Crime Hotspots"
              icon={<MapPin size={20} />}
              subtitle="Where incidents concentrate — identify and monitor high-risk areas."
            />
            <LinkCard
              href="/cases"
              title="Cases"
              icon={<FolderKanban size={20} />}
              subtitle="Drill from case types to district counts and individual investigations."
            />
          </div>
        </section>
      </div>
    </main>
  );
}
