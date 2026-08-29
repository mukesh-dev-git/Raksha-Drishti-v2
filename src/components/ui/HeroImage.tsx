"use client";

import { BASE_PATH } from "@/lib/basePath";

// -----------------------------------------------------------------------------
// PageShell's optional title-band illustration (heroImageSrc/heroImageAlt) -
// pulled out into its own Client Component because the `onError` handler
// below requires one. PageShell itself is a Server Component; passing an
// event handler straight into its returned JSX throws "Event handlers
// cannot be passed to Client Component props" at runtime (found live the
// first time any page actually passed heroImageSrc - the slot existed for a
// while with nothing wired up to trigger it). Isolating just this <img> in
// its own client boundary is the fix, not converting all of PageShell to a
// Client Component - see PageShell.tsx for why the file dropped in externally,
// no build-time dimensions, onError-hide-not-broken-icon reasoning.
// -----------------------------------------------------------------------------
export default function HeroImage({ src, alt }: { src: string; alt: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`${BASE_PATH}${src}`}
      alt={alt}
      className="hidden h-[104px] w-auto shrink-0 select-none md:block"
      onError={(e) => {
        (e.currentTarget as HTMLImageElement).style.display = "none";
      }}
    />
  );
}
