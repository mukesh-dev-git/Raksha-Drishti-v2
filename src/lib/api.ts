// -----------------------------------------------------------------------------
// Data access layer — Catalyst Functions with graceful fallback.
//
// When NEXT_PUBLIC_RD_API_BASE is set (to the deployed Catalyst Function URL),
// data is fetched live from the FIR Data Store via the rd_api Function. When it
// is NOT set, or a request fails, we fall back to the bundled sample data in
// data.ts — so the site always builds, hosts, and demos, and lights up with
// live data the moment the backend is wired. Slugs/URLs never change (they come
// from data.ts), only the numbers.
// -----------------------------------------------------------------------------
import {
  caseTypes,
  districts,
  trendYears,
  getCaseType,
  type CaseType,
  type District,
} from "./data";

const API_BASE = process.env.NEXT_PUBLIC_RD_API_BASE?.replace(/\/$/, "") || "";

async function apiGet<T>(path: string): Promise<T | null> {
  if (!API_BASE) return null; // backend not configured → use fallback
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { Accept: "application/json" },
      // build-time/runtime: always fetch fresh
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null; // network/CORS/not-deployed → fallback
  }
}

/** Whether live data is being served (for a "Live from Catalyst" badge). */
export const isLiveBackend = Boolean(API_BASE);

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
