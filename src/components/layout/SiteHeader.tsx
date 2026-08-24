import Link from "next/link";
import Image from "next/image";
import AccessibilityControls from "./AccessibilityControls";
import EmergencyBar from "./EmergencyBar";
import SiteNav from "./SiteNav";
import { BASE_PATH } from "@/lib/basePath";

// -----------------------------------------------------------------------------
// Site header — three stacked bands:
//   1. Emergency / helpline bar (first-class, persistent)
//   2. Utility row: government identity + accessibility controls
//   3. Masthead: emblem + department identity, then the primary nav
// A single tricolor rule sits between the masthead and the navigation.
//
// Used on the Home welcome page ONLY (src/app/page.tsx) - every other page
// runs the sidebar shell instead (src/app/(site)/layout.tsx). Home is a
// deliberate pre-shell landing screen, not part of that route group.
// -----------------------------------------------------------------------------
export default function SiteHeader() {
  return (
    <header>
      {/* 1. Emergency helplines */}
      <EmergencyBar />

      {/* 2. Utility row */}
      <div className="bg-navy-hover text-white">
        <div className="mx-auto flex max-w-content items-center justify-between px-4 py-1.5">
          <p className="text-xs text-white/80">
            Government of India · State Police Department
          </p>
          <AccessibilityControls />
        </div>
      </div>

      {/* 3. Masthead */}
      <div className="bg-surface">
        <div className="mx-auto flex max-w-content items-center gap-4 px-4 py-4">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src={`${BASE_PATH}/karnataka-state-police.png`}
              alt="Karnataka State Police emblem"
              width={56}
              height={56}
              priority
              className="h-14 w-14 shrink-0 object-contain"
            />
            <span className="leading-tight">
              <span className="block text-lg font-semibold text-navy">
                Raksha&#8209;Drishti
              </span>
              <span className="block text-xs text-muted">
                Karnataka State Police · Crime Analytics &amp; Investigation Portal
              </span>
            </span>
          </Link>
        </div>

        {/* The single tricolor divider for this screen region */}
        <hr className="tricolor-rule" aria-hidden="true" />

        <SiteNav />
      </div>
    </header>
  );
}
