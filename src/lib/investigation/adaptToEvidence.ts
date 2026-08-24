// -----------------------------------------------------------------------------
// adaptToEvidence — the Evidence tab's data: every real evidence item in the
// scenario (CCTV Footage, Call Detail Record, Financial Transaction — the
// only evidence types the synthetic dataset actually contains), each with
// its real linked people and the real timeline event(s) that reference it
// (a direct sourceId match against InvestigationCase.timelineEvents, not a
// second/independent derivation), plus an honest chain-of-custody flag.
//
// Scenario-wide (not scoped to a single FIR) — same precedent as Timeline
// and People, since evidence in these scenarios is part of one connected
// investigation, not siloed per FIR.
//
// No RNG, no fabrication: custodyEvents is always [] because the synthetic
// dataset has no chain-of-custody records for any evidence item in any
// scenario — the UI must render that as an explicit empty state, not a
// fabricated history.
// -----------------------------------------------------------------------------
import type { InvestigationCase, EvidenceSourceCollection } from "./model";

export interface LinkedTimelineEventView {
  id: string;
  date: string;
  time: string;
  description: string;
}

export interface EvidenceRowView {
  id: string;
  type: string;
  sourceCollection: EvidenceSourceCollection;
  title: string;
  description: string;
  date: string;
  time: string;
  linkedPeople: { id: string; name: string }[];
  linkedTimelineEvents: LinkedTimelineEventView[];
  custodyAvailable: boolean;
}

export interface EvidenceTabData {
  rows: EvidenceRowView[];
  countByType: { type: string; count: number }[];
}

function splitDateTime(iso: string): { date: string; time: string } {
  const [date, timePart] = iso.split("T");
  return { date: date ?? iso, time: timePart ? timePart.slice(0, 5) : "" };
}

export function adaptToEvidence(kase: InvestigationCase): EvidenceTabData {
  const rows: EvidenceRowView[] = kase.evidence.map((e) => {
    const { date, time } = splitDateTime(e.timestamp);
    const linkedPeople = e.relatedPersonIds
      .map((id) => kase.persons.find((p) => p.id === id))
      .filter((p): p is NonNullable<typeof p> => !!p)
      .map((p) => ({ id: p.id, name: p.name }));

    const linkedTimelineEvents = kase.timelineEvents
      .filter((t) => t.sourceId === e.id)
      .map((t) => {
        const split = splitDateTime(t.timestamp);
        return { id: t.id, date: split.date, time: split.time, description: t.description };
      });

    return {
      id: e.id,
      type: e.type,
      sourceCollection: e.sourceCollection,
      title: e.title,
      description: e.description || "No description recorded.",
      date,
      time,
      linkedPeople,
      linkedTimelineEvents,
      // No chain-of-custody record exists anywhere in the synthetic
      // dataset (see model.ts's InvestigationCase.custodyEvents comment) —
      // always false, honestly, not a per-item guess.
      custodyAvailable: kase.custodyEvents.length > 0,
    };
  });

  const byType = new Map<string, number>();
  for (const r of rows) byType.set(r.type, (byType.get(r.type) ?? 0) + 1);

  return {
    rows: rows.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)),
    countByType: Array.from(byType.entries()).map(([type, count]) => ({ type, count })),
  };
}
