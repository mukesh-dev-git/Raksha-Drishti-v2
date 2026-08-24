// -----------------------------------------------------------------------------
// normalizeInvestigationCase(scenarioId) — the single place synthetic seed
// data is turned into the unified InvestigationCase domain model.
//
// SOURCE OF TRUTH: the project's SYNTHETIC SEEDED DEVELOPMENT DATASET
// (catalyst/dataset-v2/{cases,lookups}.json + src/lib/nosql-seed/*.json).
// This is a development dataset with realistic-looking IDs and
// cross-references — it is NOT real FIR data.
//
// Hard rules enforced throughout this file:
//   - No Math.random(), no RNG, no invented values of any kind.
//   - If a scenario doesn't exist, return null — never a fabricated case.
//   - Every derived field's rule is documented at the point of computation.
//   - Categories with zero supporting records anywhere in the dataset
//     (chain of custody, forensics/FSL, search & seizure, documents) are
//     never populated here — see model.ts's ABSENT / BACKEND REQUIREMENT
//     notes. They stay as empty arrays; the UI renders the empty state.
// -----------------------------------------------------------------------------

import {
  getLookups,
  getRawScenario,
  getScenarioIds,
  getAllCallRecords,
  getAllTransactions,
  getAllCCTVSightings,
  getAllWitnessStatements,
  getAllTimelineEvents,
  getAllContradictions,
  forScenario,
  type RawScenario,
  type RawLookups,
  type RawAccused,
  type ResolvedPersonRef,
} from "./seedData";
import type {
  InvestigationCase,
  Person,
  PersonRole,
  EvidenceRecord,
  WitnessStatement,
  TimelineEvent,
  InvestigationActivity,
  DiaryEntry,
  Contradiction,
  FIRSummary,
  CrimeScene,
  ActivityMethodType,
  TimelineSourceType,
} from "./model";

// --- simple lookup-table resolvers -------------------------------------------
// All DIRECT/DERIVED per model.ts's field comments — every value here is a
// straight resolution against a real row in lookups.json, never invented.

/** GenderID convention documented in cases.json's `_code_conventions`: 1=Male, 2=Female, 3=Other. */
function genderLabel(id: number | undefined): "Male" | "Female" | "Other" | undefined {
  if (id === 1) return "Male";
  if (id === 2) return "Female";
  if (id === 3) return "Other";
  return undefined;
}

/** OccupationID convention documented in cases.json's `_code_conventions` (no OccupationMaster table yet). */
const OCCUPATION_LABELS: Record<number, string> = {
  1: "Business / Shop Owner",
  2: "Farmer",
  3: "Government Employee",
  4: "Private Employee",
  5: "Driver",
  6: "Homemaker",
  7: "Student",
  8: "Daily Wage Worker",
  9: "Self-employed / Professional",
  10: "Retired",
};
function occupationLabel(id: number | undefined): string | undefined {
  return id !== undefined ? OCCUPATION_LABELS[id] : undefined;
}

function districtName(id: number, lookups: RawLookups): string | undefined {
  return lookups.District.find((d) => d.DistrictID === id)?.DistrictName;
}
function crimeTypeName(id: number, lookups: RawLookups): string | undefined {
  return lookups.CrimeSubHead.find((c) => c.CrimeSubHeadID === id)?.CrimeHeadName;
}
function caseStatusName(id: number, lookups: RawLookups): string | undefined {
  return lookups.CaseStatusMaster.find((s) => s.CaseStatusID === id)?.CaseStatusName;
}
function caseCategoryName(id: number, lookups: RawLookups): string | undefined {
  return lookups.CaseCategory.find((c) => c.CaseCategoryID === id)?.LookupValue;
}
function gravityOffenceName(id: number, lookups: RawLookups): string | undefined {
  return lookups.GravityOffence.find((g) => g.GravityOffenceID === id)?.LookupValue;
}
function policeStationName(unitId: number, lookups: RawLookups): string | undefined {
  return lookups.Unit.find((u) => u.UnitID === unitId)?.UnitName;
}
function courtName(courtId: number, lookups: RawLookups): string | undefined {
  return lookups.Court.find((c) => c.CourtID === courtId)?.CourtName;
}
function employeeDesignation(employeeId: number, lookups: RawLookups): string | undefined {
  const emp = lookups.Employee.find((e) => e.EmployeeID === employeeId);
  if (!emp) return undefined;
  const rank = lookups.Rank.find((r) => r.RankID === emp.RankID)?.RankName;
  const desig = lookups.Designation.find((d) => d.DesignationID === emp.DesignationID)?.DesignationName;
  return [rank, desig].filter(Boolean).join(" · ") || undefined;
}
function resolveSections(caseMasterId: number, scenario: RawScenario, lookups: RawLookups): string[] {
  return scenario.actSections
    .filter((a) => a.CaseMasterID === caseMasterId)
    .sort((a, b) => a.SectionOrderID - b.SectionOrderID)
    .map((a) => {
      const section = lookups.Section.find((s) => s.ActCode === a.ActID && s.SectionCode === a.SectionID);
      const act = lookups.Act.find((x) => x.ActCode === a.ActID);
      const shortAct = act?.ShortName ?? a.ActID;
      return section ? `${shortAct} ${a.SectionID} — ${section.SectionDescription}` : `${shortAct} ${a.SectionID}`;
    });
}

// --- person index -------------------------------------------------------------
// Maps a real source-table id to the merged Person.id built for it, so every
// other builder (evidence, statements, activities) can resolve a reference
// without re-deriving the merge logic.

interface PersonIndex {
  byAccusedId: Map<number, string>;
  byVictimId: Map<number, string>;
  byComplainantId: Map<number, string>;
  byIOEmployeeId: Map<number, string>;
  byWitnessName: Map<string, string>;
  /** Every Person's own name + alias names, lowercased, for literal substring/prefix matching only. */
  namesById: Map<string, string[]>;
}

function emptyIndex(): PersonIndex {
  return {
    byAccusedId: new Map(),
    byVictimId: new Map(),
    byComplainantId: new Map(),
    byIOEmployeeId: new Map(),
    byWitnessName: new Map(),
    namesById: new Map(),
  };
}

/**
 * Accused persons — merged by the scenario-local `PersonID` fusion code
 * (e.g. "A1") that cases.json's own accused rows already carry. Multiple
 * AccusedMasterID rows sharing the same PersonID within one scenario are
 * the SAME real person under different name spellings across FIRs — this
 * is an explicit signal already present in the source data (see e.g. C1's
 * "Suresh Naik" / "Suresh N.", C3's "Zoya Merchant" / "Z. Merchant"), not
 * an inference made here.
 */
function buildAccusedPersons(scenario: RawScenario, index: PersonIndex): Person[] {
  const groups = new Map<string, RawAccused[]>();
  for (const a of scenario.accused) {
    const key = a.PersonID;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(a);
  }
  const persons: Person[] = [];
  for (const rows of groups.values()) {
    const primary = rows[0];
    const id = `ACC-${primary.AccusedMasterID}`;
    const names = Array.from(new Set(rows.map((r) => r.AccusedName)));
    const person: Person = {
      id,
      role: "accused",
      name: primary.AccusedName,
      aliasNames: names.length > 1 ? names.slice(1) : undefined,
      sourceRecordIds: rows.map((r) => `Accused.AccusedMasterID:${r.AccusedMasterID}`),
      caseMasterIds: Array.from(new Set(rows.map((r) => r.CaseMasterID))),
      age: primary.AgeYear,
      gender: genderLabel(primary.GenderID),
    };
    persons.push(person);
    for (const r of rows) index.byAccusedId.set(r.AccusedMasterID, id);
    index.namesById.set(id, names.map((n) => n.toLowerCase()));
  }
  return persons;
}

function buildVictimPersons(scenario: RawScenario, index: PersonIndex): Person[] {
  return scenario.victims.map((v) => {
    const id = `VIC-${v.VictimMasterID}`;
    index.byVictimId.set(v.VictimMasterID, id);
    index.namesById.set(id, [v.VictimName.toLowerCase()]);
    return {
      id,
      role: "victim" as PersonRole,
      name: v.VictimName,
      sourceRecordIds: [`Victim.VictimMasterID:${v.VictimMasterID}`],
      caseMasterIds: [v.CaseMasterID],
      age: v.AgeYear,
      gender: genderLabel(v.GenderID),
    };
  });
}

function buildComplainantPersons(scenario: RawScenario, index: PersonIndex): Person[] {
  return scenario.complainants.map((c) => {
    const id = `COMP-${c.ComplainantID}`;
    index.byComplainantId.set(c.ComplainantID, id);
    index.namesById.set(id, [c.ComplainantName.toLowerCase()]);
    return {
      id,
      role: "complainant" as PersonRole,
      name: c.ComplainantName,
      sourceRecordIds: [`ComplainantDetails.ComplainantID:${c.ComplainantID}`],
      caseMasterIds: [c.CaseMasterID],
      age: c.AgeYear,
      gender: genderLabel(c.GenderID),
      occupation: occupationLabel(c.OccupationID),
    };
  });
}

function buildIOPersons(scenario: RawScenario, lookups: RawLookups, index: PersonIndex): Person[] {
  const employeeIds = Array.from(new Set(scenario.firs.map((f) => f.PolicePersonID)));
  return employeeIds.map((employeeId) => {
    const emp = lookups.Employee.find((e) => e.EmployeeID === employeeId);
    const id = `IO-${employeeId}`;
    index.byIOEmployeeId.set(employeeId, id);
    if (emp) index.namesById.set(id, [emp.FirstName.toLowerCase()]);
    return {
      id,
      role: "io" as PersonRole,
      name: emp?.FirstName ?? `Officer ${employeeId}`,
      sourceRecordIds: [`Employee.EmployeeID:${employeeId}`],
      caseMasterIds: scenario.firs.filter((f) => f.PolicePersonID === employeeId).map((f) => f.CaseMasterID),
      gender: genderLabel(emp?.GenderID),
      designation: emp ? employeeDesignation(employeeId, lookups) : undefined,
      unit: emp ? policeStationName(emp.UnitID, lookups) : undefined,
    };
  });
}

/**
 * Local scenario-scoped reference codes (e.g. "P1", "P2", "V4", "V:Anil",
 * "W1") appear in the raw call/cctv/transaction/witnessStatement records'
 * from/to/relatedPerson/personOrVehicle fields. Each nosql-seed record also
 * carries a `resolvedPersons` map (built by the dataset's own build script,
 * catalyst/dataset-v2/build_seed.mjs) keyed by codes like "A1", "A2" and by
 * explicit "V:Name" codes for victims. Cross-checking every one of the 15
 * scenarios in cases.json confirms the call/cctv/transaction fields' "P<n>"
 * numbering and the accused rows' "A<n>" PersonID code refer to the same
 * person by ordinal position within that scenario (P1 = the first distinct
 * accused PersonID group, P2 = the second, …) — a structural property of how
 * the dataset's own build script generated both from the same source, not an
 * inference made here.
 *
 * Resolution order: (1) exact key match in resolvedPersons — covers
 * "V:Name", "W1", and any literal match; (2) "P<n>" -> try key "A<n>". If
 * neither resolves, the code is returned unresolved — never guessed. This
 * correctly leaves some codes unresolved, e.g. C1's "V4" (an unregistered
 * SIM card, not a person) has no resolvedPersons entry at all.
 */
function resolveLocalPersonCode(
  code: string,
  resolvedPersons: Record<string, ResolvedPersonRef>,
  index: PersonIndex
): string | undefined {
  const byRef = (ref: ResolvedPersonRef | undefined): string | undefined => {
    if (!ref) return undefined;
    if (ref.type === "Accused") return index.byAccusedId.get(ref.id);
    if (ref.type === "Victim") return index.byVictimId.get(ref.id);
    return undefined;
  };
  const direct = byRef(resolvedPersons[code]);
  if (direct) return direct;
  const m = /^P(\d+)$/.exec(code);
  if (m) {
    const viaA = byRef(resolvedPersons[`A${m[1]}`]);
    if (viaA) return viaA;
  }
  return undefined;
}

/**
 * Best-effort, literal-match-only extraction of person references from free
 * text (personOrVehicle / note fields). Two rules, both matching text the
 * dataset itself already put there — never a guess:
 *   1. Whole-word "P<n>" tokens, resolved via resolveLocalPersonCode().
 *   2. A known person's exact name (or alias) appearing verbatim in the text.
 */
function extractPersonMentions(
  text: string,
  resolvedPersons: Record<string, ResolvedPersonRef>,
  index: PersonIndex
): string[] {
  const found = new Set<string>();
  const tokenMatches = text.match(/\bP\d+\b/g) ?? [];
  for (const tok of tokenMatches) {
    const id = resolveLocalPersonCode(tok, resolvedPersons, index);
    if (id) found.add(id);
  }
  // Full-name mentions: a known person's own stored name (which may itself
  // carry a trailing parenthetical) is too long to expect verbatim in short
  // sighting text, so match on each name's stripped, parenthetical-free form
  // instead — e.g. "Suresh Naik" (from "Suresh Naik" alone, no annotation)
  // appearing inside "Suresh Naik's registered vehicle KA-04-XX-1187".
  const lower = text.toLowerCase();
  for (const [personId, names] of index.namesById) {
    if (names.some((n) => {
      const stripped = stripParenthetical(n);
      return stripped.length > 2 && lower.includes(stripped);
    })) {
      found.add(personId);
    }
  }
  return Array.from(found);
}

/**
 * Account-holder strings in transactions are formatted "Name - Bank xxNNNN"
 * (see cases.json's own transaction notes). Takes the segment before the
 * first " - " as the candidate name and reuses matchPersonByName()'s
 * bidirectional prefix rule (needed because a person's stored name can
 * itself carry a trailing parenthetical, e.g. "Zoya Merchant (app runs as
 * 'QuickCash Lending')", which is longer than the short form used in the
 * account label). Left unresolved for non-person accounts (e.g. "shell
 * company", "unknown buyer", "cloned card withdrawals").
 */
function matchAccountHolder(accountLabel: string, candidates: Person[]): string | undefined {
  const namePart = accountLabel.split(" - ")[0];
  return matchPersonByName(namePart, candidates)?.id;
}

/**
 * Statement bylines in the dataset look like "Suresh Naik (as accused,
 * recorded statement)" or "Lakshmi Bai (parking attendant)" — strips the
 * trailing " (...)" annotation to get the bare name for matching.
 */
function stripParenthetical(name: string): string {
  return name.replace(/\s*\([^)]*\)\s*$/, "").trim();
}

/**
 * Matches a witness statement's byline name against the scenario's already
 * -known accused/victim/complainant persons (never against `witness`/`io`
 * roles, and never against the statement's own `relatedPerson` field, which
 * names who the statement is ABOUT, not who gave it — e.g. Lakshmi Bai's
 * statement has relatedPerson "P2" for Deepak, the person she describes,
 * while she herself gave the statement and is not Deepak).
 *
 * Match rule: bidirectional prefix match on the stripped byline name against
 * each candidate's name/aliasNames, case-insensitive — e.g. "Ravindra Naidu"
 * (stripped from "Ravindra Naidu (as accused)") matches the accused row
 * named "Ravindra Naidu (fence, pawnbroker)" because one is a literal prefix
 * of the other. This is a literal string match against real names already in
 * the dataset, not a fuzzy/inferred guess. Where a byline name matches more
 * than one candidate (e.g. a person recorded as both Victim and Complainant
 * under the identical name), the first match wins, and persons[] is always
 * built in accused → victim → complainant order, so the most specific role
 * (victim) is preferred over the more generic one (complainant) — documented
 * here rather than left as an unstated tie-break.
 */
function matchPersonByName(byline: string, candidates: Person[]): Person | undefined {
  const stripped = stripParenthetical(byline).toLowerCase();
  if (!stripped) return undefined;
  return candidates.find((p) => {
    const names = [p.name, ...(p.aliasNames ?? [])].map((n) => n.toLowerCase());
    return names.some((n) => n.startsWith(stripped) || stripped.startsWith(n));
  });
}

/**
 * Witnesses who are not already a known accused/victim/complainant person,
 * deduplicated by exact witnessName within the scenario. A statement whose
 * byline name matches an existing accused/victim/complainant (see
 * matchPersonByName()) attaches to that Person instead of spawning a
 * duplicate "witness" — this correctly distinguishes an accused person's own
 * recorded statement (e.g. "Suresh Naik (as accused, recorded statement)")
 * from a genuine third-party witness (e.g. "Lakshmi Bai, parking
 * attendant"), by matching who is SPEAKING, never by the statement's
 * `relatedPerson` field (who the statement is about).
 */
function buildWitnessPersons(
  scenario: RawScenario,
  index: PersonIndex,
  knownPersons: Person[],
  rawStatements: { witnessName: string; caseMasterIds: number[] }[]
): Person[] {
  const persons: Person[] = [];
  const seen = new Set<string>();
  for (const s of rawStatements) {
    if (matchPersonByName(s.witnessName, knownPersons)) continue;
    if (index.byWitnessName.has(s.witnessName)) continue;
    if (seen.has(s.witnessName)) continue;
    seen.add(s.witnessName);
    const slug = s.witnessName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    const id = `WIT-${scenario.scenarioId}-${slug}`;
    index.byWitnessName.set(s.witnessName, id);
    index.namesById.set(id, [s.witnessName.toLowerCase()]);
    persons.push({
      id,
      role: "witness",
      name: s.witnessName,
      sourceRecordIds: [],
      caseMasterIds: s.caseMasterIds,
    });
  }
  return persons;
}

// --- FIR / crime scene ---------------------------------------------------------

function buildFIRSummaries(scenario: RawScenario, lookups: RawLookups, index: PersonIndex): FIRSummary[] {
  return scenario.firs.map((f) => ({
    caseMasterId: f.CaseMasterID,
    crimeNo: f.CrimeNo,
    caseNo: f.CaseNo,
    districtId: (() => {
      // District isn't stored directly on the FIR row; resolved via the
      // police station's own DistrictID (structural join, not invented).
      const unit = lookups.Unit.find((u) => u.UnitID === f.PoliceStationID);
      return unit?.DistrictID ?? scenario.districts[0];
    })(),
    districtName: (() => {
      const unit = lookups.Unit.find((u) => u.UnitID === f.PoliceStationID);
      return unit ? districtName(unit.DistrictID, lookups) : undefined;
    })(),
    crimeMinorHeadId: f.CrimeMinorHeadID,
    crimeTypeName: crimeTypeName(f.CrimeMinorHeadID, lookups),
    crimeRegisteredDate: f.CrimeRegisteredDate,
    incidentFromDate: f.IncidentFromDate,
    incidentToDate: f.IncidentToDate,
    latitude: f.latitude,
    longitude: f.longitude,
    briefFacts: f.BriefFacts,
    caseStatusId: f.CaseStatusID,
    caseStatusName: caseStatusName(f.CaseStatusID, lookups),
    caseCategoryId: f.CaseCategoryID,
    caseCategoryName: caseCategoryName(f.CaseCategoryID, lookups),
    gravityOffenceId: f.GravityOffenceID,
    gravityOffenceName: gravityOffenceName(f.GravityOffenceID, lookups),
    ioPersonId: index.byIOEmployeeId.get(f.PolicePersonID),
    policeStationName: policeStationName(f.PoliceStationID, lookups),
    courtName: courtName(f.CourtID, lookups),
    sections: resolveSections(f.CaseMasterID, scenario, lookups),
  }));
}

function buildCrimeScenes(firs: FIRSummary[]): CrimeScene[] {
  return firs.map((f) => ({
    firCaseMasterId: f.caseMasterId,
    location: [f.districtName, f.policeStationName].filter(Boolean).join(" · ") || `FIR ${f.caseMasterId}`,
    latitude: f.latitude,
    longitude: f.longitude,
    briefFacts: f.briefFacts,
  }));
}

// --- evidence -------------------------------------------------------------------

function buildEvidence(scenarioId: string, index: PersonIndex, allPersons: Person[]): EvidenceRecord[] {
  const cctv = forScenario(getAllCCTVSightings(), scenarioId).map((c): EvidenceRecord => ({
    id: c.id,
    caseId: scenarioId,
    sourceCollection: "CCTVSightings",
    type: "CCTV Footage",
    title: c.cameraLocation,
    description: [c.personOrVehicle, c.note].filter(Boolean).join(" — "),
    timestamp: c.timestamp,
    relatedPersonIds: extractPersonMentions(c.personOrVehicle, c.resolvedPersons, index),
    cameraLocation: c.cameraLocation,
  }));
  const calls = forScenario(getAllCallRecords(), scenarioId).map((c): EvidenceRecord => {
    const fromId = resolveLocalPersonCode(c.from, c.resolvedPersons, index);
    const toId = resolveLocalPersonCode(c.to, c.resolvedPersons, index);
    // Display the real resolved person's name where resolvable; fall back to
    // the raw local code (e.g. "V4") only when it genuinely doesn't resolve
    // to a person — never invent a name for it.
    const fromLabel = (fromId && allPersons.find((p) => p.id === fromId)?.name) || c.from;
    const toLabel = (toId && allPersons.find((p) => p.id === toId)?.name) || c.to;
    return {
      id: c.id,
      caseId: scenarioId,
      sourceCollection: "CallRecords",
      type: "Call Detail Record",
      title: `Call — ${fromLabel} → ${toLabel} (${c.durationSec}s)`,
      description: c.note,
      timestamp: c.timestamp,
      relatedPersonIds: [fromId, toId].filter((x): x is string => !!x),
    };
  });
  const transactions = forScenario(getAllTransactions(), scenarioId).map((t): EvidenceRecord => {
    const fromId = matchAccountHolder(t.fromAccount, allPersons);
    const toId = matchAccountHolder(t.toAccount, allPersons);
    return {
      id: t.id,
      caseId: scenarioId,
      sourceCollection: "Transactions",
      type: "Financial Transaction",
      title: `₹${t.amount.toLocaleString("en-IN")} — ${t.fromAccount} → ${t.toAccount}`,
      description: t.note,
      timestamp: t.timestamp,
      relatedPersonIds: [fromId, toId].filter((x): x is string => !!x),
      amount: t.amount,
    };
  });
  return [...cctv, ...calls, ...transactions];
}

// --- witness statements -----------------------------------------------------------

/**
 * witnessPersonId is resolved the same way buildWitnessPersons() decided
 * whether to create a new witness — by matching the byline name (never
 * `relatedPerson`, which names the statement's subject, not its speaker)
 * against every known person, accused/victim/complainant/witness alike.
 */
function buildWitnessStatements(scenarioId: string, allPersons: Person[]): WitnessStatement[] {
  return forScenario(getAllWitnessStatements(), scenarioId).map((s) => {
    const matched = matchPersonByName(s.witnessName, allPersons);
    return {
      id: s.id,
      caseId: scenarioId,
      witnessPersonId: matched?.id,
      witnessName: s.witnessName,
      statementDate: s.statementDate,
      statementText: s.statementText,
      status: "Recorded" as const,
    };
  });
}

// --- timeline / activities / diary -----------------------------------------------

function buildTimeline(scenarioId: string): TimelineEvent[] {
  return forScenario(getAllTimelineEvents(), scenarioId)
    .map((t): TimelineEvent => ({
      id: t.id,
      caseId: scenarioId,
      timestamp: t.timestamp,
      description: t.description,
      sourceType: t.source,
      sourceId: t.sourceId,
    }))
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

const ACTIVITY_METHOD_BY_SOURCE: Record<TimelineSourceType, ActivityMethodType> = {
  fir: "Case Registration",
  cctv: "CCTV Analysis",
  call: "Call Record Analysis",
  transaction: "Financial Trail Analysis",
  statement: "Witness Examination",
};

/** One activity per timeline event — a faithful 1:1 derivation, not a summary or a guess. */
function buildActivities(scenario: RawScenario, timeline: TimelineEvent[], index: PersonIndex): InvestigationActivity[] {
  return timeline.map((t) => {
    const evidenceGenerated = t.sourceType === "call" || t.sourceType === "cctv" || t.sourceType === "transaction" ? [t.sourceId] : [];
    // Assign the officer of whichever FIR this event's date falls under (a
    // scenario with 2 FIRs can have 2 different IOs) — fall back to the
    // scenario's first FIR's IO when the date doesn't cleanly disambiguate.
    const fir = scenario.firs.find((f) => t.timestamp >= f.IncidentFromDate) ?? scenario.firs[0];
    const assignedOfficer = fir ? index.byIOEmployeeId.get(fir.PolicePersonID) : undefined;
    return {
      id: `ACT-${t.id}`,
      caseId: scenario.scenarioId,
      methodType: ACTIVITY_METHOD_BY_SOURCE[t.sourceType],
      timelineEventId: t.id,
      startTime: t.timestamp,
      status: "Completed",
      findings: t.description,
      evidenceGenerated,
      assignedOfficer,
    };
  });
}

/** One diary entry per activity — see model.ts's DiaryEntry comments for the exact field derivations. */
function buildDiaryEntries(
  activities: InvestigationActivity[],
  scenarioId: string,
  evidenceById: Map<string, EvidenceRecord>,
  callsAndCctvById: Map<string, string[]> // evidence id -> relatedPersonIds
): DiaryEntry[] {
  return activities.map((a) => {
    const [date, time] = a.startTime.split("T");
    const personsInvolved = a.evidenceGenerated.flatMap((id) => callsAndCctvById.get(id) ?? []);
    return {
      id: `DI-${a.id}`,
      caseId: scenarioId,
      activityId: a.id,
      date: date ?? a.startTime,
      time: time ?? "",
      officer: a.assignedOfficer,
      activity: a.methodType,
      observation: a.findings,
      actionTaken: a.findings,
      evidenceGenerated: a.evidenceGenerated,
      personsInvolved: Array.from(new Set(personsInvolved)),
    };
  });
}

// --- contradiction -----------------------------------------------------------------

function buildContradictions(scenarioId: string): Contradiction[] {
  return forScenario(getAllContradictions(), scenarioId).map((c) => ({
    id: c.id,
    caseId: scenarioId,
    description: c.description,
    conflictingRecordIds: c.conflictingRecords,
    suggestedNextQuestion: c.suggestedNextQuestion,
  }));
}

// --- entry point --------------------------------------------------------------------

/**
 * Builds the full InvestigationCase for one scenario id, entirely from the
 * synthetic seeded development dataset. Returns null if the scenario id
 * doesn't exist — callers must render an explicit "no data" state, never
 * fall back to a generated substitute.
 */
export function normalizeInvestigationCase(scenarioId: string): InvestigationCase | null {
  const scenario = getRawScenario(scenarioId);
  if (!scenario) return null;
  const lookups = getLookups();

  const index = emptyIndex();
  const accusedPersons = buildAccusedPersons(scenario, index);
  const victimPersons = buildVictimPersons(scenario, index);
  const complainantPersons = buildComplainantPersons(scenario, index);
  const ioPersons = buildIOPersons(scenario, lookups, index);

  const rawStatements = forScenario(getAllWitnessStatements(), scenarioId);
  const nameableSoFar = [...accusedPersons, ...victimPersons, ...complainantPersons];
  const witnessPersons = buildWitnessPersons(scenario, index, nameableSoFar, rawStatements);

  const persons = [...accusedPersons, ...victimPersons, ...complainantPersons, ...ioPersons, ...witnessPersons];

  const firs = buildFIRSummaries(scenario, lookups, index);
  const crimeScenes = buildCrimeScenes(firs);
  const evidence = buildEvidence(scenarioId, index, persons);
  const witnessStatements = buildWitnessStatements(scenarioId, persons);
  const timelineEvents = buildTimeline(scenarioId);
  const activities = buildActivities(scenario, timelineEvents, index);

  const evidenceById = new Map(evidence.map((e) => [e.id, e]));
  const evidenceRelatedPersonsById = new Map(evidence.map((e) => [e.id, e.relatedPersonIds]));
  const diaryEntries = buildDiaryEntries(activities, scenarioId, evidenceById, evidenceRelatedPersonsById);

  const contradictions = buildContradictions(scenarioId);

  return {
    id: scenario.scenarioId,
    title: scenario.title,
    summary: scenario.summary,
    firs,
    caseMasterIds: firs.map((f) => f.caseMasterId),
    persons,
    evidence,
    witnessStatements,
    timelineEvents,
    activities,
    diaryEntries,
    contradictions,
    crimeScenes,
    custodyEvents: [],
    forensicRequests: [],
    searchSeizures: [],
    documents: [],
    tasks: [],
    relatedCaseIds: [],
  };
}

export { getScenarioIds };

// --- verification ----------------------------------------------------------------
// Dev-time integrity check: confirms every cross-reference inside a built
// InvestigationCase resolves to a real object elsewhere in the same case
// (no dangling ids), without asserting anything about coverage of fields
// that are legitimately ABSENT per model.ts. Used by
// scripts/verify-investigation-data.ts — not part of the UI runtime.
export function verifyInvestigationCase(kase: InvestigationCase): string[] {
  const issues: string[] = [];
  const personIds = new Set(kase.persons.map((p) => p.id));
  const evidenceIds = new Set(kase.evidence.map((e) => e.id));
  const statementIds = new Set(kase.witnessStatements.map((s) => s.id));
  const caseMasterIds = new Set(kase.caseMasterIds.map(String));

  for (const t of kase.timelineEvents) {
    const ok =
      (t.sourceType === "fir" && caseMasterIds.has(t.sourceId)) ||
      (t.sourceType === "cctv" && evidenceIds.has(t.sourceId)) ||
      (t.sourceType === "call" && evidenceIds.has(t.sourceId)) ||
      (t.sourceType === "transaction" && evidenceIds.has(t.sourceId)) ||
      (t.sourceType === "statement" && statementIds.has(t.sourceId));
    if (!ok) issues.push(`TimelineEvent ${t.id}: dangling sourceId "${t.sourceId}" (sourceType ${t.sourceType})`);
  }
  for (const e of kase.evidence) {
    for (const pid of e.relatedPersonIds) {
      if (!personIds.has(pid)) issues.push(`Evidence ${e.id}: dangling relatedPersonId "${pid}"`);
    }
  }
  for (const s of kase.witnessStatements) {
    if (s.witnessPersonId && !personIds.has(s.witnessPersonId)) {
      issues.push(`WitnessStatement ${s.id}: dangling witnessPersonId "${s.witnessPersonId}"`);
    }
  }
  for (const a of kase.activities) {
    if (a.assignedOfficer && !personIds.has(a.assignedOfficer)) {
      issues.push(`Activity ${a.id}: dangling assignedOfficer "${a.assignedOfficer}"`);
    }
    for (const eid of a.evidenceGenerated) {
      if (!evidenceIds.has(eid)) issues.push(`Activity ${a.id}: dangling evidenceGenerated id "${eid}"`);
    }
  }
  for (const d of kase.diaryEntries) {
    for (const pid of d.personsInvolved) {
      if (!personIds.has(pid)) issues.push(`DiaryEntry ${d.id}: dangling personsInvolved id "${pid}"`);
    }
    for (const eid of d.evidenceGenerated) {
      if (!evidenceIds.has(eid)) issues.push(`DiaryEntry ${d.id}: dangling evidenceGenerated id "${eid}"`);
    }
  }
  for (const c of kase.contradictions) {
    // conflictingRecordIds point at witness statements / evidence / any
    // record id minted in this scenario — check against the union.
    const known = new Set<string>([...evidenceIds, ...statementIds]);
    for (const rid of c.conflictingRecordIds) {
      if (!known.has(rid)) issues.push(`Contradiction ${c.id}: unresolved conflictingRecordId "${rid}"`);
    }
  }
  return issues;
}
