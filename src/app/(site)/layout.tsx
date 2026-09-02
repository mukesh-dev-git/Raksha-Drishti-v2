import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import DashboardTopbar from "@/components/dashboard/DashboardTopbar";
import SiteFooter from "@/components/layout/SiteFooter";
import AskAnything from "@/components/AskAnything";
import { getRealAlerts } from "@/lib/dashboardData";

// -----------------------------------------------------------------------------
// (site) route group — every page EXCEPT the Home welcome screen (see
// src/app/page.tsx, which lives outside this group on purpose): Dashboard,
// Cases, Crime Count, Crime Hotspots, and everything under them all share
// this persistent sidebar + top bar shell, plus the same SiteFooter Home
// uses (kept on every page for a consistent look, not just Home). Originally
// this shell was dashboard-only (see git history around 2026-08-24) - now
// applied site-wide per an explicit follow-up request, with Home carved out
// as a distinct pre-shell landing page instead of folding it in here too.
//
// This shell is scope-free on purpose. District used to be a login-time
// role read from a cookie here and threaded through the sidebar, topbar and
// every page below. It is now a drill-down FILTER owned by the page that
// uses it (?district= on /dashboard), because that is what the PS actually
// asks for - SCRB narrowing a statewide view, not a district officer with a
// restricted login. See PLAN.md and RESEARCH_AND_PLAN.md 1.2.
//
// Route groups are purely organizational and don't affect URLs - moving
// pages in/out of this group never changes any page's path.
// -----------------------------------------------------------------------------
// P10 Phase 4 (2026-09-02) found the problem: getSearchIndex() went live
// (getCaseWorklist() -> getLiveCaseFacts()) and this layout wraps every
// page in the site, so a cold live-cache cost the WHOLE SHELL, not just
// /cases - no per-route loading.tsx skeleton can mask a slow *layout*
// await, since a layout renders outside the Suspense boundary its own
// child route's loading.tsx creates.
//
// Loading-skeleton pass (2026-09-03) fixed it: getSearchIndex() is no
// longer called here at all. DashboardTopbar now fetches it itself, client
// side, from /api/search-index - see that route's own comment. This
// layout is back to purely synchronous work (getRealAlerts() is bundled,
// not live), so the shell renders instantly on every navigation again.
export default function ShellLayout({ children }: { children: React.ReactNode }) {
  const alertCount = getRealAlerts(3).length;

  return (
    <div className="flex min-h-screen flex-1">
      <DashboardSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardTopbar alertCount={alertCount} />
        <div id="main-content" className="flex-1 bg-paper">
          {children}
        </div>
        {/* Kept intact (unmodified) at the request of the person reviewing
            this redesign, for a consistent, professional look across every
            page - not just the Home welcome screen. */}
        <SiteFooter />
      </div>
      {/* P5.8 - site-wide, per PLAN.md's own framing ("persistent... not
          page-scoped"). Mounted here, not in the root layout, so it follows
          the same "every page except Home" boundary this shell already
          draws for everything else (see the module comment above). */}
      <AskAnything />
    </div>
  );
}
