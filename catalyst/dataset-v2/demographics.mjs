// -----------------------------------------------------------------------------
// demographics.mjs — victim/complainant occupation and religion (P1.5).
//
// Scope, deliberately: this module assigns OccupationID and ReligionID.
// It does NOT assign CasteID - that's a separate, open decision (see PLAN.md
// P1.5) because the caste taxonomy itself needs sign-off before any values
// are generated, not just the "aggregate-only, victim-side" presentation
// framing that's already agreed.
//
// Same reasoning as geo_time.mjs: this is a STATISTICAL population draw, not
// a narrative choice. No named individual is characterised - a complainant's
// OccupationID/ReligionID is drawn from a Karnataka-representative
// distribution, deterministically in ComplainantID, so the aggregate rolls up
// to something a real demographic table would produce. Nothing here reads or
// depends on a person's name, and nothing about it is meant to say anything
// about any specific fictional individual - it exists so P4.5's aggregate
// view has a real distribution to display, with a real N, not just zeros.
//
// The Accused table has no ReligionID/CasteID/OccupationID column at all
// (see DATA_STORE_SCHEMA.md) - there is structurally nowhere to put an
// offender-side demographic value even by mistake. This module only ever
// touches ComplainantDetails.
// -----------------------------------------------------------------------------

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

function weightedPick(r, weights) {
  const total = weights.reduce((a, [, w]) => a + w, 0);
  let x = r() * total;
  for (const [id, w] of weights) {
    x -= w;
    if (x < 0) return id;
  }
  return weights[weights.length - 1][0];
}

// Karnataka-representative occupation mix for FIR complainants. Not a census
// figure (no such official table exists) - a reasonable urban-leaning mix
// since most stations here are urban/semi-urban, kept broad on purpose so no
// single category dominates the aggregate view.
const OCCUPATION_WEIGHTS = [
  [1, 14], // Business / Shop Owner
  [2, 10], // Farmer
  [3, 9],  // Government Employee
  [4, 22], // Private Employee
  [5, 8],  // Driver
  [6, 12], // Homemaker
  [7, 10], // Student
  [8, 9],  // Daily Wage Worker
  [9, 12], // Self-employed / Professional
  [10, 4], // Retired
];

// Religion proportions from Census of India 2011, Karnataka state table
// (approximate, rounded to whole percent for a weight table - if exact
// figures matter for a specific claim, verify against the published census
// rather than trusting this comment). Source of the categories themselves,
// not just these particular numbers: this is the same set NCRB's own annual
// "Crime in India" report uses.
const RELIGION_WEIGHTS = [
  [1, 84], // Hindu
  [2, 13], // Muslim
  [3, 2],  // Christian
  [4, 1],  // Jain
  [6, 0.2],// Buddhist
  [5, 0.1],// Sikh
  [7, 0.3],// Other
];

export function assignOccupation(complainantId, seed = complainantId) {
  return weightedPick(rng(`occ:${seed}`), OCCUPATION_WEIGHTS);
}

export function assignReligion(complainantId, seed = complainantId) {
  return weightedPick(rng(`rel:${seed}`), RELIGION_WEIGHTS);
}
