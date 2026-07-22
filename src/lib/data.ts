// -----------------------------------------------------------------------------
// SAMPLE / PLACEHOLDER DATA
// -----------------------------------------------------------------------------
// This is dummy data used ONLY to make the click-through navigation work.
// TODO: teammate — replace these with real data from the backend / API.
// -----------------------------------------------------------------------------

export type CaseType = {
  slug: string;
  name: string;
  total: number;
};

export type District = {
  slug: string;
  name: string;
  count: number;
  // Registered cases per year (oldest → newest), aligned with `trendYears`.
  // The last value equals `count`.
  trend: number[];
};

// Year labels for the district trend series (oldest → newest).
export const trendYears = [2022, 2023, 2024, 2025, 2026];

export type CaseFile = {
  id: string;
  title: string;
  status: string;
};

// Case types shown on /cases
export const caseTypes: CaseType[] = [
  { slug: "theft", name: "Theft", total: 1240 },
  { slug: "assault", name: "Assault", total: 730 },
  { slug: "fraud", name: "Fraud", total: 512 },
  { slug: "burglary", name: "Burglary", total: 398 },
];

// District-wise counts (same list reused for every case type as placeholder)
export const districts: District[] = [
  { slug: "central", name: "Central District", count: 320, trend: [180, 214, 249, 288, 320] },
  { slug: "north", name: "North District", count: 210, trend: [124, 142, 168, 191, 210] },
  { slug: "south", name: "South District", count: 185, trend: [98, 118, 141, 167, 185] },
  { slug: "east", name: "East District", count: 142, trend: [72, 91, 108, 127, 142] },
  { slug: "west", name: "West District", count: 98, trend: [61, 68, 79, 90, 98] },
];

// Individual case files shown in /case-files
export const caseFiles: CaseFile[] = [
  { id: "FIR-1001", title: "Case File FIR-1001", status: "Open" },
  { id: "FIR-1002", title: "Case File FIR-1002", status: "Under Investigation" },
  { id: "FIR-1003", title: "Case File FIR-1003", status: "Closed" },
];

// Helpers -----------------------------------------------------------------
export const getCaseType = (slug: string) =>
  caseTypes.find((c) => c.slug === slug);

export const getDistrict = (slug: string) =>
  districts.find((d) => d.slug === slug);

export const getCaseFile = (id: string) =>
  caseFiles.find((f) => f.id === id);
