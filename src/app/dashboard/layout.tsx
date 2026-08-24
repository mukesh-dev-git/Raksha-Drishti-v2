import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import DashboardTopbar from "@/components/dashboard/DashboardTopbar";
import { getRealAlerts } from "@/lib/dashboardData";

// -----------------------------------------------------------------------------
// /dashboard's own shell - persistent sidebar + top bar - deliberately NOT
// shared with the rest of the site (see (site)/layout.tsx, which still
// carries the emergency bar / masthead / horizontal nav everywhere else).
// A route-group split, not a per-page condition: this is Next's supported
// way for one subtree to run a different top-level shell without touching
// any other route's chrome or URLs.
// -----------------------------------------------------------------------------
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const alertCount = getRealAlerts().length;

  return (
    <div className="flex min-h-screen flex-1">
      <DashboardSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardTopbar alertCount={alertCount} />
        <div id="main-content" className="flex-1 bg-paper">
          {children}
        </div>
      </div>
    </div>
  );
}
