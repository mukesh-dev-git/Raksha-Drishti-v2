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

// The district REGISTER — slug ↔ name ↔ DistrictID, and nothing else.
//
// P1.7 (2026-09-01) removed `count`, `trend` and `clearanceRate` from this
// type. They were invented placeholder numbers from the original UI mock, and
// by the time P1.2/P4 landed, every district figure the app actually renders
// came from districtStats.ts (computed from the real 12,000-case register) —
// so these three were dead fake data sitting in the one file a reviewer is
// most likely to open. Verified unused before removal: the only reader was
// crime-map/data/districts.json's `clearanceRate`, which reads
// getDistrictStats()'s real value, not this one. Real per-district numbers:
// districtStats.ts. Real coordinates: districtGeo.ts.
export type District = {
  slug: string;
  name: string;
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

// All 31 real Karnataka districts (P1.7, 2026-09-01 — was 8).
//
// MUST stay in step with catalyst/dataset-v2/karnataka_districts.mjs, which is
// the generator-side source of truth (DistrictIDs, police stations, real
// locality coordinates, case weights). This is the app-side mirror: the
// generator can't import from src/, and src/ can't import a .mjs build script,
// so the one thing that genuinely has to exist twice is this id↔slug↔name
// register. Nothing else about a district is duplicated — every number the UI
// shows is computed from the real case register at runtime.
//
// Ordered by DistrictID: 4401-4408 are the original 8, whose IDs are pinned
// because the 19 authored scenarios reference them; 4409-4431 were added by
// P1.7, alphabetically.
export const districts: District[] = [
  { slug: "bengaluru", name: "Bengaluru Urban", dbId: 4401 },
  { slug: "mysuru", name: "Mysuru", dbId: 4402 },
  { slug: "belagavi", name: "Belagavi", dbId: 4403 },
  { slug: "kalaburagi", name: "Kalaburagi", dbId: 4404 },
  { slug: "dakshina-kannada", name: "Dakshina Kannada", dbId: 4405 },
  { slug: "tumakuru", name: "Tumakuru", dbId: 4406 },
  { slug: "ballari", name: "Ballari", dbId: 4407 },
  { slug: "shivamogga", name: "Shivamogga", dbId: 4408 },
  { slug: "bagalkote", name: "Bagalkote", dbId: 4409 },
  { slug: "bengaluru-rural", name: "Bengaluru Rural", dbId: 4410 },
  { slug: "bidar", name: "Bidar", dbId: 4411 },
  { slug: "chamarajanagar", name: "Chamarajanagar", dbId: 4412 },
  { slug: "chikkaballapura", name: "Chikkaballapura", dbId: 4413 },
  { slug: "chikkamagaluru", name: "Chikkamagaluru", dbId: 4414 },
  { slug: "chitradurga", name: "Chitradurga", dbId: 4415 },
  { slug: "davanagere", name: "Davanagere", dbId: 4416 },
  { slug: "dharwad", name: "Dharwad", dbId: 4417 },
  { slug: "gadag", name: "Gadag", dbId: 4418 },
  { slug: "hassan", name: "Hassan", dbId: 4419 },
  { slug: "haveri", name: "Haveri", dbId: 4420 },
  { slug: "kodagu", name: "Kodagu", dbId: 4421 },
  { slug: "kolar", name: "Kolar", dbId: 4422 },
  { slug: "koppal", name: "Koppal", dbId: 4423 },
  { slug: "mandya", name: "Mandya", dbId: 4424 },
  { slug: "raichur", name: "Raichur", dbId: 4425 },
  { slug: "ramanagara", name: "Ramanagara", dbId: 4426 },
  { slug: "udupi", name: "Udupi", dbId: 4427 },
  { slug: "uttara-kannada", name: "Uttara Kannada", dbId: 4428 },
  { slug: "vijayapura", name: "Vijayapura", dbId: 4429 },
  { slug: "vijayanagara", name: "Vijayanagara", dbId: 4430 },
  { slug: "yadgir", name: "Yadgir", dbId: 4431 },
];

// Helpers -----------------------------------------------------------------
export const getCaseType = (slug: string) =>
  caseTypes.find((c) => c.slug === slug);

export const getDistrict = (slug: string) =>
  districts.find((d) => d.slug === slug);
