"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { RotateCw } from "lucide-react";
import { useBlobMapSrc } from "@/lib/useBlobMapSrc";
import { BASE_PATH } from "@/lib/basePath";

// The real spatiotemporal page lays out its "jump to a hotspot" control +
// legend near the top-left, sized for a full page. Embedding it 1:1 in a
// small card just crops to that corner - almost none of the actual heatmap
// is visible. Instead render it at a fixed, page-like native size and scale
// the whole thing down to fit the card (a standard iframe-thumbnail
// technique), so the WHOLE page - map included - shrinks proportionally
// instead of being cropped.
const NATIVE_W = 1400;
const NATIVE_H = 900;

// -----------------------------------------------------------------------------
// Compact live preview of the real spatiotemporal crime map (same blob:
// embed technique as MapEmbed.tsx, just sized for a dashboard card instead
// of a full page) with a link out to the full /crime-hotspots view. Used on
// /dashboard only - the Home hero doesn't have a hotspots panel at all
// (dropped per a follow-up request, along with its Crime Trend panel, to
// keep the hero compact - see HeroLiveOverview.tsx).
// -----------------------------------------------------------------------------
export default function HotspotsMini() {
  const { blobUrl, fetchError, retry } = useBlobMapSrc(`${BASE_PATH}/crime-map/spatiotemporal.html`);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.2);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setScale(el.clientWidth / NATIVE_W);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="h-full rounded-xl border border-line bg-surface p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-[15px] font-semibold text-ink">Crime Hotspots (Live)</p>
        <Link href="/crime-hotspots" className="text-xs font-medium text-dash-blue hover:underline">
          View Full Map
        </Link>
      </div>
      <div
        ref={containerRef}
        className="relative mt-3 w-full overflow-hidden rounded-lg border border-line"
        style={{ height: NATIVE_H * scale }}
      >
        {fetchError ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-3 text-center text-xs text-muted">
            <p>Couldn&apos;t load the preview.</p>
            <button
              type="button"
              onClick={retry}
              className="rounded-sm border border-line bg-surface px-2.5 py-1 font-medium text-navy hover:border-navy"
            >
              Retry
            </button>
          </div>
        ) : blobUrl === null ? (
          <div className="flex h-full w-full items-center justify-center text-xs text-muted">Loading map…</div>
        ) : (
          <>
            {/* Non-interactive preview (scaled + pointer-events disabled) -
                the full interactive map is one click away via "View Full
                Map". A key on blobUrl forces a fresh iframe on retry, since
                the map's own internal error state (e.g. a transient CDN
                fetch failure - this map depends on several external tile/
                font requests, see catalyst/README.md) can't be reached from
                out here with pointer events disabled. */}
            <iframe
              key={blobUrl}
              src={blobUrl}
              title="Crime hotspots preview"
              className="pointer-events-none absolute left-0 top-0 origin-top-left border-0"
              style={{ width: NATIVE_W, height: NATIVE_H, transform: `scale(${scale})` }}
              tabIndex={-1}
              aria-hidden="true"
            />
            <button
              type="button"
              onClick={retry}
              title="Reload map preview"
              className="absolute bottom-2 right-2 flex h-7 w-7 items-center justify-center rounded-full border border-line bg-surface/90 text-muted shadow-sm hover:text-navy"
            >
              <RotateCw size={13} aria-hidden="true" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
