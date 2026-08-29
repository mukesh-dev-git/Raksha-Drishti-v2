"use client";

import { useState } from "react";
import SegmentedFilter from "@/components/ui/SegmentedFilter";

// -----------------------------------------------------------------------------
// P4.9 item 1 - district choropleth. Shades the same 8 real districts
// getDistrictStats() already computes for /districts (reused here, not
// recomputed - never disagrees with what that page shows) by either real
// case volume or real clearance rate.
//
// There's no Karnataka district-boundary GeoJSON bundled into this app, and
// none was fabricated for this view (see PLAN.md P4.9's own note against
// faking precise boundaries) - so this is explicitly an illustrative
// schematic: each district is a circle at the mean real coordinate of its
// own cases (src/lib/districtGeo.ts), laid out on a simple 0-100 grid, not a
// real map projection or a true administrative boundary.
// -----------------------------------------------------------------------------
export type ChoroplethDistrict = {
  slug: string;
  name: string;
  x: number;
  y: number;
  totalCases: number;
  clearanceRate: number;
  repeatSubjectCount: number;
};

type Metric = "volume" | "clearance";

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

// Green (high clearance) -> amber -> red (low clearance), reusing the same
// success/warning/danger tokens StatusBadge uses elsewhere in the app, not a
// new ad hoc palette.
function clearanceColor(rate: number) {
  const t = clamp01(rate / 100);
  if (t >= 0.6) return "var(--success)";
  if (t >= 0.35) return "var(--warning)";
  return "var(--danger)";
}

export default function DistrictChoropleth({ districts }: { districts: ChoroplethDistrict[] }) {
  const [metric, setMetric] = useState<Metric>("volume");
  const [hover, setHover] = useState<string | null>(null);

  const maxCases = Math.max(...districts.map((d) => d.totalCases), 1);
  // Area (not radius) encodes the value - sqrt keeps perceived size roughly
  // proportional to the number, per standard chart practice.
  const radiusFor = (d: ChoroplethDistrict) => {
    if (metric === "clearance") return 6 + (d.clearanceRate / 100) * 7;
    return 4 + Math.sqrt(d.totalCases / maxCases) * 11;
  };

  return (
    <div className="rounded-xl border border-line bg-surface p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[15px] font-semibold text-ink">District Choropleth</p>
          <p className="mt-0.5 text-xs text-muted">
            Real case data, illustrative district positions - not an official boundary map.
          </p>
        </div>
        <SegmentedFilter
          label="Shade by"
          value={metric}
          onChange={setMetric}
          options={[
            { value: "volume", label: "Case volume" },
            { value: "clearance", label: "Clearance rate" },
          ]}
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto]">
        <div className="relative overflow-hidden rounded-lg border border-line bg-surface-2">
          <svg viewBox="0 0 100 100" className="h-auto w-full" role="img" aria-label="Karnataka district schematic">
            {districts.map((d) => {
              const r = radiusFor(d);
              const fill =
                metric === "clearance"
                  ? clearanceColor(d.clearanceRate)
                  : "var(--dash-blue)";
              const opacity =
                metric === "clearance" ? 0.85 : 0.3 + clamp01(d.totalCases / maxCases) * 0.6;
              return (
                <g
                  key={d.slug}
                  onMouseEnter={() => setHover(d.slug)}
                  onMouseLeave={() => setHover(null)}
                  style={{ cursor: "default" }}
                >
                  <circle
                    cx={d.x}
                    cy={d.y}
                    r={hover === d.slug ? r + 1.5 : r}
                    fill={fill}
                    fillOpacity={opacity}
                    stroke={fill}
                    strokeWidth={hover === d.slug ? 0.8 : 0.4}
                    style={{ transition: "r 120ms" }}
                  >
                    <title>
                      {d.name}: {d.totalCases} cases, {d.clearanceRate}% clearance
                      {d.repeatSubjectCount > 0 ? `, ${d.repeatSubjectCount} repeat subject(s)` : ""}
                    </title>
                  </circle>
                  <text
                    x={d.x}
                    y={d.y - r - 2.5}
                    textAnchor="middle"
                    fontSize={3.4}
                    fontWeight={600}
                    fill="var(--ink)"
                  >
                    {d.name}
                  </text>
                  <text x={d.x} y={d.y + r + 5} textAnchor="middle" fontSize={3} fill="var(--muted)">
                    {metric === "clearance" ? `${d.clearanceRate}%` : d.totalCases}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        <div className="flex shrink-0 flex-col justify-center gap-2 text-xs text-muted sm:w-40">
          {metric === "clearance" ? (
            <>
              <p className="font-medium text-ink">Clearance rate</p>
              <LegendRow color="var(--success)" label="≥ 60%" />
              <LegendRow color="var(--warning)" label="35–59%" />
              <LegendRow color="var(--danger)" label="< 35%" />
            </>
          ) : (
            <>
              <p className="font-medium text-ink">Case volume</p>
              <p>Circle area scales with real registered case count (see label under each district).</p>
            </>
          )}
        </div>
      </div>

      <p className="mt-3 text-[11px] text-muted">
        Each district is positioned at the mean real latitude/longitude of its own registered FIRs, laid
        out on a simple 0-100 grid - a schematic reference, not a true boundary or projection.
      </p>
    </div>
  );
}

function LegendRow({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-2">
      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}
