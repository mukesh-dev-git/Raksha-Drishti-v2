// -----------------------------------------------------------------------------
// adaptToCaseFileContent — converts a normalized InvestigationCase (built
// entirely from the synthetic seeded development dataset) into the EXACT
// CaseFileContent shape src/components/flipbook/* already renders, so the
// flipbook UI does not change at all — only where its data comes from.
//
// This module imports ONLY types from src/lib/investigationData.ts, never
// its generator functions — no RNG is invoked by using this adapter.
//
// A few of CaseFileContent's fields are typed as strict string unions that
// assume facts the synthetic dataset does not record for ANY of the 15
// scenarios (custody status, witness reliability rating, a "final report"
// conclusion — see catalyst/README.md and the Investigation Module plan:
// arrest tracking and forensic/report data are explicitly not-yet-built).
// Rather than fabricate a plausible-looking value to satisfy those unions,
// each such field is set to an honestly-labeled "not recorded" string and
// passed through an explicit, commented `as` cast — a deliberate, narrow
// type-system accommodation, not a silent data lie. Every other field is a
// direct or documented-derivation read from the InvestigationCase.
// -----------------------------------------------------------------------------

import type {
  CaseFileContent,
  Suspect as LegacySuspect,
  Victim as LegacyVictim,
  Witness as LegacyWitness,
  EvidenceItem as LegacyEvidenceItem,
  AIInsight as LegacyAIInsight,
} from "@/lib/investigationData";
import type { InvestigationCase, FIRSummary } from "./model";

function splitDateTime(iso: string): { date: string; time: string } {
  const [date, timePart] = iso.split("T");
  return { date: date ?? iso, time: timePart ? timePart.slice(0, 5) : "" };
}

function personName(kase: InvestigationCase, id: string | undefined): string | undefined {
  return id ? kase.persons.find((p) => p.id === id)?.name : undefined;
}

export function adaptToCaseFileContent(kase: InvestigationCase, firCaseMasterId: number): CaseFileContent {
  const fir: FIRSummary =
    kase.firs.find((f) => f.caseMasterId === firCaseMasterId) ?? kase.firs[0];
  const scene = kase.crimeScenes.find((s) => s.firCaseMasterId === fir.caseMasterId);
  const { date: incidentDate, time: incidentTime } = splitDateTime(fir.incidentFromDate);

  // --- complainant (real) — CaseFileContent only has room for one name string ---
  const complainant = kase.persons.find(
    (p) => p.role === "complainant" && p.caseMasterIds.includes(fir.caseMasterId)
  );

  // --- victim (real where present; explicit "no record" when this FIR has none) ---
  const victimPerson = kase.persons.find(
    (p) => p.role === "victim" && p.caseMasterIds.includes(fir.caseMasterId)
  );
  const victim: LegacyVictim = victimPerson
    ? {
        id: victimPerson.id,
        name: victimPerson.name,
        age: victimPerson.age ?? 0,
        gender: victimPerson.gender ?? "Not specified",
        address: "Not recorded in the synthetic dataset",
        occupation: victimPerson.occupation ?? "Not recorded",
        statement: "No victim statement on record for this synthetic case.",
        injuries: "Not recorded in the synthetic dataset",
      }
    : {
        id: "",
        name: "No Victim record for this case (see Complainant)",
        age: 0,
        gender: "Not specified",
        address: "Not applicable",
        occupation: "Not applicable",
        statement: "Not applicable — this FIR has no Victim row in the synthetic dataset.",
        injuries: "Not applicable",
      };

  // --- suspects (real accused persons; riskScore/status have no synthetic
  // backing — see file header) ---
  const suspects: LegacySuspect[] = kase.persons
    .filter((p) => p.role === "accused" && p.caseMasterIds.includes(fir.caseMasterId))
    .map((p) => ({
      id: p.id,
      name: p.name,
      alias: p.aliasNames?.[0] ?? "",
      age: p.age ?? 0,
      gender: p.gender ?? "Not specified",
      // No risk-scoring model exists yet (deferred to the Investigation
      // Health / risk derivation phase) — 0 is a placeholder, not a claim.
      riskScore: 0,
      // No arrest/custody record exists anywhere in the synthetic dataset
      // (ArrestSurrender is documented as not-yet-built) — this is an
      // honest "not recorded" label passed through the legacy status union.
      status: "Not Recorded" as LegacySuspect["status"],
      description: p.aliasNames?.length
        ? `Named accused on this case. Also recorded as: ${p.aliasNames.join(", ")}.`
        : "Named accused on this case.",
    }));

  // --- witnesses (real witness statements; reliability has no synthetic backing) ---
  const witnessPersons = kase.persons.filter((p) => p.role === "witness");
  const witnesses: LegacyWitness[] = witnessPersons.map((p) => {
    const statements = kase.witnessStatements.filter((s) => s.witnessPersonId === p.id);
    return {
      id: p.id,
      name: p.name,
      statement: statements.length
        ? statements.map((s) => s.statementText).join(" / ")
        : "No statement text on record.",
      // No reliability assessment exists in the synthetic dataset.
      reliability: "Not Assessed" as LegacyWitness["reliability"],
    };
  });

  // --- evidence (real; "Financial Transaction" has no home in the legacy
  // union — cast through with its correct real label rather than mislabel
  // it as one of the legacy categories that don't apply) ---
  const evidence: LegacyEvidenceItem[] = kase.evidence.map((e) => ({
    id: e.id,
    type: e.type as LegacyEvidenceItem["type"],
    title: e.title,
    description: e.description || "No description recorded.",
    date: splitDateTime(e.timestamp).date,
    relatedIds: e.relatedPersonIds,
  }));

  // --- investigation notes / case diary (real, derived in Step 1 from the
  // scenario's own timeline — spans the whole scenario, not just this FIR,
  // since the diary documents one connected investigation) ---
  const investigationNotes = kase.diaryEntries
    .slice()
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
    .map((d) => ({
      date: d.date,
      note: d.observation,
      // d.officer is a Person id (e.g. "IO-5004"), not a display name —
      // resolve it via personName(), same fix as adaptToInvestigation.ts.
      officer: personName(kase, d.officer) ?? personName(kase, fir.ioPersonId) ?? "Not recorded",
    }));

  // --- AI analysis (only fields with real backing are populated; the
  // rest are honest empty states — no invented risk score, pattern
  // analysis, or insight beyond what the scenario's own contradiction
  // record actually says) ---
  const aiAnalysis: LegacyAIInsight = {
    modusOperandi: kase.summary,
    patternAnalysis: [],
    similarCases: [], // Related Cases derivation is a later, separately-scoped phase
    keySuspectIds: suspects.map((s) => s.id),
    riskScore: 0, // see suspects[].riskScore comment above
    insights: kase.contradictions.map((c) => c.description),
    recommendedActions: kase.contradictions.map((c) => c.suggestedNextQuestion),
  };

  return {
    caseId: String(fir.caseMasterId),
    caseType: fir.crimeTypeName ?? "Not recorded",
    district: fir.districtName ?? "Not recorded",
    status: fir.caseStatusName ?? "Not recorded",
    cover: {
      firNumber: fir.crimeNo,
      title: kase.title,
      dateFiled: fir.crimeRegisteredDate,
      officerInCharge: personName(kase, fir.ioPersonId) ?? "Not recorded",
      policeStation: fir.policeStationName ?? "Not recorded",
      sections: fir.sections,
    },
    incidentSummary: {
      date: incidentDate,
      time: incidentTime,
      location: scene?.location ?? fir.districtName ?? "Not recorded",
      narrative: fir.briefFacts,
      complainant: complainant?.name ?? "Not recorded",
    },
    crimeScene: {
      location: scene?.location ?? fir.districtName ?? "Not recorded",
      description: scene?.briefFacts ?? fir.briefFacts,
      itemsRecovered: [], // no items-recovered record exists in the synthetic dataset
      sceneNotes: "No additional scene notes recorded in the synthetic dataset.",
    },
    victim,
    suspects,
    witnesses,
    evidence,
    investigationNotes,
    aiAnalysis,
    similarCases: [], // see aiAnalysis.similarCases comment
    finalReport: {
      summary: "Final investigation report not yet available for this synthetic case.",
      conclusion: "Not available.",
      recommendation: "Not available.",
      status: fir.caseStatusName ?? "Not recorded",
      officer: personName(kase, fir.ioPersonId) ?? "Not recorded",
      date: "",
    },
  };
}
