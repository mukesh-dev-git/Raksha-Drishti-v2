# Raksha-Drishti — execution plan

The **what and when**. The *why* behind every decision here lives in
[`RESEARCH_AND_PLAN.md`](RESEARCH_AND_PLAN.md) — don't duplicate reasoning
into this file, link to it.

**Legend:** `[ ]` todo · `[~]` in progress · `[x]` done · 🚧 blocked

**Guiding principle:** we are building for the **SCRB** (see
`RESEARCH_AND_PLAN.md` §1.2). The statewide intelligence view is the product;
district and station views exist to feed it. Four of the PS's six capabilities
are blocked on **data**, not on AI — so the seed comes before the models.

---

## Ordering, and why

```
P0  Credibility        no deps        ── start here, half a day
P1  Data foundation    no deps        ── unblocks P3, P4, P5
P2  Route restructure  🚧 PR #1       ── highest risk, needs PR #1 resolved
P3  Person spine       needs P1.1     ── the missing entity
P4  Real analytics     needs P1.3/1.4 ── 4 of 6 PS asks land here
P5  AI features        🚧 API + P3    ── the differentiator
P6  Zia                gated on C1    ── only if we get images
```

P0 and P1 can run in parallel — different files, different people.

---

## P0 — Stop over-promising  ✅ done (`c349d48`, `db5b1bd`)

*Half a day. Biggest credibility gain per hour available. No dependencies.*

- [x] **P0.1** Remove the 10 login-bypass links from Home (5 in
      `HomeHeader.tsx`, 5 in `FeatureGrid.tsx`). Sign-in + scope becomes the
      only way in.
      *Done when:* `/` offers exactly one forward action, and the feature grid
      either describes capabilities without linking or is cut.
- [x] **P0.2** Delete the 12 dead sidebar items in `DashboardSidebar.tsx`
      rather than labelling them "Soon". A 5-item sidebar where everything
      works reads finished; a 15-item one where 3 work reads abandoned.
      *Done when:* every visible nav item navigates somewhere real.
- [x] **P0.3** Make the maps responsive — replace `h-[80vh]` in
      `MapEmbed.tsx` with an aspect-ratio box, and give the in-iframe controls
      a compact layout under 768px.
      *Done when:* usable at 375px wide without horizontal scroll.
- [x] **P0.4** Reframe Dashboard copy so statewide reads as the SCRB
      intelligence view, not "the other option next to district."
- [x] **P0.5** Demote district from a login-time **role** to a drill-down
      **filter** (`/dashboard?district=`). The PS asks for SCRB to drill into
      districts, not for district officers to get restricted logins — and
      with no real auth, a self-selected jurisdiction implied an access
      boundary we don't have. Deleted `viewScope.ts`, `viewScope.server.ts`,
      `ViewScopeSwitcher.tsx` and the login scope picker; added
      `DistrictFilter.tsx`. Net −77 lines. (`db5b1bd`)

## P1 — Data foundation (Track D)

*The seed generator is the problem, not the rows. Fix the generator, verify
locally, then wipe + re-import **once**. See `RESEARCH_AND_PLAN.md` §5.*

- [x] **P1.1** ~~Make `Accused.PersonID` globally unique and stable~~ — done.
      `A1`…`A4` (which made 17 different people share one ID) are now the
      global register handles `KA-P0001`…`KA-P0047`: 47 people across 53
      `Accused` rows, 6 of them spanning 2+ cases with their alias spellings
      kept intact. Scope grew once in flight: the evidence layer's
      `resolvedPersons` map was keyed `A1`…`A4` while every call/CCTV/
      statement/timeline record cites `P1`…`P4`, so **0 of 47 person
      citations resolved** — the citation-grounding P5.6 depends on was dead.
      Each scenario now carries a `personIndex` bridging token → global ID;
      **107/107 citations resolve.** See `RESEARCH_AND_PLAN.md` §5.3(a)+(a2).
      ⚠️ The live Data Store still holds the old `A1`-style values — the
      re-import is deliberately deferred to **P1.6** so the wipe happens once.
- [ ] **P1.2** Merge the two seeds into one generator: broad (hundreds of
      cases, so statistics mean something) **and** deep (the 15 authored
      scenarios with full evidence). Port `ChargesheetDetails` from
      `catalyst/seed/`.
      *Done when:* `CaseMaster` ≳ 400 rows, the 15 scenarios still resolve.
- [ ] **P1.3** Populate `latitude`/`longitude` with real per-incident coords
      inside the correct district.
- [ ] **P1.4** Give `IncidentFromDate` a realistic **time-of-day**
      distribution per crime type. Unlocks the PS's spatiotemporal ask.
- [ ] **P1.5** Populate `OccupationID`/`ReligionID`/`CasteID` + build the 3
      lookup tables. **Framing agreed first** — victim/complainant
      demographics with explicit denominators, never offender propensity.
- [ ] **P1.6** Wipe the Data Store and re-import cleanly. Record row counts in
      `catalyst/README.md`.

## P2 — Route restructure 🚧

*Blocked: collides head-on with the open Investigation Module PR, which
rewrites the same workspace. **Land or close that PR first.***

- [ ] **P2.0** 🚧 Resolve PR #1 — merge it or close it.
- [ ] **P2.1** Move the workspace to `/cases/[caseId]`. Crime type and
      district become **query filters** on `/cases`, not path segments.
- [ ] **P2.2** Keep old URLs 301-redirecting so nothing already demoed 404s.
- [ ] **P2.3** Rebuild `/dashboard` as an attention list — alerts and
      anomalies first, totals demoted to a strip.

## P3 — The person spine

*Needs P1.1. This is the single highest-value addition in the whole plan:
it's the PS's "impossible in Excel" claim made literal, and every AI feature
reasons over it.*

- [ ] **P3.1** Entity fusion — union-find over `Accused`/`Victim`/
      `ComplainantDetails` + NoSQL persons → one canonical person.
      **Deterministic code, no LLM.**
- [ ] **P3.2** `/persons` index + `/persons/[personId]` profile: every case
      they touch, cross-case timeline, MO.
- [ ] **P3.3** Cross-source timeline merge — one ordered timeline per person,
      each event tagged with the source that reported it.

## P4 — Real analytics (4 of the 6 PS asks)

*Needs P1.3 / P1.4. None of this needs an LLM.*

- [ ] **P4.1** Hotspot map on real `latitude`/`longitude`.
- [ ] **P4.2** Spatiotemporal clustering — time-of-day × location.
- [ ] **P4.3** Emerging-trend alerts: flag a category spiking in a region
      against its own historical baseline.
- [ ] **P4.4** Chargesheet rate + time-to-chargesheet from
      `ChargesheetDetails`; Heinous/Non-Heinous split from `GravityOffenceID`.
- [ ] **P4.5** Socio-economic correlation view (gated on P1.5's framing).

## P5 — AI 🚧

*Blocked on P5.0. Model: GLM-4.7-Flash (200K ctx, native tool calling).*

- [ ] **P5.0** 🚧 **Get the real LLM Serving API contract** from the Catalyst
      console (Generative AI → LLM Serving → Model Details → API Details) and
      paste endpoint + headers + request/response schema into
      `RESEARCH_AND_PLAN.md` §2.2. **Nobody writes client code before this.**
- [ ] **P5.1** `src/lib/llm.ts` — server-side-only GLM client. Typed, timeout,
      graceful fallback, every call logged with prompt + response.
- [ ] **P5.2** Contradiction detector over a fused person's timeline, via tool
      calling, returning `{claim, conflictingClaim, sourceRecordIds[],
      confidence}`.
- [ ] **P5.3** **Evaluate P5.2 against the 15 authored contradictions** in
      `Contradictions.json` — they're our ground truth. Report the real hit
      rate *including misses*.
- [ ] **P5.4** "Next question to ask" — phrasing layer on P5.2's output.
- [ ] **P5.5** Suspicion score — deterministic weighted signals feed the
      existing `RiskGauge`; the LLM writes only the explanation, never the
      number.
- [ ] **P5.6** Citation guardrail enforced **in the tool schema**: no finding
      renders without a real record ID.

## P6 — Zia (gated)

- [ ] **P6.0** Decide: do we generate synthetic case-document scans / CCTV
      stills at all? **If no, close P6 and say so.**
- [ ] **P6.1** OCR a scanned FIR → text → GLM structuring. Good demo of
      "paper record → queryable intelligence."
- [ ] **P6.2** Qwen-VL on a CCTV still, cross-checked against the
      `CCTVSightings` record.
- [ ] **P6.3** Zia NER on `BriefFacts` as a cheap cross-check on P3.1.

**Explicitly not building:** sentiment analysis on crime complaints (not a
policing signal), face recognition, barcode scanning.

## Cross-cutting

- [ ] **X1** Add the 7 Ranges as coarser options in the district drill-down
      filter (`DistrictFilter.tsx`), each resolving to its 3–6 districts;
      generalise `scenarioInDistrict()` to a district-**set** test. A Range
      IGP is a real rank, and this is a filter option now, not a third role.
      (`RESEARCH_AND_PLAN.md` §1.4a)
- [ ] **X2** Document the commissionerate-vs-district modeling shortcut in
      `DATA_STORE_SCHEMA.md`. (§1.4c)
- [x] **X3** ~~CID assignment derived from district count~~ — fixed, commit
      `38853d5`. (§1.4b)

---

## Decisions still open

1. **PR #1 — merge or close?** Gates all of P2.
2. **P1.5 framing** — agree the caste/religion presentation before building it.
3. **P6.0** — images, yes or no?
4. **Show the P5.3 eval in the UI?** "Found 11 of 15, here are the 4 it
   missed" is a far stronger claim to a panel than a silent AI panel.
      *Recommend yes.*
5. **Real Catalyst Auth?** Resolved in part by P0.5 — there is no scope cookie
   any more, so nothing pretends to be access control. If per-officer views are
   ever wanted, they need real Catalyst Authentication first, and the district
   would come from the signed-in identity rather than a dropdown.
