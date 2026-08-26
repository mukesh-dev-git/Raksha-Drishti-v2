// -----------------------------------------------------------------------------
// P3.1 (entity fusion) + P3.3 (cross-source timeline merge), combined - the
// fusion naturally produces the merged timeline as its main output, so
// building them as two passes over the same data would just mean walking
// every record twice. See PLAN.md P3.
//
// P1.1 already solved the hard, fuzzy part of this - assigning one stable
// KA-Pxxxx id to a person regardless of name variant ("Suresh Naik" vs.
// "Suresh N."), and bridging every scenario's local P1..P4 tokens to it via
// each record's `resolvedPersons` map. That leaves a real but more
// mechanical problem this module solves: five record types cite a person in
// FIVE DIFFERENT SHAPES, and nothing before this joined them into one
// person's story across every case they appear in, not just one scenario:
//
//   CallRecords        from / to               -> clean P-token, both ends
//   WitnessStatements  relatedPerson            -> clean P-token, single
//   CCTVSightings      personOrVehicle          -> P-token PREFIX in free
//                                                  text ("P2, on foot..."),
//                                                  sometimes absent (vehicle-
//                                                  only sighting, no person)
//   Transactions       fromAccount / toAccount  -> NO token at all - the
//                                                  person's name is embedded
//                                                  in a free-text account
//                                                  label ("Suresh Naik -
//                                                  Canara xx1190"). Joined by
//                                                  name/alias match, not id.
//   TimelineEvents     source + sourceId        -> no person field at all -
//                                                  it points at ANOTHER
//                                                  record (a call, a
//                                                  sighting, ...) and
//                                                  inherits that record's
//                                                  people. Skipped as a
//                                                  timeline node in its own
//                                                  right (folded into the
//                                                  source record instead) to
//                                                  avoid double-counting the
//                                                  same event twice.
//
// Fusion is also cross-SCENARIO, not just cross-record: a person who appears
// in two scenarios (6 of the 47 do, per P1.1) gets ONE profile spanning
// both, sorted chronologically. That is the concrete, demoable version of
// the PS's "repeat offender... across different jurisdictions" ask.
// -----------------------------------------------------------------------------
import callRecords from "./nosql-seed/CallRecords.json";
import cctvSightings from "./nosql-seed/CCTVSightings.json";
import witnessStatements from "./nosql-seed/WitnessStatements.json";
import transactions from "./nosql-seed/Transactions.json";

// resolvedPersons entries come in TWO shapes, found live (not documented
// anywhere before now): Accused entries carry the full P1.1 apparatus
// (personId/aliases/caseMasterIds/accusedMasterIds); Victim entries are
// {id, name, type} only - NO global personId, because P1.1 scoped itself to
// `Accused.PersonID` specifically and never touched Victim/Complainant.
// Fusing a victim would mean inventing an id or keying by name, which is
// exactly the bug P1.1 fixed for Accused - so victims are skipped (see
// isFusable below), not guessed at. Real follow-up work, not done here:
// give Victim/Complainant the same global-id treatment P1.1 gave Accused.
type ResolvedPerson = {
  type: "Accused" | "Victim" | "Complainant" | string;
  id: number;
  name: string;
  personId?: string;
  aliases?: string[];
  caseMasterIds?: number[];
};
type ResolvedPersonsMap = Record<string, ResolvedPerson>;

type FusableResolvedPerson = ResolvedPerson & { personId: string; aliases: string[]; caseMasterIds: number[] };
function isFusable(rp: ResolvedPerson): rp is FusableResolvedPerson {
  return !!rp.personId;
}

export type EvidenceKind = "call" | "cctv" | "statement" | "transaction";

export type FusedEvidenceItem = {
  id: string; // e.g. "C1-CL-1" - the real record id, always citable (P5.6)
  scenarioId: string;
  kind: EvidenceKind;
  timestamp: string; // ISO; see dateOnly for statements, which only carry a date
  dateOnly: boolean;
  summary: string; // human-readable one-liner assembled from the record's own fields, not fabricated prose
};

export type FusedPerson = {
  personId: string;
  name: string;
  aliases: string[];
  types: string[]; // union of "Accused"/"Victim"/... across every scenario they appear in
  scenarioIds: string[];
  caseMasterIds: number[];
  /** Chronologically sorted, cross-scenario, cross-source. This IS the P3.3 deliverable. */
  timeline: FusedEvidenceItem[];
};

function addPerson(map: Map<string, FusedPerson>, rp: FusableResolvedPerson, scenarioId: string) {
  const existing = map.get(rp.personId);
  if (existing) {
    if (!existing.scenarioIds.includes(scenarioId)) existing.scenarioIds.push(scenarioId);
    for (const cid of rp.caseMasterIds) if (!existing.caseMasterIds.includes(cid)) existing.caseMasterIds.push(cid);
    for (const a of rp.aliases) if (!existing.aliases.includes(a)) existing.aliases.push(a);
    if (!existing.types.includes(rp.type)) existing.types.push(rp.type);
    return existing;
  }
  const created: FusedPerson = {
    personId: rp.personId,
    name: rp.name,
    aliases: [...rp.aliases],
    types: [rp.type],
    scenarioIds: [scenarioId],
    caseMasterIds: [...rp.caseMasterIds],
    timeline: [],
  };
  map.set(rp.personId, created);
  return created;
}

function push(map: Map<string, FusedPerson>, resolved: ResolvedPersonsMap, scenarioId: string, token: string | undefined, item: FusedEvidenceItem) {
  if (!token) return;
  const rp = resolved[token];
  if (!rp) return; // token cited by a record but not in this record's own resolvedPersons - treat as unresolved rather than guess
  if (!isFusable(rp)) return; // Victim/Complainant - no global personId yet, see the type comment above
  const person = addPerson(map, rp, scenarioId);
  person.timeline.push(item);
}

/** Matches free text against every resolvedPerson's name/aliases for this
 *  record - the fallback join used where a field embeds a name instead of
 *  citing a clean P-token (transactions always; CCTV sometimes - see
 *  extractCctvToken, whose C1-CC-2 comment is the reason this exists). */
function matchTextToPerson(text: string, resolved: ResolvedPersonsMap): string | undefined {
  for (const [token, rp] of Object.entries(resolved)) {
    if (text.includes(rp.name) || (rp.aliases ?? []).some((a) => text.includes(a))) return token;
  }
  return undefined;
}

/** CCTV's personOrVehicle is free text with THREE real shapes, not one:
 *  a leading "P<n>" token ("P2, on foot..."), a name embedded in a vehicle
 *  description ("Suresh Naik's registered vehicle KA-04-XX-1187" - C1-CC-2,
 *  which is the single piece of evidence C1's actual authored contradiction
 *  hinges on, and was silently dropped by token-only matching until this
 *  fallback was added), or genuinely no person at all (an unidentified
 *  vehicle/plate with nothing to attribute). Try the token first since it's
 *  unambiguous when present, then fall back to a name match. */
function extractCctvToken(personOrVehicle: string, resolved: ResolvedPersonsMap): string | undefined {
  const m = /^P\d+/.exec(personOrVehicle.trim());
  if (m) return m[0];
  return matchTextToPerson(personOrVehicle, resolved);
}

let cache: Map<string, FusedPerson> | null = null;

/** Builds (and caches) the full cross-scenario fusion. Module-scope cache is
 *  fine - the seed JSON this reads is bundled at build time, not live data,
 *  same assumption dashboardData.ts already makes. */
export function fuseAllPersons(): Map<string, FusedPerson> {
  if (cache) return cache;
  const map = new Map<string, FusedPerson>();

  for (const r of callRecords as (ResolvedPersonsMap extends never ? never : any)[]) {
    const resolved: ResolvedPersonsMap = r.resolvedPersons;
    const base = { scenarioId: r.scenarioId, kind: "call" as const, timestamp: r.timestamp, dateOnly: false };
    push(map, resolved, r.scenarioId, r.from, {
      id: r.id,
      ...base,
      summary: `Call to ${resolved[r.to]?.name ?? r.to}${r.note ? ` — ${r.note}` : ""} (${r.durationSec}s)`,
    });
    push(map, resolved, r.scenarioId, r.to, {
      id: r.id,
      ...base,
      summary: `Call from ${resolved[r.from]?.name ?? r.from}${r.note ? ` — ${r.note}` : ""} (${r.durationSec}s)`,
    });
  }

  for (const r of cctvSightings as any[]) {
    const resolved: ResolvedPersonsMap = r.resolvedPersons;
    const token = extractCctvToken(r.personOrVehicle, resolved);
    push(map, resolved, r.scenarioId, token, {
      id: r.id,
      scenarioId: r.scenarioId,
      kind: "cctv",
      timestamp: r.timestamp,
      dateOnly: false,
      summary: `Sighted — ${r.cameraLocation}${r.note ? ` (${r.note})` : ""}`,
    });
  }

  for (const r of witnessStatements as any[]) {
    const resolved: ResolvedPersonsMap = r.resolvedPersons;
    push(map, resolved, r.scenarioId, r.relatedPerson, {
      id: r.id,
      scenarioId: r.scenarioId,
      kind: "statement",
      // Statements only carry a DATE, not a time - a genuine granularity
      // difference from the other sources, not a missing field. Anchored to
      // 00:00 purely for chronological sort order; dateOnly:true is the
      // signal that no time-of-day claim should be read from this timestamp.
      timestamp: `${r.statementDate}T00:00:00`,
      dateOnly: true,
      summary: `Witness statement (${r.witnessName}): "${r.statementText}"`,
    });
  }

  for (const r of transactions as any[]) {
    const resolved: ResolvedPersonsMap = r.resolvedPersons;
    const fromToken = matchTextToPerson(r.fromAccount, resolved);
    const toToken = matchTextToPerson(r.toAccount, resolved);
    const base = { scenarioId: r.scenarioId, kind: "transaction" as const, timestamp: r.timestamp, dateOnly: false };
    push(map, resolved, r.scenarioId, fromToken, {
      id: r.id,
      ...base,
      summary: `Sent ₹${Number(r.amount).toLocaleString("en-IN")} to ${r.toAccount}${r.note ? ` — ${r.note}` : ""}`,
    });
    push(map, resolved, r.scenarioId, toToken, {
      id: r.id,
      ...base,
      summary: `Received ₹${Number(r.amount).toLocaleString("en-IN")} from ${r.fromAccount}${r.note ? ` — ${r.note}` : ""}`,
    });
  }

  for (const person of map.values()) {
    person.timeline.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }

  cache = map;
  return map;
}

export function getFusedPerson(personId: string): FusedPerson | null {
  return fuseAllPersons().get(personId) ?? null;
}

/** Every person who appears in 2+ scenarios - the direct, demoable answer to
 *  "repeat offender... across different jurisdictions". */
export function getCrossCasePersons(): FusedPerson[] {
  return [...fuseAllPersons().values()].filter((p) => p.scenarioIds.length > 1);
}
