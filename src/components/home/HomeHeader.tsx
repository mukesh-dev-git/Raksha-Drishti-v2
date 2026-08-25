import Image from "next/image";
import Link from "next/link";
import { Phone } from "lucide-react";
import { BASE_PATH } from "@/lib/basePath";

// -----------------------------------------------------------------------------
// Home page's own compact single-row header - logo and a primary Emergency
// 112 badge. Distinct from SiteHeader (the old 3-band emergency-bar/utility-
// row/masthead header) which is now unused - see git history if that fuller
// helpline treatment (all 4 numbers, not just 112) is ever wanted back;
// SiteFooter's "In an emergency" block still lists it.
//
// Deliberately carries NO navigation. "/" is the sign-in screen: the only
// way into the portal is through the scope picker in LoginPanel. A nav bar
// here would route around the very thing this page exists to do (it used to
// - four links, plus five more in FeatureGrid and two in HomeHero). Nav
// begins at (site)/layout.tsx, past the sign-in. See PLAN.md P0.1.
// -----------------------------------------------------------------------------
export default function HomeHeader() {
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

      <a
        href="tel:112"
        className="ml-auto flex shrink-0 items-center gap-1.5 rounded-full border border-danger/40 px-3.5 py-1.5 text-sm font-semibold text-danger hover:bg-danger-bg"
      >
        <Phone size={14} aria-hidden="true" /> Emergency 112
      </a>
    </header>
  );
}
