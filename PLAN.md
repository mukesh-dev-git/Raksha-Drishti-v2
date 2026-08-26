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

## Where the work stands

*Last swept 2026-08-25.*

| Track | State | Where it's at |
|---|---|---|
| **P0** Credibility | ✅ **done** | All 5. App no longer promises what it can't do. |
| **P1** Data foundation | 🔵 **in progress** | P1.1 ✅ · P1.3 ✅ · P1.4 `[~]` built, not applied · **P1.2 is next** · P1.5 needs a decision · P1.6 last |
| **P2** Route restructure | 🚧 **blocked** | PR #1 unresolved. Nothing here can start. |
| **P3** Person spine | ⚪ **ready** | Unblocked by P1.1. Nothing else in its way. |
| **P4** Real analytics | ⚪ **waiting on P1.2** | Needs case volume before a hotspot or a trend means anything. |
| **P5** AI | 🔵 **in progress** | P5.0 ✅ · P5.1 ✅ — GLM client works end-to-end. **P5.2 is next.** |
| **P6** Zia | 🚧 **gated** | Needs the P6.0 yes/no on generating images. |
| **P7** Kannada voice (Zia) | ⚪ **ready** | Not gated like P6 - P7.1 can start from data we already have. |
| **X** Cross-cutting | 🔵 | X3 ✅ · X1, X2 open |

**Done so far:** P0.1–P0.5 · P1.1 · P1.3 · P5.0 · P5.1 · X3

**Ready to pick up right now, no decisions needed:** **P1.2** (then P1.6) ·
P3.1–P3.3 · P5.2 · P7.1 · X1 · X2

**Blocked on someone, not on effort:**

| Blocked | Needs |
|---|---|
| All of P2 | **PR #1 — merge or close** |
| ~~All of P5~~ | ~~a working access token~~ — **unblocked**, `src/lib/llm.ts` verified live |
| All of P6 | **P6.0 — do we generate images at all?** "No" closes the track cleanly |
| P1.5, P4.5 | **Agreement on the caste/religion framing** before anything is built |

**The honest read on P4:** it's the biggest remaining prize — 4 of the PS's 6
capabilities — and it is *not* blocked on AI or on anyone's decision. It is
blocked on **P1.2**, because 19 cases across 8 districts cannot show a
hotspot, a trend, or a time-of-day distribution. P1.2 is the highest-value
unblocked work in the plan. Note also that P4.1 is larger than "plot the
coords": the map today is 16 hardcoded Bengaluru localities with crime types
that don't exist in the 4-type schema, and **nothing in `src/` reads
`latitude`/`longitude` at all** — so it's a rewrite to read the Data Store,
not a data swap.

---

## Ordering, and why

```
P0  Credibility        ✅ done
P1  Data foundation    🔵 P1.1/P1.3 done ── P1.2 is the next real unlock
P2  Route restructure  🚧 PR #1       ── highest risk, needs PR #1 resolved
P3  Person spine       ⚪ ready       ── P1.1 unblocked it
P4  Real analytics     ⚪ needs P1.2  ── 4 of 6 PS asks land here
P5  AI features        🔵 P5.0/P5.1 done ── P5.2 is the next real unlock
P6  Zia                🚧 gated on P6.0 ── only if we get images
P7  Kannada voice       ⚪ ready       ── not gated like P6, can start now
```

P0 and P1 can run in parallel — different files, different people.

---

## P0 — Stop over-promising  ✅ done (`c349d48`, `db5b1bd`)

*Half a day. Biggest credibility gain per hour available. No dependencies.*

- [x] **P0.1** Remove the login-bypass links from Home. Sign-in becomes the
      only way in.
      *Done when:* `/` offers exactly one forward action, and the feature grid
      either describes capabilities without linking or is cut.
      *Actually removed:* **11 on Home** — 4 in `HomeHeader`'s nav, 5
      `FeatureGrid` cards, 2 `HomeHero` CTAs — **plus 4 more** found during
      in-browser verification in `SiteFooter`'s Quick links, which renders on
      Home *and* every `(site)` page (so it took a `quickLinks` prop rather
      than losing the column everywhere). This item originally said "10 (5 in
      `HomeHeader`, 5 in `FeatureGrid`)"; that was an estimate written before
      the work and never corrected. See `c349d48`.
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
- [x] **P1.3** ~~Populate `latitude`/`longitude` with real per-incident coords
      inside the correct district~~ — done. The defect was narrower than
      "no real coords": the coords were real, but **reused** — 5 station
      centroids each served 2 cases, so 19 FIRs occupied 14 points, and
      identical points are indistinguishable on a map at any zoom. Now 19/19
      distinct, each anchored on its authored location (max drift 1.0km) so
      C1 stays in Yeshwanthpur and C8 in Whitefield. New
      `catalyst/dataset-v2/geo_time.mjs` holds real locality tables for all
      13 stations; `placeIncident()` is the reusable generator P1.2 calls for
      bulk cases.
- [~] **P1.4** Time-of-day. **Profiles built and calibrated**
      (`incidentHour()` in `geo_time.mjs`, per crime type) — but there was
      nothing to fill on the authored 15: of 19 FIRs, 11 already have
      realistic hand-authored times (9 fit the profiles), 7 are **period
      offences** that correctly carry no time of day, and the last one is
      date-only *on purpose* — its timing lives in the evidence layer.
      Auto-filling it put C1's Tumakuru sale at 14:14, hours **before** the
      21:40 CCTV of the accused driving there — so a `00:00:00` here is
      load-bearing, not a gap. **Remains open only for P1.2's generated bulk
      cases**, which is where a distribution can actually show up; 19 cases
      can't display one.
      ⚠️ **P4.2 must exclude period offences** rather than read their
      `00:00` as midnight — see `isPeriodOffence()`. Counting them would
      manufacture a midnight spike that is purely a storage artefact.
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

- [x] **P3.1 + P3.3** ~~Entity fusion~~ / ~~cross-source timeline merge~~ —
      done together as `src/lib/personFusion.ts` (built as one pass since
      fusion's natural output IS the merged timeline). 47 people, 116
      timeline items, all citable by real record id (P5.6-ready).
      **Two real gaps found and fixed, not assumed away:**
      - Five record types cite a person in five different shapes (clean
        token on calls/statements; a token *prefix in free text* on CCTV;
        no token at all on transactions — a name embedded in an account
        label). A first pass only handled the clean-token cases and
        **silently dropped C1-CC-2** — the CCTV sighting the one authored
        contradiction in C1 actually hinges on — because it names the
        person via "Suresh Naik's registered vehicle...", not a token.
        Fixed with a name/alias fallback match, same technique already
        needed for transactions. Verified Suresh's fused timeline now
        contains it before moving on.
      - `Victim`/`Complainant` `resolvedPersons` entries are a **different,
        thinner shape** (`{id, name, type}`, no `personId`) — P1.1 scoped
        its global-id work to `Accused` only. Fusing a victim would mean
        inventing an id or keying by name, exactly what P1.1 fixed for
        Accused — so they're skipped (`isFusable`), not guessed at. Real
        follow-up, not done here: give Victim/Complainant the same
        treatment.
      - Also found: "6 people span 2+ cases" (P1.1) means 2+
        `CaseMasterIDs`, not 2+ *scenarios* — all 6 stay within one
        scenario. **Zero people currently span two different scenarios.**
        The cross-jurisdiction repeat-offender story is real at the
        multi-FIR level today, not yet at the multi-investigation level;
        that's a data-authoring gap for P1.2, not a fusion bug.
- [ ] **P3.2** `/persons` index + `/persons/[personId]` profile: every case
      they touch, cross-case timeline, MO. Consumes `personFusion.ts`
      directly - the hard part is already done.

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

- [x] **P5.0** ~~Get the real LLM Serving API contract~~ — done, recorded in
      `RESEARCH_AND_PLAN.md` §2.2. Three things it changed: the `"model"`
      string is **not** the console's display name (`crm-di-glm47b_30b_it`,
      `VL-Qwen3.6-35B-A3B`); GLM and the VLM are **different APIs**, not one
      API with two models (OpenAI chat-completions vs. a flat
      `prompt`+`images[]` shape); and there's a queue — 8.9s total for 256
      tokens in the vendor's own sample.
      ⚠️ One thing still unresolved, carried into P5.1: the console says
      `Authorization: Zoho-oauthtoken <token>`, both code samples say
      `Bearer`. **Verify with one real call rather than guessing.**
      Two attempts so far, both inconclusive — **not** because the schemes
      are equivalent but because the token was rejected first. See §2.2's
      "what we've ruled out" for what those calls established, and the
      grant-token-vs-access-token trap that is the most likely cause.
- [x] **P5.1** ~~`src/lib/llm.ts` — server-side-only GLM client~~ — done and
      **verified against a real live call**, not just typechecked. Along the
      way, resolved everything P5.0 had left open:
      - The prior 401s were a dead grant-token-used-as-access-token, not an
        auth-scheme problem — both `Zoho-oauthtoken` and `Bearer` work once
        a real access token is used.
      - `CATALYST-ORG: <org id>` header is required — its absence was the
        *next* failure after fixing the token (`ORGID_HEADER_UNAVAILABLE`).
      - The real 200 response is `{response, tool_calls, usage, model,
        created_time}` — **flat**, not the OpenAI `choices[0].message`
        shape the console's own sample documents. `llm.ts` is written
        against the verified shape.
      - The untested piece — minting via `grant_type=refresh_token` rather
        than the one-time `authorization_code` exchange — was exercised for
        real on first request (proven by a differing token prefix, not
        assumed).
      - New finding for P5.2: GLM does not reliably follow short-output
        instructions ("reply with one word" → it reasons anyway and gets
        truncated). Use `tools`/`tool_choice` for structured output, don't
        fight it with prompt wording.
      Full log in `RESEARCH_AND_PLAN.md` §2.2.
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

## P7 — Kannada voice pipeline (Zia Trained NLP Models)

*Found 2026-08-26 (`RESEARCH_AND_PLAN.md` §2.1). Same auth as P5's `llm.ts`
- different endpoints, no new token logic needed. Unlike P6, this is
**not gated on generating images** - the audio Text-to-Audio needs can be
synthesized from prose we already have, so P7 can start independently of
P6.0's decision.*

- [ ] **P7.1** Text-to-Audio on `WitnessStatements[].statementText` -
      real spoken Kannada/English playback in the Investigation Workspace.
      Cheapest item in this track: pure input from data that already exists,
      no new authoring.
- [ ] **P7.2** Audio-to-Text intake - let an officer dictate a
      complaint/witness statement in Kannada and get back transcribed text.
      This is a genuine answer to the PS's "Excel-based reporting" complaint,
      not a demo trick: a real Karnataka station's friction is as much
      Kannada-English as it is paper-digital. Needs P7.1 (or any other
      Kannada audio source) to have something to transcribe in a demo.
- [ ] **P7.3** Text Translation, Kannada ⇄ English, on `BriefFacts` /
      witness statements - the bridge between station-level Kannada intake
      and an SCRB/NCRB report that has to read in English.
- [ ] **P7.4** Wire P7.2's transcript into P5.1's `llm.ts` as GLM input -
      "officer speaks a witness statement in Kannada" → transcribed →
      translated → structured/summarized by GLM, one pipeline.

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
