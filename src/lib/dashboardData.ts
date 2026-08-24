// -----------------------------------------------------------------------------
// Server-side helpers that derive the Dashboard's "Featured Investigation",
// "Alerts & Leads", and "Verified Evidence Feed" widgets from the same
// bundled NoSQL seed JSON that /api/investigation reads (src/lib/nosql-seed/
// *.json - see catalyst/README.md §2b/§3b for why this is bundled JSON
// rather than a live NoSQL query). Everything here is real seeded case data,
// not fabricated - no invented deltas, alert counts, or call volumes.
// -----------------------------------------------------------------------------
import { caseTypes, districts } from "./data";
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
  caseMasterIds: number[];
};
const META: Record<string, ScenarioMeta> = scenarioMeta;

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

export function getFeaturedScenario(scenarioId = "C1") {
  const meta = META[scenarioId];
  if (!meta) return null;
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
};

// Real evidence contradictions only - no fabricated "crime spike" style
// alerts, since there's no real anomaly-detection signal behind them.
export function getRealAlerts(limit = 3): Alert[] {
  return (contradictions as { id: string; scenarioId: string; description: string }[])
    .slice(0, limit)
    .map((c) => {
      const meta = META[c.scenarioId];
      return {
        id: c.id,
        scenarioId: c.scenarioId,
        title: `Evidence contradiction — ${meta?.title || c.scenarioId}`,
        detail: c.description,
        link: scenarioLink(c.scenarioId),
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
export function getRealEvidenceFeed(limit = 6): EvidenceFeedItem[] {
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
  ];
  items.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
  return items.slice(0, limit);
}
