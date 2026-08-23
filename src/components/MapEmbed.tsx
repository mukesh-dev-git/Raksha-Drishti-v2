"use client";

import { useEffect, useState } from "react";
import { Maximize2, Minimize2, X } from "lucide-react";

// -----------------------------------------------------------------------------
// MapEmbed — iframe wrapper for the crime map / heatmap pages, with a toggle to
// expand the map to the full browser viewport (over the header/nav/footer) so
// officers can view it edge-to-edge, and collapse back into the page layout.
//
// Fetches the map HTML and sets it via iframe.srcdoc instead of iframe.src.
// Slate injects X-Frame-Options: DENY on every response (confirmed via curl
// -i and a browser-side fetch, 2026-08-24) - alongside whatever we set
// ourselves, as a genuinely duplicated header, and that blocks a src-loaded
// iframe regardless of a CSP frame-ancestors override too. srcdoc content is
// inline in the parent's own response, not a separate HTTP request/response,
// so there's nothing for Slate's edge layer to inject a header into.
// -----------------------------------------------------------------------------
export default function MapEmbed({
  src,
  title,
}: {
  src: string;
  title: string;
}) {
  const [fullWidth, setFullWidth] = useState(false);
  const [html, setHtml] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(src)
      .then((r) => r.text())
      .then((text) => {
        if (!cancelled) setHtml(text);
      });
    return () => {
      cancelled = true;
    };
  }, [src]);

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
        <iframe srcDoc={html ?? undefined} title={title} className="h-full w-full border-0" />
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
        {html === null ? (
          <div className="flex h-full w-full items-center justify-center text-sm text-muted">
            Loading map…
          </div>
        ) : (
          <iframe srcDoc={html} title={title} className="h-full w-full border-0" />
        )}
      </div>
    </div>
  );
}
