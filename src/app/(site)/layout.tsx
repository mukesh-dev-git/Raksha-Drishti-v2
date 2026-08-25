import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import DashboardTopbar from "@/components/dashboard/DashboardTopbar";
import SiteFooter from "@/components/layout/SiteFooter";
import { getRealAlerts } from "@/lib/dashboardData";
import { getViewScope } from "@/lib/viewScope.server";

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
// Also reads the "Viewing as" scope (viewScope.ts) once here and passes it
// down - the topbar's switcher, the sidebar's district label, and every
// page under this layout all need the same scope for one consistent view.
//
// Route groups are purely organizational and don't affect URLs - moving
// pages in/out of this group never changes any page's path.
// -----------------------------------------------------------------------------
export default async function ShellLayout({ children }: { children: React.ReactNode }) {
  const scope = await getViewScope();
  const alertCount = getRealAlerts(3, scope).length;

  return (
    <div className="flex min-h-screen flex-1">
      <DashboardSidebar scope={scope} />
      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardTopbar alertCount={alertCount} scope={scope} />
        <div id="main-content" className="flex-1 bg-paper">
          {children}
        </div>
        {/* Kept intact (unmodified) at the request of the person reviewing
            this redesign, for a consistent, professional look across every
            page - not just the Home welcome screen. */}
        <SiteFooter />
      </div>
    </div>
  );
}
