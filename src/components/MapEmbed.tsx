"use client";

import { useEffect, useState } from "react";
import { Maximize2, Minimize2, X } from "lucide-react";

// -----------------------------------------------------------------------------
// MapEmbed — iframe wrapper for the crime map / heatmap pages, with a toggle to
// expand the map to the full browser viewport (over the header/nav/footer) so
// officers can view it edge-to-edge, and collapse back into the page layout.
//
// Fetches the map HTML and loads it via a blob: URL instead of iframe.src.
// Slate injects X-Frame-Options: DENY on every response (confirmed via curl
// -i and a browser-side fetch, 2026-08-24) - alongside whatever we set
// ourselves, as a genuinely duplicated header, and that blocks a src-loaded
// iframe regardless of a CSP frame-ancestors override too.
//
// Tried iframe.srcdoc first (inline HTML, no separate HTTP response for
// Slate to inject a header into - same benefit as blob:) - that fixed the
// blocking, but broke the map itself: loaded as a normal top-level page the
// map renders perfectly (confirmed via screenshot, 2026-08-24), but inside
// a srcdoc iframe maplibre-gl's map.on("load") never fires and map.on(
// "error") never fires either - a silent hang specific to the about:srcdoc
// context (likely a WebGL/fetch quirk of that specific origin), not a real
// resource failure. blob: URLs get a proper blob: origin instead of
// about:srcdoc, while keeping the same "not a real HTTP request" property
// that avoids Slate's header injection - should sidestep both problems.
// -----------------------------------------------------------------------------
export default function MapEmbed({
  src,
  title,
}: {
  src: string;
  title: string;
}) {
  const [fullWidth, setFullWidth] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    setFetchError(null);
    fetch(src)
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
        return r.text();
      })
      .then((text) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(new Blob([text], { type: "text/html" }));
        setBlobUrl(objectUrl);
      })
      .catch((e) => {
        if (!cancelled) setFetchError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src, retryKey]);

  // Let Escape exit full-width mode, and stop the page from scrolling behind it.
  useEffect(() => {
    if (!fullWidth) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullWidth(false);
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [fullWidth]);

  if (fullWidth) {
    return (
      <div className="fixed inset-0 z-50 bg-ink">
        {blobUrl && <iframe src={blobUrl} title={title} className="h-full w-full border-0" />}
        <button
          type="button"
          onClick={() => setFullWidth(false)}
          className="absolute right-4 top-4 z-10 inline-flex items-center gap-1.5 rounded-sm border border-line bg-surface px-3 py-1.5 text-xs font-medium text-navy shadow-md hover:border-navy"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
          Exit full width
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <button
          type="button"
          onClick={() => setFullWidth(true)}
          className="inline-flex items-center gap-1.5 rounded-sm border border-line bg-surface px-3 py-1.5 text-xs font-medium text-navy hover:border-navy"
        >
          <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
          View full width
        </button>
      </div>
      <div className="h-[80vh] w-full overflow-hidden rounded border border-line">
        {fetchError ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-sm text-muted">
            <p>Couldn&apos;t load the map ({fetchError}).</p>
            <button
              type="button"
              onClick={() => setRetryKey((k) => k + 1)}
              className="rounded-sm border border-line bg-surface px-3 py-1.5 text-xs font-medium text-navy hover:border-navy"
            >
              Retry
            </button>
          </div>
        ) : blobUrl === null ? (
          <div className="flex h-full w-full items-center justify-center text-sm text-muted">
            Loading map…
          </div>
        ) : (
          <iframe src={blobUrl} title={title} className="h-full w-full border-0" />
        )}
      </div>
    </div>
  );
}
