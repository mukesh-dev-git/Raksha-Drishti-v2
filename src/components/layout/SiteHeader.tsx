import Link from "next/link";
import { Shield } from "lucide-react";
import AccessibilityControls from "./AccessibilityControls";
import EmergencyBar from "./EmergencyBar";
import SiteNav from "./SiteNav";

// -----------------------------------------------------------------------------
// Site header — three stacked bands:
//   1. Emergency / helpline bar (first-class, persistent)
//   2. Utility row: government identity + accessibility controls
//   3. Masthead: emblem + department identity, then the primary nav
// A single tricolor rule sits between the masthead and the navigation.
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
          <Link href="/dashboard" className="flex items-center gap-3">
            <span
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-sm bg-navy text-white"
              aria-hidden="true"
            >
              <Shield size={26} strokeWidth={1.75} />
            </span>
            <span className="leading-tight">
              <span className="block text-lg font-semibold text-navy">
                Raksha&#8209;Drishti
              </span>
              <span className="block text-xs text-muted">
                State Police Department · Crime Analytics &amp; Investigation Portal
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
