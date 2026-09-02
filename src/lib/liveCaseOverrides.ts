// -----------------------------------------------------------------------------
// P10 Phase 2 (2026-09-02) - the fix for the exact gap flagged this session:
// a write to CaseMaster (status, officer) succeeded against the live Data
// Store and then stayed invisible everywhere, because /cases/[caseId] reads
// only the bundled snapshot (caseWorklist.ts -> caseFacts.json, compiled at
// build time).
//
// Deliberately narrow, not a rewrite of the page's data model: fetches ONLY
// the columns this app can actually write (CaseStatusID, PolicePersonID -
// the same two P2.4 already wired PATCH endpoints for), by exact
// CaseMasterID, and returns them to be merged OVER the bundled WorklistCase
// - not instead of it. Everything else on the page (evidence, contradictions,
// cross-source timeline, relationship graph, scenario narrative) stays
// exactly as it was: those come from the hand-authored NoSQL evidence
// collections, which are a genuinely separate concern from this table's CRUD
// (see PLAN.md P10 for why bulk cases have no evidence layer by design, and
// why that makes this split clean rather than arbitrary).
//
// Single-row lookup by exact CaseMasterID - no pagination problem, no
// zcqlAll(), no aggregate needed. Cheap enough to call on every case-detail
// render.
//
// CANNOT be tested locally - same constraint as every other live Data Store
// call in this app: `catalyst.initialize()` needs a real Slate request
// context. Falls back to `null` (caller uses the bundled value, unchanged
// behaviour) on ANY failure - local dev, a genuine network error, whatever -
// same honest-degradation pattern src/lib/api.ts's getSummary() already
// uses. This function must never make a page fail to render; at worst it
// makes one page briefly show a stale value, exactly the existing (known,
// documented) gap - not a new failure mode.
// -----------------------------------------------------------------------------
import { headers } from "next/headers";
import { zcql, pick } from "./zcql";
import { isCaseStatusId, type CaseStatusId } from "./caseStatus";

export type LiveCaseOverrides = {
  statusId: CaseStatusId;
  policePersonId: number | null;
};

export async function getLiveCaseOverrides(caseMasterId: number): Promise<LiveCaseOverrides | null> {
  try {
    const h = await headers();
    const rows = await zcql(
      { headers: h },
      `SELECT CaseStatusID, PolicePersonID FROM CaseMaster WHERE CaseMasterID = ${caseMasterId}`
    );
    if (!rows.length) return null; // not found live - stay on the bundled value, don't 404 a page that otherwise renders fine
    const cols = pick(rows[0], "CaseMaster");
    const rawStatus = Number(cols.CaseStatusID);
    if (!isCaseStatusId(rawStatus)) return null; // unexpected shape - don't trust it, fall back
    const rawOfficer = Number(cols.PolicePersonID);
    return {
      statusId: rawStatus,
      policePersonId: Number.isFinite(rawOfficer) ? rawOfficer : null,
    };
  } catch (e) {
    // Expected locally (no Catalyst request context) - log for the live
    // case (a genuine failure worth knowing about) without ever throwing.
    console.warn("[liveCaseOverrides] live fetch failed - falling back to bundled data", e);
    return null;
  }
}
