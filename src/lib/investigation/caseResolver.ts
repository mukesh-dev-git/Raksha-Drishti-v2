// -----------------------------------------------------------------------------
// caseResolver — bridges the app's existing (caseType, district, caseId?)
// URL scheme onto the synthetic seeded development dataset's real FIRs and
// scenarios. Pure lookup logic — no fabrication, no RNG, no database access.
//
//   caseType + district + optional caseId
//                 |
//                 v
//   real FIR / scenario mapping (derived from normalizeInvestigationCase()
//   across all 15 scenarios — the same normalization Step 1 verified, not a
//   second, parallel derivation)
//                 |
//         0 matches -> unavailable
//         1+ matches, no caseId -> "ok", full match list preserved,
//                                   deterministic primary = lowest CaseMasterID
//         caseId supplied, matches one of the real FIRs for this pair
//                                -> "ok", primary = exactly that FIR
//         caseId supplied, does NOT match any real FIR for this pair
//                                -> "unavailable" (never silently substituted)
//
// caseType/district slugs are resolved against the existing src/lib/data.ts
// tables (already the documented FK bridge to CrimeSubHeadID/DistrictID —
// see that file's own comments), not a second, duplicate slug table.
// -----------------------------------------------------------------------------

import { getCaseType, getDistrict, type CaseFile } from "@/lib/data";
import { getScenarioIds } from "./seedData";
import { normalizeInvestigationCase } from "./normalize";
import type { InvestigationCase } from "./model";

export interface ResolvedFir {
  scenarioId: string;
  caseMasterId: number;
}

export type CaseResolution =
  | { status: "unavailable" }
  | { status: "ok"; matches: ResolvedFir[]; primary: ResolvedFir };

export interface CaseLookupResult {
  status: "ok" | "unavailable";
  investigationCase?: InvestigationCase;
  /** The FIR this lookup resolved to — the one a case-file view should feature. */
  primaryFirCaseMasterId?: number;
  /** Every real FIR matching this (caseType, district) pair, for callers that need the full list (e.g. a case-files listing). */
  matchingFirCaseMasterIds?: number[];
}

// --- FIR index ----------------------------------------------------------------
// Built once, from the same normalizeInvestigationCase() Step 1 verified —
// not a second parallel derivation of district/crime-type-per-FIR.

interface FirIndexEntry {
  scenarioId: string;
  caseMasterId: number;
  crimeMinorHeadId: number;
  districtId: number;
}

let _firIndex: FirIndexEntry[] | null = null;

function getFirIndex(): FirIndexEntry[] {
  if (_firIndex) return _firIndex;
  const entries: FirIndexEntry[] = [];
  for (const scenarioId of getScenarioIds()) {
    const kase = normalizeInvestigationCase(scenarioId);
    if (!kase) continue; // defensive; getScenarioIds() only returns real ids
    for (const fir of kase.firs) {
      entries.push({
        scenarioId,
        caseMasterId: fir.caseMasterId,
        crimeMinorHeadId: fir.crimeMinorHeadId,
        districtId: fir.districtId,
      });
    }
  }
  _firIndex = entries;
  return entries;
}

/** Every real FIR matching this (caseType, district) pair, sorted deterministically (ascending CaseMasterID) — never shuffled, never truncated silently. */
export function resolveFirsForPair(caseTypeSlug: string, districtSlug: string): ResolvedFir[] {
  const ct = getCaseType(caseTypeSlug);
  const d = getDistrict(districtSlug);
  if (!ct || !d) return [];
  return getFirIndex()
    .filter((e) => e.crimeMinorHeadId === ct.dbId && e.districtId === d.dbId)
    .sort((a, b) => a.caseMasterId - b.caseMasterId)
    .map((e) => ({ scenarioId: e.scenarioId, caseMasterId: e.caseMasterId }));
}

/**
 * Resolves (caseType, district, caseId?) to a CaseResolution.
 *   - No real FIRs for this pair -> "unavailable".
 *   - caseId omitted -> "ok" with the complete match list (workspace-level
 *     use), primary deterministically the lowest CaseMasterID — documented
 *     default, not a random pick.
 *   - caseId supplied -> must match one of this pair's real FIRs exactly
 *     (compared as the FIR's own CaseMasterID, e.g. "9005"); an unmatched
 *     caseId is "unavailable", never silently resolved to a different FIR.
 */
export function resolveCase(caseTypeSlug: string, districtSlug: string, caseId?: string): CaseResolution {
  const matches = resolveFirsForPair(caseTypeSlug, districtSlug);
  if (matches.length === 0) return { status: "unavailable" };

  if (caseId === undefined) {
    return { status: "ok", matches, primary: matches[0] };
  }

  const requested = matches.find((m) => String(m.caseMasterId) === caseId);
  if (!requested) return { status: "unavailable" };
  return { status: "ok", matches, primary: requested };
}

/**
 * Full lookup: resolves the case, then normalizes the primary FIR's home
 * scenario via normalizeInvestigationCase() (Step 1's verified path — no
 * RNG, no fabrication). Returns "unavailable" without building anything if
 * resolution fails, at any stage — never a fabricated substitute.
 */
/**
 * Real case files (id/title/status) for a (caseType, district) pair, in the
 * exact CaseFile shape src/lib/data.ts already defines — so existing list
 * components (CaseFilesListClient) and the workspace's "Open Case Files"
 * section can render them unchanged. Replaces the old fake 3-item
 * `caseFiles` list with the real matching FIRs — this is what fixes the
 * dead-end 404: clicking one of these ids now always resolves via
 * resolveCase() above, because these ARE the ids it resolves against.
 */
export function listCasesForPair(caseTypeSlug: string, districtSlug: string): CaseFile[] {
  return resolveFirsForPair(caseTypeSlug, districtSlug).map((m) => {
    const kase = normalizeInvestigationCase(m.scenarioId);
    const fir = kase?.firs.find((f) => f.caseMasterId === m.caseMasterId);
    return {
      id: String(m.caseMasterId),
      title: kase ? `${kase.title} — ${fir?.crimeNo ?? m.caseMasterId}` : String(m.caseMasterId),
      status: fir?.caseStatusName ?? "Not recorded",
    };
  });
}

export function resolveInvestigationCase(caseTypeSlug: string, districtSlug: string, caseId?: string): CaseLookupResult {
  const resolution = resolveCase(caseTypeSlug, districtSlug, caseId);
  if (resolution.status === "unavailable") return { status: "unavailable" };

  const investigationCase = normalizeInvestigationCase(resolution.primary.scenarioId);
  if (!investigationCase) return { status: "unavailable" }; // defensive; shouldn't happen given the index is itself built from normalize()

  return {
    status: "ok",
    investigationCase,
    primaryFirCaseMasterId: resolution.primary.caseMasterId,
    matchingFirCaseMasterIds: resolution.matches.map((m) => m.caseMasterId),
  };
}
