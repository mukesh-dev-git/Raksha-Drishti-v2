# Production build-out plan — live data, auth, CRUD

Confirmed direction (2026-08-22): Data Store + NoSQL in Catalyst, no direct
client-side DB access (Web SDK could technically do it, but skipped —
unauthenticated raw writes to a police FIR system are a real risk, and
`rd_api`-mediated writes give validation + audit trail, which is also the
more credible thing to show a jury). CRUD goes through `rd_api`, gated by
Catalyst Authentication, with the frontend switched to client-side fetching
so edits reflect live without a rebuild.

## Phase 1 — Data pipeline (this session, automatable by Claude)
1. `catalyst/dataset-v2/build_seed.py` — reads `lookups.json` + `cases.json`,
   emits: one CSV per Data Store table (exact column headers, matching the
   already-verified live schema), one JSON file per new NoSQL collection
   (`CallRecords`, `Transactions`, `CCTVSightings`, `WitnessStatements`,
   `TimelineEvents`, `Contradictions`).
2. Run it, sanity-check row counts and headers against `DATA_STORE_SCHEMA.md`.
3. `catalyst ds:import --table <Name> <csv>` for each of the 15 Data Store
   tables that have rows, in the documented parent-before-child order.
4. Verify via `ds:export` query (same method used to verify `CaseMaster`'s
   schema earlier) — spot-check a few tables' actual row content, not just
   row counts.

## Phase 2 — rd_api CRUD extension (this session, automatable by Claude)
5. Add `Datastore`/ZCQL insert/update/delete to `functions/rd_api/index.js`:
   `POST/PUT/DELETE /cases`, `/accused`, `/victims`, `/complainants` (today
   it's `GET`-only). Use `@zcatalyst/datastore`'s `insertRow`/`updateRow`/
   `deleteRow` (confirmed available in the already-installed
   `zcatalyst-sdk-node`).
6. Basic input validation (required fields, FK existence checks) before
   any write.
7. Audit log — every write appends to a new `AuditLog` NoSQL collection
   (who, when, what changed, before/after) rather than mutating silently.
8. Redeploy `rd_api`, verify each new endpoint with a real request.

## Phase 3 — Auth (needs the user — console access)
9. Enable Catalyst Authentication in the `Raksha-Dhrishti-v2` console
   (manual, console-only, like schema creation).
10. Build with `NEXT_PUBLIC_RD_AUTH=on`; confirm `AuthGate.tsx` actually
    gates the app.
11. `rd_api`'s write endpoints reject unauthenticated requests — read
    the Catalyst-injected user context, not a client-supplied identity.

## Phase 4 — Live client-side CRUD UI (this session, automatable by Claude,
## but design choices worth showing the user before wiring broadly)
12. Convert the pages that need live data (case files, investigation
    workspace, district-wise) to client-side fetching — data-fetch moves
    from the Server Component's build-time `fetch` into a `"use client"`
    hook, calling `rd_api` at view time. Static export is fully compatible
    with this; only *build-time* fetches are frozen.
13. Add edit/delete UI (forms, confirm dialogs) wired to the Phase 2
    endpoints, replacing the current read-only display of bundled/mock data
    on those specific screens.
14. End-to-end check: create/edit/delete a case in the UI, confirm it's
    reflected immediately without a rebuild, and shows up in `AuditLog`.

## What Claude can't do unattended
- Phase 3 step 9 (enabling Authentication) is a console action on the
  user's Zoho account — needs the user, same as every other schema/console
  step so far.
- Phase 4's UI/UX shape (what an edit form looks like, what's deletable by
  whom) is worth a quick confirm before building broadly, even though the
  mechanics are automatable.

**Starting now: Phase 1.**
