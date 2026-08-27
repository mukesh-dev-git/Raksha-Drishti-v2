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
  // Data Store CrimeSubHead.CrimeSubHeadID — bridges the URL slug to the DB.
  dbId: number;
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
  // Data Store District.DistrictID — bridges the URL slug to the DB.
  dbId: number;
};

// Year labels for the district trend series (oldest → newest).
export const trendYears = [2022, 2023, 2024, 2025, 2026];

// Case types shown on /cases
export const caseTypes: CaseType[] = [
  { slug: "theft", name: "Theft", total: 1240, dbId: 1 },
  { slug: "assault", name: "Assault", total: 730, dbId: 2 },
  { slug: "fraud", name: "Fraud", total: 512, dbId: 3 },
  { slug: "burglary", name: "Burglary", total: 398, dbId: 4 },
];

// District-wise counts — real Karnataka districts, spanning Bengaluru's
// metro core, the coastal, northern, and Malnad regions. Same list reused
// for every case type as placeholder.
export const districts: District[] = [
  { slug: "bengaluru", name: "Bengaluru Urban", count: 620, trend: [540, 595, 565, 600, 620], clearanceRate: 58, dbId: 4401 },
  { slug: "mysuru", name: "Mysuru", count: 310, trend: [265, 290, 275, 295, 310], clearanceRate: 71, dbId: 4402 },
  { slug: "belagavi", name: "Belagavi", count: 275, trend: [240, 260, 235, 268, 275], clearanceRate: 64, dbId: 4403 },
  { slug: "kalaburagi", name: "Kalaburagi", count: 230, trend: [205, 195, 218, 210, 230], clearanceRate: 47, dbId: 4404 },
  { slug: "dakshina-kannada", name: "Dakshina Kannada", count: 205, trend: [180, 200, 190, 212, 205], clearanceRate: 76, dbId: 4405 },
  { slug: "tumakuru", name: "Tumakuru", count: 168, trend: [150, 145, 160, 155, 168], clearanceRate: 69, dbId: 4406 },
  { slug: "ballari", name: "Ballari", count: 152, trend: [135, 150, 140, 148, 152], clearanceRate: 28, dbId: 4407 },
  { slug: "shivamogga", name: "Shivamogga", count: 120, trend: [100, 108, 102, 115, 120], clearanceRate: 82, dbId: 4408 },
];

// Helpers -----------------------------------------------------------------
export const getCaseType = (slug: string) =>
  caseTypes.find((c) => c.slug === slug);

export const getDistrict = (slug: string) =>
  districts.find((d) => d.slug === slug);
