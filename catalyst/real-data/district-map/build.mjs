// -----------------------------------------------------------------------------
// build.mjs - real district map data for the SCRB choropleth (2026-10-15).
//
// Joins three REAL sources into one GeoJSON the map serves as-is:
//
//   1. Boundaries - ka-districts-2011-source.geojson. Census 2011 district
//      polygons from DataMeet India (github.com/datameet/maps,
//      Districts/Census_2011/2011_Dist.shp, CC BY 4.0), filtered to Karnataka
//      and simplified to 15% with mapshaper:
//        mapshaper 2011_Dist.shp -filter "ST_NM === 'Karnataka'" \
//          -simplify 15% keep-shapes -o format=geojson precision=0.0001
//      The source itself has small slivers/overlaps between neighbouring
//      districts (mapshaper reports them before any simplification); they are
//      invisible at map scale and left as-is rather than "fixed" by hand.
//
//   2. Population - census2011-karnataka.csv. Census 2011 Primary Census
//      Abstract, district level (mirror of the widely used "India Census 2011"
//      district table). Sanity-checked below: the 30 rows must sum to
//      61,095,297, Karnataka's official 2011 total, or the build aborts.
//
//   3. Crime - src/lib/real-data/districtCrimeTrends.json, the real KSP/SCRB
//      district IPC counts (P13). 2024 is deliberately NOT used: that year's
//      source only has a 21-head crime-type table, and its sum includes road
//      accidents and some special-law heads - a different definition from the
//      "IPC Cases" total published for 2022, 2023 and 2025 (IPC/BNS). Mixing
//      them would show definition changes as crime trends.
//
// TWO HONEST LIMITATIONS, both surfaced in the map UI, not just here:
//   - 2011 boundaries = 30 districts. Vijayanagara (carved from Ballari in
//     2021) has no separate 2011 polygon or population, so it is drawn and
//     counted INSIDE Ballari. Ramanagara was renamed Bengaluru South
//     (KSP's 2025 report uses the new name) - same polygon, same series.
//   - Police units != revenue districts. City commissionerates and K.G.F are
//     summed into their parent revenue district (listed per district in the
//     output as `kspUnits`). Karnataka Railways has no district and is
//     excluded. This merge exists only because no commissionerate boundary
//     polygons are published; the forecast panel still uses KSP's own units.
//
// Population is 2011 - rates for fast-growing districts (Bengaluru above
// all) are therefore overstated relative to NCRB's projected-population
// rates. The trend alert compares a district against ITSELF, so it is not
// affected by the stale denominator.
//
// Run: node catalyst/real-data/district-map/build.mjs
// -----------------------------------------------------------------------------
import { readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..", "..");

const fail = (msg) => { console.error(`ABORT: ${msg}`); process.exit(1); };

// --- census code -> app district(s) + the KSP units policing it --------------
// appDistricts: the app's own district IDs/slugs (karnataka_districts.mjs).
const DISTRICTS = {
  555: { name: "Belagavi", app: [["belagavi", 4403]], ksp: ["Belagavi City", "Belagavi Dist"] },
  556: { name: "Bagalkote", app: [["bagalkote", 4409]], ksp: ["Bagalkot"] },
  557: { name: "Vijayapura", app: [["vijayapura", 4429]], ksp: ["Vijayapur"] },
  558: { name: "Bidar", app: [["bidar", 4411]], ksp: ["Bidar"] },
  559: { name: "Raichur", app: [["raichur", 4425]], ksp: ["Raichur"] },
  560: { name: "Koppal", app: [["koppal", 4423]], ksp: ["Koppal"] },
  561: { name: "Gadag", app: [["gadag", 4418]], ksp: ["Gadag"] },
  562: { name: "Dharwad", app: [["dharwad", 4417]], ksp: ["Hubballi Dharwad City", "Dharwad"] },
  563: { name: "Uttara Kannada", app: [["uttara-kannada", 4428]], ksp: ["Uttara Kannada"] },
  564: { name: "Haveri", app: [["haveri", 4420]], ksp: ["Haveri"] },
  565: { name: "Ballari", label: "Ballari + Vijayanagara", app: [["ballari", 4407], ["vijayanagara", 4430]], ksp: ["Ballari", "Vijayanagara"] },
  566: { name: "Chitradurga", app: [["chitradurga", 4415]], ksp: ["Chitradurga"] },
  567: { name: "Davanagere", app: [["davanagere", 4416]], ksp: ["Davanagere"] },
  568: { name: "Shivamogga", app: [["shivamogga", 4408]], ksp: ["Shivamogga"] },
  569: { name: "Udupi", app: [["udupi", 4427]], ksp: ["Udupi"] },
  570: { name: "Chikkamagaluru", app: [["chikkamagaluru", 4414]], ksp: ["Chikkamagaluru"] },
  571: { name: "Tumakuru", app: [["tumakuru", 4406]], ksp: ["Tumakuru"] },
  572: { name: "Bengaluru Urban", app: [["bengaluru", 4401]], ksp: ["Bengaluru City"] },
  573: { name: "Mandya", app: [["mandya", 4424]], ksp: ["Mandya"] },
  574: { name: "Hassan", app: [["hassan", 4419]], ksp: ["Hassan"] },
  575: { name: "Dakshina Kannada", app: [["dakshina-kannada", 4405]], ksp: ["Mangaluru City", "Dakshina Kannada"] },
  576: { name: "Kodagu", app: [["kodagu", 4421]], ksp: ["Kodagu"] },
  577: { name: "Mysuru", app: [["mysuru", 4402]], ksp: ["Mysuru City", "Mysuru Dist"] },
  578: { name: "Chamarajanagar", app: [["chamarajanagar", 4412]], ksp: ["Chamarajanagar"] },
  579: { name: "Kalaburagi", app: [["kalaburagi", 4404]], ksp: ["Kalaburagi City", "Kalaburagi"] },
  580: { name: "Yadgir", app: [["yadgir", 4431]], ksp: ["Yadgir"] },
  581: { name: "Kolar", app: [["kolar", 4422]], ksp: ["Kolar", "K.G.F"] },
  582: { name: "Chikkaballapura", app: [["chikkaballapura", 4413]], ksp: ["Chikkaballapura"] },
  // KSP's "Bengaluru District" police unit; its jurisdiction is the city's
  // rural belt and may not align exactly with the 2011 revenue boundary.
  583: { name: "Bengaluru Rural", app: [["bengaluru-rural", 4410]], ksp: ["Bengaluru Dist"] },
  // Renamed Bengaluru South; KSP reports it as "Ramanagara" through 2024 and
  // "Bengaluru South" in 2025 - one series, one polygon.
  584: { name: "Ramanagara", label: "Ramanagara (Bengaluru South)", app: [["ramanagara", 4426]], ksp: ["Ramanagara", "Bengaluru South"] },
};
const EXCLUDED_UNITS = new Set(["Karnataka Railways"]);
const YEARS = [2022, 2023, 2025];

// --- 1. population -------------------------------------------------------------
const csv = readFileSync(join(HERE, "census2011-karnataka.csv"), "utf8").trim().split(/\r?\n/);
const head = csv[0].split(",");
const col = (n) => { const i = head.indexOf(n); if (i < 0) fail(`census column ${n} missing`); return i; };
const [cCode, cPop, cUrbHh, cHh] = ["District code", "Population", "Urban_Households", "Households"].map(col);
const census = new Map();
for (const line of csv.slice(1)) {
  const c = line.split(",");
  census.set(Number(c[cCode]), { population: Number(c[cPop]), urbanHouseholdPct: Math.round((Number(c[cUrbHh]) / Number(c[cHh])) * 1000) / 10 });
}
const statePop = [...census.values()].reduce((s, d) => s + d.population, 0);
if (statePop !== 61095297) fail(`census rows sum to ${statePop}, expected Karnataka 2011 total 61095297`);

// --- 2. crime --------------------------------------------------------------------
const trends = JSON.parse(readFileSync(join(ROOT, "src/lib/real-data/districtCrimeTrends.json"), "utf8"));
const ipc = new Map(); // unit -> year -> count
for (const r of trends) {
  if (!ipc.has(r.unit)) ipc.set(r.unit, {});
  ipc.get(r.unit)[r.year] = r.ipcCases;
}
const mapped = new Set(Object.values(DISTRICTS).flatMap((d) => d.ksp));
for (const unit of ipc.keys()) {
  if (!mapped.has(unit) && !EXCLUDED_UNITS.has(unit)) fail(`KSP unit "${unit}" is not mapped to a district`);
}

// --- 3. boundaries + join -------------------------------------------------------------
const geo = JSON.parse(readFileSync(join(HERE, "ka-districts-2011-source.geojson"), "utf8"));
if (geo.features.length !== 30) fail(`expected 30 district polygons, got ${geo.features.length}`);

const stateTotals = Object.fromEntries(YEARS.map((y) => [y, 0]));
const features = geo.features.map((f) => {
  const code = Number(f.properties.censuscode);
  const d = DISTRICTS[code];
  if (!d) fail(`no mapping for census code ${code} (${f.properties.DISTRICT})`);
  const pop = census.get(code);
  if (!pop) fail(`no census row for ${code}`);

  const ipcByYear = {};
  for (const y of YEARS) {
    let sum = 0;
    for (const u of d.ksp) {
      const v = ipc.get(u)?.[y];
      // Ramanagara/Bengaluru South: exactly one of the two names has a value
      // in any given year - a missing name is expected, a missing YEAR is not.
      if (typeof v === "number") sum += v;
    }
    if (sum === 0) fail(`${d.name}: no IPC count at all for ${y}`);
    ipcByYear[y] = sum;
    stateTotals[y] += sum;
  }

  const baseline = (ipcByYear[2022] + ipcByYear[2023]) / 2;
  const changePct = Math.round(((ipcByYear[2025] - baseline) / baseline) * 1000) / 10;
  return {
    type: "Feature",
    geometry: f.geometry,
    properties: {
      censusCode: code,
      name: d.name,
      label: d.label ?? d.name,
      appDistricts: d.app.map(([slug, id]) => ({ slug, id })),
      kspUnits: d.ksp,
      population2011: pop.population,
      urbanHouseholdPct: pop.urbanHouseholdPct,
      ipc: ipcByYear,
      ratePerLakh2025: Math.round((ipcByYear[2025] / pop.population) * 1e5 * 10) / 10,
      baselineRatePerLakh: Math.round((baseline / pop.population) * 1e5 * 10) / 10,
      changePct,
    },
  };
});

const stateBaseline = (stateTotals[2022] + stateTotals[2023]) / 2;
const out = {
  type: "FeatureCollection",
  meta: {
    builtAt: new Date().toISOString().slice(0, 10),
    sources: {
      boundaries: "DataMeet India, Census 2011 districts (CC BY 4.0) - github.com/datameet/maps",
      population: "Census of India 2011, Primary Census Abstract (district)",
      crime: "Karnataka State Police / SCRB district IPC counts, 2022, 2023, 2025",
    },
    state: {
      population2011: statePop,
      ipc: stateTotals,
      ratePerLakh2025: Math.round((stateTotals[2025] / statePop) * 1e5 * 10) / 10,
      changePct: Math.round(((stateTotals[2025] - stateBaseline) / stateBaseline) * 1000) / 10,
    },
    excludedUnits: [...EXCLUDED_UNITS],
  },
  features,
};

writeFileSync(join(ROOT, "src/lib/real-data/districtMap.json"), JSON.stringify(out));
console.log(`30 districts written. State 2025: ${stateTotals[2025]} IPC cases, ${out.meta.state.ratePerLakh2025}/lakh, ${out.meta.state.changePct}% vs 2022-23 avg.`);
for (const f of [...features].sort((a, b) => b.properties.changePct - a.properties.changePct)) {
  const p = f.properties;
  console.log(`  ${p.label.padEnd(30)} rate ${String(p.ratePerLakh2025).padStart(6)}/lakh   change ${String(p.changePct).padStart(6)}%`);
}
