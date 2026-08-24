"use client";

import { Search, Bell, Mail, UserCircle } from "lucide-react";
import AccessibilityControls from "@/components/layout/AccessibilityControls";

// -----------------------------------------------------------------------------
// Dashboard top bar - greeting, search (visual only, not wired to anything
// yet), and notification/mail/profile chrome. No fabricated officer name or
// photo: auth is off by default (AuthGate) so there's no real signed-in
// identity to show, and inventing one would misrepresent a real person.
// alertCount is the one real number here - the same Alerts & Leads count
// shown lower on the page.
// -----------------------------------------------------------------------------
export default function DashboardTopbar({ alertCount }: { alertCount: number }) {
  const hour = new Date().getHours();
  const timeGreeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <header className="flex items-center gap-4 border-b border-line bg-surface px-6 py-3.5">
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-[17px] font-semibold text-ink">{timeGreeting}, Officer</h1>
        <p className="truncate text-xs text-muted">Here&apos;s what&apos;s happening across Karnataka</p>
      </div>

      <label className="relative hidden w-full max-w-sm sm:block">
        <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
        <input
          type="search"
          placeholder="Search cases, FIRs, persons, locations…"
          className="w-full rounded-lg border border-line bg-surface-2/50 py-2.5 pl-10 pr-4 text-sm text-ink placeholder:text-muted focus-visible:border-dash-blue"
          aria-label="Search cases, FIRs, persons, locations"
        />
      </label>

      <div className="hidden shrink-0 border-r border-line pr-4 lg:block">
        <AccessibilityControls variant="light" />
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          className="relative flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-surface-2"
          aria-label={`${alertCount} alerts`}
        >
          <Bell size={18} aria-hidden="true" />
          {alertCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white">
              {alertCount}
            </span>
          )}
        </button>
        <button type="button" className="flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-surface-2" aria-label="Messages">
          <Mail size={18} aria-hidden="true" />
        </button>
        <div className="ml-1.5 flex items-center gap-2 border-l border-line pl-3">
          <UserCircle size={30} className="text-muted" aria-hidden="true" />
          <span className="hidden leading-tight md:block">
            <span className="block text-[13px] font-medium text-ink">Duty Officer</span>
            <span className="block text-[11px] text-muted">Karnataka State Police</span>
          </span>
        </div>
      </div>
    </header>
  );
}
