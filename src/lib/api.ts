// -----------------------------------------------------------------------------
// Data access layer — same-origin Route Handlers (src/app/api/*) with
// graceful fallback to the bundled sample data in data.ts.
//
// Previously called an external Catalyst Function (rd_api) via
// NEXT_PUBLIC_RD_API_BASE, gated by output:"export" static hosting. Both are
// retired - see catalyst/README.md. Now that the app runs on Slate (real
// Next.js server, confirmed working 2026-08-23/24), the same ZCQL logic runs
// as Route Handlers in this same deployment instead: no external URL, no
// CORS, one deploy. Every page that calls into this file is `force-dynamic`
// (see e.g. src/app/cases/[caseType]/district-wise/page.tsx) so these fetches
// re-run live per request rather than being baked in at build time.
//
// The fallback behaviour is unchanged: if a route errors or the Data Store
// doesn't have a table/row yet, callers silently get the bundled sample data
// instead of a broken page. Slugs/URLs never change (they come from
// data.ts), only the numbers.
// -----------------------------------------------------------------------------
import {
  caseTypes,
  districts,
  trendYears,
  getCaseType,
  type CaseType,
  type District,
} from "./data";

async function apiGet<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`/api${path}`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null; // network/Data Store error → fallback
  }
}

// --- Dashboard summary ------------------------------------------------------
export type Summary = {
  totalCases: number;
  crimeCategories: number;
  districtsCovered: number;
};

export async function getSummary(): Promise<Summary> {
  const live = await apiGet<Summary>("/summary");
  if (live) return live;
  return {
    totalCases: caseTypes.reduce((s, c) => s + c.total, 0),
    crimeCategories: caseTypes.length,
    districtsCovered: districts.length,
  };
}

// --- Case types (crime sub-heads) ------------------------------------------
export async function getCaseTypes(): Promise<CaseType[]> {
  const live = await apiGet<CaseType[]>("/casetypes");
  if (live && live.length) return live;
  return caseTypes;
}

// --- District-wise stats for a case type -----------------------------------
// Returns the full District shape (count, trend, clearanceRate) so the
// existing components render unchanged.
export async function getDistrictStats(caseTypeSlug: string): Promise<District[]> {
  const c = getCaseType(caseTypeSlug);
  const live = c
    ? await apiGet<
        { dbId: number; count: number; trend: number[]; clearanceRate: number }[]
      >(`/district-stats?crime=${c.dbId}`)
    : null;

  if (live && live.length) {
    // Merge live numbers onto the known districts (keeps slug/name/URL stable).
    const byId = new Map(live.map((r) => [r.dbId, r]));
    return districts.map((d) => {
      const r = byId.get(d.dbId);
      return r
        ? { ...d, count: r.count, trend: r.trend, clearanceRate: r.clearanceRate }
        : d;
    });
  }
  return districts; // fallback
}

export { trendYears };
