"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Phone } from "lucide-react";
import {
  LayoutDashboard,
  Radar,
  MapPin,
  BarChart3,
  TrendingUp,
  FolderKanban,
  Network,
  Activity,
  Users,
  Flag,
  ClipboardList,
  ScrollText,
  FileText,
  UserCircle,
  ShieldCheck,
  Settings,
} from "lucide-react";
import { BASE_PATH } from "@/lib/basePath";

type Item = {
  label: string;
  href?: string; // omit -> disabled / coming soon
  icon: typeof LayoutDashboard;
  badge?: "New";
};

const SECTIONS: { heading: string; items: Item[] }[] = [
  {
    heading: "Analytics",
    items: [
      { label: "Crime Overview", href: "/crime-count", icon: BarChart3 },
      { label: "Crime Hotspots", href: "/crime-hotspots", icon: MapPin },
      { label: "District Performance", icon: Radar },
      { label: "Trend Analysis", icon: TrendingUp },
    ],
  },
  {
    heading: "Investigation",
    items: [
      { label: "Cases", href: "/cases", icon: FolderKanban },
      { label: "Investigation Workspace", icon: Network },
      { label: "Evidence Feed", icon: Activity, badge: "New" },
      { label: "Persons & Entities", icon: Users },
      { label: "Alerts & Leads", icon: Flag },
    ],
  },
  {
    heading: "Reports",
    items: [
      { label: "Custom Reports", icon: ClipboardList },
      { label: "Scheduled Reports", icon: ScrollText },
      { label: "Data Exports", icon: FileText },
    ],
  },
  {
    heading: "System",
    items: [
      { label: "Users & Roles", icon: UserCircle },
      { label: "Audit Logs", icon: ShieldCheck },
      { label: "Settings", icon: Settings },
    ],
  },
];

export default function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col bg-dash-sidebar text-white/85">
      {/* Brand */}
      <Link href="/dashboard" className="flex items-center gap-2.5 px-5 py-5">
        <Image
          src={`${BASE_PATH}/karnataka-state-police.png`}
          alt=""
          width={32}
          height={32}
          className="h-8 w-8 shrink-0 object-contain"
        />
        <span className="leading-tight">
          <span className="block text-[15px] font-semibold text-white">Raksha-Drishti</span>
          <span className="block text-[11px] text-white/55">Crime Analytics &amp; Investigation Portal</span>
        </span>
      </Link>

      <nav className="scrollbar-hide flex-1 overflow-y-auto px-3 pb-4">
        <NavLink label="Dashboard" href="/dashboard" icon={LayoutDashboard} active={pathname === "/dashboard"} />

        {SECTIONS.map((section) => (
          <div key={section.heading} className="mt-5">
            <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/35">
              {section.heading}
            </p>
            <div className="mt-1.5 space-y-0.5">
              {section.items.map((item) => (
                <NavLink
                  key={item.label}
                  label={item.label}
                  href={item.href}
                  icon={item.icon}
                  badge={item.badge}
                  active={!!item.href && pathname.startsWith(item.href)}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Emergency quick access */}
      <div className="m-3 rounded-lg bg-dash-sidebar-hover p-3.5">
        <p className="flex items-center gap-1.5 text-[11px] font-medium text-white/60">
          <Phone size={12} aria-hidden="true" /> Emergency Quick Access
        </p>
        <a href="tel:112" className="mt-1.5 block text-2xl font-bold text-white hover:underline">
          112
        </a>
        <p className="text-[11px] text-white/45">24×7 Police Helpdesk</p>
      </div>
    </aside>
  );
}

function NavLink({
  label,
  href,
  icon: Icon,
  active,
  badge,
}: {
  label: string;
  href?: string;
  icon: typeof LayoutDashboard;
  active?: boolean;
  badge?: "New";
}) {
  const content = (
    <span
      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13.5px] transition ${
        active
          ? "bg-dash-sidebar-active font-medium text-white"
          : href
            ? "text-white/70 hover:bg-dash-sidebar-hover hover:text-white"
            : "text-white/30"
      }`}
    >
      <Icon size={17} aria-hidden="true" className="shrink-0" />
      <span className="flex-1">{label}</span>
      {badge && (
        <span className="rounded-full bg-dash-teal/25 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-dash-teal">
          New
        </span>
      )}
      {!href && !badge && (
        <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-white/40">
          Soon
        </span>
      )}
    </span>
  );

  if (!href) {
    return (
      <span aria-disabled="true" className="block cursor-not-allowed">
        {content}
      </span>
    );
  }
  return (
    <Link href={href} aria-current={active ? "page" : undefined}>
      {content}
    </Link>
  );
}
