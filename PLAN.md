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
| **P2** Route restructure | 🟢 **read side done** | On `feature/cases-restructure-crud`, not yet merged/deployed. P2.1+P2.1a+P2.1b+P2.1c+P2.1d+P2.2+P2.3 all done — real FIR Index, case/district/person pages, header search, old-URL redirects, and an attention-list dashboard surfacing cross-district pattern signals for the first time. **Only P2.4 remains open**: the case-status write endpoint is built but genuinely unverified (no live Catalyst context in local dev) — needs a Slate deploy + Postman test. IO assignment/case-diary not started (diary blocked on console-only table provisioning, not a choice). |
| **P3** Person spine | ✅ **done** | P3.1+P3.3 (`589721d`) — fusion + timeline merge, 2 real bugs found and fixed. P3.2 (`/persons`) landed via the P2 restructure — see P2.1c. |
| **P4** Real analytics | ⚪ **mixed** | P4.1–P4.3 need P1.2's case volume. **P4.6+P4.7 done** (`f9fde9e`) — MO-clustering (3 real clusters) and the repeat-offender view (6 real people), both live. P4.8 still open. |
| **P5** AI | 🔵 **in progress** | P5.0-P5.3, P5.2b, P5.3b ✅ — real findings now visible in the Investigation Workspace UI (2/15, honest). **P5.4 is next.** P5.8 (ask-anything chatbot, real case-file links) added, not started. |
| **P6** Zia | 🚧 **gated** | Needs the P6.0 yes/no on generating images. |
| **P7** Kannada voice (Zia) | ⚪ **ready** | Not gated like P6 - P7.1 can start from data we already have. |
| **X** Cross-cutting | 🔵 | X3 ✅ · X1, X2 open |

**Done so far:** P0.1–P0.5 · P1.1 · P1.3 · P3.1 · P3.3 · P5.0 · P5.1 · P5.2 ·
P5.3 · X3

**Ready to pick up right now, no decisions needed:** **P1.2** (then P1.6) ·
P4.8 (→ P5.7) · P5.4 · P5.8 · P7.1 · X1 · X2

**Blocked on a Slate deploy to verify (built, not confirmed working):**
P2.4's case-status write endpoint - see P2.4 for exactly what was and
wasn't verifiable locally.

**Blocked on someone, not on effort:**

| Blocked | Needs |
|---|---|
| ~~All of P2~~ | ~~PR #1 — merge or close~~ — **unblocked 2026-08-27**, resolved by decision (proceed independently) |
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
P2  Route restructure  🔵 in progress ── P2.1/1a/1b/1c done, P2.1d next
P3  Person spine       ✅ done       ── P3.2 landed via P2.1c
P4  Real analytics     ⚪ P4.6/P4.7 done ── P4.1-P4.3 still need P1.2
P5  AI features        🔵 P5.0-P5.3, P5.2b, P5.3b done ── P5.4 is next
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

## P2 — Route restructure 🔵 in progress (`feature/cases-restructure-crud`)

*Grounded in real CCTNS/Karnataka-police workflow research (chat, 2026-08-27),
not a guess: real systems are search-first (FIR number / person / district),
with a flat FIR Index worklist as the daily-use screen - not a mandatory
"pick a crime type, then a district" gate to reach one case. Approved via a
click-through prototype before any restructuring code was written.*

- [x] **P2.0** ~~Resolve PR #1~~ — resolved by decision, not merge. v2 PR #1
      ("Investigation Module — synthetic-data domain model + full case
      workspace", KavyaSreeA, opened 2026-08-24) overlaps heavily with this
      work and was already `CONFLICTING`/stale against main. User decision:
      treat it as superseded, proceed independently - PR left open for the
      user to close/discuss with the author directly, not touched here.
- [x] **P2.1** `/cases` rebuilt as the real FIR Index — every real FIR (19),
      one flat searchable/filterable list (crime type / district / status /
      free text), not a category picker. `src/lib/caseWorklist.ts`.
      Replaces `data.ts`'s `caseFiles` placeholder (3 hardcoded FIR-100x
      rows shown unfiltered under every case type + district).
- [x] **P2.1a** `/cases/[caseId]` — new, real, single-case detail page,
      keyed by the actual `CaseMasterID`. Replaces two fake terminuses at
      once: `case-files/[caseId]` (the RNG-mock flipbook) and the real half
      of the old `investigation-workspace` (a live-ZCQL call that can't run
      in local dev and only ever resolved "first scenario matching this
      crime type + district", not one specific case). Real case facts,
      sections, sibling-FIR cross-links (a scenario can span 2+ FIRs),
      cross-source evidence timeline (`CrossSourceTimeline`, reused from
      P4.7), and both verified + AI-detected contradiction findings, kept
      visibly distinct per the existing `RealEvidenceFeed` convention.
      **Forced retirement, not optional scope:** Next.js rejects two
      differently-named dynamic segments at the same path level
      (`[caseId]` vs `[caseType]`) as a hard build error - so shipping
      `/cases/[caseId]` required deleting the entire old `[caseType]` tree
      in the same change (`investigation-workspace`, `case-files`,
      `case-files/[caseId]`, `district-wise`, and their components:
      `InvestigationWorkspaceClient`, `CaseFilesListClient`,
      `DistrictWiseClient`, `CasesListClient`). `scenarioLink()`
      (dashboardData.ts) and `moPatterns.ts`'s link-builder were updated to
      point at the new route - confirmed only 2 call sites, no others.
      **Real data-quality fix along the way:** all 19 real FIRs had been
      hardcoded to `CaseStatusID=4` ("Under Investigation") - a real,
      unused `CaseStatusMaster` column. Hand-varied 6 by registered-date
      age (2 Closed, 3 Charge Sheeted, 1 Open, 13 stay Under Investigation)
      so status filtering has something real to show - documented in
      `build_seed.mjs` §7 with exact reasoning per case.
      **Bug found + fixed live:** `border-danger/30`-style Tailwind opacity
      modifiers silently fail on this app's plain-hex color tokens
      (confirmed via computed-style check - falls back to default gray,
      not the intended tint). Fixed in the new page; flagged as a spawned
      follow-up task for the same pre-existing bug elsewhere (AlertsPanel,
      HomeHeader, AIPanel, CrossSourceTimeline).
      Verified: typecheck clean, production build clean, live in-browser -
      worklist stat tiles/filters/rows and case-detail facts/evidence/
      contradictions all confirmed against real data, not just rendered.
- [x] **P2.1b** `/districts` + `/districts/[district]` — done. The SP/Range
      lens: real total cases, clearance rate, and repeat-subject count
      (cross-referenced against `getRepeatCaseSuspects()`, not a separate
      count) per district, all computed from `getCaseWorklist()` so numbers
      never disagree with what `/cases` itself shows filtered the same way.
      District detail reuses `CaseWorklistClient` pre-scoped to that
      district's cases (added a `hideDistrictFilter` prop rather than
      leaving a district dropdown that could filter a district's own page
      down to zero rows). Deliberately **no trend chart** - the old
      `district-wise` page's 5-year trend was `data.ts`'s fake placeholder;
      the seeded dataset only has one real year of dates, so a real trend
      needs P1.2 first (documented in `districtStats.ts`, same gap
      P4.1-P4.3 are blocked on - nothing shown here that isn't computed
      from real FIRs).
      Verified live: Bengaluru Urban correctly shows 5 cases / 20%
      clearance (1 of 5 resolved), Mysuru 2 cases / 100% (2 of 2 resolved)
      - checked by hand against the worklist, not just rendered.
      Sidebar: added "Districts" under Investigation.
- [x] **P2.1c** `/persons` + `/persons/[personId]` — done. The Crime and
      Criminal Records Search equivalent: every one of the 47 real people
      in the register, searchable by name, not only the 6 repeat subjects.
      `/persons/[personId]` reuses the visual pieces `/repeat-offenders`
      proved (`OffenderAvatar`, registered identity, `CrossSourceTimeline`)
      as its own linkable/bookmarkable page - `/repeat-offenders` now links
      "View full profile" into it rather than being the only place a
      person is reachable.
      **Real bug found + fixed while wiring this up:** `/repeat-offenders`'
      per-case links (`resolveCase()`) were calling `scenarioLink(scenarioId)`
      for each case row - but that resolves to the scenario's FIRST
      `CaseMasterID`, so a person's SECOND FIR in the same scenario (e.g.
      Suresh Naik's 9002, sharing scenario C1 with 9001) silently linked to
      the wrong case page. Introduced by P2.1a's `scenarioLink` rewrite,
      caught here because `/persons/[personId]` needed the same per-case
      link done correctly. Fixed to `caseDetailLink(caseMasterId)` directly
      - verified live, Suresh Naik's two case rows now resolve to `/cases/
      9001` and `/cases/9002` respectively, not both to 9001.
      Sidebar: added "Persons" under Investigation.
- [x] **P2.1d** Wire the header search bar (`DashboardTopbar.tsx`) to real
      data — done. Was a fully decorative `<input>`, zero state/routing.
      `src/lib/searchIndex.ts` builds a small flat index (case title/FIR
      no./accused, person name/aliases, district name → real hrefs) once,
      server-side, in `ShellLayout` (a server component) and passes it
      down as a plain prop - the client-side search bar only filters it,
      no fetching. Grouped results (Cases/Persons/Districts), same shape
      as the approved prototype. Small enough dataset (19+47+8 ≈ 74 items)
      that no debounce/route-handler was needed - documented inline for
      when that stops being true.
      Verified live: typing "suresh" correctly returns both of his real,
      distinctly-linked FIRs (`/cases/9001`, `/cases/9002` - the P2.1c
      link-mislink bug stayed fixed here) plus his person record; clicking
      a result navigates and clears the query.
- [x] **P2.2** Old-URL redirects — done, `next.config.mjs`'s new
      `redirects()`. None of the old fake ids survive (`case-files/
      [caseId]`'s placeholder ids like `FIR-1001` never mapped to a real
      case; district-wise's crime-type segment has no 1:1 destination now
      that type is a filter, not a route), so every old URL lands on the
      closest still-real equivalent: `investigation-workspace` and
      `case-files*` → `/districts/:district`, `district-wise` → `/cases`.
      Verified live (not just configured): all 4 old patterns return a
      real 308 with the correct `Location`, and every destination itself
      resolves 200 - checked with curl against a real running server, not
      assumed from the config alone.
- [x] **P2.3** Rebuild `/dashboard` as an attention list — done. Alerts and
      anomalies now open the page; the 5 stat totals that used to be the
      first thing on screen are demoted to a compact one-row `StatStrip`.
      **The actual point of this rebuild, not just reordering**: two new
      "anomaly" signals surface real cross-district pattern data
      (`getMoPatternClusters()`, `getRepeatCaseSuspects()`) that has
      existed since P4.6/P4.7 but was never once mentioned on the
      dashboard - the PS's "Pattern & Trend Discovery... across districts"
      ask, previously invisible on SCRB's actual home screen. Deliberately
      **statewide regardless of `?district=`** - a cross-district finding
      scoped to one district isn't one anymore (`AttentionSignals.tsx`).
      Verified live: signal cards show the same real counts already
      verified on `/pattern-analysis` (3 clusters, 1 exact) and
      `/repeat-offenders` (6 subjects); confirmed they stay fixed while
      the district filter changes everything else on the page; every
      link (attention cards, "Open Workspace", Alerts) resolves to a real
      `/cases/[caseId]` or feature page, not a 404.
      `StatCard.tsx`/`Sparkline.tsx` are now unused (only consumer was the
      old 5-card grid) - left in place, flagged below with the other known
      dead code rather than deleted mid-task.
- [~] **P2.4** CRUD hooks, built in parallel per user request (not after
      the restructure) — **case status update done** (`PATCH /api/cases/
      [caseId]/status`), IO assignment and case-diary entries **not
      started, scoped out for a real reason** (below). This is the first
      write endpoint anywhere in this app - every route before it was
      read-only.
      - `src/lib/zcql.ts`'s new `updateRow()`: Data Store DML is a
        *separate* API from ZCQL (which is SELECT-only) -
        `capp.datastore().table(name).updateRow({ROWID, ...})`, confirmed
        against the SDK's own `table.d.ts` since no existing write call in
        this codebase to copy from. Needs the row's internal `ROWID`
        (Catalyst's implicit system PK), not the business key
        `CaseMasterID` - so the endpoint does `SELECT ROWID WHERE
        CaseMasterID = ?` first, then `updateRow()`.
      - `CaseStatusEditor.tsx`: real dropdown + Save on `/cases/[caseId]`,
        replacing the static status pill. Failure is shown, not swallowed
        - the point of this control right now is partly to make the first
        live test legible ("here's exactly what Catalyst said"), not just
        to look finished.
      - **Honestly UNTESTED against a live Data Store** - confirmed why:
        local dev has no Catalyst request context (every `zcql()` call
        fails immediately with `"Failed to parse object"`, hit repeatedly
        this session). What *was* verified locally, live, via curl and
        the browser: bad `caseId` → 404 before any DB call; bad
        `statusId` → 400 before any DB call; a valid request reaches the
        real Catalyst call and fails with exactly that same
        `"Failed to parse object"` error every other live call hits
        locally (not a code bug - the expected local-dev limitation) - and
        the UI surfaces that error cleanly instead of crashing. **Needs a
        Slate deploy to confirm the actual write works** - user chose to
        test via Postman against the deployed endpoint before falling
        back to a from-scratch fix if that surfaces a real bug.
      - IO assignment: same pattern, one more `updateRow()` call - not
        built yet, lower value than status without a real Employee picker
        (free-text officer ID isn't much of an upgrade over nothing).
      - Case-diary entries: **genuinely blocked on infra, not skipped by
        choice** - no `CaseDiary` table exists, and Catalyst's Data Store
        has no CSV-import UI or DDL via any SDK; every table is hand-
        created in the console (`catalyst/README.md` §2b). Needs a human
        with console access to create it (Schema View → **+ New Table**)
        before any write endpoint for it can exist - not something this
        session can provision.

**Known follow-up, not done here:** `investigationData.ts` and every
component that only it fed (`AIPanel.tsx`, `EntityDetailCard.tsx`,
`entityStyles.tsx`, `EvidenceBoard.tsx`, `EvidencePanel.tsx`,
`TimelinePanel.tsx`, `flipbook/*`) are now fully dead code - confirmed
nothing under `src/app` imports them any more. `StatCard.tsx`/
`Sparkline.tsx` joined that list with the P2.3 dashboard rebuild - their
only consumer (the old 5-card stat grid) is gone, replaced by
`StatStrip.tsx`. All left in place rather than deleted in the same change
as the routing/dashboard retirement; worth a dedicated cleanup pass.

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
- [x] **P3.2** ~~`/persons` index + `/persons/[personId]` profile~~ — done,
      landed as part of the P2 cases restructure (see **P2.1c**) rather
      than as a standalone task: real search over all 47 people, every
      case they touch (via `caseWorklist.ts`), cross-case timeline
      (`personFusion.ts`, unchanged - the hard part really was already
      done), registered identity. `/repeat-offenders` now links into this
      rather than being the only place a person is reachable.

## P4 — Real analytics (4 of the 6 PS asks)

*Needs P1.3 / P1.4. None of this needs an LLM.*

- [ ] **P4.1** Hotspot map on real `latitude`/`longitude`.
- [ ] **P4.2** Spatiotemporal clustering — time-of-day × location.
- [ ] **P4.3** Emerging-trend alerts: flag a category spiking in a region
      against its own historical baseline.
- [ ] **P4.4** Chargesheet rate + time-to-chargesheet from
      `ChargesheetDetails`; Heinous/Non-Heinous split from `GravityOffenceID`.
- [ ] **P4.5** Socio-economic correlation view (gated on P1.5's framing).
- [x] **P4.6** ~~MO pattern-clustering / similar-case matching~~ — done,
      `/pattern-analysis` (`f9fde9e`, branch `feature/mo-patterns-and-
      repeat-offenders`). `build_seed.mjs` now emits `caseFacts.json`
      (per-FIR Act/Section signature + district, resolved via
      `lookups.Unit` — the same data the Part 5 audit found read nowhere
      in `src/`). A naive "shares any section" rule was tried and rejected
      **after computing the real frequency table**: `IPC-420`/`379`/`120B`
      each appear in 6 of 19 cases (~32%), so it produced one useless
      6-case mega-cluster. Shipped rule instead: exact signature match, or
      2+ shared sections where at least one is rare (≤3 of 19 cases).
      **Verified against hand-computed expected output before shipping** —
      3 real clusters across 6 real cases (a cyber-fraud pattern spanning
      Bengaluru/Ballari, an exact assault-charge match spanning
      Ballari/Bengaluru, a forgery pattern spanning Tumakuru/Kalaburagi),
      and the running code reproduced that exact result.
- [x] **P4.7** ~~Statewide repeat-offender / cross-jurisdiction network
      view~~ — done, `/repeat-offenders` (`f9fde9e`, same branch).
      `personFusion.ts` gains `getRepeatCaseSuspects()` — deliberately
      **not** the same query as P3.1's `getCrossCasePersons()`
      (scenario-count > 1, which is 0 people right now); ships against
      "spans 2+ real `CaseMasterID`s" instead (6 real people today), per
      this item's own note above. First UI surface anywhere in the app for
      a computation that existed since P3.1 but nothing showed — verified
      live by clicking a real case link through to its investigation
      workspace, not just by reading the code.
- [ ] **P4.8** *(added 2026-08-26 — user request)* **Fetch real aggregate
      stats on `/crime-count` and `/crime-hotspots` themselves.**
      Verified: both pages are currently a bare `PageShell` +
      `MapEmbed` and nothing else — no `getSummary`/`getCaseTypes` call, no
      chart, no stat card, on either page file. Prerequisite for P5.7
      below (there's no "below the map" content to attach AI insights to
      yet). Same real/fallback data pattern as everywhere else in the app.

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
- [x] **P5.2** ~~Contradiction detector over a fused person's timeline~~ —
      done, `src/lib/contradictionDetector.ts`. Verified against Suresh Naik
      (KA-P0001): exact match with C1's real ground truth
      (`C1-WS-2`/`C1-CC-2`), zero hallucinated citations. Four real,
      live-verified fixes along the way (not guessable from docs) — see
      `4e88214`'s message: `tool_choice` forcing is broken on this endpoint,
      GLM sometimes emits tool calls as inline text instead of the
      structured field (`llm.ts` now parses both), a real total
      prompt+completion token ceiling well under the documented 128K, and a
      truncated response can look identical to "no contradiction found"
      unless checked for explicitly.
- [x] **P5.3** ~~Evaluate P5.2 against the 15 authored contradictions~~ —
      done, run for real (not estimated): **1 hit / 15 total, honestly, and
      the reason why is the actual finding.** `Contradictions.json`'s
      `conflictingRecords` is 2 ids for only 2 of 15 scenarios (C1, C5) —
      the other 13 are 3-4 record chains, and **verified on C2** by tracing
      each cited record back to its person: the contradiction spans **two
      different people** (P1 sighted; P4's alibi; a call linking them), not
      one suspect's own claims. P5.2 as scoped — one person's timeline — can
      only ever address single-person cases, which are a minority of this
      dataset. Of the 2 in-scope cases, found 1 (C1); missed C5. **New,
      correctly-scoped follow-up: P5.2b**, below.
      First pass also caught two of its own bugs live rather than shipping
      them: the tool schema originally forced exactly a 2-id pair (fixed to
      `recordIds: string[]`, min 2, after this eval run proved most ground
      truth isn't a pair), and `llm.ts`'s `text` field could be `undefined`
      on a live 200 despite its type saying `string` (a truncated
      generation can omit `response` entirely) - crashed a caller that
      reasonably trusted the type; now defaulted to `""` at the source.
- [x] **P5.2b** ~~Scenario-level contradiction detection~~ — done,
      `getScenarioTimeline()` (personFusion.ts) + `detectScenarioContradictions()`
      (contradictionDetector.ts, sharing `runDetection()` with P5.2 — one
      schema, one guardrail, two entry points). Re-ran P5.3: **1/15 → 3/15
      real hits (C1, C2, C11)** on that eval pass, each fix verified live,
      not assumed. **This 3/15 was never persisted** — generating the
      bundled `AIContradictions.json` artifact (below) was a *different*
      run on the identical, unchanged prompts and got **2/15 (C1, C2)**.
      Both numbers are real; the difference between them (not either number
      alone) is the actual finding — this detector is not deterministic,
      confirmed twice now, not theorized:
      - Confirmed C2 needs cross-person evidence — traced live: Ravindra's
        alibi (his own statement) vs. two calls with Praveen vs. a sighting
        of Praveen — three different people's records, unreachable from any
        one person's timeline. `getScenarioTimeline` found it immediately.
      - The inline-tag fallback parser (P5.2) turned out inconsistent
        across responses — sometimes `<arg_key>x<arg_value>`, sometimes
        `<arg_key>x</arg_key><arg_value>` — and only the first form was
        handled. Silently failed the eval's C2 call even though the model
        had found the *exact right answer* — a parsing bug reading as a
        detection miss. Fixed with an optional closing tag in the regex.
      - The "hard total-token ceiling ~1800" theory from P5.2/P5.3 was
        itself wrong — a live call at 1923 total tokens returned clean.
        What was really happening: `maxTokens: 700` was too small for
        scenario-level prompts (naturally longer — more merged records),
        and every truncated response had `toolCallCount: 0` — confirmed
        from server logs, not inferred. Raised to 1500.
      - Raising `maxTokens` made generation slower; several real calls then
        exceeded the 20s request timeout mid-generation. Raised to 45s.
      **Two honest limitations left, not chased further:** a few calls
      return genuinely empty (`response` empty, no tool call) even at the
      larger budget — a live model/gateway quirk without full visibility
      into why; and the model sometimes reports one real multi-record
      contradiction as several separate smaller pairs instead of one group
      that covers everything (C4, C15) — found the right records, structured
      wrong, currently scored a miss. Do not present 2/15, 3/15, or any
      number from any run as more than what it is — 15 authored cases,
      honestly run, with a result that moves between runs.
- [x] **P5.3b** ~~Surface AI findings in the real Investigation Workspace UI~~
      — done. Until this, every P3/P5 module built today was library code
      with zero UI surface — nothing an officer would ever see. Added:
      - **`AIContradictions.json`** — all 15 scenarios pre-computed once via
        `detectScenarioContradictions()` (retrying up to 2× on the "empty
        tool call" failure mode found in P5.2b - a transient gap, not a
        wrong answer, so retrying is a reliability fix, not re-running for
        a better number). Same seeded-bundle pattern as every other real
        collection in `nosql-seed/`, not a live call per page load - each
        call takes 10-60s, which a page load can't wait on. **Final,
        shipped result: 2/15 (C1, C2)** - generation itself hit a real
        network condition partway through (`UND_ERR_CONNECT_TIMEOUT` on 5
        scenarios after ~15 consecutive calls, confirmed transient by a
        clean `curl` moments later) and was completed incrementally rather
        than restarted from scratch.
      - **`/api/investigation`** now returns `aiFindings` alongside the
        existing authored `contradiction` field.
      - **`RealEvidenceFeed.tsx`** renders both, kept visibly, honestly
        distinct: red "Verified contradiction — case record" (what the
        scenario was authored around) vs. indigo "AI-detected contradiction
        — GLM-4.7-Flash" (what the model found on its own), with a verdict
        pill (matches / independent-not-a-full-match / none this run) and
        an explicit "generated once, not live" caption so nobody mistakes
        it for a live call. Verified all three states render correctly by
        temporarily pointing the fetch at a fixture route (C1 = match, C5 =
        none, C15 = independent-not-a-full-match), then reverted before
        commit - a real screenshot-equivalent check, not just a typecheck.
- [ ] **P5.4** "Next question to ask" — phrasing layer on P5.2/P5.2b's output.
- [ ] **P5.5** Suspicion score — deterministic weighted signals feed the
      existing `RiskGauge`; the LLM writes only the explanation, never the
      number.
- [ ] **P5.6** Citation guardrail enforced **in the tool schema**: no finding
      renders without a real record ID.
- [ ] **P5.7** *(added 2026-08-26 — user request)* **AI insights panel below
      the map on `/crime-count` and `/crime-hotspots`** (needs P4.8's real
      stats to exist first). Plain narrative prose via `llm.ts` (no
      `tools`/`tool_choice` needed here — this is a summary, not a
      structured finding), reasoning over real `getSummary`/`getCaseTypes`/
      district-stats numbers: "Theft is up X% in Bengaluru Urban this
      quarter while clearance held steady in Mysuru" - the PS's "Pattern &
      Trend Discovery" and "Sociological... Predictive Dashboards" made
      concrete for the two pages that most need it. Same honest caveat as
      the rest of P4: reasoning over 19 real cases across 8 districts (pre-
      P1.2) will read thin - a real number of cases, but not enough to
      narrate convincingly. Worth shipping now regardless (labelled
      "generated once" like P5.3b, same pattern), and gets materially
      better the moment P1.2 lands, not blocked on it.
- [ ] **P5.8** *(added 2026-08-26 — user request)* **Ask-anything chatbot** —
      a persistent Q&A widget (site-wide, not page-scoped) an officer can ask
      a free-text question ("which cases involve Suresh Naik", "what's the
      status of FIR-1002", "any repeat offenders in Ballari") and get an
      answer grounded in the real seeded data, not a general-knowledge guess.
      Not scoped anywhere before now — checked `features.md` and the rest of
      this file, genuinely missing.
      **The standout requirement, per the user's own framing: every case it
      references must come with a real, clickable navigation link to that
      case's actual page** (`/cases/[caseType]/[district]/investigation-
      workspace` or `case-files/[caseId]`, via `scenarioLink()` /
      `dashboardData.ts`'s existing resolvers) — not just a name or FIR
      number in prose. This is the same citation-grounding discipline P5.6
      already exists to enforce for AI findings (no finding renders without
      a real record ID); here the "citation" is a working link, and a
      version of this that answers in prose without one is a worse, not
      equal, version of the feature.
      Natural fit for `llm.ts`'s existing tool-calling (P5.1 done, verified
      live) — give GLM tools that query `personFusion.ts` / `caseFacts.json`
      / `dashboardData.ts` (find-person, find-case, list-repeat-offenders-in-
      district, etc.) and force it to cite what it used, same `tool_choice`
      pattern P5.2/P5.2b already use. Not blocked on anything else in P5 -
      could start now.
      Scope check before building: decide whether this answers over the
      *whole* seeded dataset (all 19 real FIRs across every collection) or
      is scoped per-page (e.g. only the case currently open in the
      Investigation Workspace) - the "which cases involve X" example above
      needs the former; a per-case assistant is a smaller, easier v1.

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
