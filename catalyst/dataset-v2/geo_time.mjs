// -----------------------------------------------------------------------------
// geo_time.mjs — where and when an incident happened (P1.3 / P1.4).
//
// Two generator capabilities, kept in their own module because P1.2's broad
// generator needs exactly the same two and must not reimplement them:
//
//   placeIncident(policeStationId, seed)  -> { latitude, longitude, locality }
//   incidentHour(crimeMinorHeadId, seed)  -> hour 0-23
//
// Both are DETERMINISTIC in `seed` (use the CaseMasterID), so re-running the
// generator never renumbers or relocates an existing case. Same reasoning as
// P1.1's stable PersonIDs: seed data that reshuffles on every build can't be
// referenced by anything else.
// -----------------------------------------------------------------------------

import { NEW_STATION_LOCALITIES } from "./karnataka_districts.mjs";

// --- deterministic PRNG -------------------------------------------------------
// mulberry32 on a hashed seed. Not for cryptography - just needs to be stable
// across machines and Node versions, which Math.random() is not.
function rng(seed) {
  let h = 2166136261 >>> 0;
  const s = String(seed);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return function next() {
    h = (h + 0x6d2b79f5) >>> 0;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// --- P1.3 · geography ---------------------------------------------------------
// Real localities inside each police station's actual jurisdiction. A crime
// has to happen somewhere that exists: the point of this table is that every
// generated coordinate lands on a real Karnataka place in the RIGHT district,
// rather than on a bounding-box random point that can fall in a lake, in the
// Arabian Sea, or across a district line.
//
// `spreadKm` is how far incidents scatter from the locality centre - tighter
// in dense urban stations, wider for the rural ones that police large areas.
export const STATION_LOCALITIES = {
  // --- Bengaluru Urban (4401) ---
  440101: { spreadKm: 1.2, localities: [ // Yeshwanthpur PS
    ["Yeshwanthpur", 13.0287, 77.5541], ["Malleshwaram", 13.0030, 77.5700],
    ["Rajajinagar", 12.9910, 77.5520], ["Peenya", 13.0280, 77.5170],
    ["Mathikere", 13.0330, 77.5650],
  ]},
  440102: { spreadKm: 1.8, localities: [ // Whitefield PS
    ["Whitefield", 12.9698, 77.7500], ["Marathahalli", 12.9560, 77.7010],
    ["Kadugodi", 12.9950, 77.7600], ["Brookefield", 12.9650, 77.7170],
    ["Varthur", 12.9400, 77.7480],
  ]},
  440103: { spreadKm: 1.2, localities: [ // K.G. Halli PS
    ["K.G. Halli", 13.0080, 77.6200], ["Kammanahalli", 13.0130, 77.6380],
    ["Banaswadi", 13.0140, 77.6510], ["Lingarajapuram", 13.0090, 77.6280],
  ]},
  // --- Mysuru (4402) ---
  440201: { spreadKm: 1.0, localities: [ // K.R. Market PS
    ["Devaraja Market", 12.3080, 76.6520], ["Sayyaji Rao Road", 12.3090, 76.6480],
    ["Mysuru Palace", 12.3052, 76.6552], ["Chamarajapuram", 12.3020, 76.6420],
  ]},
  440202: { spreadKm: 1.2, localities: [ // Vidyaranyapuram PS
    ["Vidyaranyapuram", 12.2870, 76.6320], ["Kuvempunagar", 12.2930, 76.6180],
    ["Srirampura", 12.2960, 76.6390], ["Ramakrishnanagar", 12.2810, 76.6180],
  ]},
  // --- Belagavi (4403) ---
  440301: { spreadKm: 1.5, localities: [ // Belagavi Camp PS
    ["Camp", 15.8570, 74.5090], ["Tilakwadi", 15.8450, 74.4980],
    ["Shahapur", 15.8360, 74.5080], ["Vadgaon", 15.8300, 74.4820],
  ]},
  // --- Kalaburagi (4404) ---
  440401: { spreadKm: 1.5, localities: [ // Kalaburagi Town PS
    ["Super Market", 17.3300, 76.8340], ["Jewargi Road", 17.3160, 76.8260],
    ["Station Bazaar", 17.3350, 76.8290], ["Aiwan-e-Shahi", 17.3290, 76.8410],
  ]},
  // --- Dakshina Kannada (4405) ---
  440501: { spreadKm: 2.0, localities: [ // Mangaluru North PS
    ["Hampankatta", 12.8700, 74.8420], ["Kadri", 12.8880, 74.8560],
    ["Bejai", 12.8830, 74.8480], ["Kavoor", 12.9060, 74.8380],
    ["Surathkal", 13.0100, 74.7940],
  ]},
  // --- Tumakuru (4406) ---
  440601: { spreadKm: 1.5, localities: [ // Tumakuru City PS
    ["Tumakuru City", 13.3379, 77.1173], ["Batawadi", 13.3280, 77.1050],
    ["S.S. Puram", 13.3420, 77.1010], ["Antharasanahalli", 13.3600, 77.1350],
  ]},
  440602: { spreadKm: 4.0, localities: [ // Sira Rural PS
    ["Sira", 13.7411, 76.9046], ["Kallambella", 13.7000, 76.9300],
    ["Hulikunte", 13.8000, 76.8700], ["Bukkapatna", 13.6600, 76.8500],
  ]},
  // --- Ballari (4407) ---
  440701: { spreadKm: 1.5, localities: [ // Ballari Town PS
    ["Ballari Fort", 15.1394, 76.9214], ["Cowl Bazaar", 15.1450, 76.9260],
    ["Gandhi Nagar", 15.1520, 76.9180], ["Moka Road", 15.1280, 76.9330],
  ]},
  // --- Shivamogga (4408) ---
  440801: { spreadKm: 1.5, localities: [ // Shivamogga City PS
    ["Shivamogga City", 13.9299, 75.5681], ["Vinobanagar", 13.9380, 75.5760],
    ["Gopala", 13.9200, 75.5620], ["Sagar Road", 13.9450, 75.5850],
  ]},
  440802: { spreadKm: 5.0, localities: [ // Sagar Rural PS
    ["Sagar", 14.1667, 75.0333], ["Talaguppa", 14.2200, 74.9500],
    ["Anandapuram", 14.0700, 75.0500], ["Heggodu", 14.1900, 75.0600],
  ]},

  // --- P1.7 (2026-09-01) · the other 23 Karnataka districts ---
  // Merged in from karnataka_districts.mjs rather than transcribed here: at
  // 31 districts this table would be ~190 lines of coordinates maintained in
  // parallel with the district roster, lookups.json and the case weights.
  // The 8 districts above stay written out longhand deliberately - their
  // localities were hand-tuned and verified live in P1.3, and re-transcribing
  // working coordinates for tidiness would risk breaking them for no gain.
  ...NEW_STATION_LOCALITIES,
};

const KM_PER_DEG_LAT = 110.574;

// Place one incident inside a station's jurisdiction, offsetting by a random
// bearing/distance - a disc, not a lat/lng box, so the scatter is isotropic
// rather than stretched east-west.
//
// `anchor` is the key argument. The 15 authored scenarios already carry a
// coordinate that encodes narrative location: C1 is "The Yeshwanthpur Fencing
// Ring" and its CCTV record names a Yeshwanthpur parking lot, so that case
// belongs in Yeshwanthpur and nowhere else. Pass its existing coordinate as
// the anchor and it stays put, give or take a few hundred metres. Only omit
// the anchor for generated bulk cases (P1.2) that have no authored location -
// those pick a real locality from the station's list instead.
//
// The defect this fixes is narrower than "the coordinates are wrong": they
// were *reused*. Five station centroids each served two different cases, so
// 19 FIRs occupied 14 points. Identical coordinates are indistinguishable on
// a map at any zoom, which is fatal for a hotspot view.
export function placeIncident(policeStationId, seed, anchor = null) {
  const station = STATION_LOCALITIES[policeStationId];
  if (!station) throw new Error(`no localities defined for PoliceStationID ${policeStationId}`);
  const r = rng(`geo:${policeStationId}:${seed}`);

  let locality, baseLat, baseLng, spreadKm;
  if (anchor) {
    baseLat = anchor.latitude;
    baseLng = anchor.longitude;
    // Tight: enough to separate two cases that shared a point, not enough to
    // move an incident out of the neighbourhood its narrative names.
    spreadKm = Math.min(station.spreadKm, 1.0);
    locality = nearestLocality(policeStationId, baseLat, baseLng);
  } else {
    [locality, baseLat, baseLng] = station.localities[Math.floor(r() * station.localities.length)];
    spreadKm = station.spreadKm;
  }

  // sqrt() keeps the distribution uniform over the disc's AREA; without it
  // points bunch toward the centre.
  const distKm = spreadKm * Math.sqrt(r());
  const bearing = r() * 2 * Math.PI;

  const dLat = (distKm * Math.cos(bearing)) / KM_PER_DEG_LAT;
  const kmPerDegLng = KM_PER_DEG_LAT * Math.cos((baseLat * Math.PI) / 180);
  const dLng = (distKm * Math.sin(bearing)) / kmPerDegLng;

  return {
    latitude: Number((baseLat + dLat).toFixed(6)),
    longitude: Number((baseLng + dLng).toFixed(6)),
    locality,
  };
}

function haversineKm(aLat, aLng, bLat, bLng) {
  const R = 6371, p = Math.PI / 180;
  const dLat = (bLat - aLat) * p, dLng = (bLng - aLng) * p;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * p) * Math.cos(bLat * p) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Nearest named locality to a point - used to label an anchored incident, and
// by the verification pass to confirm a coordinate didn't drift out of its
// station's area.
export function nearestLocality(policeStationId, lat, lng) {
  const station = STATION_LOCALITIES[policeStationId];
  if (!station) return null;
  let best = null, bd = Infinity;
  for (const [name, la, lo] of station.localities) {
    const d = haversineKm(lat, lng, la, lo);
    if (d < bd) { bd = d; best = name; }
  }
  return best;
}

// --- P1.4 · time of day -------------------------------------------------------
// Relative weight per hour 0-23, per CrimeSubHeadID. These shapes are the
// whole point of the PS's "time of day x location" ask: a burglary curve that
// peaks at 2am and an assault curve that peaks at 9pm are what makes
// spatiotemporal clustering say anything a plain map doesn't.
//
//   1 Theft    - two humps: daytime market/transit crowds, then an evening peak.
//   2 Assault  - evening and night, tailing into the early hours.
//   3 Fraud    - business hours; the discrete-event kind (a handover, a
//                signing). Period frauds don't get an hour at all, see below.
//   4 Burglary - overnight, peaking either side of 2am, near-zero in daylight.
const HOUR_WEIGHTS = {
  1: [2,1,1,1,1,1, 2,4,6,7,8,9, 9,8,7,7,8,9, 10,9,8,6,4,3],
  2: [4,3,2,1,1,1, 1,2,2,3,3,4, 5,4,4,5,6,8, 10,12,12,11,9,6],
  3: [1,1,1,1,1,1, 1,2,4,7,9,10, 10,8,9,10,9,7, 4,2,1,1,1,1],
  4: [10,11,12,12,11,8, 5,2,1,1,1,1, 1,1,1,1,1,2, 3,4,5,7,8,9],
};

// P1.2 follow-through on this file's own left-open note above: rural theft
// (cattle-lifting, farm-equipment) is a night crime, not the daytime-market/
// evening-commute pattern urban theft (pickpocketing, vehicle theft from a
// parking lot) shows - conflating them under one "Theft" profile blunts both.
// Calibration source: C7 (the Shivamogga-Tumakuru cattle corridor), whose two
// hand-authored incidents at 22:30/23:00 didn't fit HOUR_WEIGHTS[1] - not
// bad data, a coarse taxonomy. Only Theft gets a rural variant: the other
// three crime types' urban/rural split isn't evidenced by anything authored.
const HOUR_WEIGHTS_RURAL_THEFT = [8,9,10,9,7,4, 2,1,1,1,1,1, 1,1,1,1,1,2, 3,4,5,6,7,8];

// Stations this file's own STATION_LOCALITIES marks as rural via a wide
// spreadKm (>=3) - policing a large sparsely-built area, not a dense PS
// jurisdiction. Re-derived from the same table rather than a second hand-
// maintained list, so the two can't drift apart.
function isRuralStation(policeStationId) {
  const station = STATION_LOCALITIES[policeStationId];
  return !!station && station.spreadKm >= 3;
}

// Calibration check against the 15 authored scenarios: 9 of the 11 discrete
// incidents fall at >=50% of their crime type's peak hour, i.e. the profiles
// agree with what a human author independently thought was realistic.
//
// The 2 that don't are both C7, the cattle-theft corridor, at 22:30 and
// 23:00. That is not bad data - livestock theft is a rural overnight crime.
// It's the taxonomy being coarse: "Theft" (CrimeSubHeadID 1) covers both
// daytime market pickpocketing and 3am cattle lifting, which have opposite
// curves. The fix is NOT to widen the Theft profile's night tail - that would
// blunt the daytime peak that distinguishes theft from burglary, which is
// precisely the contrast P4.2's spatiotemporal clustering needs to find
// anything. Better handled in P1.2 by giving rural stations a night-shifted
// theft profile, since the urban/rural split is the real driver.


// Pick an hour for a discrete incident of this crime type. `policeStationId`
// is optional - only Theft (see HOUR_WEIGHTS_RURAL_THEFT above) branches on
// it; every other crime type ignores it and uses its one urban/rural-blended
// profile, same as before this was added.
export function incidentHour(crimeMinorHeadId, seed, policeStationId = null) {
  const weights =
    crimeMinorHeadId === 1 && isRuralStation(policeStationId)
      ? HOUR_WEIGHTS_RURAL_THEFT
      : HOUR_WEIGHTS[crimeMinorHeadId];
  if (!weights) throw new Error(`no hour profile for CrimeSubHeadID ${crimeMinorHeadId}`);
  const r = rng(`hour:${crimeMinorHeadId}:${seed}`);
  const total = weights.reduce((a, b) => a + b, 0);
  let x = r() * total;
  for (let h = 0; h < 24; h++) {
    x -= weights[h];
    if (x < 0) return h;
  }
  return 23;
}

// A crime that unfolded over days or weeks (a running extortion racket, a
// ponzi scheme, a skimming operation) has no time of day, and inventing one
// would fabricate precision the record doesn't have. Real FIRs record 00:00
// with a from/to date range in exactly this situation.
//
// This matters downstream: P4.2 must EXCLUDE these from any time-of-day
// analysis. Counting their 00:00 as "midnight" would manufacture a midnight
// spike that is purely an artefact of how unknown times are stored.
export function isPeriodOffence(incidentFromDate, incidentToDate) {
  const from = new Date(String(incidentFromDate).replace(" ", "T"));
  const to = new Date(String(incidentToDate).replace(" ", "T"));
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return false;
  return to.getTime() - from.getTime() > 36 * 60 * 60 * 1000; // > 36h
}
