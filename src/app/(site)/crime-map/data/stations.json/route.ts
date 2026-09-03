import { NextResponse } from "next/server";
import policeStations from "@/lib/real-data/policeStations.json";

// -----------------------------------------------------------------------------
// P13 Phase A (2026-09-03) - real police station locations for the hotspot
// map, a NEW layer, additive to the existing (synthetic-but-real-neighbourhood-
// anchored) incident points points.json already serves.
//
// Deliberately NOT a replacement for anything: CaseMaster's per-FIR
// coordinates (points.json) come from geo_time.mjs's placeIncident(), which
// already scatters incidents around real, hand-verified Karnataka locality
// names - correct as far as it goes, but those are neighbourhood centroids,
// not real station buildings, and matching this file's ~921 real station
// names against the app's own ~59 synthetic Unit rows (P1.7) to rewrite that
// generator would risk a silent wrong-station mismatch (data-entry artifacts
// exist in the source itself, e.g. "Bruceept PS") for a 12,000-row re-import
// - a bigger, riskier change than "add a real layer" for a smaller, less
// certain win. See catalyst/real-data/police-stations/parse-kml.mjs for the
// real source (KSRSAC via OpenCity) and how this file was produced.
//
// Static bundled data, not a live query - this is real government reference
// data with no reason to change per-request, same reasoning as districts.ts.
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    source: "KSRSAC (Karnataka State Remote Sensing Applications Centre), via https://data.opencity.in/dataset/police-station-locations",
    fetchedAt: "2026-09-03",
    total: policeStations.length,
    stations: policeStations,
  });
}
