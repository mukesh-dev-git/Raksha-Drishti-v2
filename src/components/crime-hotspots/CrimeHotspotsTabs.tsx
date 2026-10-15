"use client";

import { useEffect, useState } from "react";
import { Map as MapIcon, Grid3x3 } from "lucide-react";
import MapEmbed from "@/components/MapEmbed";

type Tab = "districts" | "hotspots";

const TABS: { id: Tab; label: string; icon: typeof MapIcon }[] = [
  { id: "districts", label: "District Map", icon: Grid3x3 },
  { id: "hotspots", label: "Hotspot Map", icon: MapIcon },
];

// -----------------------------------------------------------------------------
// The two crime-geography views on /crime-hotspots (map cleanup, 2026-10-15):
//
//   - District Map (default): the statewide SCRB view - real Census 2011
//     boundaries, real KSP crime per lakh, pulsing trend alerts, and the
//     cross-district cases as an optional layer (formerly its own tab).
//   - Hotspot Map: the drill-down - where inside a district, by location and
//     time of day.
//
// The District Map's "Show hotspots" button links here with
// ?view=hotspots&district=<slug>; that district is passed into the hotspot
// map so it opens already zoomed onto it. Read from window.location in an
// effect rather than useSearchParams, so the page itself can stay static.
// Only the active tab's iframe mounts - each MapLibre embed is heavy.
// -----------------------------------------------------------------------------
export default function CrimeHotspotsTabs({
  districtMapSrc,
  hotspotMapSrc,
}: {
  districtMapSrc: string;
  hotspotMapSrc: string;
}) {
  const [tab, setTab] = useState<Tab>("districts");
  const [district, setDistrict] = useState<string | null>(null);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get("view") === "hotspots") setTab("hotspots");
    const d = q.get("district");
    if (d && /^[a-z-]+$/.test(d)) setDistrict(d);
  }, []);

  const hotspotSrc = district ? `${hotspotMapSrc}?district=${encodeURIComponent(district)}` : hotspotMapSrc;

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
              tab === id ? "border-navy text-navy" : "border-transparent text-muted hover:text-ink"
            }`}
          >
            <Icon size={15} aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>

      {tab === "districts" && (
        <MapEmbed src={districtMapSrc} title="Karnataka district crime map — real crime rate per lakh and trend alerts" />
      )}
      {tab === "hotspots" && <MapEmbed src={hotspotSrc} title="Karnataka crime hotspots by location and time of day" />}
    </div>
  );
}
