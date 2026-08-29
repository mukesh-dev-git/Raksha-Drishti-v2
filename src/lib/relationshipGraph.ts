// -----------------------------------------------------------------------------
// P9.4 - a REAL relationship/network graph for /cases/[caseId], replacing
// what the deleted EvidenceBoard.tsx used to show off investigationData.ts's
// 100%-RNG mock generator. Nothing here is invented: every node is a person
// or location a real record actually names, every edge is one real record
// (a call, a transaction, a CCTV sighting, a witness statement) connecting
// two of them.
//
// personFusion.ts already solved the hard join problem (matchTextToPerson,
// extractCctvToken - both exported from there for exactly this reuse) for
// building ONE PERSON's cross-source timeline. That's the wrong shape for a
// graph, which needs the *pairs* a record connects, not one person's view of
// it - so this module goes back to the raw seed collections directly and
// walks each record's own two (or more) endpoints, rather than flattening
// through getScenarioTimeline/getFusedPerson the way the case-detail page's
// timeline does.
// -----------------------------------------------------------------------------
import callRecordsRaw from "./nosql-seed/CallRecords.json";
import cctvSightingsRaw from "./nosql-seed/CCTVSightings.json";
import witnessStatementsRaw from "./nosql-seed/WitnessStatements.json";
import transactionsRaw from "./nosql-seed/Transactions.json";
import { matchTextToPerson, extractCctvToken, type ResolvedPerson, type ResolvedPersonsMap } from "./personFusion";

type CallRecord = {
  scenarioId: string;
  id: string;
  from: string;
  to: string;
  timestamp: string;
  durationSec: number;
  note?: string;
  resolvedPersons: ResolvedPersonsMap;
};
type Transaction = {
  scenarioId: string;
  id: string;
  fromAccount: string;
  toAccount: string;
  amount: number;
  timestamp: string;
  note?: string;
  resolvedPersons: ResolvedPersonsMap;
};
type CctvSighting = {
  scenarioId: string;
  id: string;
  cameraLocation: string;
  personOrVehicle: string;
  timestamp: string;
  note?: string;
  resolvedPersons: ResolvedPersonsMap;
};
type WitnessStatement = {
  scenarioId: string;
  id: string;
  witnessName: string;
  statementDate: string;
  statementText: string;
  relatedPerson: string;
  resolvedPersons: ResolvedPersonsMap;
};

// `as unknown as X[]` (not a direct cast): TS infers each seed JSON array as
// a union of per-record literal types (every record's own resolvedPersons
// keys, others left as `?: undefined`), which a direct cast to
// Record<string, ResolvedPerson> correctly rejects (undefined isn't a
// ResolvedPerson). Same trapdoor personFusion.ts routes around via `as any`
// on its own JSON imports - going through `unknown` here instead of `any` so
// everything past this line still gets real type-checking.
const callRecords = callRecordsRaw as unknown as CallRecord[];
const transactions = transactionsRaw as unknown as Transaction[];
const cctvSightings = cctvSightingsRaw as unknown as CctvSighting[];
const witnessStatements = witnessStatementsRaw as unknown as WitnessStatement[];

export type GraphNodeKind = "Accused" | "Victim" | "Complainant" | "Witness" | "Location";
export type GraphEdgeKind = "call" | "transaction" | "cctv" | "statement";

export type GraphNode = {
  /** Stable across the whole graph: a person's real KA-Pxxxx personId when
   *  they have one (Accused), else `name:<their name>` (Victim/Complainant -
   *  no global personId yet, see personFusion.ts's isFusable comment for
   *  why) or `loc:<camera location>` / `witness:<witness name>`. Never a
   *  synthetic incrementing id - every node id traces back to a real field. */
  id: string;
  label: string;
  kind: GraphNodeKind;
  /** How many real records this node appears in - used client-side to size
   *  the node (a person cited 6 times is visually more central than one
   *  cited once), not a fabricated "importance score". */
  recordCount: number;
};

export type GraphEdge = {
  /** The real record id (e.g. "C1-CL-1") - always citable, same discipline
   *  personFusion.ts's FusedEvidenceItem.id follows. */
  id: string;
  source: string;
  target: string;
  kind: GraphEdgeKind;
  label: string;
  timestamp: string;
};

export type RelationshipGraph = { nodes: GraphNode[]; edges: GraphEdge[] };

function personNodeId(rp: ResolvedPerson): string {
  return rp.personId ?? `name:${rp.name}`;
}
function locationNodeId(cameraLocation: string): string {
  return `loc:${cameraLocation}`;
}
function witnessNodeId(witnessName: string): string {
  return `witness:${witnessName}`;
}

class GraphBuilder {
  private nodes = new Map<string, GraphNode>();
  edges: GraphEdge[] = [];

  private touch(id: string, label: string, kind: GraphNodeKind) {
    const existing = this.nodes.get(id);
    if (existing) {
      existing.recordCount += 1;
      return id;
    }
    this.nodes.set(id, { id, label, kind, recordCount: 1 });
    return id;
  }

  person(rp: ResolvedPerson): string {
    // rp.type is only ever "Accused"/"Victim" in the seeded data today (the
    // "Complainant" branch is real per personFusion.ts's ResolvedPerson type
    // but not currently authored into any record) - passed through as-is
    // rather than remapped, so a future Complainant record renders correctly
    // with zero changes here.
    return this.touch(personNodeId(rp), rp.name, rp.type as GraphNodeKind);
  }
  location(cameraLocation: string): string {
    return this.touch(locationNodeId(cameraLocation), cameraLocation, "Location");
  }
  witness(witnessName: string): string {
    return this.touch(witnessNodeId(witnessName), witnessName, "Witness");
  }

  /** Every edge goes through here so the "no self-loop" rule (a record that
   *  resolves to the same entity on both ends isn't a relationship - see
   *  C1-WS-2, where the accused's own recorded statement about himself would
   *  otherwise draw a line from a node to itself) is enforced in one place. */
  link(sourceId: string, targetId: string, edge: Omit<GraphEdge, "source" | "target">) {
    if (sourceId === targetId) return;
    this.edges.push({ ...edge, source: sourceId, target: targetId });
  }

  build(): RelationshipGraph {
    return { nodes: [...this.nodes.values()], edges: this.edges };
  }
}

/**
 * Real nodes/edges for one scenario's evidence, straight off the raw seed
 * collections. No node or edge here is invented - every one traces back to
 * a specific record id, checkable against src/lib/nosql-seed/*.json.
 *
 * Deliberately not cached module-scope the way personFusion.ts's fusion is -
 * this filters to one scenarioId per call and the seed collections are tiny
 * (41/24/17/22 rows total), so re-scanning per case-detail page render costs
 * nothing worth caching for.
 */
export function getCaseRelationshipGraph(scenarioId: string): RelationshipGraph {
  const g = new GraphBuilder();

  // Calls: from -> to, both clean P-tokens, always resolvable.
  for (const r of callRecords) {
    if (r.scenarioId !== scenarioId) continue;
    const fromRp = r.resolvedPersons[r.from];
    const toRp = r.resolvedPersons[r.to];
    if (!fromRp || !toRp) continue; // token cited but not in this record's own resolvedPersons - unresolved, not guessed at
    g.link(g.person(fromRp), g.person(toRp), {
      id: r.id,
      kind: "call",
      timestamp: r.timestamp,
      label: `Call · ${r.durationSec}s${r.note ? ` — ${r.note}` : ""}`,
    });
  }

  // Transactions: fromAccount/toAccount are free text ("Suresh Naik - Canara
  // xx1190"), joined by name/alias match via matchTextToPerson - same
  // fallback personFusion.ts uses for the identical field.
  for (const r of transactions) {
    if (r.scenarioId !== scenarioId) continue;
    const fromTok = matchTextToPerson(r.fromAccount, r.resolvedPersons);
    const toTok = matchTextToPerson(r.toAccount, r.resolvedPersons);
    const fromRp = fromTok ? r.resolvedPersons[fromTok] : undefined;
    const toRp = toTok ? r.resolvedPersons[toTok] : undefined;
    if (!fromRp || !toRp) continue; // account label didn't match a known person - don't guess an endpoint
    g.link(g.person(fromRp), g.person(toRp), {
      id: r.id,
      kind: "transaction",
      timestamp: r.timestamp,
      label: `₹${Number(r.amount).toLocaleString("en-IN")}${r.note ? ` — ${r.note}` : ""}`,
    });
  }

  // CCTV: person <-> the real camera location that sighted them, via
  // extractCctvToken (leading "P<n>" token, else the same name/alias
  // fallback). A vehicle-only sighting with no person attributable
  // (extractCctvToken returns undefined) is skipped - no node invented for
  // "unidentified vehicle".
  for (const r of cctvSightings) {
    if (r.scenarioId !== scenarioId) continue;
    const token = extractCctvToken(r.personOrVehicle, r.resolvedPersons);
    const rp = token ? r.resolvedPersons[token] : undefined;
    if (!rp) continue;
    g.link(g.person(rp), g.location(r.cameraLocation), {
      id: r.id,
      kind: "cctv",
      timestamp: r.timestamp,
      label: `Sighted${r.note ? ` — ${r.note}` : ""}`,
    });
  }

  // Witness statements: witnessName is free text naming whoever gave the
  // statement, relatedPerson is the clean P-token it's about. Found while
  // building this against the real data (not assumed): witnessName is
  // sometimes literally the accused's OR another resolved person's own name
  // ("Suresh Naik (as accused, recorded statement)", "Tarun Bhatia (as
  // accused)") - i.e. some "witness statements" are actually one already-
  // known person's statement about another. Tried against matchTextToPerson
  // first so those become real person-to-person edges instead of a spurious
  // duplicate "Witness: Tarun Bhatia" node standing in for someone who
  // already has a real node. Only falls back to a free-text witness node
  // when the name genuinely doesn't resolve to anyone already in this
  // record's resolvedPersons (e.g. "Lakshmi Bai (parking attendant)").
  //
  // Honest limitation, not fixed here: matchTextToPerson is a plain
  // substring match against name/aliases, so a witness label whose
  // parenthetical doesn't overlap any alias on file (e.g. "Faizal Khan
  // installing a device" against an alias list that only has "Faizal Khan
  // (device installer)", no bare "Faizal Khan") won't match and falls back
  // to a free-text Witness node instead of the real person node. That's the
  // same imprecision personFusion.ts already lives with for this exact
  // helper - not a new gap this module introduces.
  for (const r of witnessStatements) {
    if (r.scenarioId !== scenarioId) continue;
    const relatedRp = r.resolvedPersons[r.relatedPerson];
    if (!relatedRp) continue;
    const witnessTok = matchTextToPerson(r.witnessName, r.resolvedPersons);
    const witnessRp = witnessTok ? r.resolvedPersons[witnessTok] : undefined;
    const sourceId = witnessRp ? g.person(witnessRp) : g.witness(r.witnessName);
    g.link(sourceId, g.person(relatedRp), {
      id: r.id,
      kind: "statement",
      timestamp: `${r.statementDate}T00:00:00`,
      label: "Witness statement",
    });
  }

  return g.build();
}
