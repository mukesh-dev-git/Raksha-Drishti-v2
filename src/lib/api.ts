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
// ~4 KB of REAL precomputed aggregates - see getSummary()'s fallback below for
// why this is a generated file rather than a live read of caseWorklist.ts.
import summaryFallback from "./nosql-seed/summaryFallback.json";

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

// `districtIds` scopes every number to one or more real districts ("Viewing
// as" district drill-down filter, and X1's Range option - see
// DistrictFilter.tsx) via the route's own CaseMaster/Unit join; omit for the
// statewide (SCRB / State HQ) view. A single-district filter is a
// one-element array.
export async function getSummary(districtIds?: number[]): Promise<Summary> {
  const qs = districtIds && districtIds.length > 0 ? `?district=${districtIds.join(",")}` : "";
  const live = await apiGet<Summary>(`/summary${qs}`);
  if (live) return live;

  // Fallback (local dev / Data Store error): REAL aggregates over the same
  // 12,000-case seeded register every other page counts, precomputed into
  // summaryFallback.json by build_seed.mjs (§6b).
  //
  // P1.7 replaced what used to be here: sums over data.ts's invented
  // `count`/`trend`/`clearanceRate` placeholders, which meant a Data Store
  // hiccup silently swapped the dashboard's real totals for fabricated ones
  // with nothing in the UI saying so. Those fields are gone. This file can't
  // just import caseWorklist.ts instead - api.ts runs in the browser (note
  // the relative `/api` fetch above) and caseFacts.json is ~6 MB; the
  // precomputed aggregate is ~4 KB. Numbers here are real but STATIC: they
  // reflect the seed as generated, so they won't show a status change written
  // through /api/cases/[caseId]/status the way the live route does.
  const scoped = districtIds && districtIds.length > 0
    ? summaryFallback.districts.filter((d) => districtIds.includes(d.dbId))
    : summaryFallback.districts;
  const filtered = districtIds && districtIds.length > 0;
  const totalCases = scoped.reduce((s, d) => s + d.totalCases, 0);
  const solvedCases = scoped.reduce((s, d) => s + d.solvedCases, 0);
  const years = summaryFallback.years;
  const yearlyTrend = years.map((_, i) => scoped.reduce((s, d) => s + d.yearlyTrend[i], 0));
  const yearlySolved = years.map((_, i) => scoped.reduce((s, d) => s + d.yearlySolved[i], 0));
  return {
    totalCases,
    crimeCategories: summaryFallback.crimeCategories,
    districtsCovered: filtered ? scoped.length : districts.length,
    solvedCases,
    activeInvestigations: totalCases - solvedCases,
    detectionRate: totalCases ? Math.round((solvedCases / totalCases) * 1000) / 10 : 0,
    years,
    yearlyTrend,
    yearlySolved,
  };
}

// --- Case types (crime sub-heads) ------------------------------------------
// See getSummary() - same `districtIds` scoping. The bundled fallback sample
// data has no real per-district-per-category breakdown, so the fallback
// path (local dev only) returns the unscoped list rather than a fabricated
// split - never shown once the live API is available.
export async function getCaseTypes(districtIds?: number[]): Promise<CaseType[]> {
  const qs = districtIds && districtIds.length > 0 ? `?district=${districtIds.join(",")}` : "";
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
