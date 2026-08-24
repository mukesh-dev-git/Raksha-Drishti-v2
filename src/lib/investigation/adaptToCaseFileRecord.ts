// -----------------------------------------------------------------------------
// adaptToCaseFileRecord — the structured "single record" view for the Case
// Files tab: Case/FIR Details, Legal Details, Persons, Investigation Record
// (condensed), Evidence (register + custody), Supporting Information (crime
// scene, forensics, search & seizure, related cases).
//
// Reuses the existing adaptToInvestigation() and adaptToTimelineDetail()
// adapters for the Investigation Record section rather than re-deriving
// activities/diary/timeline a second time — this file only condenses their
// output and adds the Case/Legal/Persons/Evidence/Supporting sections that
// don't exist elsewhere yet. No RNG, no fabrication: every field is DIRECT,
// a documented DERIVED lookup, or an explicit "not available" absence.
// -----------------------------------------------------------------------------
import type { InvestigationCase, FIRSummary, PersonRole } from "./model";
import { adaptToInvestigation } from "./adaptToInvestigation";
import { adaptToTimelineDetail, type TimelineDetailEvent } from "./adaptToTimeline";

export interface CaseFilePersonRow {
  id: string;
  name: string;
  age?: number;
  gender?: string;
  extra?: string; // occupation / designation, when present
}

export interface CaseFileEvidenceRow {
  id: string;
  type: string;
  title: string;
  date: string;
  linkedPeople: { id: string; name: string }[];
}

export interface CaseFileRecordData {
  caseIdentity: {
    firNumber: string;
    caseTitle: string;
    crimeType: string;
    policeStation: string;
    district: string;
    dateFiled: string;
    incidentDate: string;
    incidentTime: string;
    status: string;
  };
  legal: {
    sections: string[];
    caseCategory: string;
    gravityOffence: string;
  };
  persons: Record<Exclude<PersonRole, never>, CaseFilePersonRow[]>;
  investigation: {
    activityCount: number;
    diaryCount: number;
    timelineCount: number;
    pendingCount: number;
    recentTimeline: TimelineDetailEvent[];
  };
  evidence: {
    register: CaseFileEvidenceRow[];
    custodyAvailable: boolean;
  };
  supporting: {
    crimeScene: { location: string; briefFacts: string; hasCoordinates: boolean } | null;
    forensicsAvailable: boolean;
    searchSeizureAvailable: boolean;
    relatedCasesAvailable: boolean;
  };
}

function personRow(p: InvestigationCase["persons"][number]): CaseFilePersonRow {
  return {
    id: p.id,
    name: p.name,
    age: p.age,
    gender: p.gender,
    extra: p.occupation ?? p.designation,
  };
}

export function adaptToCaseFileRecord(kase: InvestigationCase, firCaseMasterId: number): CaseFileRecordData {
  const fir: FIRSummary = kase.firs.find((f) => f.caseMasterId === firCaseMasterId) ?? kase.firs[0];
  const scene = kase.crimeScenes.find((s) => s.firCaseMasterId === fir.caseMasterId);

  const personsForFir = kase.persons.filter((p) => p.caseMasterIds.includes(fir.caseMasterId));
  const byRole = (role: PersonRole) => personsForFir.filter((p) => p.role === role).map(personRow);

  const inv = adaptToInvestigation(kase, firCaseMasterId);
  const timelineDetail = adaptToTimelineDetail(kase);

  const evidenceForCase = kase.evidence; // scenario-wide, matches how evidence/timeline already span the connected investigation elsewhere in this module
  const register: CaseFileEvidenceRow[] = evidenceForCase.map((e) => ({
    id: e.id,
    type: e.type,
    title: e.title,
    date: e.timestamp.split("T")[0] ?? e.timestamp,
    linkedPeople: e.relatedPersonIds
      .map((id) => kase.persons.find((p) => p.id === id))
      .filter((p): p is NonNullable<typeof p> => !!p)
      .map((p) => ({ id: p.id, name: p.name })),
  }));

  return {
    caseIdentity: {
      firNumber: fir.crimeNo,
      caseTitle: kase.title,
      crimeType: fir.crimeTypeName ?? "Not available in current records",
      policeStation: fir.policeStationName ?? "Not available in current records",
      district: fir.districtName ?? "Not available in current records",
      dateFiled: fir.crimeRegisteredDate,
      incidentDate: fir.incidentFromDate.split("T")[0] ?? fir.incidentFromDate,
      incidentTime: fir.incidentFromDate.split("T")[1]?.slice(0, 5) ?? "",
      status: fir.caseStatusName ?? "Not available in current records",
    },
    legal: {
      sections: fir.sections,
      caseCategory: fir.caseCategoryName ?? "Not available in current records",
      gravityOffence: fir.gravityOffenceName ?? "Not available in current records",
    },
    persons: {
      complainant: byRole("complainant"),
      victim: byRole("victim"),
      accused: byRole("accused"),
      witness: byRole("witness"),
      io: byRole("io"),
    } as Record<Exclude<PersonRole, never>, CaseFilePersonRow[]>,
    investigation: {
      activityCount: inv.activities.length,
      diaryCount: inv.diary.length,
      timelineCount: timelineDetail.length,
      pendingCount: inv.tasks.length + inv.gaps.length,
      recentTimeline: timelineDetail.slice(-3).reverse(),
    },
    evidence: {
      register,
      custodyAvailable: kase.custodyEvents.length > 0,
    },
    supporting: {
      crimeScene: scene
        ? { location: scene.location, briefFacts: scene.briefFacts, hasCoordinates: scene.latitude !== undefined && scene.longitude !== undefined }
        : null,
      forensicsAvailable: kase.forensicRequests.length > 0,
      searchSeizureAvailable: kase.searchSeizures.length > 0,
      relatedCasesAvailable: kase.relatedCaseIds.length > 0,
    },
  };
}
