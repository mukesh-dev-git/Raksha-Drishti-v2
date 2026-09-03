// -----------------------------------------------------------------------------
// P13 Phase B (2026-09-03) - reconciles 4 real, differently-shaped KSP/SCRB
// district-crime CSVs (2022/2023/2024/2025, all kept alongside this script,
// unmodified, for audit) into one clean long-format table:
//   { unit, range, year, ipcCases, sllCases, total }
// - the real training data for the QuickML regression pipeline.
//
// REAL, NOT FORCED: KSP's own unit taxonomy - 6 City Commissionerates plus
// Range-grouped districts - is NOT the app's 31-district revenue-district
// roster (Bengaluru City/Dist/South are three separate real KSP units, all
// folded into one "Bengaluru Urban" district in src/lib/data.ts). Decided
// explicitly (2026-09-03, user choice): keep KSP's real native units rather
// than force-aggregating into the app's roster - more granular, no invented
// sums, but means this data needs its own display surface rather than
// slotting onto the existing /districts/[district] pages. See PLAN.md P13.B.
//
// SPELLING DRIFT IS REAL, ACROSS KSP'S OWN REPORTS, NOT JUST BETWEEN
// SOURCES: "Kalaburgi" (2022/23) -> "Kalaburagi" (2024/25, the official
// spelling since 2014); "Shimoga" -> "Shivamogga" (same); "Vijayapura" ->
// "Vijayapur"; "Chikkaballapura" (2022/23, matches the app's own spelling in
// karnataka_districts.mjs) -> "Chickballapura" (2024/25's own spelling,
// dropping the second "ka") - canonicalized to the app's existing spelling
// here, not the more recent report's. Every mapping below was read off the
// real files, not guessed.
//
// 2025 introduces "Bengaluru South" (Central Range) - a real unit that does
// not exist in 2022-2024. Not merged into "Bengaluru Dist" - kept as its own
// row with only one real year of history, stated as a genuine administrative
// change, not smoothed over. Ramanagara has the opposite gap: present in
// 2022/2023/2024, genuinely absent from the 2025 source file (verified by
// grep against the raw CSV, not a parsing miss) - kept at 3 years, not
// backfilled or guessed.
//
// "Total"/"STATE" summary rows are dropped (not a unit). Non-geographic
// units (Karnataka Railways) are kept - QuickML can use them as a
// categorical value like any other; they just don't correspond to a point
// on a district map.
//
// 2024's source file only has an IPC crime-type breakdown (21 columns, no
// per-district SLL figure published that year) - ipcCases is the sum of
// those 21 columns; sllCases and total are left null for 2024, not
// estimated. 2025's SLL figure IS real and present, so 2025 gets a real
// total (ipcCases + sllCases); 2022/2023 have direct Total columns.
// -----------------------------------------------------------------------------
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));

// Canonical unit name -> { range }. Order/grouping taken from the 2024/2025
// files' own Range headers (the richest, most current structure).
const CANONICAL_UNITS = {
  "Bengaluru City": "Commissionerate", "Mysuru City": "Commissionerate",
  "Hubballi Dharwad City": "Commissionerate", "Mangaluru City": "Commissionerate",
  "Belagavi City": "Commissionerate", "Kalaburagi City": "Commissionerate",
  "Bengaluru Dist": "Central Range", "Bengaluru South": "Central Range",
  "Ramanagara": "Central Range", "Tumakuru": "Central Range", "Kolar": "Central Range",
  "Chikkaballapura": "Central Range", "K.G.F": "Central Range",
  "Chitradurga": "Eastern Range", "Davanagere": "Eastern Range",
  "Shivamogga": "Eastern Range", "Haveri": "Eastern Range",
  "Dakshina Kannada": "Western Range", "Udupi": "Western Range",
  "Chikkamagaluru": "Western Range", "Uttara Kannada": "Western Range",
  "Belagavi Dist": "Northern Range", "Bagalkot": "Northern Range",
  "Vijayapur": "Northern Range", "Dharwad": "Northern Range", "Gadag": "Northern Range",
  "Kalaburagi": "North Eastern Range", "Bidar": "North Eastern Range", "Yadgir": "North Eastern Range",
  "Mysuru Dist": "Southern Range", "Mandya": "Southern Range",
  "Chamarajanagar": "Southern Range", "Hassan": "Southern Range", "Kodagu": "Southern Range",
  "Ballari": "Ballari Range", "Koppal": "Ballari Range",
  "Raichur": "Ballari Range", "Vijayanagara": "Ballari Range",
  "Karnataka Railways": "Statewide function",
};

// Every real spelling variant seen across the 4 source files, mapped to its
// canonical name above. Built by reading each file's own district column,
// not assumed.
const ALIASES = {
  "Bagalkot": "Bagalkot",
  "Bengaluru City": "Bengaluru City",
  "Bengaluru District": "Bengaluru Dist", "Bengaluru Dist": "Bengaluru Dist",
  "Bengaluru South": "Bengaluru South",
  "Belagavi District": "Belagavi Dist", "Belagavi Dist": "Belagavi Dist",
  "Ballari": "Ballari",
  "Bidar": "Bidar",
  "Vijayapura": "Vijayapur", "Vijayapur": "Vijayapur",
  "Chikkaballapura": "Chikkaballapura", "Chickballapura": "Chikkaballapura",
  "Chamarajnagar": "Chamarajanagar", "Chamarajanagar": "Chamarajanagar",
  "Chikkamagaluru": "Chikkamagaluru",
  "Chitradurga": "Chitradurga",
  "Dakshina Kannada": "Dakshina Kannada",
  "Davanagere": "Davanagere",
  "Dharwad": "Dharwad",
  "Gadag": "Gadag",
  "Kalaburgi": "Kalaburagi", "Kalaburagi": "Kalaburagi",
  "Hassan": "Hassan",
  "Haveri": "Haveri",
  "Hubballi Dharwad": "Hubballi Dharwad City", "Hubballi Dharwad City": "Hubballi Dharwad City",
  "K.G.F.": "K.G.F", "KGF": "K.G.F", "K.G.F": "K.G.F",
  "Kodagu": "Kodagu",
  "Kolar": "Kolar",
  "Koppal": "Koppal",
  "Mandya": "Mandya",
  "Mangaluru City": "Mangaluru City",
  "Mysuru City": "Mysuru City",
  "Mysuru District": "Mysuru Dist", "Mysuru Dist": "Mysuru Dist",
  "Raichur": "Raichur",
  "K.Railways": "Karnataka Railways", "KRailways": "Karnataka Railways", "Karnataka Railways": "Karnataka Railways",
  "Ramanagara": "Ramanagara",
  "Shimoga": "Shivamogga", "Shivamogga": "Shivamogga",
  "Tumakuru": "Tumakuru",
  "Udupi": "Udupi",
  "Uttara Kannada": "Uttara Kannada",
  "Yadgiri": "Yadgir", "Yadgir": "Yadgir",
  "Belagavi City": "Belagavi City",
  "Kalaburgi City": "Kalaburagi City", "Kalaburagi City": "Kalaburagi City",
  "Vijayanagara": "Vijayanagara",
};

const DROP_ROWS = new Set(["", "Total", "Total Districts", "TOTAL", "STATE", "Commissionerates",
  "Central Range", "Eastern Range", "Western Range", "Northern Range",
  "North Eastern Range", "Southern Range", "Ballari Range", "Coastal Security Police", "CID"]);
// Coastal Security Police / CID appear as row labels in the 2024 source with
// no numeric IPC breakdown under them (function units, not geographic, and
// not populated in that file) - dropped rather than recorded as a false 0.

function parseCsv(text) {
  return text.trim().split(/\r?\n/).map((line) =>
    // Simple split is correct here: every source file's only quoted field
    // (a "Heads of Crime" value in the OTHER real-data pull, not this one)
    // never appears in these 4 district-total files - verified by eye
    // against each file's own head before writing this.
    line.split(",").map((c) => c.trim())
  );
}

function canon(raw) {
  const name = raw.replace(/^﻿/, "").trim();
  if (DROP_ROWS.has(name)) return null;
  const mapped = ALIASES[name];
  if (!mapped) {
    console.warn(`Unmapped unit name, dropped: "${name}" - add it to ALIASES if this is real data.`);
    return null;
  }
  return mapped;
}

const rows = []; // { unit, range, year, ipcCases, sllCases, total }

// --- 2022 / 2023: flat "Districts,IPC Cases,SLL Cases,Total" ---------------
for (const year of [2022, 2023]) {
  const text = readFileSync(join(HERE, `ka-district-${year}.csv`), "utf8");
  const [, ...body] = parseCsv(text);
  for (const [rawName, ipc, sll, total] of body) {
    const unit = canon(rawName);
    if (!unit) continue;
    rows.push({
      unit, range: CANONICAL_UNITS[unit] ?? null, year,
      ipcCases: Number(ipc), sllCases: Number(sll), total: Number(total),
    });
  }
}

// --- 2024: district x 21 IPC crime-type columns, Range-grouped, no SLL -----
{
  const text = readFileSync(join(HERE, "ka-district-ipc-2024.csv"), "utf8");
  const [, ...body] = parseCsv(text);
  for (const [, rawName, ...crimeCols] of body) {
    const unit = canon(rawName);
    if (!unit) continue;
    const ipcCases = crimeCols.reduce((sum, v) => sum + (Number(v) || 0), 0);
    rows.push({ unit, range: CANONICAL_UNITS[unit] ?? null, year: 2024, ipcCases, sllCases: null, total: null });
  }
}

// --- 2025: Range-grouped, "IPC/BNS Crimes" + "SLL Crimes" columns ----------
{
  const text = readFileSync(join(HERE, "ka-district-2025.csv"), "utf8");
  const [, ...body] = parseCsv(text);
  for (const [, rawName, ipcBns, sll] of body) {
    const unit = canon(rawName);
    if (!unit) continue;
    const ipcCases = Number(ipcBns), sllCases = Number(sll);
    rows.push({
      unit, range: CANONICAL_UNITS[unit] ?? null, year: 2025,
      ipcCases, sllCases, total: ipcCases + sllCases,
    });
  }
}

// Sanity: every row's ipcCases must be a real, finite, non-negative number -
// a NaN here means a parsing assumption (column order, canon mapping) was
// wrong, and shipping it into training data would silently corrupt the
// model rather than fail loudly.
const bad = rows.filter((r) => !Number.isFinite(r.ipcCases) || r.ipcCases < 0);
if (bad.length > 0) {
  console.error(`${bad.length} row(s) have an invalid ipcCases value - aborting.`);
  console.error(JSON.stringify(bad, null, 2));
  process.exit(1);
}

rows.sort((a, b) => a.unit.localeCompare(b.unit) || a.year - b.year);

const outPath = join(HERE, "..", "..", "..", "src", "lib", "real-data", "districtCrimeTrends.json");
writeFileSync(outPath, JSON.stringify(rows, null, 2) + "\n");

const byUnit = new Map();
for (const r of rows) byUnit.set(r.unit, (byUnit.get(r.unit) ?? 0) + 1);
console.log(`${rows.length} real (unit, year) rows across ${byUnit.size} real KSP units, 2022-2025.`);
console.log(`Units with fewer than 4 years of data (real gaps, not errors):`);
for (const [unit, count] of byUnit) {
  if (count < 4) console.log(`  ${unit}: ${count} year(s)`);
}
console.log(`Written to ${outPath}`);
