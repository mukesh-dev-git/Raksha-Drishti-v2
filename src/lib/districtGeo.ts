// -----------------------------------------------------------------------------
// P4.9 - real district centroids for /crime-hotspots's choropleth and
// cross-district flow map (both real MapLibre basemaps as of 2026-08-30 -
// see crime-map-source/choropleth.html and flows.html).
//
// There is no Karnataka district-boundary GeoJSON bundled into this app, and
// none is fabricated to fill that gap. What IS real: per-FIR latitude/
// longitude (P4.1, caseFacts.json) for all 5,000 cases. getDistrictCentroids()
// takes the mean of each district's real case coordinates - a genuine,
// data-derived point per district, not an invented one - and both map pages
// plot it directly via /crime-map/data/districts.json and flows.json rather
// than a schematic projection.
// -----------------------------------------------------------------------------
import { getCaseWorklist } from "./caseWorklist";
import { districts } from "./data";

export type DistrictPoint = {
  slug: string;
  name: string;
  dbId: number;
  /** Mean latitude of this district's real, coordinate-bearing FIRs. */
  lat: number;
  lng: number;
  /** How many real cases the centroid was averaged from - 0 means no real
   *  case had coordinates for this district, so lat/lng falls back to 0 and
   *  callers must not plot it as if it were real. */
  sampleSize: number;
};

// P10 Phase 4: no module-scope cache here any more (it used to cache
// forever, correct only for a static bundled source) - this reduce is cheap
// synchronous JS over an already-in-memory array; getCaseWorklist()'s own
// getLiveCaseFacts() cache (TTL ~90s) already covers the expensive part.
export async function getDistrictCentroids(): Promise<DistrictPoint[]> {
  const worklist = await getCaseWorklist();
  return districts.map((d) => {
    const pts = worklist.filter(
      (c) => c.districtSlug === d.slug && c.latitude != null && c.longitude != null
    );
    const n = pts.length;
    const lat = n ? pts.reduce((s, c) => s + (c.latitude as number), 0) / n : 0;
    const lng = n ? pts.reduce((s, c) => s + (c.longitude as number), 0) / n : 0;
    return { slug: d.slug, name: d.name, dbId: d.dbId, lat, lng, sampleSize: n };
  });
}
