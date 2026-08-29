import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import path from "path";

// Real-basemap cross-district flow map (2026-08-30, replacing the SVG
// schematic). Same Route Handler pattern as hotspots.html/route.ts - see
// that file for why this can't be a public/ static asset (Slate's
// X-Frame-Options: DENY).
const html = readFileSync(path.join(process.cwd(), "src/lib/crime-map-source/flows.html"), "utf-8");

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
