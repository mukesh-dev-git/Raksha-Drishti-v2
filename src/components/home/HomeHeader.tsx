"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Phone } from "lucide-react";
import { BASE_PATH } from "@/lib/basePath";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/crime-count", label: "Crime Overview" },
  { href: "/crime-hotspots", label: "Hotspots" },
  { href: "/cases", label: "Cases" },
];

// -----------------------------------------------------------------------------
// Home page's own compact single-row header - logo, horizontal nav, and a
// primary Emergency 112 badge. Distinct from SiteHeader (the old 3-band
// emergency-bar/utility-row/masthead header) which is now unused - see git
// history if that fuller helpline treatment (all 4 numbers, not just 112)
// is ever wanted back; SiteFooter's "In an emergency" block still lists it.
// -----------------------------------------------------------------------------
export default function HomeHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-20 flex items-center gap-6 border-b border-line bg-surface px-6 py-3">
      <Link href="/" className="flex shrink-0 items-center gap-3">
        <Image
          src={`${BASE_PATH}/karnataka-state-police.png`}
          alt="Karnataka State Police emblem"
          width={44}
          height={44}
          priority
          className="h-11 w-11 object-contain"
        />
        <span className="leading-tight">
          <span className="block text-base font-semibold text-navy">Raksha-Drishti</span>
          <span className="block text-xs text-muted">Karnataka State Police</span>
        </span>
      </Link>

      <nav aria-label="Primary" className="hidden flex-1 items-center justify-center gap-1 md:flex">
        {NAV.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`rounded-md px-3.5 py-2 text-sm font-medium transition ${
                active ? "text-navy" : "text-ink hover:bg-surface-2"
              }`}
            >
              {item.label}
              {active && <span className="mx-auto mt-1 block h-0.5 w-4 rounded-full bg-navy" />}
            </Link>
          );
        })}
      </nav>

      <a
        href="tel:112"
        className="ml-auto flex shrink-0 items-center gap-1.5 rounded-full border border-danger/40 px-3.5 py-1.5 text-sm font-semibold text-danger hover:bg-danger-bg"
      >
        <Phone size={14} aria-hidden="true" /> Emergency 112
      </a>
    </header>
  );
}
