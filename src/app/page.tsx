import HomeHeader from "@/components/home/HomeHeader";
import HomeHero from "@/components/home/HomeHero";
import StatStrip from "@/components/home/StatStrip";
import FeatureGrid from "@/components/home/FeatureGrid";
import MissionStrip from "@/components/home/MissionStrip";
import LoginPanel from "@/components/home/LoginPanel";
import SiteFooter from "@/components/layout/SiteFooter";
import { getSummary } from "@/lib/api";

// -----------------------------------------------------------------------------
// "/" — Home. The public welcome screen, reached BEFORE the officer
// analytics dashboard: a marketing-style left column (hero with a live
// stats/trend/hotspots preview, a stat strip, feature cards, mission strip,
// footer) alongside a persistent login sidebar on the right. Deliberately
// outside the (site) route group (see (site)/layout.tsx) so it keeps its
// own header instead of the sidebar shell every page past this one uses.
//
// Every number is real (getSummary(), same fallback pattern as elsewhere) -
// see StatStrip.tsx and MissionStrip.tsx for the two places the reference
// design had a claim this app has no data to back, and what replaced it.
// LoginPanel.tsx explains why the login form doesn't just fake a sign-in.
// -----------------------------------------------------------------------------
export const metadata = { title: "Home" };
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const summary = await getSummary();

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <div className="flex min-w-0 flex-1 flex-col">
        <HomeHeader />
        <main id="main-content" className="flex-1">
          <HomeHero summary={summary} />
          <StatStrip summary={summary} />
          <FeatureGrid />
          <MissionStrip />
        </main>
        <SiteFooter />
      </div>
      <LoginPanel />
    </div>
  );
}
