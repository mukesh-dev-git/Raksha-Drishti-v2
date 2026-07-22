"use client";

import { useEffect, useState } from "react";
import { Maximize2, Minimize2, X } from "lucide-react";

// -----------------------------------------------------------------------------
// MapEmbed — iframe wrapper for the crime map / heatmap pages, with a toggle to
// expand the map to the full browser viewport (over the header/nav/footer) so
// officers can view it edge-to-edge, and collapse back into the page layout.
// -----------------------------------------------------------------------------
export default function MapEmbed({
  src,
  title,
}: {
  src: string;
  title: string;
}) {
  const [fullWidth, setFullWidth] = useState(false);

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
        <iframe src={src} title={title} className="h-full w-full border-0" />
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
        <iframe src={src} title={title} className="h-full w-full border-0" />
      </div>
    </div>
  );
}
