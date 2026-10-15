"use client";

import { useEffect, useState } from "react";

// -----------------------------------------------------------------------------
// Shared blob: URL loader for the crime-map HTML embeds. Extracted out of
// MapEmbed.tsx so the new dashboard mini-map can reuse the exact same
// Slate X-Frame-Options workaround without duplicating it - see MapEmbed.tsx
// for the full story on why this fetch+blob+<base> approach exists at all.
// -----------------------------------------------------------------------------
export function useBlobMapSrc(src: string) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    setFetchError(null);
    setBlobUrl(null);
    fetch(src)
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
        return r.text();
      })
      .then((text) => {
        if (cancelled) return;
        // A blob: document has no real path of its own, so a root-relative
        // fetch inside the map HTML needs a <base> tag to resolve against
        // the real origin - see MapEmbed.tsx.
        // A blob: document also has no query string, so the src's own
        // ?params (e.g. ?district=kodagu) are handed over as a global the map
        // script reads instead of location.search.
        const params = new URL(src, window.location.origin).search;
        const withBase =
          `<base href="${window.location.origin}/">` +
          `<script>window.__MAP_PARAMS = ${JSON.stringify(params)};</script>` +
          text;
        objectUrl = URL.createObjectURL(new Blob([withBase], { type: "text/html" }));
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

  return { blobUrl, fetchError, retry: () => setRetryKey((k) => k + 1) };
}
