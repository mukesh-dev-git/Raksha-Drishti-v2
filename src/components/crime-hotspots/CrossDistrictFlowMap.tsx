"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { CrossDistrictFlow } from "@/lib/crossDistrictFlows";

// -----------------------------------------------------------------------------
// P4.9 item 4 - cross-district flow map. Arcs between districts where one
// real investigation scenario's FIRs actually span two districts (see
// src/lib/crossDistrictFlows.ts) - sourced from the 15 hand-authored
// scenarios only, never the 5,000 single-FIR P1.2 bulk cases (those have no
// cross-district signal at all, by construction). Today that's exactly 4
// real arcs, not padded out with anything invented.
//
// Same illustrative district schematic as DistrictChoropleth (mean real
// coordinate per district, simple 0-100 grid) - not a real boundary map.
// -----------------------------------------------------------------------------
export type FlowDistrictPoint = { slug: string; name: string; x: number; y: number };

const CRIME_COLOR: Record<string, string> = {
  Theft: "var(--dash-blue)",
  Assault: "var(--dash-pink)",
  Fraud: "var(--dash-orange)",
  Burglary: "var(--dash-teal)",
};

export default function CrossDistrictFlowMap({
  districts,
  flows,
}: {
  districts: FlowDistrictPoint[];
  flows: CrossDistrictFlow[];
}) {
  const [hover, setHover] = useState<string | null>(null);
  const bySlug = new Map(districts.map((d) => [d.slug, d]));

  return (
    <div className="rounded-xl border border-line bg-surface p-5 shadow-sm">
      <div>
        <p className="text-[15px] font-semibold text-ink">Cross-District Flow Map</p>
        <p className="mt-0.5 text-xs text-muted">
          Real investigations whose FIRs span two districts - {flows.length} of 15 authored scenarios.
        </p>
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border border-line bg-surface-2">
        <svg viewBox="0 0 100 100" className="h-auto w-full" role="img" aria-label="Cross-district investigation flows">
          <defs>
            {flows.map((f) => (
              <marker
                key={f.scenarioId}
                id={`arrow-${f.scenarioId}`}
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="5"
                markerHeight="5"
                orient="auto-start-reverse"
              >
                <path d="M0,0 L10,5 L0,10 z" fill={CRIME_COLOR[f.crimeTypeName] ?? "var(--dash-blue)"} />
              </marker>
            ))}
          </defs>

          {/* All 8 districts as reference dots, even ones with no cross-district flow. */}
          {districts.map((d) => (
            <g key={d.slug}>
              <circle cx={d.x} cy={d.y} r={2.2} fill="var(--surface)" stroke="var(--line-strong)" strokeWidth={0.5} />
              <text x={d.x} y={d.y - 4} textAnchor="middle" fontSize={3} fill="var(--muted)">
                {d.name}
              </text>
            </g>
          ))}

          {/* Real cross-district arcs. */}
          {flows.map((f) => {
            const a = bySlug.get(f.fromDistrictSlug);
            const b = bySlug.get(f.toDistrictSlug);
            if (!a || !b) return null;
            const mx = (a.x + b.x) / 2;
            const my = (a.y + b.y) / 2;
            // Perpendicular offset so the arc bows rather than drawing a
            // straight line through the district dots.
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const len = Math.hypot(dx, dy) || 1;
            const nx = -dy / len;
            const ny = dx / len;
            const bow = 10;
            const cx = mx + nx * bow;
            const cy = my + ny * bow;
            const color = CRIME_COLOR[f.crimeTypeName] ?? "var(--dash-blue)";
            const active = hover === f.scenarioId;
            return (
              <path
                key={f.scenarioId}
                d={`M ${a.x} ${a.y} Q ${cx} ${cy} ${b.x} ${b.y}`}
                fill="none"
                stroke={color}
                strokeWidth={active ? 1.4 : 0.8}
                strokeOpacity={active ? 1 : 0.75}
                markerEnd={`url(#arrow-${f.scenarioId})`}
                onMouseEnter={() => setHover(f.scenarioId)}
                onMouseLeave={() => setHover(null)}
                style={{ cursor: "pointer", transition: "stroke-width 120ms" }}
              >
                <title>
                  {f.title}: {f.fromDistrictName} → {f.toDistrictName} ({f.crimeTypeName})
                </title>
              </path>
            );
          })}
        </svg>
      </div>

      <ul className="mt-4 divide-y divide-line">
        {flows.map((f) => (
          <li key={f.scenarioId} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-[13px]">
            <div className="min-w-0">
              <span
                className="mr-2 inline-block h-2 w-2 rounded-full align-middle"
                style={{ backgroundColor: CRIME_COLOR[f.crimeTypeName] ?? "var(--dash-blue)" }}
              />
              <span className="font-medium text-ink">{f.title}</span>
              <span className="ml-2 text-muted">
                {f.fromDistrictName} <ArrowRight className="inline h-3 w-3" aria-hidden="true" /> {f.toDistrictName}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted">
              <span>{f.crimeTypeName}</span>
              <span>{f.assignedTo}</span>
              {f.caseMasterIds.map((id) => (
                <Link key={id} href={`/cases/${id}`} className="text-dash-blue hover:underline">
                  FIR {id}
                </Link>
              ))}
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-3 text-[11px] text-muted">
        Sourced from the 15 hand-authored investigation scenarios only. The 5,000 bulk-generated cases are
        single-FIR administrative records with no cross-district signal, so none are shown here - not a gap
        in this view, a real property of that data.
      </p>
    </div>
  );
}
