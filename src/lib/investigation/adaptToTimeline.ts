// -----------------------------------------------------------------------------
// adaptToLegacyTimelineEvents — converts InvestigationCase.timelineEvents
// (Step 1, built from the synthetic seeded TimelineEvents collection) into
// the EXACT TimelineEvent shape src/components/investigation/TimelinePanel.tsx
// already renders, so the Timeline UI does not change at all.
//
// This module imports ONLY the TimelineEvent TYPE from
// src/lib/investigationData.ts, never its generator functions — no RNG is
// invoked, no other Investigation Workspace section is touched.
//
// No fabrication: every field is either copied unchanged from the real
// seed-derived TimelineEvent (id, description, date/time split from the
// real timestamp) or a documented, deterministic derivation from real
// fields already present on InvestigationCase (title from sourceType,
// relatedIds from the real evidence/statement/IO record the event points
// at). If a scenario has zero timeline events, the result is an empty
// array — the existing TimelinePanel already renders that gracefully (a
// bare connecting thread, no cards), which is this step's empty state; no
// new UI is introduced.
// -----------------------------------------------------------------------------

import type { TimelineEvent as LegacyTimelineEvent } from "@/lib/investigationData";
import type { InvestigationCase, TimelineSourceType } from "./model";

/**
 * Headline label per source type — the closest the legacy shape has to a
 * "type" field (it has no dedicated one). Directly derived from the real,
 * DIRECT `sourceType` on each TimelineEvent — not invented text, just a
 * fixed, documented label per category.
 */
const TITLE_BY_SOURCE: Record<TimelineSourceType, string> = {
  fir: "FIR Registered",
  cctv: "CCTV Sighting Logged",
  call: "Call Record Logged",
  transaction: "Financial Transaction Logged",
  statement: "Witness Statement Recorded",
};

function splitDateTime(iso: string): { date: string; time: string } {
  const [date, timePart] = iso.split("T");
  return { date: date ?? iso, time: timePart ? timePart.slice(0, 5) : "" };
}

/**
 * Related-entity ids for cross-panel highlighting, derived from the real
 * record the event's sourceId points at — never guessed:
 *   - cctv / call / transaction -> that EvidenceRecord's own real
 *     relatedPersonIds (already resolved in Step 1), plus the evidence
 *     record's own id (so a future wired Evidence panel can cross-highlight
 *     the exact exhibit).
 *   - statement -> the real WitnessStatement's resolved witnessPersonId
 *     (when resolvable) plus the statement's own id.
 *   - fir -> the FIR's real investigating-officer Person id, when known.
 */
function relatedIdsFor(event: InvestigationCase["timelineEvents"][number], kase: InvestigationCase): string[] {
  const ids = new Set<string>();
  if (event.sourceType === "cctv" || event.sourceType === "call" || event.sourceType === "transaction") {
    const evidence = kase.evidence.find((e) => e.id === event.sourceId);
    if (evidence) {
      ids.add(evidence.id);
      evidence.relatedPersonIds.forEach((id) => ids.add(id));
    }
  } else if (event.sourceType === "statement") {
    const statement = kase.witnessStatements.find((s) => s.id === event.sourceId);
    if (statement) {
      ids.add(statement.id);
      if (statement.witnessPersonId) ids.add(statement.witnessPersonId);
    }
  } else if (event.sourceType === "fir") {
    const fir = kase.firs.find((f) => String(f.caseMasterId) === event.sourceId);
    if (fir?.ioPersonId) ids.add(fir.ioPersonId);
  }
  return Array.from(ids);
}

/**
 * Returns the case's real timeline, already chronologically sorted (see
 * Step 1's normalize.ts), mapped to the legacy TimelinePanel shape. Returns
 * an empty array when the case has no timeline events — the caller (the
 * investigation-workspace page) also passes [] when no synthetic scenario
 * resolves at all, so both "no data" cases converge on the same, already-
 * existing empty rendering.
 */
export function adaptToLegacyTimelineEvents(kase: InvestigationCase): LegacyTimelineEvent[] {
  return kase.timelineEvents.map((event) => {
    const { date, time } = splitDateTime(event.timestamp);
    return {
      id: event.id,
      date,
      time,
      title: TITLE_BY_SOURCE[event.sourceType],
      description: event.description,
      relatedIds: relatedIdsFor(event, kase),
    };
  });
}

/** Human-readable label per source type, for the case-shell Timeline tab (distinct from TITLE_BY_SOURCE's headline phrasing). */
const SOURCE_TYPE_LABEL: Record<TimelineSourceType, string> = {
  fir: "FIR",
  cctv: "CCTV",
  call: "Call Record",
  transaction: "Financial Transaction",
  statement: "Witness Statement",
};

export interface TimelineDetailEvent {
  id: string;
  date: string;
  time: string;
  sourceType: TimelineSourceType;
  sourceTypeLabel: string;
  description: string;
  /** Real persons the underlying evidence/statement/FIR record resolves to — same relatedIdsFor() rule as the legacy adapter, resolved to display name here. */
  relatedPeople: { id: string; name: string }[];
  /** The real seed record id this event was built from — e.g. "C1-CC-2" — always traceable back to source. */
  sourceRecordId: string;
}

/**
 * Richer, non-legacy view of the case's real timeline for the new case-shell
 * Timeline tab. Same source data and same relatedIdsFor() derivation as
 * adaptToLegacyTimelineEvents — this is a different presentation of
 * identical real data, not a second/independent derivation.
 */
export function adaptToTimelineDetail(kase: InvestigationCase): TimelineDetailEvent[] {
  return kase.timelineEvents.map((event) => {
    const { date, time } = splitDateTime(event.timestamp);
    const relatedPeople = relatedIdsFor(event, kase)
      .map((id) => kase.persons.find((p) => p.id === id))
      .filter((p): p is NonNullable<typeof p> => !!p)
      .map((p) => ({ id: p.id, name: p.name }));
    return {
      id: event.id,
      date,
      time,
      sourceType: event.sourceType,
      sourceTypeLabel: SOURCE_TYPE_LABEL[event.sourceType],
      description: event.description,
      relatedPeople,
      sourceRecordId: event.sourceId,
    };
  });
}
