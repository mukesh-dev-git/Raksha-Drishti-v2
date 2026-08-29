// -----------------------------------------------------------------------------
// P4.6 - MO pattern-clustering / similar-case matching. The PS, verbatim:
// "Network & Behavioral Analysis... identifying recurring Modus Operandi."
//
// Deterministic, not an LLM - consistent with P4's "none of this needs an
// LLM" framing. Reads catalyst/dataset-v2/out/nosql/caseFacts.json (built
// by build_seed.mjs from cases.json's per-FIR ActSectionAssociation data,
// which was seeded into the Data Store but - confirmed by the Part 5 audit
// - read nowhere in src/ before this).
//
// THE CLUSTERING RULE, and why it isn't simpler:
//
// A naive "shares >=1 Act+Section" rule produces a useless mega-cluster:
// IPC-420 (cheating), IPC-379 (theft) and IPC-120B (criminal conspiracy)
// each appear in 6 of the 19 real cases (~32%) - common enough that
// "shares a section" mostly just means "is the same broad crime type",
// not "shares a method". Verified by computing the real frequency table
// before choosing a rule, not assumed.
//
// The rule actually used: two cases (from DIFFERENT scenarios - same-
// scenario cases are already known to be linked, so pairing them again
// here would restate what the Investigation Workspace already shows, not
// surface anything new) are linked if EITHER
//   (a) their full section signatures are identical, or
//   (b) they share 2+ sections AND at least one of those shared sections
//       is "rare" (appears in <=3 of the 19 real cases) - so a shared
//       IPC-420 alone never qualifies, but IPC-420 shared ALONGSIDE a
//       specific, uncommon section (e.g. ITACT-66C) does.
// Verified against the real 19-case dataset before shipping: this rule
// finds exactly 3 real clusters (not 0, not a single mega-cluster of 6+
// unrelated cases) - see RESEARCH_AND_PLAN.md for the computation.
//
// Clusters are the connected components of this link graph, not just
// pairs - a case can chain into a cluster through a shared link even if
// it doesn't directly match every other member.
// -----------------------------------------------------------------------------
import caseFacts from "./nosql-seed/caseFacts.json";
import scenarioMeta from "./nosql-seed/scenarioMeta.json";
import { caseTypes, districts } from "./data";
import { caseDetailLink } from "./caseWorklist";

type CaseFact = {
  caseMasterId: number;
  scenarioId: string;
  crimeNo: string;
  crimeMinorHeadId: number;
  districtId: number | null;
  sections: string[];
  incidentFromDate: string | null;
  gravityOffenceId: number;
};
const FACTS: Record<string, CaseFact> = caseFacts as Record<string, CaseFact>;

const RARE_THRESHOLD = 3; // a section appearing in <=3 of the real cases counts as distinctive

export type PatternMember = {
  caseMasterId: number;
  scenarioId: string;
  scenarioTitle: string;
  crimeTypeName: string;
  districtName: string;
  sections: string[];
  link: string | null;
};

export type PatternCluster = {
  id: string;
  members: PatternMember[];
  /** The section(s) that tie every edge in this cluster together - not
   *  necessarily shared by ALL members at once (a chain can link A-B-C on
   *  different section pairs), so this is the union of every linking
   *  section across the cluster's edges, for display, not a strict
   *  "every member has these" guarantee. */
  linkingSections: string[];
  strength: "exact" | "partial";
};

// Takes the already-bulk-filtered fact list (see getMoPatternClusters) -
// frequency must be computed over the same 19-case universe RARE_THRESHOLD
// was calibrated against, not diluted by P1.2's ~400 bulk cases.
function sectionFrequency(facts: CaseFact[]): Map<string, number> {
  const freq = new Map<string, number>();
  for (const f of facts) {
    for (const s of f.sections) freq.set(s, (freq.get(s) ?? 0) + 1);
  }
  return freq;
}

function shouldLink(a: CaseFact, b: CaseFact, freq: Map<string, number>): { linked: boolean; shared: string[]; exact: boolean } {
  const shared = a.sections.filter((s) => b.sections.includes(s));
  if (shared.length === 0) return { linked: false, shared: [], exact: false };
  const exact = shared.length === a.sections.length && shared.length === b.sections.length;
  const hasRare = shared.some((s) => (freq.get(s) ?? 0) <= RARE_THRESHOLD);
  return { linked: exact || (shared.length >= 2 && hasRare), shared, exact };
}

function toMember(f: CaseFact): PatternMember {
  const meta = (scenarioMeta as Record<string, { title: string }>)[f.scenarioId];
  const c = caseTypes.find((x) => x.dbId === f.crimeMinorHeadId);
  const d = districts.find((x) => x.dbId === f.districtId);
  return {
    caseMasterId: f.caseMasterId,
    scenarioId: f.scenarioId,
    scenarioTitle: meta?.title ?? f.scenarioId,
    crimeTypeName: c?.name ?? "Unknown",
    districtName: d?.name ?? "Unknown",
    sections: f.sections,
    link: caseDetailLink(f.caseMasterId),
  };
}

let cache: PatternCluster[] | null = null;

/** Every real MO-linked cluster (size 2+) among the seeded cases. Cached -
 *  the seed JSON this reads is bundled at build time, same assumption
 *  dashboardData.ts and personFusion.ts already make. */
export function getMoPatternClusters(): PatternCluster[] {
  if (cache) return cache;

  // P1.2 - scoped to the 15 authored scenarios only, same as before P1.2's
  // bulk cases existed. RARE_THRESHOLD=3 and this whole rule were verified
  // against the real 19-case universe (see this file's header); against a
  // ~400-case bulk pool drawn from only ~20 IPC sections, almost nothing
  // stays "rare" and a shared section starts meaning "same broad crime
  // type" again - exactly the mega-cluster problem this rule exists to
  // avoid. A bulk case also has no evidence backing a claimed MO match,
  // only a coincidental section overlap. Bulk cases carry a synthetic
  // "BULK-<id>" scenarioId (see build_seed.mjs §6) specifically so they can
  // be excluded this cleanly.
  const facts = Object.values(FACTS).filter((f) => !f.scenarioId.startsWith("BULK-"));
  const freq = sectionFrequency(facts);

  const adjacency = new Map<number, Set<number>>();
  const edgeSections = new Map<number, string[]>(); // caseMasterId -> every section that linked it to a neighbor
  const edgeStrength = new Map<string, boolean>(); // "a-b" -> exact?

  for (let i = 0; i < facts.length; i++) {
    for (let j = i + 1; j < facts.length; j++) {
      const a = facts[i];
      const b = facts[j];
      if (a.scenarioId === b.scenarioId) continue; // already-known intra-case link, not a new finding
      const { linked, shared, exact } = shouldLink(a, b, freq);
      if (!linked) continue;
      if (!adjacency.has(a.caseMasterId)) adjacency.set(a.caseMasterId, new Set());
      if (!adjacency.has(b.caseMasterId)) adjacency.set(b.caseMasterId, new Set());
      adjacency.get(a.caseMasterId)!.add(b.caseMasterId);
      adjacency.get(b.caseMasterId)!.add(a.caseMasterId);
      edgeSections.set(a.caseMasterId, [...(edgeSections.get(a.caseMasterId) ?? []), ...shared]);
      edgeSections.set(b.caseMasterId, [...(edgeSections.get(b.caseMasterId) ?? []), ...shared]);
      edgeStrength.set(`${a.caseMasterId}-${b.caseMasterId}`, exact);
    }
  }

  const factsById = new Map(facts.map((f) => [f.caseMasterId, f]));
  const seen = new Set<number>();
  const clusters: PatternCluster[] = [];

  for (const start of adjacency.keys()) {
    if (seen.has(start)) continue;
    const componentIds: number[] = [];
    const stack = [start];
    let anyExact = false;
    while (stack.length) {
      const id = stack.pop()!;
      if (seen.has(id)) continue;
      seen.add(id);
      componentIds.push(id);
      for (const nb of adjacency.get(id) ?? []) {
        const key = id < nb ? `${id}-${nb}` : `${nb}-${id}`;
        if (edgeStrength.get(key)) anyExact = true;
        stack.push(nb);
      }
    }
    if (componentIds.length < 2) continue;

    const linkingSections = [...new Set(componentIds.flatMap((id) => edgeSections.get(id) ?? []))];
    clusters.push({
      id: `mo-${componentIds.slice().sort((a, b) => a - b).join("-")}`,
      members: componentIds
        .map((id) => factsById.get(id)!)
        .sort((a, b) => a.caseMasterId - b.caseMasterId)
        .map(toMember),
      linkingSections,
      strength: anyExact ? "exact" : "partial",
    });
  }

  clusters.sort((a, b) => b.members.length - a.members.length || (a.strength === "exact" ? -1 : 1));
  cache = clusters;
  return clusters;
}
