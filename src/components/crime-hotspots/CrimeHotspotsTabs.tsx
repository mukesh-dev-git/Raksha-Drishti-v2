"use client";

import { useState } from "react";
import { Map as MapIcon, Grid3x3, Waypoints } from "lucide-react";
import MapEmbed from "@/components/MapEmbed";

type Tab = "map" | "choropleth" | "flows";

const TABS: { id: Tab; label: string; icon: typeof MapIcon }[] = [
  { id: "choropleth", label: "District Map", icon: Grid3x3 },
  { id: "map", label: "Hotspot Map", icon: MapIcon },
  { id: "flows", label: "Cross-District Flows", icon: Waypoints },
];

// -----------------------------------------------------------------------------
// P4.1 + P4.9 - the three real-data crime-geography views live behind one
// tab switcher so /crime-hotspots stays a single page rather than three, and
// only the active tab's content mounts (each maplibre iframe is heavy - no
// reason to load three at once).
//
// All three tabs are now real MapLibre basemaps (2026-08-30) - choropleth
// and flows used to be plain SVG schematics with no real geography at all
// (DistrictChoropleth.tsx/CrossDistrictFlowMap.tsx, since deleted). They now
// plot the exact same real data (district centroids from getDistrictCentroids(),
// cross-district flows from getCrossDistrictFlows()) on the same free CARTO
// basemap the hotspot map already uses.
//
// 2026-10-15: the District Map is now a real boundary choropleth (Census 2011
// polygons, real KSP crime per lakh, pulsing trend alerts - see
// choropleth.html) and is the default tab: it's the statewide SCRB view.
// -----------------------------------------------------------------------------
export default function CrimeHotspotsTabs({
  mapSrc,
  choroplethSrc,
  flowsSrc,
}: {
  mapSrc: string;
  choroplethSrc: string;
  flowsSrc: string;
}) {
  const [tab, setTab] = useState<Tab>("choropleth");

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

      {tab === "map" && <MapEmbed src={mapSrc} title="Karnataka crime hotspots — real registered FIRs" />}
      {tab === "choropleth" && <MapEmbed src={choroplethSrc} title="Karnataka district crime map — real crime rate per lakh and trend alerts" />}
      {tab === "flows" && <MapEmbed src={flowsSrc} title="Karnataka cross-district investigation flows" />}
    </div>
  );
}
