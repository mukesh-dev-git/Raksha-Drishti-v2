import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import path from "path";

// P4.1 - serves the real, statewide hotspot map. Same Route Handler pattern
// as map.html/route.ts and spatiotemporal.html/route.ts (see that file for
// the full story on why this isn't a public/ static asset): Slate applies
// X-Frame-Options: DENY to every response, and CSP frame-ancestors set here
// is what actually lets MapEmbed.tsx's blob-URL iframe render it.
const html = readFileSync(path.join(process.cwd(), "src/lib/crime-map-source/hotspots.html"), "utf-8");

export const dynamic = "force-dynamic";

export async function GET() {
  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "X-Frame-Options": "SAMEORIGIN",
      "Content-Security-Policy": "frame-ancestors 'self'",
    },
  });
}
