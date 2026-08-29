// -----------------------------------------------------------------------------
// socioEconomicStats.ts — P4.5, the PS's "Socio-Economic Correlation" ask.
// Framing agreed before this was built (PLAN.md P1.5/P4.5, resolved
// 2026-08-29): aggregate-only, victim/complainant side, always with an
// explicit denominator, never an offender-propensity signal.
//
// That framing is enforced structurally here, not just by convention:
//
//   - Source is complainantOccupationIds/complainantReligionIds on
//     WorklistCase - the victim/complainant side. The Accused table has no
//     demographic columns at all (DATA_STORE_SCHEMA.md), so there is no
//     offender-side field this module could read even by mistake.
//   - Every function returns COUNTS ONLY, grouped by category, with the
//     total N of complainants the breakdown is computed over. No function
//     here returns or accepts a single case/person's demographic value -
//     that would let a caller build exactly the per-individual display this
//     framing exists to prevent. If a future caller needs that, it's a
//     deliberate decision to revisit, not an oversight to patch around.
//   - CasteID is NOT read here. That taxonomy is a separate, still-open
//     decision (PLAN.md P1.5) - the "aggregate-only, victim-side" agreement
//     covers how to PRESENT it, not what the category labels should be, and
//     no CasteID values have been generated yet (bulk_cases.mjs leaves it 0
//     for every complainant). Add it only once that's resolved.
//
// A case can have more than one complainant (institutional cases sometimes
// do); each complainant contributes one count, not each case - the N in
// "N=4,997 complainants" is people, not FIRs.
// -----------------------------------------------------------------------------
import { getCaseWorklist, type WorklistCase } from "./caseWorklist";
import { caseTypes, districts } from "./data";

export type CategoryBreakdown = {
  /** Total complainants the percentages below are computed over - always
   *  shown alongside the chart, never omitted. Excludes "not specified". */
  totalKnown: number;
  /** Complainants with no value recorded (0) - a bulk-generated case, or an
   *  institutional complainant with no personal demographic to record.
   *  Shown as its own line, never silently dropped from the denominator. */
  notSpecified: number;
  categories: { id: number; name: string; count: number; pct: number }[];
};

function breakdown(ids: number[], labels: Map<number, string>): CategoryBreakdown {
  const counts = new Map<number, number>();
  let notSpecified = 0;
  for (const id of ids) {
    if (id === 0) { notSpecified++; continue; }
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  const totalKnown = ids.length - notSpecified;
  const categories = [...counts.entries()]
    .map(([id, count]) => ({
      id,
      name: labels.get(id) ?? `Unknown (${id})`,
      count,
      pct: totalKnown > 0 ? Math.round((1000 * count) / totalKnown) / 10 : 0,
    }))
    .sort((a, b) => b.count - a.count);
  return { totalKnown, notSpecified, categories };
}

const OCCUPATION_LABELS = new Map<number, string>([
  [1, "Business / Shop Owner"], [2, "Farmer"], [3, "Government Employee"],
  [4, "Private Employee"], [5, "Driver"], [6, "Homemaker"], [7, "Student"],
  [8, "Daily Wage Worker"], [9, "Self-employed / Professional"], [10, "Retired"],
]);

const RELIGION_LABELS = new Map<number, string>([
  [1, "Hindu"], [2, "Muslim"], [3, "Christian"], [4, "Jain"],
  [5, "Sikh"], [6, "Buddhist"], [7, "Other"],
]);

export type SocioEconomicFilters = { crimeTypeSlug?: string; districtSlug?: string };

function filterCases(cases: WorklistCase[], f: SocioEconomicFilters): WorklistCase[] {
  return cases.filter(
    (c) => (!f.crimeTypeSlug || c.crimeTypeSlug === f.crimeTypeSlug) && (!f.districtSlug || c.districtSlug === f.districtSlug)
  );
}

function allOccupationIds(cases: WorklistCase[]): number[] {
  return cases.flatMap((c) => c.complainantOccupationIds);
}
function allReligionIds(cases: WorklistCase[]): number[] {
  return cases.flatMap((c) => c.complainantReligionIds);
}

/** Cases (not complainants) by district — real, needs no demographic field,
 *  just the district every case already carries. Capped to the top N so a
 *  crowded 8-district bar list doesn't compete with the two demographic
 *  panels for attention; the cap is a display choice, not a data limit. */
function districtBreakdown(cases: WorklistCase[], topN = 10): { totalKnown: number; notSpecified: number; categories: { id: number; name: string; count: number; pct: number }[] } {
  const counts = new Map<number, { name: string; count: number }>();
  let notSpecified = 0;
  for (const c of cases) {
    if (c.districtId == null) { notSpecified++; continue; }
    const e = counts.get(c.districtId) ?? { name: c.districtName, count: 0 };
    e.count++;
    counts.set(c.districtId, e);
  }
  const totalKnown = cases.length - notSpecified;
  const categories = [...counts.entries()]
    .map(([id, e]) => ({ id, name: e.name, count: e.count, pct: totalKnown > 0 ? Math.round((1000 * e.count) / totalKnown) / 10 : 0 }))
    .sort((a, b) => b.count - a.count)
    .slice(0, topN);
  return { totalKnown, notSpecified, categories };
}

export type SocioEconomicView = {
  occupation: CategoryBreakdown;
  religion: CategoryBreakdown;
  district: CategoryBreakdown;
  /** Cases counted for this view - distinct from complainant N (a case can
   *  have >1 complainant, or 0 if the FIR predates any complainant record). */
  caseCount: number;
  filterOptions: { crimeTypes: { slug: string; name: string }[]; districts: { slug: string; name: string }[] };
};

/** Victim/complainant occupation + religion breakdown, optionally filtered by
 *  crime type and/or district. Every breakdown carries its own real N -
 *  never assume the same denominator applies across two calls with
 *  different filters. */
export function getSocioEconomicView(filters: SocioEconomicFilters = {}): SocioEconomicView {
  const cases = filterCases(getCaseWorklist(), filters);
  return {
    occupation: breakdown(allOccupationIds(cases), OCCUPATION_LABELS),
    religion: breakdown(allReligionIds(cases), RELIGION_LABELS),
    district: districtBreakdown(cases),
    caseCount: cases.length,
    filterOptions: {
      crimeTypes: caseTypes.map((t) => ({ slug: t.slug, name: t.name })),
      districts: districts.map((d) => ({ slug: d.slug, name: d.name })),
    },
  };
}
