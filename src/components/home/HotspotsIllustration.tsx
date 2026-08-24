import Link from "next/link";

// -----------------------------------------------------------------------------
// Purely decorative heatmap graphic for the Home hero's "Crime Hotspots"
// panel - no live map, no iframe, no external CDN calls (unlike
// HotspotsMini, which the hero used to embed here and which depends on the
// same external tile/font CDN as the full /crime-hotspots page - see
// catalyst/README.md §5 for that map's known reliability issue). This
// panel is UI dressing only; "View Full Map" is the real, live, actual map.
// -----------------------------------------------------------------------------
export default function HotspotsIllustration() {
  return (
    <div className="h-full">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-white/70">Crime Hotspots</p>
        <Link href="/crime-hotspots" className="text-xs font-medium text-dash-blue hover:underline">
          View Full Map
        </Link>
      </div>

      <div className="relative mt-3 aspect-[3/2] w-full overflow-hidden rounded-lg border border-white/10 bg-[#0a1730]">
        <svg viewBox="0 0 200 130" className="absolute inset-0 h-full w-full" aria-hidden="true">
          <defs>
            <radialGradient id="hs-red" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="hs-orange" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="hs-yellow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#eab308" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#eab308" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="hs-green" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#22c55e" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="hs-blue" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* faint street grid for a "map" feel */}
          <g stroke="#ffffff" strokeOpacity="0.06" strokeWidth="1">
            <path d="M0 25 H200 M0 55 H200 M0 85 H200 M0 110 H200" />
            <path d="M30 0 V130 M70 0 V130 M110 0 V130 M150 0 V130 M180 0 V130" />
          </g>

          {/* heat blobs, low-to-high density */}
          <circle cx="40" cy="90" r="34" fill="url(#hs-blue)" />
          <circle cx="150" cy="30" r="30" fill="url(#hs-green)" />
          <circle cx="95" cy="70" r="34" fill="url(#hs-yellow)" />
          <circle cx="105" cy="65" r="22" fill="url(#hs-orange)" />
          <circle cx="108" cy="62" r="12" fill="url(#hs-red)" />
          <circle cx="160" cy="95" r="20" fill="url(#hs-orange)" />
          <circle cx="163" cy="97" r="9" fill="url(#hs-red)" />

          {/* a few marker dots */}
          {[
            [108, 62],
            [163, 97],
            [40, 90],
            [150, 30],
          ].map(([cx, cy], i) => (
            <circle key={i} cx={cx} cy={cy} r="2" fill="#fff" fillOpacity="0.85" />
          ))}
        </svg>

        <span className="absolute bottom-1.5 left-2 text-[9px] font-medium tracking-wide text-white/40">
          Bengaluru
        </span>
      </div>
    </div>
  );
}
