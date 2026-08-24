import { LayoutDashboard, BarChart3, MapPin, FolderKanban } from "lucide-react";
import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";
import LinkCard from "@/components/LinkCard";
import StatTile from "@/components/ui/StatTile";
import ScrollZoomHero from "@/components/dashboard/ScrollZoomHero";
import { getSummary } from "@/lib/api";

// -----------------------------------------------------------------------------
// "/" — Home. The public-facing welcome screen, reached BEFORE the officer
// analytics dashboard: photographic hero, a brief real-numbers summary, and
// the four modules to enter. Deliberately outside the (site) route group
// (see (site)/layout.tsx) so it keeps the original government-portal
// masthead/footer chrome instead of the sidebar shell every page past this
// one uses - a landing screen, not part of the internal app shell.
// -----------------------------------------------------------------------------
export const metadata = { title: "Home" };
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const summary = await getSummary();

  return (
    <>
      <SiteHeader />
      <div id="main-content" className="flex-1">
        <main>
          <ScrollZoomHero />

          <div className="mx-auto max-w-content px-4">
            <section aria-label="Summary statistics" className="mt-10">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatTile label="Registered cases" value={summary.totalCases.toLocaleString("en-IN")} hint="Across all categories" />
                <StatTile label="Crime categories" value={String(summary.crimeCategories)} hint="Tracked case types" />
                <StatTile label="Districts covered" value={String(summary.districtsCovered)} hint="Statewide reporting" />
                <StatTile label="Helpline" value="112" hint="24×7 emergency response" />
              </div>
            </section>

            <section aria-labelledby="modules-heading" className="mt-12 pb-16">
              <h2 id="modules-heading" className="text-xl font-semibold text-navy">
                Enter the portal
              </h2>
              <p className="mt-1 text-muted">Choose where you&apos;d like to start.</p>

              <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <LinkCard
                  href="/dashboard"
                  title="Dashboard"
                  icon={<LayoutDashboard size={20} />}
                  subtitle="The full analytics home — stats, trends, hotspots, and a live investigation feed."
                />
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
      </div>
      <SiteFooter />
    </>
  );
}
