"use client";

import { useState } from "react";
import { Map as MapIcon, Grid3x3, Waypoints } from "lucide-react";
import MapEmbed from "@/components/MapEmbed";
import DistrictChoropleth, { type ChoroplethDistrict } from "@/components/crime-hotspots/DistrictChoropleth";
import CrossDistrictFlowMap, { type FlowDistrictPoint } from "@/components/crime-hotspots/CrossDistrictFlowMap";
import type { CrossDistrictFlow } from "@/lib/crossDistrictFlows";

type Tab = "map" | "choropleth" | "flows";

const TABS: { id: Tab; label: string; icon: typeof MapIcon }[] = [
  { id: "map", label: "Hotspot Map", icon: MapIcon },
  { id: "choropleth", label: "District Choropleth", icon: Grid3x3 },
  { id: "flows", label: "Cross-District Flows", icon: Waypoints },
];

// -----------------------------------------------------------------------------
// P4.1 + P4.9 - the three real-data crime-geography views live behind one
// tab switcher so /crime-hotspots stays a single page rather than three, and
// only the active tab's content mounts (the maplibre iframe in particular is
// heavy - no reason to load it while a user is on the choropleth tab).
// -----------------------------------------------------------------------------
export default function CrimeHotspotsTabs({
  mapSrc,
  choroplethDistricts,
  flowDistricts,
  flows,
}: {
  mapSrc: string;
  choroplethDistricts: ChoroplethDistrict[];
  flowDistricts: FlowDistrictPoint[];
  flows: CrossDistrictFlow[];
}) {
  const [tab, setTab] = useState<Tab>("map");

  return (
    <div>
      <div role="tablist" aria-label="Crime geography view" className="mb-5 flex flex-wrap gap-2 border-b border-line">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
              tab === id
                ? "border-navy text-navy"
                : "border-transparent text-muted hover:text-ink"
            }`}
          >
            <Icon size={15} aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>

      {tab === "map" && (
        <MapEmbed src={mapSrc} title="Karnataka crime hotspots — real registered FIRs" />
      )}
      {tab === "choropleth" && <DistrictChoropleth districts={choroplethDistricts} />}
      {tab === "flows" && <CrossDistrictFlowMap districts={flowDistricts} flows={flows} />}
    </div>
  );
}
