import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import path from "path";

// See src/app/crime-map/map.html/route.ts for why this is a Route Handler
// instead of a public/ static asset.
// Source lives in src/lib/crime-map-source/, not public/ - see
// src/app/crime-map/map.html/route.ts for why.
const html = readFileSync(path.join(process.cwd(), "src/lib/crime-map-source/spatiotemporal.html"), "utf-8");

export const dynamic = "force-dynamic";

export async function GET() {
  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "X-Frame-Options": "SAMEORIGIN",
    },
  });
}
