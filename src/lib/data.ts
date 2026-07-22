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
  // The last value equals `count`. Not monotonic — real crime trends rise
  // and fall year to year.
  trend: number[];
  // Share of registered cases resolved/charge-sheeted, 0–100.
  clearanceRate: number;
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

// District-wise counts — real Karnataka districts, spanning Bengaluru's
// metro core, the coastal, northern, and Malnad regions. Same list reused
// for every case type as placeholder.
export const districts: District[] = [
  { slug: "bengaluru", name: "Bengaluru Urban", count: 620, trend: [540, 595, 565, 600, 620], clearanceRate: 58 },
  { slug: "mysuru", name: "Mysuru", count: 310, trend: [265, 290, 275, 295, 310], clearanceRate: 71 },
  { slug: "belagavi", name: "Belagavi", count: 275, trend: [240, 260, 235, 268, 275], clearanceRate: 64 },
  { slug: "kalaburagi", name: "Kalaburagi", count: 230, trend: [205, 195, 218, 210, 230], clearanceRate: 47 },
  { slug: "dakshina-kannada", name: "Dakshina Kannada", count: 205, trend: [180, 200, 190, 212, 205], clearanceRate: 76 },
  { slug: "tumakuru", name: "Tumakuru", count: 168, trend: [150, 145, 160, 155, 168], clearanceRate: 69 },
  { slug: "ballari", name: "Ballari", count: 152, trend: [135, 150, 140, 148, 152], clearanceRate: 28 },
  { slug: "shivamogga", name: "Shivamogga", count: 120, trend: [100, 108, 102, 115, 120], clearanceRate: 82 },
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
