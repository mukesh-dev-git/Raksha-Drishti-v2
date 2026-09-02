import { NextResponse } from "next/server";
import { getSearchIndex } from "@/lib/searchIndex";

export const dynamic = "force-dynamic";

// GET /api/search-index -> SearchItem[]
//
// Loading-skeleton pass (2026-09-03): getSearchIndex() used to be awaited
// directly inside ShellLayout ((site)/layout.tsx), which wraps every single
// page in the app. Since P10 Phase 4 made it live-backed (it walks the full
// 12,000-case worklist via getCaseWorklist()), that meant a cold cache no
// longer cost one slow page - it blocked the ENTIRE SHELL (sidebar, topbar,
// footer) from rendering at all, on every route, because a layout's own
// await happens *outside* the Suspense boundary any child route's
// loading.tsx creates. No per-route skeleton can mask a blocking layout.
//
// This route exists so DashboardTopbar can fetch the index itself, lazily,
// client-side, on first real interaction with the search box - exactly the
// "genuinely better fix" the old layout comment already named but deferred.
// ShellLayout no longer touches getSearchIndex() at all.
export async function GET() {
  const index = await getSearchIndex();
  return NextResponse.json(index);
}
