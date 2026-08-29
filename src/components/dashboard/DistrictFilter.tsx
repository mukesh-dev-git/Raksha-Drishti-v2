"use client";

import { useRouter } from "next/navigation";
import { MapPin, X } from "lucide-react";
import { districts } from "@/lib/data";
import { ranges } from "@/lib/ranges";
import { districtSetLabel } from "@/lib/dashboardData";

// -----------------------------------------------------------------------------
// The PS's "District-Level Drill-down": SCRB narrowing the statewide view to
// one district, or (X1, RESEARCH_AND_PLAN.md §1.4a) a coarser Range - "the
// Range tier is no longer 'a third role' - it's a coarser filter option: one
// entry per Range in the same drill-down control, resolving to that Range's
// districts." This replaced a login-time "Viewing as" scope (a cookie read
// in (site)/layout.tsx and threaded through the whole shell) - see the note
// in dashboard/page.tsx for why that was the wrong shape.
//
// State lives in the URL (?district=<DistrictID>[,<DistrictID>...]), not in
// component state or a cookie: the server component above reads it
// directly, and a filtered view is shareable and bookmarkable. Clearing it
// means removing the param, not writing a "statewide" sentinel. A Range
// option's value is its comma-joined district dbIds - same query param,
// same parsing path on the server, no new URL shape to special-case.
//
// Uncontrolled <select> read from the event, with the router doing the
// navigating - deliberately not a useState mirror. See LoginPanel.tsx for
// the bug that pattern caused when the DOM value changed without React's
// onChange firing.
// -----------------------------------------------------------------------------
export default function DistrictFilter({ districtIds = [] }: { districtIds?: number[] }) {
  const router = useRouter();
  const active = districtIds.length > 0;
  const currentValue = active ? districtIds.slice().sort((a, b) => a - b).join(",") : "";

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 shadow-sm">
      <MapPin size={16} className="shrink-0 text-dash-blue" aria-hidden="true" />

      <label className="text-[13px] font-medium text-ink" htmlFor="district-filter">
        Drill down to
      </label>

      <select
        id="district-filter"
        value={currentValue}
        onChange={(e) => {
          const v = e.target.value;
          router.push(v ? `/dashboard?district=${v}` : "/dashboard");
        }}
        className="rounded-lg border border-line bg-surface-2/50 px-3 py-1.5 text-[13px] text-ink focus-visible:border-dash-blue"
      >
        <option value="">All Karnataka — statewide</option>
        <optgroup label="Ranges (IGP) - real KSP ranges, only their seeded districts">
          {ranges.map((r) => (
            <option key={r.name} value={r.districtDbIds.slice().sort((a, b) => a - b).join(",")}>
              {r.name} ({r.districtDbIds.map((id) => districts.find((d) => d.dbId === id)?.name).join(", ")})
            </option>
          ))}
        </optgroup>
        <optgroup label="Districts">
          {districts.map((d) => (
            <option key={d.dbId} value={d.dbId}>
              {d.name}
            </option>
          ))}
        </optgroup>
      </select>

      {active && (
        <>
          <span className="flex items-center gap-1.5 rounded-full bg-dash-blue-bg px-2.5 py-1 text-[11px] font-semibold text-dash-blue">
            Filtered · {districtSetLabel(districtIds)}
          </span>
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="flex items-center gap-1 text-[12px] font-medium text-muted hover:text-ink"
          >
            <X size={12} aria-hidden="true" /> Clear
          </button>
        </>
      )}

      <p className="ml-auto hidden text-[11.5px] text-muted lg:block">
        Narrows every figure, the featured case, alerts and evidence below.
      </p>
    </div>
  );
}
