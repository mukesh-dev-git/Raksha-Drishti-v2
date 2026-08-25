// -----------------------------------------------------------------------------
// Server-side helpers that derive the Dashboard's "Featured Investigation",
// "Alerts & Leads", and "Verified Evidence Feed" widgets from the same
// bundled NoSQL seed JSON that /api/investigation reads (src/lib/nosql-seed/
// *.json - see catalyst/README.md §2b/§3b for why this is bundled JSON
// rather than a live NoSQL query). Everything here is real seeded case data,
// not fabricated - no invented deltas, alert counts, or call volumes.
// -----------------------------------------------------------------------------
import { caseTypes, districts } from "./data";
import type { ViewScope } from "./viewScope";
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

// A scenario is in scope for a District Officer only if their district is
// one of the (possibly several - see build_seed.mjs) real districts the
// scenario's FIRs touch. A State/CID Officer sees everything.
export function scenarioInScope(scenarioId: string, scope: ViewScope): boolean {
  if (scope.role === "state") return true;
  const meta = META[scenarioId];
  return !!meta && meta.districtIds.includes(scope.districtId);
}

// The real districts a State/CID-scoped viewer would need to pick from,
// and the label a district officer's own scope resolves to - both derived
// from data.ts's real district table, not hand-maintained here.
export function districtLabel(districtId: number): string {
  return districts.find((d) => d.dbId === districtId)?.name ?? `District ${districtId}`;
}

// scenarioId -> real /cases/[caseType]/[district]/investigation-workspace URL,
// resolved via the same dbId tables every other live route already uses.
function scenarioLink(scenarioId: string): string | null {
  const meta = META[scenarioId];
  if (!meta) return null;
  const c = caseTypes.find((x) => x.dbId === meta.crimeMinorHeadID);
  const d = districts.find((x) => x.dbId === meta.districtId);
  if (!c || !d) return null;
  return `/cases/${c.slug}/${d.slug}/investigation-workspace`;
}

// Picks which scenario to feature for a given scope. A District Officer's
// featured case is one their own unit is actually investigating, so
// CID-assigned scenarios are skipped even when they sit in that district
// (C8 is Bengaluru-only but assigned to the Cyber Crimes Wing). A State/CID
// viewer sees everything, so prefer a CID case and fall back to any.
function pickFeaturedScenarioId(scope: ViewScope): string | null {
  const ids = Object.keys(META);
  if (scope.role === "district") {
    return ids.find((id) => META[id].assignedTo === "District" && scenarioInScope(id, scope)) ?? null;
  }
  return ids.find((id) => META[id].assignedTo === "CID") ?? ids[0] ?? null;
}

export function getFeaturedScenario(scope: ViewScope = { role: "state" }) {
  const scenarioId = pickFeaturedScenarioId(scope);
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
export function getRealAlerts(limit = 3, scope: ViewScope = { role: "state" }): Alert[] {
  return (contradictions as { id: string; scenarioId: string; description: string }[])
    .filter((c) => scenarioInScope(c.scenarioId, scope))
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

// Most recent real evidence items across every seeded scenario, newest first.
export function getRealEvidenceFeed(limit = 6, scope: ViewScope = { role: "state" }): EvidenceFeedItem[] {
  const items: EvidenceFeedItem[] = [
    ...(callRecords as any[]).map((r) => ({
      id: r.id,
      scenarioId: r.scenarioId,
      kind: "call" as const,
      label: `${r.from} → ${r.to}`,
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
  ].filter((item) => scenarioInScope(item.scenarioId, scope));
  items.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
  return items.slice(0, limit);
}
