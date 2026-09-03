// -----------------------------------------------------------------------------
// P13 Phase A (2026-09-03) - parses the real Karnataka police station roster
// into the flat JSON src/lib/real-data/policeStations.json actually consumes.
//
// SOURCE (real, verified): KSRSAC (Karnataka State Remote Sensing Applications
// Centre - a real state government geospatial agency), republished by OpenCity
// (a Bengaluru civic-data nonprofit) at:
//   https://data.opencity.in/dataset/police-station-locations
// Downloaded 2026-09-03 as ka-police-stations-source.kml (kept alongside this
// script, unmodified, for audit - re-run this script against a fresher KML
// from the same page if OpenCity publishes an update).
//
// This is a DIFFERENT tier of data from everything in catalyst/dataset-v2/:
// that directory generates synthetic case data; this directory only ever
// PARSES real, externally-sourced data, never invents a value. If a field is
// missing or malformed in the source KML, this script drops the record or
// leaves the field null - it never guesses.
//
// Run: node catalyst/real-data/police-stations/parse-kml.mjs
// -----------------------------------------------------------------------------
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const SOURCE_KML = join(HERE, "ka-police-stations-source.kml");
const OUT_JSON = join(HERE, "..", "..", "..", "src", "lib", "real-data", "policeStations.json");

const xml = readFileSync(SOURCE_KML, "utf8");
const placemarks = xml.split("<Placemark>").slice(1);

const stations = [];
let skippedNoCoord = 0;
let skippedNoName = 0;

for (const block of placemarks) {
  const nameMatch = block.match(/<SimpleData name="POL_STAName">([^<]*)<\/SimpleData>/);
  const coordMatch = block.match(/<coordinates>([^<]*)<\/coordinates>/);
  const kgisCodeMatch = block.match(/<SimpleData name="KGISPSCode">([^<]*)<\/SimpleData>/);

  if (!coordMatch) { skippedNoCoord++; continue; }
  if (!nameMatch) { skippedNoName++; continue; }

  const [lngStr, latStr] = coordMatch[1].split(",");
  const lat = Number(latStr);
  const lng = Number(lngStr);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) { skippedNoCoord++; continue; }

  stations.push({
    name: nameMatch[1].trim(),
    kgisCode: kgisCodeMatch ? kgisCodeMatch[1].trim() : null,
    lat: Number(lat.toFixed(6)),
    lng: Number(lng.toFixed(6)),
  });
}

// Sanity check, not a silent pass-through: every real Karnataka coordinate
// must fall inside the state's real bounding box (same box caseCreate.ts's
// POST /api/cases already validates against). A KML placemark outside it
// would mean a parsing bug, not a real station - fail loudly rather than
// ship a bad point onto the map.
const KARNATAKA_BBOX = { latMin: 11.0, latMax: 19.0, lngMin: 73.0, lngMax: 79.0 };
const outOfBounds = stations.filter(
  (s) => s.lat < KARNATAKA_BBOX.latMin || s.lat > KARNATAKA_BBOX.latMax ||
         s.lng < KARNATAKA_BBOX.lngMin || s.lng > KARNATAKA_BBOX.lngMax
);
if (outOfBounds.length > 0) {
  console.error(`${outOfBounds.length} station(s) fell outside Karnataka's bounding box - aborting, not writing output.`);
  console.error(JSON.stringify(outOfBounds, null, 2));
  process.exit(1);
}

writeFileSync(OUT_JSON, JSON.stringify(stations, null, 2) + "\n");

console.log(`Parsed ${stations.length} real police stations (source: KSRSAC via OpenCity).`);
console.log(`Skipped: ${skippedNoCoord} missing/invalid coordinates, ${skippedNoName} missing name.`);
console.log(`Written to ${OUT_JSON}`);
