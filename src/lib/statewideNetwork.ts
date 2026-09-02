// -----------------------------------------------------------------------------
// P4.9 item 5 - "Statewide link-analysis graph": relationshipGraph.ts's real
// per-case relationship graph (P9.4), generalised ACROSS cases for the full
// 47-person evidence-linked register, not just within one FIR. This is the
// concrete build of PLAN.md P4.9's own framing: "closer to what 'Network &
// Behavioral Analysis' actually asked for than a list view [/repeat-
// offenders] is."
//
// WHY THIS ISN'T "relationshipGraph.ts but for every scenario at once":
// relationshipGraph.ts draws PERSON-TO-PERSON edges because within one
// scenario, the raw evidence records (calls, transactions, CCTV, statements)
// each name two real endpoints - a genuine pairwise relationship. There is no
// equivalent statewide: nothing in the seed data ever puts two people from
// two DIFFERENT cases in the same record together. Concatenating every
// case's relationshipGraph would just render 15 disconnected islands - no
// new information over visiting each case page in turn.
//
// The one thing that IS real and cross-case is P1.1's entity fusion itself:
// personFusion.ts's fuseAllPersons() already proves, per person, exactly
// which real CaseMasterIDs (FIRs) they are named as accused in - not a
// coincidental name match, the same stable KA-Pxxxx id P1.1 resolved. So the
// real statewide network is a BIPARTITE graph: Person nodes and Case (FIR)
// nodes, with an edge wherever a person is actually named accused in that
// FIR. A person named in only one FIR gets one edge (a leaf on their case's
// cluster). The 6 real repeat subjects getRepeatCaseSuspects() finds get 2+
// edges, visibly bridging FIR nodes - the actual "network" in this network
// view, backed by nothing invented.
//
// Checked against the live data before writing this (not assumed): every one
// of today's 47 fused persons has scenarioIds.length === 1 (nobody currently
// spans two different SCENARIOS, only within-scenario multi-FIR repeats -
// same fact personFusion.ts's getRepeatCaseSuspects() comment already
// records). Each of the 15 scenarios contributes 1-2 real FIRs (19 total),
// per scenarioMeta.json's own caseMasterIds arrays. FIR (Case) nodes carry
// their real scenarioId so the client can group/color same-scenario FIRs
// together - genuinely clustering "by which of the 15 scenarios they belong
// to" without drawing any FIR-to-FIR edge that isn't backed by a real shared
// person.
// -----------------------------------------------------------------------------
import { fuseAllPersons, getRepeatCaseSuspects, type FusedPerson } from "./personFusion";
import { caseDetailLink } from "./caseWorklist";
import { caseTypes, districts } from "./data";
import scenarioMetaRaw from "./nosql-seed/scenarioMeta.json";
import caseFactsRaw from "./nosql-seed/caseFacts.json";
import { getLiveCaseFacts, type CaseFact } from "./liveCaseFacts";

type ScenarioMeta = {
  title: string;
  crimeMinorHeadID: number;
  districtId: number | null;
  districtIds: number[];
  caseMasterIds: number[];
};
const SCENARIO_META = scenarioMetaRaw as Record<string, ScenarioMeta>;

// P10 Phase 4: only ever looked up for the 19 authored FIRs (via
// SCENARIO_META's own caseMasterIds arrays - bulk cases never appear here),
// so swapping to the live register (a strict superset) is safe. Bundled
// fallback if the live fetch fails.
const BUNDLED_CASE_FACTS: Record<string, CaseFact> = caseFactsRaw as Record<string, CaseFact>;

export type NetworkNodeKind = "Person" | "Case";

export type NetworkNode = {
  /** Person: the real KA-Pxxxx personId (P1.1). Case: `case:<caseMasterId>`
   *  - the real FIR id, never a synthetic incrementing id. */
  id: string;
  label: string;
  kind: NetworkNodeKind;
  /** Real grouping key for BOTH kinds - which of the 15 scenarios this node
   *  belongs to. For a Person this is scenarioIds[0] (safe today because
   *  every person's scenarioIds.length is 1 - see file header; a genuinely
   *  cross-scenario person would still render, just clustered under their
   *  first scenario rather than split across two). */
  scenarioId: string;
  scenarioTitle: string;
  /** How many real things this node is tied to - a person's total evidence
   *  items across every FIR they're named in (Person), or how many distinct
   *  accused persons are named in this FIR (Case). Used client-side to size
   *  the node, same convention relationshipGraph.ts's recordCount follows. */
  recordCount: number;
  /** Person-only: true iff getRepeatCaseSuspects() includes them (named
   *  accused in 2+ real FIRs) - the actual bridge nodes in this graph. */
  isRepeat?: boolean;
  /** Person-only: every real FIR they're named accused in. */
  caseMasterIds?: number[];
  /** Case-only. */
  caseMasterId?: number;
  crimeNo?: string;
  districtName?: string;
  crimeTypeName?: string;
  /** Case-only: this FIR's real investigation-workspace page. */
  link?: string;
};

export type NetworkEdge = {
  /** `<personId>__case:<caseMasterId>` - always traces back to one real
   *  person and one real FIR, per P1.1's own resolvedPersons.caseMasterIds
   *  field (not a name-match guess). */
  id: string;
  source: string;
  target: string;
  label: string;
};

export type StatewideNetwork = {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  stats: {
    personCount: number;
    caseCount: number;
    scenarioCount: number;
    edgeCount: number;
    repeatSubjectCount: number;
  };
};

function caseNodeId(caseMasterId: number): string {
  return `case:${caseMasterId}`;
}

function buildCaseNode(caseMasterId: number, scenarioId: string, meta: ScenarioMeta, facts: Record<string, CaseFact>): NetworkNode {
  const fact = facts[String(caseMasterId)];
  const crimeType = caseTypes.find((c) => c.dbId === (fact?.crimeMinorHeadId ?? meta.crimeMinorHeadID));
  const district = districts.find((d) => d.dbId === (fact?.districtId ?? meta.districtId ?? undefined));
  return {
    id: caseNodeId(caseMasterId),
    label: meta.title,
    kind: "Case",
    scenarioId,
    scenarioTitle: meta.title,
    recordCount: 0, // filled in once every person->case edge is known, below
    caseMasterId,
    crimeNo: fact?.crimeNo,
    districtName: district?.name ?? "Unknown",
    crimeTypeName: crimeType?.name ?? "Unknown",
    link: caseDetailLink(caseMasterId),
  };
}

function buildPersonNode(p: FusedPerson, repeatIds: Set<string>): NetworkNode {
  // scenarioIds[0]: real and unambiguous today (see file header) - every
  // fused person currently has exactly one scenario.
  const scenarioId = p.scenarioIds[0];
  const meta = SCENARIO_META[scenarioId];
  return {
    id: p.personId,
    label: p.name,
    kind: "Person",
    scenarioId,
    scenarioTitle: meta?.title ?? scenarioId,
    recordCount: p.timeline.length,
    isRepeat: repeatIds.has(p.personId),
    caseMasterIds: p.caseMasterIds,
  };
}

/**
 * The full statewide network: every one of the 47 real evidence-linked
 * people (personFusion.ts, scoped to the 15 authored scenarios only - bulk
 * cases are never touched, they carry no evidence and no personId) as
 * Person nodes, every real FIR they're named accused in as Case nodes, and
 * an edge for each real (person, FIR) pair.
 *
 * P10 Phase 4: reads the live Data Store for FIR facts (getLiveCaseFacts(),
 * TTL ~90s), falling back to the bundled snapshot on any failure. No
 * module-scope cache of the DERIVED network here any more (it used to
 * cache forever, correct only for a static source) - this graph is built
 * over the same ~19-FIR, 47-person universe every time, cheap enough to
 * redo per call; personFusion.ts's own evidence-collection reads keep
 * their existing bundled-at-build-time cache unchanged (Phase 4 only
 * touches caseFacts.json's three read paths, not the NoSQL evidence layer).
 */
export async function getStatewideNetwork(): Promise<StatewideNetwork> {
  const liveFacts = await getLiveCaseFacts();
  const facts = liveFacts ?? BUNDLED_CASE_FACTS;

  const persons = [...fuseAllPersons().values()];
  const repeatIds = new Set(getRepeatCaseSuspects().map((p) => p.personId));

  const caseNodes = new Map<string, NetworkNode>();
  for (const [scenarioId, meta] of Object.entries(SCENARIO_META)) {
    for (const caseMasterId of meta.caseMasterIds) {
      const id = caseNodeId(caseMasterId);
      if (!caseNodes.has(id)) caseNodes.set(id, buildCaseNode(caseMasterId, scenarioId, meta, facts));
    }
  }

  const personNodes = persons.map((p) => buildPersonNode(p, repeatIds));

  const edges: NetworkEdge[] = [];
  const caseDegree = new Map<string, number>();
  for (const p of persons) {
    for (const caseMasterId of p.caseMasterIds) {
      const targetId = caseNodeId(caseMasterId);
      if (!caseNodes.has(targetId)) continue; // real caseMasterId not among the 19 seeded FIRs - skip rather than invent a node
      const fact = facts[String(caseMasterId)];
      edges.push({
        id: `${p.personId}__${targetId}`,
        source: p.personId,
        target: targetId,
        label: `Accused — FIR ${fact?.crimeNo ?? caseMasterId}`,
      });
      caseDegree.set(targetId, (caseDegree.get(targetId) ?? 0) + 1);
    }
  }

  // Now that every edge is known, size each Case node by how many distinct
  // accused it's actually linked to.
  for (const [id, node] of caseNodes) {
    node.recordCount = caseDegree.get(id) ?? 0;
  }

  const nodes = [...personNodes, ...caseNodes.values()];
  const scenarioCount = new Set(nodes.map((n) => n.scenarioId)).size;

  return {
    nodes,
    edges,
    stats: {
      personCount: personNodes.length,
      caseCount: caseNodes.size,
      scenarioCount,
      edgeCount: edges.length,
      repeatSubjectCount: repeatIds.size,
    },
  };
}
