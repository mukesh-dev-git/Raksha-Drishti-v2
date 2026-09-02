// -----------------------------------------------------------------------------
// P10 Phase 4 (2026-09-02) - caseDetailLink() extracted out of
// caseWorklist.ts into its own zero-dependency file.
//
// Why: caseWorklist.ts now imports liveCaseFacts.ts, which imports
// `next/headers` (server-only). CaseWorklistClient.tsx is a Client
// Component and previously imported `caseDetailLink` (a real value, not
// just the `WorklistCase` type) straight from caseWorklist.ts - a mixed
// type+value import pulls the WHOLE module's runtime code into the client
// bundle regardless of the `type` keyword on the other specifier, which
// broke the build ("You're importing a component that needs next/headers" -
// the App Router client-bundle equivalent of that rule). This function is
// trivial and has no server-only dependency, so it belongs in its own file
// rather than dragging the rest of caseWorklist.ts's live-fetch machinery
// along with it.
//
// caseWorklist.ts still re-exports this (see its own import line) so every
// existing SERVER-side caller keeps working unchanged; only
// CaseWorklistClient.tsx needed to switch its import to point here directly.
// -----------------------------------------------------------------------------
export function caseDetailLink(caseMasterId: number): string {
  return `/cases/${caseMasterId}`;
}
