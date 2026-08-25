"use client";

import { useRouter } from "next/navigation";
import { MapPin, X } from "lucide-react";
import { districts } from "@/lib/data";
import { districtLabel } from "@/lib/dashboardData";

// -----------------------------------------------------------------------------
// The PS's "District-Level Drill-down": SCRB narrowing the statewide view to
// one district. This replaced a login-time "Viewing as" scope (a cookie read
// in (site)/layout.tsx and threaded through the whole shell) - see the note
// in dashboard/page.tsx for why that was the wrong shape.
//
// State lives in the URL (?district=<DistrictID>), not in component state or
// a cookie: the server component above reads it directly, and a filtered
// view is shareable and bookmarkable. Clearing it means removing the param,
// not writing a "statewide" sentinel.
//
// Uncontrolled <select> read from the event, with the router doing the
// navigating - deliberately not a useState mirror. See LoginPanel.tsx for
// the bug that pattern caused when the DOM value changed without React's
// onChange firing.
// -----------------------------------------------------------------------------
export default function DistrictFilter({ districtId }: { districtId?: number }) {
  const router = useRouter();
  const active = districtId !== undefined;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 shadow-sm">
      <MapPin size={16} className="shrink-0 text-dash-blue" aria-hidden="true" />

      <label className="text-[13px] font-medium text-ink" htmlFor="district-filter">
        Drill down to
      </label>

      <select
        id="district-filter"
        value={active ? String(districtId) : ""}
        onChange={(e) => {
          const v = e.target.value;
          router.push(v ? `/dashboard?district=${v}` : "/dashboard");
        }}
        className="rounded-lg border border-line bg-surface-2/50 px-3 py-1.5 text-[13px] text-ink focus-visible:border-dash-blue"
      >
        <option value="">All Karnataka — statewide</option>
        {districts.map((d) => (
          <option key={d.dbId} value={d.dbId}>
            {d.name}
          </option>
        ))}
      </select>

      {active && (
        <>
          <span className="flex items-center gap-1.5 rounded-full bg-dash-blue-bg px-2.5 py-1 text-[11px] font-semibold text-dash-blue">
            Filtered · {districtLabel(districtId)}
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
