// -----------------------------------------------------------------------------
// adaptToPeople — the People tab's data: every real person in the scenario,
// grouped by role, each with their real cross-references (statements,
// linked evidence, timeline mentions) so the officer can see everything
// connected to one person without leaving the tab. Scenario-wide (not
// scoped to a single FIR) — same precedent as the Timeline tab, since a
// person can span multiple FIRs in the same connected investigation (e.g.
// the entity-fusion cases) and that connection is exactly what this tab
// exists to surface.
//
// Reuses adaptToTimelineDetail() for the timeline cross-reference rather
// than re-deriving it. No RNG, no fabrication: every field is DIRECT or a
// documented lookup against real records already on InvestigationCase.
// -----------------------------------------------------------------------------
import type { InvestigationCase, PersonRole } from "./model";
import { adaptToTimelineDetail } from "./adaptToTimeline";

export interface PersonStatementView {
  id: string;
  date: string;
  text: string;
}

export interface PersonEvidenceView {
  id: string;
  type: string;
  title: string;
}

export interface PersonDetailView {
  id: string;
  role: PersonRole;
  name: string;
  aliasNames: string[];
  age?: number;
  gender?: string;
  extra?: string;
  caseMasterIds: number[];
  statements: PersonStatementView[];
  relatedEvidence: PersonEvidenceView[];
  timelineMentionCount: number;
}

export type PeopleByRole = Record<PersonRole, PersonDetailView[]>;

export function adaptToPeople(kase: InvestigationCase): PeopleByRole {
  const timelineDetail = adaptToTimelineDetail(kase);

  const rows: PersonDetailView[] = kase.persons.map((p) => {
    const statements = kase.witnessStatements
      .filter((s) => s.witnessPersonId === p.id)
      .map((s) => ({ id: s.id, date: s.statementDate, text: s.statementText }));

    const relatedEvidence = kase.evidence
      .filter((e) => e.relatedPersonIds.includes(p.id))
      .map((e) => ({ id: e.id, type: e.type, title: e.title }));

    const timelineMentionCount = timelineDetail.filter((t) => t.relatedPeople.some((rp) => rp.id === p.id)).length;

    return {
      id: p.id,
      role: p.role,
      name: p.name,
      aliasNames: p.aliasNames ?? [],
      age: p.age,
      gender: p.gender,
      extra: p.occupation ?? p.designation,
      caseMasterIds: p.caseMasterIds,
      statements,
      relatedEvidence,
      timelineMentionCount,
    };
  });

  return {
    complainant: rows.filter((r) => r.role === "complainant"),
    victim: rows.filter((r) => r.role === "victim"),
    accused: rows.filter((r) => r.role === "accused"),
    witness: rows.filter((r) => r.role === "witness"),
    io: rows.filter((r) => r.role === "io"),
  };
}
