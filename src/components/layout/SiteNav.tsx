"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// -----------------------------------------------------------------------------
// Primary navigation — a simple horizontal bar. Click-first (no mega-menus, no
// hover-dependent reveals), works on low-end mobile. Current section is marked
// with aria-current and a solid underline (not conveyed by color alone).
// -----------------------------------------------------------------------------

const NAV = [
  { href: "/dashboard", label: "Home" },
  { href: "/crime-count", label: "Crime Count" },
  { href: "/crime-hotspots", label: "Crime Hotspots" },
  { href: "/cases", label: "Cases" },
];

export default function SiteNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Primary" className="border-t border-line bg-surface">
      <ul className="mx-auto flex max-w-content flex-wrap px-2">
        {NAV.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href)) ||
            (item.href === "/cases" && pathname.startsWith("/cases"));
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`inline-flex items-center border-b-[3px] px-4 py-3 text-sm font-medium ${
                  active
                    ? "border-navy text-navy"
                    : "border-transparent text-ink hover:bg-surface-2"
                }`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
