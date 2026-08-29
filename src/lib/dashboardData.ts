// -----------------------------------------------------------------------------
// Server-side helpers that derive the Dashboard's "Featured Investigation",
// "Alerts & Leads", and "Verified Evidence Feed" widgets from the same
// bundled NoSQL seed JSON that /api/investigation reads (src/lib/nosql-seed/
// *.json - see catalyst/README.md §2b/§3b for why this is bundled JSON
// rather than a live NoSQL query). Everything here is real seeded case data,
// not fabricated - no invented deltas, alert counts, or call volumes.
// -----------------------------------------------------------------------------
import { caseTypes, districts } from "./data";
import { ranges } from "./ranges";
import scenarioMeta from "./nosql-seed/scenarioMeta.json";
import callRecords from "./nosql-seed/CallRecords.json";
import transactions from "./nosql-seed/Transactions.json";
import cctvSightings from "./nosql-seed/CCTVSightings.json";
import witnessStatements from "./nosql-seed/WitnessStatements.json";
import contradictions from "./nosql-seed/Contradictions.json";

type ScenarioMeta = {
  title: string;
  summary: string;
  crimeMinorHeadID: number;
  districtId: number | null;
  districtIds: number[];
  assignedTo: "District" | "CID";
  assignmentReason: string;
  caseMasterIds: number[];
};
// JSON module imports widen string-literal fields (assignedTo) to plain
// `string` - this file's own build_seed.mjs only ever writes "District" or
// "CID" into it, so the cast is safe, not a type-safety hole.
const META: Record<string, ScenarioMeta> = scenarioMeta as Record<string, ScenarioMeta>;

// District here is a DRILL-DOWN FILTER, not a role. The PS asks for SCRB to
// "visualize crime patterns across districts and specific police stations" -
// i.e. one statewide viewer narrowing the view, not a district officer with
// a restricted login. `districtId` undefined = statewide, the default.
// A scenario passes the filter if any of its real districts (possibly
// several - see build_seed.mjs) intersects the filter's district set.
//
// X1 - generalised from a single optional districtId to an optional
// districtId ARRAY, per RESEARCH_AND_PLAN.md §1.4a: the Range tier is "a
// coarser filter option... scenarioInDistrict(id, districtId?) generalises
// to a district-set test." A single-district filter is just a one-element
// array now - every existing call site passing one number still works,
// wrapped as `[districtId]`.
export function scenarioInDistrict(scenarioId: string, districtIds?: number[]): boolean {
  if (districtIds === undefined || districtIds.length === 0) return true;
  const meta = META[scenarioId];
  return !!meta && meta.districtIds.some((id) => districtIds.includes(id));
}

// The real districts the drill-down filter offers,
// and the label a filtered district resolves to - both derived
// from data.ts's real district table, not hand-maintained here.
export function districtLabel(districtId: number): string {
  return districts.find((d) => d.dbId === districtId)?.name ?? `District ${districtId}`;
}

// X1 - the multi-district label for a Range selection, e.g. "Central Range
// (Bengaluru Urban, Tumakuru)". Falls back to a comma-joined district list
// if the set doesn't match a known Range exactly (still honest, just less
// pretty) - never silently drops a district from the label.
export function districtSetLabel(districtIds: number[]): string {
  const names = districtIds.map(districtLabel);
  if (names.length === 1) return names[0];
  const match = ranges.find(
    (r) => r.districtDbIds.length === districtIds.length && r.districtDbIds.every((id) => districtIds.includes(id))
  );
  return match ? `${match.name} (${names.join(", ")})` : names.join(", ");
}

// scenarioId -> real /cases/[caseId] URL (P2 restructure - the real,
// single-case detail page keyed by CaseMasterID). Links to the scenario's
// FIRST real FIR; a scenario spanning more than one (e.g. C1's 9001+9002)
// shows the rest as "same investigation" cross-links on that page itself
// (see getSiblingCases, caseWorklist.ts) rather than needing a link per FIR
// here. Was `/cases/[caseType]/[district]/investigation-workspace` - that
// route is retired (Next.js won't allow it to coexist with `/cases/
// [caseId]`: two differently-named dynamic segments at the same path
// level is a hard build error, not a style choice).
export function scenarioLink(scenarioId: string): string | null {
  const meta = META[scenarioId];
  if (!meta || meta.caseMasterIds.length === 0) return null;
  return `/cases/${meta.caseMasterIds[0]}`;
}

// Picks which scenario to feature. Filtered to a district, feature any
// scenario touching it - CID-assigned included, since an SCRB viewer
// drilling into a district wants that district's whole picture, not just
// what its own unit runs. Unfiltered, prefer a CID case as the more
// state-level-relevant one, falling back to any.
function pickFeaturedScenarioId(districtIds?: number[]): string | null {
  const ids = Object.keys(META).filter((id) => scenarioInDistrict(id, districtIds));
  if (districtIds !== undefined && districtIds.length > 0) return ids[0] ?? null;
  return ids.find((id) => META[id].assignedTo === "CID") ?? ids[0] ?? null;
}

export function getFeaturedScenario(districtIds?: number[]) {
  const scenarioId = pickFeaturedScenarioId(districtIds);
  if (!scenarioId) return null;
  const meta = META[scenarioId];
  const link = scenarioLink(scenarioId);
  if (!link) return null;

  const by = <T extends { scenarioId: string }>(rows: T[]) => rows.filter((r) => r.scenarioId === scenarioId);
  const calls = by(callRecords);
  const txns = by(transactions);
  const cctv = by(cctvSightings);
  const statements = by(witnessStatements);
  const contradiction = by(contradictions)[0] || null;

  const persons = Object.values(calls[0]?.resolvedPersons || {}) as { type: string; name: string }[];
  const suspects = persons.filter((p) => p.type === "Accused").length;
  const victims = persons.filter((p) => p.type === "Victim").length;
  const witnesses = new Set(statements.map((s) => s.witnessName)).size;
  const locations = new Set(cctv.map((c) => c.cameraLocation)).size;

  const c = caseTypes.find((x) => x.dbId === meta.crimeMinorHeadID)!;
  const d = districts.find((x) => x.dbId === meta.districtId)!;

  return {
    scenarioId,
    title: meta.title,
    summary: meta.summary,
    caseTypeName: c.name,
    districtName: d.name,
    districtNames: meta.districtIds.map(districtLabel),
    assignedTo: meta.assignedTo,
    assignmentReason: meta.assignmentReason,
    caseMasterIds: meta.caseMasterIds,
    link,
    hasContradiction: !!contradiction,
    counts: {
      suspects,
      victims,
      witnesses,
      locations,
      calls: calls.length,
      transactions: txns.length,
      cctv: cctv.length,
    },
  };
}

export type Alert = {
  id: string;
  scenarioId: string;
  title: string;
  detail: string;
  link: string | null;
  assignedTo: "District" | "CID" | null;
  assignmentReason: string | null;
};

// Real evidence contradictions only - no fabricated "crime spike" style
// alerts, since there's no real anomaly-detection signal behind them.
export function getRealAlerts(limit = 3, districtIds?: number[]): Alert[] {
  return (contradictions as { id: string; scenarioId: string; description: string }[])
    .filter((c) => scenarioInDistrict(c.scenarioId, districtIds))
    .slice(0, limit)
    .map((c) => {
      const meta = META[c.scenarioId];
      return {
        id: c.id,
        scenarioId: c.scenarioId,
        title: `Evidence contradiction — ${meta?.title || c.scenarioId}`,
        detail: c.description,
        link: scenarioLink(c.scenarioId),
        assignedTo: meta?.assignedTo ?? null,
        assignmentReason: meta?.assignmentReason ?? null,
      };
    });
}

export type EvidenceFeedItem = {
  id: string;
  scenarioId: string;
  kind: "call" | "transaction" | "cctv" | "statement";
  label: string;
  timestamp: string;
  link: string | null;
};

// Evidence records cite people by a scenario-local narrative token ("P1",
// "P2", ...); each record carries its own resolvedPersons map keyed by those
// same tokens (see build_seed.mjs). Render the person's name where the token
// resolves, and fall back to the raw value where it doesn't - `from`/`to`
// aren't always people (C1's "V4" is an unregistered SIM, and some records
// name a number outright), so this must degrade rather than blank out.
function personLabel(rec: { resolvedPersons?: Record<string, { name?: string }> }, ref: string): string {
  return rec.resolvedPersons?.[ref]?.name ?? ref;
}

// Most recent real evidence items across every seeded scenario, newest first.
export function getRealEvidenceFeed(limit = 6, districtIds?: number[]): EvidenceFeedItem[] {
  const items: EvidenceFeedItem[] = [
    ...(callRecords as any[]).map((r) => ({
      id: r.id,
      scenarioId: r.scenarioId,
      kind: "call" as const,
      label: `${personLabel(r, r.from)} → ${personLabel(r, r.to)}`,
      timestamp: r.timestamp,
      link: scenarioLink(r.scenarioId),
    })),
    ...(transactions as any[]).map((r) => ({
      id: r.id,
      scenarioId: r.scenarioId,
      kind: "transaction" as const,
      label: `₹${Number(r.amount).toLocaleString("en-IN")}`,
      timestamp: r.timestamp,
      link: scenarioLink(r.scenarioId),
    })),
    ...(cctvSightings as any[]).map((r) => ({
      id: r.id,
      scenarioId: r.scenarioId,
      kind: "cctv" as const,
      label: r.cameraLocation,
      timestamp: r.timestamp,
      link: scenarioLink(r.scenarioId),
    })),
    ...(witnessStatements as any[]).map((r) => ({
      id: r.id,
      scenarioId: r.scenarioId,
      kind: "statement" as const,
      label: r.witnessName,
      timestamp: `${r.statementDate}T00:00:00`,
      link: scenarioLink(r.scenarioId),
    })),
  ].filter((item) => scenarioInDistrict(item.scenarioId, districtIds));
  items.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
  return items.slice(0, limit);
}
