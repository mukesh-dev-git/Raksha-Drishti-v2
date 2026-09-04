// -----------------------------------------------------------------------------
// calibrate.mjs — Issue #9 (P13.C). Reads the real 2024 KSP IPC crime-type
// breakdowns by district/unit and computes calibrated weights for the
// synthetic case generator.
//
// Two mappings are applied:
//   1. KSP units → app revenue districts (commissionerates merged into
//      parent districts; Railways/CSP/CID dropped)
//   2. 21 real IPC categories → the app's 4 crime types
//
// Outputs:
//   - Per-district total FIR weights (replaces census-derived weights)
//   - Global crime-type weights (replaces hardcoded 40/23/21/16)
//   - Per-district crime-type distribution matrix (new — so Bengaluru gets
//     more Cyber Crime/Fraud, rural districts get more Assault)
//
// Run: node catalyst/dataset-v2/calibrate.mjs
// -----------------------------------------------------------------------------
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CSV_PATH = join(__dirname, "..", "real-data", "crime-trends", "ka-district-ipc-2024.csv");

// ── 1. Parse the CSV ─────────────────────────────────────────────────────────
const raw = readFileSync(CSV_PATH, "utf8").trim().split("\n");
const headers = raw[0].split(",");

const rows = [];
for (let i = 1; i < raw.length; i++) {
  const cells = raw[i].split(",");
  const slNo = cells[0].trim();
  const unit = cells[1]?.trim();
  if (!slNo || !unit || unit === "Total") continue;
  // Skip section headers (ranges) and non-district units
  if (["Commissionerates", "Central Range", "Eastern Range", "Western Range",
       "Northern Range", "North Eastern Range", "Southern Range", "Ballari Range",
       "Karnataka Railways", "Coastal Security Police", "CID"].includes(unit)) continue;

  const nums = {};
  for (let c = 2; c < headers.length; c++) {
    nums[headers[c].trim()] = parseInt(cells[c] || "0", 10) || 0;
  }
  rows.push({ unit, ...nums });
}

// ── 2. Map 21 IPC categories → 4 app crime types ────────────────────────────
// Motor accidents excluded — not FIR crime types the app models.
function mapToAppTypes(row) {
  const theft = row["THEFT"] || 0;
  const assault = (row["MURDER"] || 0) + (row["ATTEMPT TO MURDER"] || 0) +
    (row["RAPE"] || 0) + (row["RIOTS"] || 0) + (row["CASES OF HURT"] || 0) +
    (row["CRUELTY BY HUSBAND"] || 0) + (row["DOWRY DEATHS"] || 0) +
    (row["MOLESTATION"] || 0) + (row["POCSO"] || 0) + (row["POCSO RAPE"] || 0);
  const fraud = (row["CYBER CRIME"] || 0) + (row["GAMBLING"] || 0) +
    (row["DP ACT"] || 0) + (row["SC/ST"] || 0);
  const burglary = (row["DACOITY"] || 0) + (row["ROBBERY"] || 0) +
    (row["BURGLARY-DAY"] || 0) + (row["BURGLARY-NIGHT"] || 0);
  return { theft, assault, fraud, burglary };
}

// ── 3. Map KSP units → revenue districts ─────────────────────────────────────
const UNIT_TO_DISTRICT = {
  "Bengaluru City": "Bengaluru Urban",
  "Bengaluru Dist": "Bengaluru Urban",
  "K.G.F": "Kolar",
  "Mysuru City": "Mysuru",
  "Mysuru Dist": "Mysuru",
  "Hubballi Dharwad City": "Dharwad",
  "Dharwad": "Dharwad",
  "Mangaluru City": "Dakshina Kannada",
  "Dakshina Kannada": "Dakshina Kannada",
  "Belagavi City": "Belagavi",
  "Belagavi Dist": "Belagavi",
  "Kalaburagi City": "Kalaburagi",
  "Kalaburagi": "Kalaburagi",
  // Direct mappings (CSV name → app name)
  "Ramanagara": "Ramanagara",
  "Tumakuru": "Tumakuru",
  "Kolar": "Kolar",
  "Chickballapura": "Chikkaballapura",
  "Chitradurga": "Chitradurga",
  "Davanagere": "Davanagere",
  "Shivamogga": "Shivamogga",
  "Haveri": "Haveri",
  "Udupi": "Udupi",
  "Chikkamagaluru": "Chikkamagaluru",
  "Uttara Kannada": "Uttara Kannada",
  "Bagalkot": "Bagalkote",
  "Vijayapur": "Vijayapura",
  "Gadag": "Gadag",
  "Bidar": "Bidar",
  "Yadgir": "Yadgir",
  "Mandya": "Mandya",
  "Chamarajanagar": "Chamarajanagar",
  "Hassan": "Hassan",
  "Kodagu": "Kodagu",
  "Ballari": "Ballari",
  "Koppal": "Koppal",
  "Raichur": "Raichur",
  "Vijayanagara": "Vijayanagara",
  "Bengaluru Rural": "Bengaluru Rural",  // not in CSV but handle defensively
};

// District name → app district ID
const DISTRICT_IDS = {
  "Bengaluru Urban": 4401, "Mysuru": 4402, "Belagavi": 4403, "Kalaburagi": 4404,
  "Dakshina Kannada": 4405, "Tumakuru": 4406, "Ballari": 4407, "Shivamogga": 4408,
  "Bagalkote": 4409, "Bengaluru Rural": 4410, "Bidar": 4411, "Chamarajanagar": 4412,
  "Chikkaballapura": 4413, "Chikkamagaluru": 4414, "Chitradurga": 4415,
  "Davanagere": 4416, "Dharwad": 4417, "Gadag": 4418, "Hassan": 4419,
  "Haveri": 4420, "Kodagu": 4421, "Kolar": 4422, "Koppal": 4423,
  "Mandya": 4424, "Raichur": 4425, "Ramanagara": 4426, "Udupi": 4427,
  "Uttara Kannada": 4428, "Vijayapura": 4429, "Vijayanagara": 4430, "Yadgir": 4431,
};

// Aggregate
const districtTotals = new Map();  // name → { theft, assault, fraud, burglary, total }

for (const row of rows) {
  const distName = UNIT_TO_DISTRICT[row.unit];
  if (!distName) {
    console.warn(`  [skip] unmapped unit: "${row.unit}"`);
    continue;
  }
  const mapped = mapToAppTypes(row);
  const existing = districtTotals.get(distName) || { theft: 0, assault: 0, fraud: 0, burglary: 0, total: 0 };
  existing.theft += mapped.theft;
  existing.assault += mapped.assault;
  existing.fraud += mapped.fraud;
  existing.burglary += mapped.burglary;
  existing.total += mapped.theft + mapped.assault + mapped.fraud + mapped.burglary;
  districtTotals.set(distName, existing);
}

// Bengaluru Rural is not in the CSV (its cases are split between Bengaluru Dist
// and Ramanagara in KSP's taxonomy). Give it a proportional estimate from
// Bengaluru Dist's total based on population ratio (~10% of Bengaluru Dist).
if (!districtTotals.has("Bengaluru Rural")) {
  const blr = districtTotals.get("Bengaluru Urban");
  if (blr) {
    const ratio = 0.08;
    districtTotals.set("Bengaluru Rural", {
      theft: Math.round(blr.theft * ratio),
      assault: Math.round(blr.assault * ratio),
      fraud: Math.round(blr.fraud * ratio),
      burglary: Math.round(blr.burglary * ratio),
      total: Math.round(blr.total * ratio),
    });
  }
}

// ── 4. Compute outputs ──────────────────────────────────────────────────────

// Global crime type totals
let globalTheft = 0, globalAssault = 0, globalFraud = 0, globalBurglary = 0;
for (const d of districtTotals.values()) {
  globalTheft += d.theft;
  globalAssault += d.assault;
  globalFraud += d.fraud;
  globalBurglary += d.burglary;
}
const globalTotal = globalTheft + globalAssault + globalFraud + globalBurglary;

console.log("=== CALIBRATED CRIME TYPE WEIGHTS (global) ===");
console.log(`  Theft:    ${globalTheft} (${(globalTheft / globalTotal * 100).toFixed(1)}%)`);
console.log(`  Assault:  ${globalAssault} (${(globalAssault / globalTotal * 100).toFixed(1)}%)`);
console.log(`  Fraud:    ${globalFraud} (${(globalFraud / globalTotal * 100).toFixed(1)}%)`);
console.log(`  Burglary: ${globalBurglary} (${(globalBurglary / globalTotal * 100).toFixed(1)}%)`);
console.log();

// Rounded weights (sum to ~100)
const crimeWeights = [
  [1, Math.round(globalTheft / globalTotal * 100)],
  [2, Math.round(globalAssault / globalTotal * 100)],
  [3, Math.round(globalFraud / globalTotal * 100)],
  [4, Math.round(globalBurglary / globalTotal * 100)],
];
console.log(`const CRIME_WEIGHTS = ${JSON.stringify(crimeWeights)};`);
console.log();

// District weights — scaled so the total is ~600 (similar magnitude to old weights)
const maxTotal = Math.max(...[...districtTotals.values()].map(d => d.total));
const scaleFactor = 120 / maxTotal; // Bengaluru gets ~120

console.log("=== CALIBRATED DISTRICT WEIGHTS ===");
const sortedDistricts = [...districtTotals.entries()].sort((a, b) => b[1].total - a[1].total);

for (const [name, d] of sortedDistricts) {
  const w = Math.max(1, Math.round(d.total * scaleFactor));
  const id = DISTRICT_IDS[name];
  console.log(`  ${name.padEnd(22)} (${id}): weight ${String(w).padStart(3)}  |  real total: ${d.total}`);
}
console.log();

// Per-district crime-type matrix (percentages)
console.log("=== PER-DISTRICT CRIME-TYPE MATRIX ===");
console.log("// { [districtId]: [[crimeTypeId, weight], ...] }");
console.log("const DISTRICT_CRIME_MATRIX = {");
for (const [name, d] of sortedDistricts) {
  const id = DISTRICT_IDS[name];
  const t = d.total || 1;
  const pcts = [
    [1, Math.round(d.theft / t * 100)],
    [2, Math.round(d.assault / t * 100)],
    [3, Math.round(d.fraud / t * 100)],
    [4, Math.round(d.burglary / t * 100)],
  ];
  console.log(`  ${id}: ${JSON.stringify(pcts)}, // ${name} (${d.total})`);
}
console.log("};");

// Output JS-ready weight for karnataka_districts.mjs
console.log();
console.log("=== WEIGHT VALUES FOR karnataka_districts.mjs ===");
for (const [name, d] of sortedDistricts) {
  const w = Math.max(1, Math.round(d.total * scaleFactor));
  const id = DISTRICT_IDS[name];
  console.log(`  // ${id} ${name}: weight: ${w},`);
}
