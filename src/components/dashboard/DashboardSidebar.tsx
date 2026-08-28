"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Phone, ChevronLeft, ChevronRight } from "lucide-react";
import { Home, LayoutDashboard, MapPin, BarChart3, FolderKanban, Waypoints, ShieldAlert, Landmark, Users } from "lucide-react";
import { BASE_PATH } from "@/lib/basePath";

type Item = {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  badge?: "New";
};

// -----------------------------------------------------------------------------
// Every item here navigates somewhere real. This list used to carry 12 more
// entries rendered disabled with a "Soon" pill (District Performance, Trend
// Analysis, Investigation Workspace, Evidence Feed, Persons & Entities,
// Alerts & Leads, all of Reports and all of System) against 3 that worked -
// so the sidebar advertised a product four times the size of the one that
// existed, and read as abandoned rather than in progress.
//
// The route restructure in PLAN.md P2/P3 brings several of them back as real
// pages (/persons, /cases/[caseId], /trends). Add each one back HERE only
// once its page actually exists - not ahead of it. See PLAN.md P0.2.
// -----------------------------------------------------------------------------
const SECTIONS: { heading: string; items: Item[] }[] = [
  {
    heading: "Analytics",
    items: [
      { label: "Crime Overview", href: "/crime-count", icon: BarChart3 },
      { label: "Crime Hotspots", href: "/crime-hotspots", icon: MapPin },
      { label: "Pattern Analysis", href: "/pattern-analysis", icon: Waypoints },
    ],
  },
  {
    heading: "Investigation",
    items: [
      { label: "Cases", href: "/cases", icon: FolderKanban },
      { label: "Districts", href: "/districts", icon: Landmark },
      { label: "Persons", href: "/persons", icon: Users },
      { label: "Repeat Offenders", href: "/repeat-offenders", icon: ShieldAlert },
    ],
  },
];

const COLLAPSE_KEY = "rd-sidebar-collapsed";

export default function DashboardSidebar() {
  const pathname = usePathname();

  // Defaults to expanded so the server-rendered HTML and the first client
  // paint match (no access to localStorage during SSR) - the persisted
  // preference is applied a moment later in the effect below, same
  // read-after-mount pattern as every other viewer-local preference in this
  // app (AccessibilityControls' font-size/high-contrast toggles).
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
  }, []);

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      return next;
    });
  }

  return (
    <aside
      className={`sticky top-0 flex h-screen shrink-0 flex-col bg-dash-sidebar text-white/85 transition-[width] duration-200 ${
        collapsed ? "w-[68px]" : "w-64"
      }`}
    >
      {/* Brand + collapse toggle */}
      <div className={`flex items-center px-3 py-5 ${collapsed ? "justify-center" : "justify-between gap-2 px-5"}`}>
        <Link href="/" className={`flex min-w-0 items-center gap-2.5 ${collapsed ? "" : "flex-1"}`}>
          <Image
            src={`${BASE_PATH}/karnataka-state-police.png`}
            alt=""
            width={32}
            height={32}
            className="h-8 w-8 shrink-0 object-contain"
          />
          {!collapsed && (
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-[15px] font-semibold text-white">Raksha-Drishti</span>
              <span className="block truncate text-[11px] text-white/55">Crime Analytics &amp; Investigation Portal</span>
            </span>
          )}
        </Link>
        <button
          type="button"
          onClick={toggle}
          aria-expanded={!collapsed}
          aria-label={collapsed ? "Show sidebar" : "Hide sidebar"}
          title={collapsed ? "Show sidebar" : "Hide sidebar"}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-white/50 transition hover:bg-dash-sidebar-hover hover:text-white"
        >
          {collapsed ? <ChevronRight size={16} aria-hidden="true" /> : <ChevronLeft size={16} aria-hidden="true" />}
        </button>
      </div>

      {!collapsed && (
        <p className="-mt-2 px-5 pb-3 text-[10px] font-medium uppercase tracking-[0.1em] text-white/40">
          SCRB · State Crime Records Bureau
        </p>
      )}

      <nav className="scrollbar-hide flex-1 overflow-y-auto px-3 pb-4">
        <NavLink label="Home" href="/" icon={Home} active={pathname === "/"} collapsed={collapsed} />
        <NavLink
          label="Dashboard"
          href="/dashboard"
          icon={LayoutDashboard}
          active={pathname === "/dashboard"}
          collapsed={collapsed}
        />

        {SECTIONS.map((section) => (
          <div key={section.heading} className="mt-5">
            {!collapsed && (
              <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/35">
                {section.heading}
              </p>
            )}
            <div className="mt-1.5 space-y-0.5">
              {section.items.map((item) => (
                <NavLink
                  key={item.label}
                  label={item.label}
                  href={item.href}
                  icon={item.icon}
                  badge={item.badge}
                  active={pathname.startsWith(item.href)}
                  collapsed={collapsed}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Emergency quick access */}
      {collapsed ? (
        <a
          href="tel:112"
          title="Emergency 112 — 24×7 Police Helpdesk"
          className="m-3 flex flex-col items-center gap-0.5 rounded-lg bg-dash-sidebar-hover py-2.5 text-white hover:underline"
        >
          <Phone size={14} aria-hidden="true" />
          <span className="text-[13px] font-bold">112</span>
        </a>
      ) : (
        <div className="m-3 rounded-lg bg-dash-sidebar-hover p-3.5">
          <p className="flex items-center gap-1.5 text-[11px] font-medium text-white/60">
            <Phone size={12} aria-hidden="true" /> Emergency Quick Access
          </p>
          <a href="tel:112" className="mt-1.5 block text-2xl font-bold text-white hover:underline">
            112
          </a>
          <p className="text-[11px] text-white/45">24×7 Police Helpdesk</p>
        </div>
      )}
    </aside>
  );
}

function NavLink({
  label,
  href,
  icon: Icon,
  active,
  badge,
  collapsed,
}: {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  active?: boolean;
  badge?: "New";
  collapsed?: boolean;
}) {
  return (
    <Link href={href} aria-current={active ? "page" : undefined} title={collapsed ? label : undefined}>
      <span
        className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13.5px] transition ${
          collapsed ? "justify-center" : ""
        } ${
          active
            ? "bg-dash-sidebar-active font-medium text-white"
            : "text-white/70 hover:bg-dash-sidebar-hover hover:text-white"
        }`}
      >
        <Icon size={17} aria-hidden="true" className="shrink-0" />
        {!collapsed && (
          <>
            <span className="flex-1">{label}</span>
            {badge && (
              <span className="rounded-full bg-dash-teal/25 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-dash-teal">
                New
              </span>
            )}
          </>
        )}
      </span>
    </Link>
  );
}
