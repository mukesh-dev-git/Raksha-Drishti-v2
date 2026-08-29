// -----------------------------------------------------------------------------
// X1 - the Range (IGP) tier as a coarser drill-down option, not a third
// login role (see RESEARCH_AND_PLAN.md §1.4a: "the Range tier is no longer
// 'a third role' - it's a coarser filter option: one entry per Range in the
// same drill-down control, resolving to that Range's districts").
//
// Real Karnataka has 7 Ranges, each covering 3-6 districts - sourced from
// ksp.karnataka.gov.in's Organization page (the same source
// RESEARCH_AND_PLAN.md §1.5 already cites). This app's seeded dataset only
// covers 8 of Karnataka's ~30 real districts, so every Range below is
// PARTIALLY represented - most show only 1 of their real districts, Central
// Range shows 2 (Bengaluru Urban + Tumakuru). Stated explicitly rather than
// implied: selecting "Central Range" here does NOT mean "all of Central
// Range's real districts", it means "the 2 of them this seed happens to
// cover." districtDbIds only ever lists dbIds that exist in `data.ts`'s
// `districts` array - never a fabricated one for a district not seeded.
// -----------------------------------------------------------------------------
export type Range = {
  name: string;
  headquarters: string;
  /** Real DistrictID (data.ts dbId) values this seed happens to cover for
   *  this range - not the range's full real district list. */
  districtDbIds: number[];
};

export const ranges: Range[] = [
  { name: "Central Range", headquarters: "Bengaluru", districtDbIds: [4401, 4406] }, // Bengaluru Urban, Tumakuru
  { name: "Southern Range", headquarters: "Mysuru", districtDbIds: [4402] }, // Mysuru
  { name: "Northern Range", headquarters: "Belagavi", districtDbIds: [4403] }, // Belagavi
  { name: "North Eastern Range", headquarters: "Kalaburagi", districtDbIds: [4404] }, // Kalaburagi
  { name: "Western Range", headquarters: "Mangaluru", districtDbIds: [4405] }, // Dakshina Kannada
  { name: "Ballari Range", headquarters: "Ballari", districtDbIds: [4407] }, // Ballari
  { name: "Eastern Range", headquarters: "Davangere", districtDbIds: [4408] }, // Shivamogga
];

export function getRange(name: string): Range | undefined {
  return ranges.find((r) => r.name === name);
}
