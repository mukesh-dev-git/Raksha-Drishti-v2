import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";

// -----------------------------------------------------------------------------
// (site) route group — every page EXCEPT /dashboard: the emergency bar,
// government masthead, and horizontal nav that make this read as an official
// police portal. Split out of the root layout so /dashboard can run its own
// sidebar shell (see src/app/dashboard/layout.tsx) without dragging this
// chrome along - route groups are purely organizational and don't affect
// URLs, so nothing here changes any page's path.
// -----------------------------------------------------------------------------
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <div id="main-content" className="flex-1">
        {children}
      </div>
      <SiteFooter />
    </>
  );
}
