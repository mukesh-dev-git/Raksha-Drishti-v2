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
};

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
  { slug: "central", name: "Central District", count: 320 },
  { slug: "north", name: "North District", count: 210 },
  { slug: "south", name: "South District", count: 185 },
  { slug: "east", name: "East District", count: 142 },
  { slug: "west", name: "West District", count: 98 },
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
