// -----------------------------------------------------------------------------
// P4.9 - real district centroids + a schematic 2D projection, shared by the
// district choropleth and the cross-district flow map on /crime-hotspots.
//
// There is no Karnataka district-boundary GeoJSON bundled into this app (and
// none was fabricated for this - see PLAN.md P4.9's own note on not faking
// precise boundaries). What we DO have is real per-FIR latitude/longitude
// (P4.1, caseFacts.json) for all 5,000 cases. getDistrictCentroids() takes
// the mean of each district's real case coordinates - a genuine, data-derived
// point per district, not an invented one - and projectSchematic() lays those
// 8 points out on a simple 0-100 grid that preserves real relative
// north-south/east-west ordering (a plain linear scale, not a map
// projection). Both consuming views must label this as illustrative, not a
// real boundary map.
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

let cache: DistrictPoint[] | null = null;

export function getDistrictCentroids(): DistrictPoint[] {
  if (cache) return cache;
  const worklist = getCaseWorklist();
  cache = districts.map((d) => {
    const pts = worklist.filter(
      (c) => c.districtSlug === d.slug && c.latitude != null && c.longitude != null
    );
    const n = pts.length;
    const lat = n ? pts.reduce((s, c) => s + (c.latitude as number), 0) / n : 0;
    const lng = n ? pts.reduce((s, c) => s + (c.longitude as number), 0) / n : 0;
    return { slug: d.slug, name: d.name, dbId: d.dbId, lat, lng, sampleSize: n };
  });
  return cache;
}

export type SchematicPoint = { x: number; y: number };

/** Projects real lat/lng points into a 0-100 x 0-100 box, padded, with
 *  latitude inverted (north = up, matching how a map reads). Simple linear
 *  min-max scaling - not equirectangular, not any real projection - fine for
 *  8 widely-separated points laid out schematically, not for precision. */
export function projectSchematic(
  points: DistrictPoint[],
  padding = 14
): Map<string, SchematicPoint> {
  const withCoords = points.filter((p) => p.sampleSize > 0);
  const lats = withCoords.map((p) => p.lat);
  const lngs = withCoords.map((p) => p.lng);
  const latMin = Math.min(...lats);
  const latMax = Math.max(...lats);
  const lngMin = Math.min(...lngs);
  const lngMax = Math.max(...lngs);
  const latSpan = latMax - latMin || 1;
  const lngSpan = lngMax - lngMin || 1;

  const out = new Map<string, SchematicPoint>();
  for (const p of points) {
    if (p.sampleSize === 0) continue;
    out.set(p.slug, {
      x: padding + ((p.lng - lngMin) / lngSpan) * (100 - 2 * padding),
      y: padding + ((latMax - p.lat) / latSpan) * (100 - 2 * padding),
    });
  }
  return out;
}
