// -----------------------------------------------------------------------------
// Unified Investigation domain model.
//
// Built entirely from the project's SYNTHETIC SEEDED DEVELOPMENT DATASET —
// catalyst/dataset-v2/{cases,lookups}.json + src/lib/nosql-seed/*.json — not
// from any random/mock generator. This is a development dataset with
// realistic-looking IDs and cross-references; it is not real FIR data.
//
// Every field below is one of:
//   DIRECT   — copied unchanged from a synthetic seed record.
//   DERIVED  — computed deterministically from one or more real seed
//              records, with the exact derivation rule documented at the
//              point of computation in normalize.ts. Never invented.
//   ABSENT   — the synthetic dataset has no supporting record for this
//              field. Left undefined/empty rather than fabricated.
//              Consuming UI must render an explicit empty state, never a
//              placeholder value. Where a future real backend would need
//              this field, it's flagged inline as a BACKEND REQUIREMENT
//              (documentation only — no schema/table is created here).
//
// This file has no dependency on the RNG mock generator in
// src/lib/investigationData.ts and no dependency on any database — it's a
// pure, source-agnostic domain type so that a later swap to a real backend
// API only has to replace normalize.ts's inputs, not this shape or the UI
// that consumes it (see catalyst/README.md and the Investigation Module
// planning notes for the full "synthetic now / real API later" contract).
// -----------------------------------------------------------------------------

export type PersonRole = "victim" | "complainant" | "witness" | "accused" | "io";

export interface Person {
  /** Stable, source-encoded id — "ACC-8001" | "VIC-7001" | "COMP-6001" | "IO-5001" | "WIT-<scenario>-<slug>" */
  id: string;
  role: PersonRole;
  /** DIRECT — primary name on the source row. */
  name: string;
  /**
   * DERIVED — additional name spellings for the same real person, merged
   * only when the synthetic data's own scenario-local `PersonID` code
   * groups multiple AccusedMasterID rows together (an explicit fusion
   * signal already present in cases.json — see normalize.ts's
   * buildAccusedPersons()). Never inferred from name similarity.
   */
  aliasNames?: string[];
  /** DIRECT — every real source-table id this Person was built from (the audit trail). */
  sourceRecordIds: string[];
  /** DIRECT — which FIR(s) (CaseMasterID) this person appears on. */
  caseMasterIds: number[];
  age?: number;
  gender?: "Male" | "Female" | "Other";
  /** DIRECT — resolved OccupationID label, complainants/victims only, when recorded. */
  occupation?: string;
  /** DERIVED — Rank + Designation label. IO persons only. */
  designation?: string;
  /** DERIVED — police station name. IO persons only. */
  unit?: string;
}

export type EvidenceSourceCollection = "CCTVSightings" | "CallRecords" | "Transactions";
export type EvidenceType = "CCTV Footage" | "Call Detail Record" | "Financial Transaction";

export interface EvidenceRecord {
  /** DIRECT — the seed record's own id, e.g. "C1-CC-2". */
  id: string;
  caseId: string;
  sourceCollection: EvidenceSourceCollection;
  type: EvidenceType;
  /** DERIVED — short label built from the record's own fields (see normalize.ts). */
  title: string;
  /** DIRECT — the record's own note/description text. May be empty string if the source left it blank. */
  description: string;
  /** DIRECT */
  timestamp: string;
  /**
   * DERIVED — resolved from the record's own from/to/personOrVehicle/account
   * fields against that scenario's `resolvedPersons` map and known Person
   * names. See normalize.ts's resolveLocalPersonCode() / matchAccountHolder()
   * for the exact, literal-match-only rules. Never guessed.
   */
  relatedPersonIds: string[];
  /** DIRECT — transactions only. */
  amount?: number;
  /** DIRECT — CCTV only. */
  cameraLocation?: string;
  // ABSENT — no synthetic record exists for evidence custody/status yet.
  // BACKEND REQUIREMENT: evidence.custodianPersonId, evidence.status
  // (collected | in-lab | returned | sealed) — see Investigation Module §7/§10.
}

export interface WitnessStatement {
  /** DIRECT — e.g. "C1-WS-2". */
  id: string;
  caseId: string;
  /** DERIVED — resolved Person.id (see normalize.ts's resolveLocalPersonCode()). Undefined if unresolved. */
  witnessPersonId?: string;
  /** DIRECT */
  witnessName: string;
  /** DIRECT */
  statementDate: string;
  /** DIRECT */
  statementText: string;
  /**
   * DERIVED — every statement in the synthetic dataset is a completed,
   * already-recorded statement; there is no "pending" record anywhere in
   * it, so this is always "Recorded", never invented as anything else.
   * BACKEND REQUIREMENT: a real "pending / re-examination needed" status
   * would need a real backend field — see Investigation Module §10.
   */
  status: "Recorded";
}

export type TimelineSourceType = "fir" | "call" | "cctv" | "transaction" | "statement";

export interface TimelineEvent {
  /** DIRECT — e.g. "C1-T3". */
  id: string;
  caseId: string;
  /** DIRECT */
  timestamp: string;
  /** DIRECT */
  description: string;
  /** DIRECT — copied from the seed record's own `source` field. */
  sourceType: TimelineSourceType;
  /**
   * DIRECT — copied from the seed record's own `sourceId`. Always resolves
   * to a real record elsewhere in the same InvestigationCase (a FIR,
   * EvidenceRecord, or WitnessStatement) — checked by
   * verifyInvestigationCase() in normalize.ts.
   */
  sourceId: string;
}

export type ActivityMethodType =
  | "Case Registration" // derived from sourceType "fir"
  | "CCTV Analysis" // derived from sourceType "cctv"
  | "Call Record Analysis" // derived from sourceType "call"
  | "Financial Trail Analysis" // derived from sourceType "transaction"
  | "Witness Examination"; // derived from sourceType "statement"

export interface InvestigationActivity {
  /** "ACT-" + the TimelineEvent id it was derived from. */
  id: string;
  caseId: string;
  /** DERIVED — 1:1 from TimelineEvent.sourceType. See ACTIVITY_METHOD_BY_SOURCE in normalize.ts. */
  methodType: ActivityMethodType;
  /** Back-reference to the real TimelineEvent this activity was derived from. */
  timelineEventId: string;
  /** DIRECT — the source event's own timestamp. */
  startTime: string;
  /**
   * DERIVED — the source record documents the action as already having
   * happened, so "Completed" is the only status the data supports; no
   * other status (e.g. "In Progress") appears anywhere in the dataset.
   */
  status: "Completed";
  /** DIRECT — the source event's own description text. */
  findings: string;
  /**
   * DERIVED — [sourceId] when sourceType is call/cctv/transaction (that
   * record IS the generated evidence); empty for fir/statement sources.
   */
  evidenceGenerated: string[];
  /** DERIVED — the case's IO Person id for the FIR this activity's timestamp falls under, when known. */
  assignedOfficer?: string;
  // ABSENT — not recorded anywhere in the synthetic dataset.
  // BACKEND REQUIREMENT: activity.objective, activity.actionsTaken (distinct
  // from findings), activity.nextAction, activity.location,
  // activity.completionTime (distinct from startTime) — see Investigation
  // Module §7.
}

export interface DiaryEntry {
  /** "DI-" + the Activity id it was derived from. */
  id: string;
  caseId: string;
  activityId: string;
  /** DIRECT — date portion of the activity's startTime. */
  date: string;
  /** DIRECT — time portion of the activity's startTime. */
  time: string;
  /** DERIVED — same as the activity's assignedOfficer. */
  officer?: string;
  /** DERIVED — the activity's methodType label. */
  activity: string;
  /** DIRECT — the source event's description text. */
  observation: string;
  /**
   * Same text as observation. The synthetic dataset does not separately
   * record intent-of-action vs. outcome-observed — collapsing these
   * honestly reflects that, rather than inventing a distinct "action taken"
   * narrative that isn't in the source.
   */
  actionTaken: string;
  /** Same as the activity's evidenceGenerated. */
  evidenceGenerated: string[];
  /** DERIVED — resolved person ids referenced by the source record, when resolvable. */
  personsInvolved: string[];
  // ABSENT — not recorded anywhere in the synthetic dataset.
  // BACKEND REQUIREMENT: diaryEntry.location, diaryEntry.nextAction,
  // diaryEntry.attachments — see Investigation Module §6.
}

export interface Contradiction {
  /** DIRECT — e.g. "C1-CD-1". */
  id: string;
  caseId: string;
  description: string;
  conflictingRecordIds: string[];
  suggestedNextQuestion: string;
}

export interface FIRSummary {
  caseMasterId: number;
  crimeNo: string;
  caseNo: string;
  districtId: number;
  /** DERIVED — resolved via lookups.District. */
  districtName?: string;
  crimeMinorHeadId: number;
  /** DERIVED — resolved via lookups.CrimeSubHead. */
  crimeTypeName?: string;
  crimeRegisteredDate: string;
  incidentFromDate: string;
  incidentToDate: string;
  latitude?: number;
  longitude?: number;
  briefFacts: string;
  caseStatusId: number;
  /** DERIVED — resolved via lookups.CaseStatusMaster. */
  caseStatusName?: string;
  /** DIRECT — 1=FIR, 2=UDR, 3=Zero FIR, 4=PAR (lookups.CaseCategory). */
  caseCategoryId: number;
  /** DERIVED — resolved via lookups.CaseCategory. */
  caseCategoryName?: string;
  /** DIRECT — 1=Heinous, 2=Non-Heinous (lookups.GravityOffence). */
  gravityOffenceId: number;
  /** DERIVED — resolved via lookups.GravityOffence. */
  gravityOffenceName?: string;
  /** DERIVED — resolved Person.id for the investigating officer. */
  ioPersonId?: string;
  /** DERIVED — resolved via lookups.Unit. */
  policeStationName?: string;
  /** DERIVED — resolved via lookups.Court. */
  courtName?: string;
  /** DERIVED — "ActCode SectionCode — Description" strings via scenario.actSections + lookups.Act/Section. */
  sections: string[];
}

export interface CrimeScene {
  firCaseMasterId: number;
  /** DERIVED — districtName + a short label built from the FIR. */
  location: string;
  latitude?: number;
  longitude?: number;
  /** DIRECT — reused from the FIR; the only scene narrative the dataset provides. */
  briefFacts: string;
  // ABSENT — no synthetic record exists for these.
  // BACKEND REQUIREMENT: crimeScene.photographs, crimeScene.sketch,
  // crimeScene.peoplePresent — see Investigation Module §14.
}

export interface InvestigationCase {
  /** Scenario id, e.g. "C1". DIRECT. */
  id: string;
  title: string;
  summary: string;
  /** One entry per real FIR in this scenario. */
  firs: FIRSummary[];
  caseMasterIds: number[];

  persons: Person[];
  evidence: EvidenceRecord[];
  witnessStatements: WitnessStatement[];
  /** Sorted chronologically. */
  timelineEvents: TimelineEvent[];
  /** DERIVED 1:1 from timelineEvents. */
  activities: InvestigationActivity[];
  /** DERIVED 1:1 from activities. */
  diaryEntries: DiaryEntry[];
  contradictions: Contradiction[];
  /** DERIVED, one per FIR. */
  crimeScenes: CrimeScene[];

  // Explicitly empty in this phase — the synthetic dataset has no
  // supporting records for any of these categories. Populate only when
  // real records exist; never fabricate placeholder entries to fill a UI
  // slot. See the BACKEND REQUIREMENT notes above and catalyst/README.md.
  /** BACKEND REQUIREMENT: ChainOfCustody table — Investigation Module §8. */
  custodyEvents: [];
  /** BACKEND REQUIREMENT: ForensicRequest table — Investigation Module §13. */
  forensicRequests: [];
  /** BACKEND REQUIREMENT: SearchSeizure table — Investigation Module §11. */
  searchSeizures: [];
  /** BACKEND REQUIREMENT: Documents metadata table + Stratus wiring — Investigation Module §6. */
  documents: [];
  /** Deferred to a later implementation phase (Investigation Module §20 / Phase 4). */
  tasks: [];
  /** Deferred to a later implementation phase (Investigation Module §21 / Phase 4). */
  relatedCaseIds: [];
}
