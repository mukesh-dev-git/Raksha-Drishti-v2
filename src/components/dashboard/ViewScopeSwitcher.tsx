"use client";

import { useRouter } from "next/navigation";
import { Landmark } from "lucide-react";
import { districts } from "@/lib/data";
import { VIEW_SCOPE_COOKIE, type ViewScope } from "@/lib/viewScope";

// -----------------------------------------------------------------------------
// "Viewing as" switcher - State/CID Officer (statewide, including
// cross-district cases) vs District Officer (scoped to one real district).
// See viewScope.ts for what this is and, importantly, what it is NOT (real
// access control - there's no signed-in identity behind it yet).
//
// Writes a plain client-readable cookie directly (no API round-trip needed -
// this is a display preference, not something that needs server-side
// verification) and does a full server-data refresh so every Server
// Component on the page (stat cards, Featured Investigation, Alerts,
// Evidence Feed) re-reads it and actually re-scopes, not just a label swap.
// -----------------------------------------------------------------------------
export default function ViewScopeSwitcher({ scope }: { scope: ViewScope }) {
  const router = useRouter();

  const value = scope.role === "state" ? "state" : `district:${scope.districtId}`;

  function onChange(next: string) {
    document.cookie = `${VIEW_SCOPE_COOKIE}=${next}; path=/; max-age=${60 * 60 * 24 * 30}`;
    router.refresh();
  }

  return (
    <label className="hidden shrink-0 items-center gap-2 border-r border-line pr-4 lg:flex">
      <Landmark size={16} className="text-muted" aria-hidden="true" />
      <span className="sr-only">Viewing as</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-line bg-surface-2/50 py-1.5 pl-2 pr-6 text-xs font-medium text-ink"
      >
        <option value="state">SCRB — Statewide (State HQ)</option>
        {districts.map((d) => (
          <option key={d.dbId} value={`district:${d.dbId}`}>
            District Officer — {d.name}
          </option>
        ))}
      </select>
    </label>
  );
}
