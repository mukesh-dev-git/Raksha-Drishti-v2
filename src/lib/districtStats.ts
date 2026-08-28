// -----------------------------------------------------------------------------
// P2.1b - the district-first analytics lens (the SP/Range view: pendency,
// clearance, real case list for one district), decoupled from crime type.
// Built entirely from getCaseWorklist() - no separate data source, so a
// district's numbers here always agree with what /cases itself shows when
// filtered to that district.
//
// Deliberately NO trend chart. data.ts's `districts.trend` is a fake
// 5-year placeholder (2022-2026) predating this restructure - showing it
// here would present it as real. The seeded dataset only has one real
// year (2026) of registration dates; a real multi-year trend needs P1.2's
// case-volume expansion first (tracked in PLAN.md, same gap P4.1-P4.3 are
// blocked on). Nothing shown here that isn't computed from real FIRs.
// -----------------------------------------------------------------------------
import { districts } from "./data";
import { getCaseWorklist, type WorklistCase } from "./caseWorklist";
import { getRepeatCaseSuspects } from "./personFusion";
import type { CaseStatusId } from "./caseStatus";

export type DistrictStat = {
  slug: string;
  name: string;
  dbId: number;
  cases: WorklistCase[];
  totalCases: number;
  statusCounts: Record<CaseStatusId, number>;
  /** Share of cases charge-sheeted or closed, 0-100, rounded. Real, not a
   *  placeholder - computed from this district's actual case statuses. */
  clearanceRate: number;
  repeatSubjectCount: number;
};

let cache: DistrictStat[] | null = null;

export function getDistrictStats(): DistrictStat[] {
  if (cache) return cache;

  const worklist = getCaseWorklist();

  // Repeat subjects touching each district - a person counts toward every
  // district any of their real cases fall in, via the same worklist rows
  // (not a separate lookup), so this always agrees with what /cases shows.
  const repeatByDistrict = new Map<string, Set<string>>(); // districtSlug -> personIds
  for (const p of getRepeatCaseSuspects()) {
    for (const cid of p.caseMasterIds) {
      const c = worklist.find((x) => x.caseMasterId === cid);
      if (!c) continue;
      const set = repeatByDistrict.get(c.districtSlug) ?? new Set<string>();
      set.add(p.personId);
      repeatByDistrict.set(c.districtSlug, set);
    }
  }

  cache = districts.map((d) => {
    const cases = worklist.filter((c) => c.districtSlug === d.slug);
    const statusCounts: Record<CaseStatusId, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
    for (const c of cases) statusCounts[c.statusId]++;
    const resolved = statusCounts[2] + statusCounts[3];
    return {
      slug: d.slug,
      name: d.name,
      dbId: d.dbId,
      cases,
      totalCases: cases.length,
      statusCounts,
      clearanceRate: cases.length > 0 ? Math.round((resolved / cases.length) * 100) : 0,
      repeatSubjectCount: repeatByDistrict.get(d.slug)?.size ?? 0,
    };
  }).sort((a, b) => b.totalCases - a.totalCases);

  return cache;
}

export function getDistrictStat(slug: string): DistrictStat | null {
  return getDistrictStats().find((d) => d.slug === slug) ?? null;
}
