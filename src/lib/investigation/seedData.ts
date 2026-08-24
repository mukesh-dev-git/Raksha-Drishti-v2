// -----------------------------------------------------------------------------
// Typed loaders over the project's SYNTHETIC SEEDED DEVELOPMENT DATASET.
// Source files (unchanged by this module — read-only):
//   catalyst/dataset-v2/lookups.json   — reference/taxonomy tables
//   catalyst/dataset-v2/cases.json     — 15 hand-authored scenarios: FIR /
//                                        Accused / Victim / ComplainantDetails /
//                                        ActSectionAssociation rows
//   src/lib/nosql-seed/*.json          — the 6 cross-referenced NoSQL
//                                        collections (calls, transactions,
//                                        CCTV sightings, witness statements,
//                                        timeline events, contradictions),
//                                        each record already carrying
//                                        scenarioId / caseMasterIds /
//                                        resolvedPersons
//
// This module does no interpretation — it only reads and types the JSON.
// All derivation logic lives in normalize.ts. No randomness, no network
// calls, no database access — everything here is a synchronous read of a
// static file bundled with the repo.
// -----------------------------------------------------------------------------

import { readFileSync } from "node:fs";
import path from "node:path";

function readJson<T>(relPath: string): T {
  const abs = path.join(process.cwd(), relPath);
  return JSON.parse(readFileSync(abs, "utf-8")) as T;
}

// --- lookups.json ------------------------------------------------------------

export interface RawDistrict {
  DistrictID: number;
  DistrictName: string;
  StateID: number;
  Active: boolean;
}
export interface RawUnit {
  UnitID: number;
  UnitName: string;
  TypeID: number;
  DistrictID: number;
  StateID: number;
  Active: boolean;
}
export interface RawRank {
  RankID: number;
  RankName: string;
  Hierarchy: number;
  Active: boolean;
}
export interface RawDesignation {
  DesignationID: number;
  DesignationName: string;
  SortOrder: number;
  Active: boolean;
}
export interface RawEmployee {
  EmployeeID: number;
  DistrictID: number;
  UnitID: number;
  RankID: number;
  DesignationID: number;
  KGID: string;
  FirstName: string;
  EmployeeDOB: string;
  GenderID: number;
  AppointmentDate: string;
}
export interface RawCourt {
  CourtID: number;
  CourtName: string;
  DistrictID: number;
  StateID: number;
  Active: boolean;
}
export interface RawCaseStatusMaster {
  CaseStatusID: number;
  CaseStatusName: string;
}
export interface RawCaseCategory {
  CaseCategoryID: number;
  LookupValue: string;
}
export interface RawGravityOffence {
  GravityOffenceID: number;
  LookupValue: string;
}
export interface RawCrimeSubHead {
  CrimeSubHeadID: number;
  CrimeHeadID: number;
  CrimeHeadName: string;
  SeqID: number;
}
export interface RawAct {
  ActCode: string;
  ActDescription: string;
  ShortName: string;
  Active: boolean;
}
export interface RawSection {
  ActCode: string;
  SectionCode: string;
  SectionDescription: string;
  Active: boolean;
}

export interface RawLookups {
  District: RawDistrict[];
  Unit: RawUnit[];
  Rank: RawRank[];
  Designation: RawDesignation[];
  Employee: RawEmployee[];
  Court: RawCourt[];
  CaseStatusMaster: RawCaseStatusMaster[];
  CaseCategory: RawCaseCategory[];
  GravityOffence: RawGravityOffence[];
  CrimeSubHead: RawCrimeSubHead[];
  Act: RawAct[];
  Section: RawSection[];
  [key: string]: unknown;
}

// --- cases.json ----------------------------------------------------------------

export interface RawFIR {
  CaseMasterID: number;
  CrimeNo: string;
  CaseNo: string;
  CrimeRegisteredDate: string;
  PolicePersonID: number;
  PoliceStationID: number;
  CaseCategoryID: number;
  GravityOffenceID: number;
  CrimeMajorHeadID: number;
  CrimeMinorHeadID: number;
  CaseStatusID: number;
  CourtID: number;
  IncidentFromDate: string;
  IncidentToDate: string;
  InfoReceivedPSDate: string;
  latitude?: number;
  longitude?: number;
  BriefFacts: string;
}
export interface RawComplainant {
  ComplainantID: number;
  CaseMasterID: number;
  ComplainantName: string;
  AgeYear: number;
  OccupationID: number;
  ReligionID: number;
  CasteID: number;
  GenderID: number;
}
export interface RawVictim {
  VictimMasterID: number;
  CaseMasterID: number;
  VictimName: string;
  AgeYear: number;
  GenderID: number;
  VictimPolice: string;
}
export interface RawAccused {
  AccusedMasterID: number;
  CaseMasterID: number;
  AccusedName: string;
  AgeYear: number;
  GenderID: number;
  /** Scenario-local fusion code, e.g. "A1" — same code across FIRs means the same real person. */
  PersonID: string;
}
export interface RawActSection {
  CaseMasterID: number;
  ActID: string;
  SectionID: string;
  ActOrderID: number;
  SectionOrderID: number;
}
export interface RawScenario {
  scenarioId: string;
  title: string;
  summary: string;
  districts: number[];
  firs: RawFIR[];
  complainants: RawComplainant[];
  victims: RawVictim[];
  accused: RawAccused[];
  actSections: RawActSection[];
  personRefs: Record<string, string>;
  contradiction: {
    description: string;
    conflictingRecords: string[];
    suggestedNextQuestion: string;
  };
}
export interface RawCasesFile {
  cases: RawScenario[];
  [key: string]: unknown;
}

// --- src/lib/nosql-seed/*.json ---------------------------------------------------

export interface ResolvedPersonRef {
  type: "Accused" | "Victim";
  id: number;
  name: string;
}
interface SeedRecordBase {
  scenarioId: string;
  caseMasterIds: number[];
  resolvedPersons: Record<string, ResolvedPersonRef>;
  id: string;
}
export interface RawCallRecord extends SeedRecordBase {
  from: string;
  to: string;
  timestamp: string;
  durationSec: number;
  note: string;
}
export interface RawTransaction extends SeedRecordBase {
  fromAccount: string;
  toAccount: string;
  amount: number;
  timestamp: string;
  note: string;
}
export interface RawCCTVSighting extends SeedRecordBase {
  cameraLocation: string;
  personOrVehicle: string;
  timestamp: string;
  note: string;
}
export interface RawWitnessStatement extends SeedRecordBase {
  witnessName: string;
  statementDate: string;
  statementText: string;
  relatedPerson: string;
}
export interface RawTimelineEvent extends SeedRecordBase {
  timestamp: string;
  source: "fir" | "call" | "cctv" | "transaction" | "statement";
  sourceId: string;
  description: string;
}
export interface RawContradiction extends SeedRecordBase {
  description: string;
  conflictingRecords: string[];
  suggestedNextQuestion: string;
}

// --- cached loaders --------------------------------------------------------------
// Static JSON, read once per process and cached — no randomness, no per-call
// re-fetch, so results are stable across repeated calls within a process.

let _lookups: RawLookups | null = null;
export function getLookups(): RawLookups {
  if (!_lookups) _lookups = readJson<RawLookups>("catalyst/dataset-v2/lookups.json");
  return _lookups;
}

let _cases: RawCasesFile | null = null;
export function getCasesFile(): RawCasesFile {
  if (!_cases) _cases = readJson<RawCasesFile>("catalyst/dataset-v2/cases.json");
  return _cases;
}

export function getScenarioIds(): string[] {
  return getCasesFile().cases.map((c) => c.scenarioId);
}

export function getRawScenario(scenarioId: string): RawScenario | undefined {
  return getCasesFile().cases.find((c) => c.scenarioId === scenarioId);
}

function cachedArray<T>(relPath: string): () => T[] {
  let cache: T[] | null = null;
  return () => {
    if (!cache) cache = readJson<T[]>(relPath);
    return cache;
  };
}

export const getAllCallRecords = cachedArray<RawCallRecord>("src/lib/nosql-seed/CallRecords.json");
export const getAllTransactions = cachedArray<RawTransaction>("src/lib/nosql-seed/Transactions.json");
export const getAllCCTVSightings = cachedArray<RawCCTVSighting>("src/lib/nosql-seed/CCTVSightings.json");
export const getAllWitnessStatements = cachedArray<RawWitnessStatement>("src/lib/nosql-seed/WitnessStatements.json");
export const getAllTimelineEvents = cachedArray<RawTimelineEvent>("src/lib/nosql-seed/TimelineEvents.json");
export const getAllContradictions = cachedArray<RawContradiction>("src/lib/nosql-seed/Contradictions.json");

export function forScenario<T extends { scenarioId: string }>(all: T[], scenarioId: string): T[] {
  return all.filter((r) => r.scenarioId === scenarioId);
}
