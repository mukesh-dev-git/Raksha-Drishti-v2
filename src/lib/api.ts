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
  solvedCases: number;
  activeInvestigations: number;
  detectionRate: number;
  years: number[];
  yearlyTrend: number[];
  yearlySolved: number[];
};

// `districtId` scopes every number to one real district ("Viewing as:
// District Officer" mode - see viewScope.ts) via the API route's own
// CaseMaster/Unit join; omit for the statewide (SCRB / State HQ) view.
export async function getSummary(districtId?: number): Promise<Summary> {
  const qs = districtId ? `?district=${districtId}` : "";
  const live = await apiGet<Summary>(`/summary${qs}`);
  if (live) return live;

  // Fallback (local dev / Data Store error): approximate from the bundled
  // district sample data - it has per-district trend + clearanceRate but no
  // real yearly "solved" breakdown, so yearlySolved here is a clearanceRate-
  // weighted estimate, not a real count. Only ever shown when the live API
  // is unavailable (see catalyst/README.md).
  const scoped = districtId ? districts.filter((d) => d.dbId === districtId) : districts;
  const totalCases = districtId
    ? scoped.reduce((s, d) => s + d.count, 0)
    : caseTypes.reduce((s, c) => s + c.total, 0);
  const yearlyTrend = trendYears.map((_, i) => scoped.reduce((s, d) => s + d.trend[i], 0));
  const solvedCases = Math.round(scoped.reduce((s, d) => s + d.count * (d.clearanceRate / 100), 0));
  return {
    totalCases,
    crimeCategories: caseTypes.length,
    districtsCovered: districtId ? 1 : districts.length,
    solvedCases,
    activeInvestigations: totalCases - solvedCases,
    detectionRate: totalCases ? Math.round((solvedCases / totalCases) * 1000) / 10 : 0,
    years: trendYears,
    yearlyTrend,
    yearlySolved: yearlyTrend.map((y) => Math.round(y * 0.6)),
  };
}

// --- Case types (crime sub-heads) ------------------------------------------
// See getSummary() - same `districtId` scoping. The bundled fallback sample
// data has no real per-district-per-category breakdown, so the fallback
// path (local dev only) returns the unscoped list rather than a fabricated
// split - never shown once the live API is available.
export async function getCaseTypes(districtId?: number): Promise<CaseType[]> {
  const qs = districtId ? `?district=${districtId}` : "";
  const live = await apiGet<CaseType[]>(`/casetypes${qs}`);
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
