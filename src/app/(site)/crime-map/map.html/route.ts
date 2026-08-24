import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import path from "path";

// Serves public/crime-map/map.html through a Route Handler instead of as a
// static public/ asset. Slate applies X-Frame-Options: DENY to every
// response by default, including public/ files, and that layer sits outside
// Next's own request pipeline - next.config.mjs's headers() override never
// reached it (confirmed via repeated cache-busted curl checks, 2026-08-24).
// A Route Handler IS Next's own code path, so we can set the header
// ourselves here and have it actually take effect. This is what MapEmbed.tsx
// iframes on /crime-count - needs SAMEORIGIN, not DENY, to render at all.
//
// Read at module scope (build time) rather than per-request, so this has no
// runtime filesystem dependency on Slate's function environment.
// Source lives in src/lib/crime-map-source/, not public/ - keeping it out of
// public/ avoids any ambiguity between this Route Handler and a static file
// at the exact same URL path.
const html = readFileSync(path.join(process.cwd(), "src/lib/crime-map-source/map.html"), "utf-8");

// force-dynamic, not force-static: this session found Slate/OpenNext
// unreliable specifically for prerendered/static route classification
// (the earlier dynamicParams 404 saga) - this content IS genuinely static,
// but there's no real cost to always executing it live, and doing so avoids
// risking the same bug class here too.
export const dynamic = "force-dynamic";

export async function GET() {
  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "X-Frame-Options": "SAMEORIGIN",
      // Slate's edge layer adds its own X-Frame-Options: DENY alongside
      // ours rather than replacing it - duplicate conflicting values make
      // Chrome block the frame regardless of what we set here (confirmed:
      // still blocked after adding SAMEORIGIN above). CSP frame-ancestors
      // takes precedence over X-Frame-Options in every modern browser when
      // both are present, so this is what actually wins.
      "Content-Security-Policy": "frame-ancestors 'self'",
    },
  });
}
