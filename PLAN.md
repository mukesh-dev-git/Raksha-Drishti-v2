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

*Last swept 2026-09-02.*

| Track | State | Where it's at |
|---|---|---|
| **P0** Credibility | ✅ **done** | All 5. App no longer promises what it can't do. |
| **P1** Data foundation | 🔵 **nearly done** | P1.1 ✅ · P1.2 ✅ · P1.3 ✅ · **P1.7 ✅ 2026-09-01** (all **31** real Karnataka districts, **12,000** FIRs) · **P1.6 ✅ 2026-09-02** (live Data Store re-imported at full scale — `CaseMaster` 19 → 12,000, every table verified against source by re-export; done by upsert, no wipe needed) · P1.4 `[~]` built, not applied · **P1.5** `[~]` occupation + religion live, caste taxonomy still an open question. Both defects the scale-up found are now resolved (2026-09-02, via the Catalyst MCP): `ActSectionAssociation`'s truncated ROWIDs fixed (drop-and-recreate as bigint, no console step needed after all), and `/api/summary`'s `zcqlAll()` off-by-one fixed as a side effect of rewriting it onto real ZCQL aggregates — see `catalyst/README.md` §2. |
| **P2** Route restructure | ✅ **done, merged, deployed** | Merged to `main` and pushed to `v2/main` 2026-08-28 (17 commits) - confirmed live on Slate. P2.1+P2.1a+P2.1b+P2.1c+P2.1d+P2.2+P2.3 all real FIR Index, case/district/person pages, header search, old-URL redirects, attention-list dashboard. **P2.4's case-status write endpoint confirmed working against the live Data Store** (two real writes via curl, both directions, not just a 200 taken on faith) - the app's first-ever write, live. IO assignment/case-diary not started (diary blocked on console-only table provisioning, not a choice). One real gap surfaced: writes hit the live Data Store but every read path still serves bundled seed JSON, so a write is currently invisible in the UI - see P2.4. |
| **P3** Person spine | ✅ **done** | P3.1+P3.3 (`589721d`) — fusion + timeline merge, 2 real bugs found and fixed. P3.2 (`/persons`) landed via the P2 restructure — see P2.1c. |
| **P4** Real analytics | ✅ **all 7 sub-items done, 2026-08-30** | P4.1 (real statewide hotspot map), P4.2+P4.9 (time-of-day×day-of-week heatmap), P4.3+P4.9 (control-chart trend alerts), P4.4 (chargesheet rate/heinous split), P4.5 (socio-economic breakdown, `/socio-economic`, 2026-08-30 - occupation + religion, caste withheld pending taxonomy decision), P4.6+P4.7 (MO-clustering + repeat-offenders), P4.8 (real stat cards), P4.9 (choropleth, kernel-density, cross-district flow map, case-flow Sankey, statewide link-analysis graph). P4.1-P4.4/P4.6-P4.9 built via 6 parallel subagents 2026-08-29; P4.5 built directly 2026-08-30. |
| **P5** AI | 🔵 **in progress** | P5.0-P5.3, P5.2b, P5.3b ✅. **P5.4 done, 2026-08-29** (AI-suggested next question, citation-checked). **P5.8 done, 2026-08-29** (Ask Anything chatbot, real tool-calling, grounded citations); **3 real bugs found + fixed + live-verified 2026-08-31** — it used to give up on any 3-round question (loop off-by-one) and silently ignore fed-back tool results (`role:"tool"` never actually read by the model) — now answers correctly with real, hallucination-checked citations end-to-end through the UI. |
| **P6** Zia | ✅ **closed, 2026-08-29** | Decision: no synthetic images. Track closed cleanly rather than built against fabricated source images. |
| **P7** Kannada voice (Zia) | 🔵 **P7.1 done, 2026-08-29** | Text-to-Audio pipeline built and wired into case-detail witness statements; P7.2-P7.4 still open. |
| **X** Cross-cutting | ✅ **done** | X1, X2, X3 all done - see below. |
| **P9** Refined-prototype push | ✅ **done, today** | All five sub-items shipped and independently verified: P9.1+P9.1b (suspicion score + tool-schema guardrail), P9.3 (pattern/repeat cross-links), P9.2 (real IO assignment), P9.4 (relationship graph, built on a subagent's branch `feature/case-relationship-graph`, merged to `main` after review - the only real conflict was two adjacent import lines in `cases/[caseId]/page.tsx`; every other overlapping file (`caseWorklist.ts`, `contradictionDetector.ts`, `personFusion.ts`, `.gitignore`) merged clean with nothing lost, re-verified with `tsc --noEmit`, `next build`, and a live check on cases 9001+9002 showing the graph, MO-cluster card, repeat badges and IO picker all rendering together). |
| **P10** Live Data Store as source of truth | 🔴 **open, not started** | **Raised 2026-09-02.** The app is a bundled-JSON app with a Data Store bolted to two corners: only `/` and `/dashboard`'s headline numbers read live, everything else renders from a 6 MB compiled snapshot — so a case-status write succeeds and is then invisible everywhere. CRUD inventory is thinner than it sounds: **no create, no delete**, and update covers exactly 2 columns of 1 table. Needs the read paths moved over, real FIR CRUD, and `zcqlAll()`'s off-by-one fixed first. A rearchitecture, not a task — **not a candidate for the 6 Sept deadline**; see P10 below for the real constraints (ZCQL's 300-row cap, `COUNT()` returning 0, console-only DDL). |

**Done so far:** P0.1–P0.5 · P1.1 · P1.2 · P1.3 · P1.5 (occupation + religion)
· **P2 (whole track)** · **P4 (whole track)** · P3.1 · P3.3 · P5.0 · P5.1 ·
P5.2 · P5.3 · P5.4 · P5.8 · P6 (closed) · P7.1 · X1 · X2 · X3

**Ready to pick up right now, no decisions needed:** P5.7 · P7.2 · P7.3 · P7.4

**✅ Verified live in production, 2026-09-02** (Slate auto-deploys on push to
`main`, so P1.6/P1.7 shipped themselves — there was never a manual redeploy
step to do, and an earlier note here claiming otherwise was wrong):
`/districts` renders all **31** districts · `/cases` reports **12,000** with
every CrimeNo in the correct 18-digit format · `/api/summary` returns
**31 districts** and 12,001 cases (the known `zcqlAll()` off-by-one) · authored
scenario **9001** still renders its full evidence layer · and **Ask Anything**
answered a real question in production for the first time since its fix —
`ok: true`, 2 tool rounds, **12 real citations, 0 hallucinated**, 23.5 s.

**Biggest known architectural debt:** **P10** — the whole app should read the live Data Store, and real CRUD is largely missing. Recorded, scoped, and deliberately not started before the deadline.

**Blocked on someone, not on effort:**

| Blocked | Needs |
|---|---|
| ~~All of P2~~ | ~~PR #1 — merge or close~~ — **unblocked 2026-08-27**, resolved by decision (proceed independently) |
| ~~All of P5~~ | ~~a working access token~~ — **unblocked**, `src/lib/llm.ts` verified live |
| ~~All of P6~~ | ~~P6.0 — do we generate images at all?~~ — **resolved 2026-08-29: no**, track closed |
| ~~P1.5, P4.5~~ | ~~Agreement on the caste/religion framing~~ — **resolved 2026-08-29** (aggregate-only, victim-side, with denominators, never offender propensity). **Built 2026-08-30**: occupation + religion done, `/socio-economic` live. **Caste specifically still open** — the framing resolved *how* to present it, not *what taxonomy* to use (official SC/ST/OBC/General vs. omitting caste entirely) — see P1.5. |

**The honest read on P4:** it's the biggest remaining prize — 4 of the PS's 6
capabilities — and as of P1.2 (2026-08-29, scaled to 5,000 the same day) it
is no longer blocked on data volume: 5,000 real cases across 8 districts
exist now, real dates spanning 2022-2026, real time-of-day via
`geo_time.mjs`. P4.1-P4.3 are still open
work, just genuinely unblocked work now rather than "not enough rows to plot
anything." Note also that P4.1 is larger than "plot the coords": the map
today is 16 hardcoded Bengaluru localities with crime types that don't exist
in the 4-type schema, and **nothing in `src/` reads `latitude`/`longitude`
at all** — so it's a rewrite to read the Data Store, not a data swap.

---

## Ordering, and why

```
P0  Credibility        ✅ done
P1  Data foundation    🔵 P1.1/P1.2/P1.3/P1.6/P1.7 done ── P1.4/P1.5 remain
P2  Route restructure  🔵 in progress ── P2.1/1a/1b/1c done, P2.1d next
P3  Person spine       ✅ done       ── P3.2 landed via P2.1c
P4  Real analytics     ✅ done 2026-08-29 ── all 6 sub-items, 6 parallel subagents
P5  AI features        🔵 P5.0-P5.4, P5.8 done ── P5.7 next
P6  Zia                ✅ closed 2026-08-29 ── no images, decided
P7  Kannada voice       🔵 P7.1 done 2026-08-29 ── P7.2-P7.4 open
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
- [x] **P1.2** Done (2026-08-29), scaled the same day. New
      `catalyst/dataset-v2/bulk_cases.mjs` generates real, statistically-
      varied `CaseMaster` rows (+ `ComplainantDetails`/`Victim`/`Accused`/
      `ActSectionAssociation`) using the SAME `lookups.json` and the SAME
      `geo_time.mjs` `placeIncident()`/`incidentHour()` P1.3/P1.4 already
      built - not a separate/incompatible generator. First landed at 409
      total (19 authored + 390 bulk, over the original "≳400" bar); **scaled
      to 5,000 total (19 + 4,981 bulk) same day** on direct request - SCRB
      handles statewide volume, and 409 undersold that. `BULK_CASE_COUNT` in
      `build_seed.mjs` is the one constant to change for a different target;
      `caseFacts.json`/`accused.json` (the two bundled files that scale with
      case count) switched from pretty-printed to minified JSON at this
      size (2.4MB → 1.9MB) - everything else stays pretty. Regeneration
      itself is fast regardless of scale (~1.1s at 5,000 rows, single O(n)
      pass, no quadratic step). **All 19 authored FIRs verified still
      resolving
      unchanged** (`/pattern-analysis` still finds exactly the same 3
      clusters/7 cases, `/repeat-offenders` still finds exactly the same 6
      people - checked live, not assumed). New `ChargesheetDetails` table
      (shape ported from `catalyst/seed/`, per scope - NOT its rows, which
      carry the old generator's real defects: `GenderID` stored as literal
      text, every `Accused.PersonID` hardcoded to `"A1"` for all 4 sample
      rows shown, `OccupationID`/`ReligionID`/`CasteID` hardcoded to `1,1,1`
      for every complainant. "The seed generator is the problem, not the
      rows" - so this generates fresh, correct rows against the real pinned
      lookup IDs, not a port of the old ones), populated for every
      Charge-Sheeted case, scenario and bulk alike (1,293 rows at 5,000
      scale).
      **Deliberate scope boundary, not an oversight:** bulk cases carry no
      evidence records (calls/CCTV/transactions/statements) and are
      EXCLUDED from every evidence-dependent feature - `personFusion.ts`
      (P3.1, so `/persons` + repeat-offender detection stay at their real,
      verified 47 people), and `moPatterns.ts` (P4.6 - `RARE_THRESHOLD=3`
      was calibrated against the 19-case universe; diluted across thousands
      of bulk cases drawn from only ~20 IPC sections, "rare" stops meaning
      anything and the rule would find fake clusters from coincidental
      section overlap - re-verified live at 5,000 scale, still exactly the
      same 3 clusters/7 cases).
      A bulk case's accused ARE real (continuing global `KA-Pxxxx` IDs from
      P1.1's register, only for Charge-Sheeted/Closed cases - a chargesheet
      needs a named accused, matching real procedure) but un-linked: no
      evidence-backed `/persons/[personId]` profile exists for them, so
      `caseWorklist.ts`'s new `linked: boolean` field (via new bundled
      `accused.json`) tells the case-detail page to render their name as
      plain text, never a link that would 404 - verified live (case 5:
      "Iqbal Kulkarni" renders as a `<span>`, not a `<Link>`, confirmed via
      the accessibility tree, not just visually).
      **Real payoff, verified live at 5,000 scale:** `/cases` now lists
      5,000 real cases (1,926 Under Investigation/1,293 Charge Sheeted/
      1,356 Closed/425 Open); `/districts` now shows real, differentiated
      per-district volume and clearance (Bengaluru Urban 1,271 cases/51%,
      down to Shivamogga 440/53% - not the old "5 cases" toy numbers) with
      ZERO code changes to `districtStats.ts` itself (it was already
      `getCaseWorklist()`-driven, not `data.ts`'s fake counts - this is
      exactly the payoff P1.2 was supposed to unlock). A bulk case with too
      little data degrades honestly rather than faking it (case 5's
      relationship graph: "0 entities, 0 linked records... too few linked
      records to draw a graph"). Also fixed along the way: `geo_time.mjs`'s
      own left-open note on a rural theft time-of-day profile (rural
      stations - `spreadKm>=3` in `STATION_LOCALITIES` - now get a night-
      shifted curve, urban theft keeps the daytime/evening one).
      **`CaseWorklistClient.tsx` (the FIR Index table) needed real
      pagination for this** - it rendered every filtered row into the DOM
      unvirtualized, fine at 19-409 rows, genuinely bad at 5,000. Added
      client-side pagination (50/page, resets to page 1 on any filter
      change) over the already-filtered array - no new data-fetching, just
      a render-window slice. Verified live: `/cases` correctly shows "Page 1
      of 100"; `/districts/bengaluru` (1,271 cases, the largest district)
      correctly shows "Page 1 of 26"; Next/Previous confirmed advancing.
      ⚠️ **Local/bundled seed only** - the live Data Store still holds just
      the 19 real FIRs. Importing the other 4,981 (+ `ChargesheetDetails`,
      already a provisioned table per `DATA_STORE_SCHEMA.md`, not a new
      console-provisioning blocker) is folded into **P1.6**'s wipe-and-
      reimport, same reasoning as P1.1's deferred `PersonID` fix - one wipe,
      not one per landed fix.
      Typecheck + production build clean (build ~10s compile, unaffected by
      scale - route bundle sizes are unchanged since the seed JSON is read
      server-side, never shipped to the client bundle).
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
- [~] **P1.5** Populate `OccupationID`/`ReligionID`/`CasteID` + build the 3
      lookup tables. **Framing agreed first** — victim/complainant
      demographics with explicit denominators, never offender propensity.
      **Occupation + Religion done, 2026-08-30** — `OccupationMaster` and
      `ReligionMaster` built in `lookups.json`; `catalyst/dataset-v2/
      demographics.mjs` assigns both via a deterministic, Karnataka-
      representative statistical draw (Census 2011 proportions for religion;
      not a narrative choice about any named individual — see that file's
      header). Applied to all 22 authored complainants and all ~4,981 bulk
      ones — 5,003 total, verified against the source weights at N=20,000
      (Hindu 83.2% vs 84% target, Muslim 13.1% vs 13%, no bias). Institutional
      complainants (a bank's nodal officer, a forest-department officer)
      deliberately excluded from religion — they represent an organisation,
      not a person, so "not specified" is correct, not a gap.
      **`CasteID` still 0 for everyone — genuinely open, not an oversight.**
      The "aggregate-only, victim-side" agreement resolved the *presentation*
      framing; it did not pin down the caste *taxonomy* itself (official SC/
      ST/OBC/General categories, used in NCRB's own reporting and required
      for Prevention of Atrocities Act enforcement, vs. omitting caste
      entirely and reporting only religion + occupation). That is a separate
      decision worth a direct answer before generating any values — asked,
      not yet answered.
- [x] **P1.7** ✅ **Done 2026-09-01.** Expanded district coverage to all real Karnataka districts.
      `catalyst/dataset-v2/lookups.json` currently seeds only **8** of
      Karnataka's real 31 districts (Bengaluru Urban, Mysuru, Belagavi,
      Kalaburagi, Dakshina Kannada, Tumakuru, Ballari, Shivamogga -
      `DistrictID` 4401-4408) - every `districtName`/`districtSlug` value
      across the whole seeded dataset (`CaseMaster`, `caseWorklist.ts`,
      `districtStats.ts`, `/districts`, the hotspot map, `askTools.ts`'s
      `get_district_stats`/`search_cases`, etc.) is downstream of this one
      table, so it's the single real place to fix, not a per-page change.
      User-requested (2026-08-31): add the remaining ~23 real districts
      (real `DistrictID`s/PIN prefixes, same shape as the existing 8 rows -
      `build_seed.mjs`'s PIN-prefix map and `geo_time.mjs`'s per-district
      geo/time config both need matching new entries, not just
      `lookups.json` alone) so every real Karnataka district is
      representable, not just the current 8. Not started - needs the same
      "real data, no invented case volume" discipline as P1.2/P1.5: new
      districts should get real case rows generated for them (via
      `bulk_cases.mjs`), not just an empty entry in a dropdown that returns
      zero cases everywhere. Natural to fold into **P1.6**'s wipe-and-
      reimport (same "one wipe, not per-fix" reasoning P1.6 already uses)
      rather than a second separate re-import.
- [x] **P1.6** ✅ **Done 2026-09-02.** Live Data Store re-imported at full scale — `CaseMaster` 19 → **12,000**, `District` 8 → **31**, plus Unit/Court/Employee/Complainant/Victim/Accused/ChargesheetDetails, every table verified by re-exporting and diffing against the source CSVs field by field (not by trusting the import's success message). The real `KA-Pnnnn` PersonIDs (P1.1) and P1.5's demographics are now live. **No wipe was needed after all** — there is no wipe command (CLI has only import/export/status, ZCQL is SELECT-only, the SDK's `deleteRows()` needs a deployed request context), but every ID already live was also in the new dataset, so an **upsert** on each table's PK reaches the identical end state with zero stale rows and no destructive step. Two real defects were found by the scale-up; both since resolved, 2026-09-02, documented in `catalyst/README.md` §2: (a) `ActSectionAssociation` imported 16,395 rows whose Lookup ROWIDs were silently truncated to 10 digits — the in-place fix (`Update_Column` to bigint) turned out to be blocked by the platform itself (`"Data type of this column cannot be changed"`), so it was fixed by drop-and-recreate (`Delete_Column` + `Create_Column` as bigint) via the Catalyst MCP, no console step needed after all; verified via ZCQL (16,395 rows, exactly 2 distinct `ActID` values matching the real IPC/ITACT split, case 9001's real sections resolve correctly). (b) `zcqlAll()`'s one-duplicate-row bug is fixed for `/api/summary` specifically, as a side effect of rewriting that route onto real ZCQL aggregates instead of walking every row — `zcqlAll()` itself is unchanged and any other caller still has the bug. Original task text below.
- [ ] ~~**P1.6**~~ Wipe the Data Store and re-import cleanly. Record row counts in
      `catalyst/README.md`. Now carries two real fixes at once, which is
      exactly why this was deferred to one wipe rather than done per-fix:
      P1.1's real `KA-Pxxxx` PersonIDs (the live Data Store still has the
      old `A1`-style ones) and P1.2's 5,000-row `CaseMaster` (+ the new
      `ChargesheetDetails` table - already provisioned, not a new console
      step). `catalyst/dataset-v2/out/csv/*.csv` is already correct and
      ready; this item is the live `ds:import` run + verification, not more
      generation work.

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
      `StatCard.tsx` was left unused (only consumer was the old 5-card
      grid) - since deleted, see the dead-code note below.
- [x] **P2.4** CRUD hooks, built in parallel per user request (not after
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
        the UI surfaces that error cleanly instead of crashing.
      - **✅ CONFIRMED WORKING on Slate, 2026-08-28** — `main` pushed to
        `v2/main` (17 commits, this whole P2 restructure), auto-deploy
        confirmed live by polling for `/persons` (a route that only
        exists in the new code) to stop 404ing. Then the real test against
        the live Data Store, via curl, not just the 200 status code taken
        on faith: `PATCH /api/cases/9001/status {"statusId":3}` →
        `{"ok":true,"caseMasterId":9001,"statusId":3}` (200) - moved case
        9001 from Charge Sheeted to Closed for real. Immediately reversed
        with a second real write (`{"statusId":2}` → `{"ok":true,...}`,
        200) to restore it to the value the bundled seed JSON and every
        screenshot/verification this session already assumes - **both
        directions confirmed working**, not a one-off fluke. The 404/400
        validation guards were re-checked against the live deploy too,
        same results as local.
        ⚠️ **One real, honest gap this surfaced**: the write endpoint
        writes to the live Data Store, but every read path in this app
        (`getCaseWorklist()`, the whole `/cases` + `/districts` +
        `/persons` tree) reads the **bundled seed JSON**, not a live
        query - by design, documented throughout this session. So a
        successful live write is currently invisible in the UI; nothing
        rereads it. Real next step if this write endpoint is to matter
        beyond "proof the plumbing works": either a live GET alongside
        it, or accept that case status is Data-Store-authoritative but
        UI-displayed-from-snapshot until a broader live-read migration.
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

**Dead-code cleanup: done.** Deleted `investigationData.ts` and every
component that only it fed (`AIPanel.tsx`, `EntityDetailCard.tsx`,
`entityStyles.tsx`, `EvidenceBoard.tsx`, `EvidencePanel.tsx`,
`TimelinePanel.tsx`, `flipbook/CaseBoardPage.tsx`, `flipbook/
CaseFileFlipbook.tsx`, `flipbook/pages.tsx`), plus `StatCard.tsx` (only
consumer was the old dashboard 5-card grid, replaced by `StatStrip.tsx`).

Verified with a *transitive* import check across all of `src/`, not just
`src/app` - a first `src/app`-only pass produced two false positives
(`MiniRelationshipGraph.tsx`, `HeroLiveOverview.tsx` both looked dead but
are real, live components reached through `FeaturedInvestigationCard.tsx`/
`HomeHero.tsx`), caught and corrected before deleting anything.
`Sparkline.tsx` looked like it belonged with `StatCard` too but is still
needed by `HeroLiveOverview.tsx` - kept. The real backstop either way was
`tsc --noEmit` + `npm run build` after deleting - both clean, all 21
pages still build at identical sizes, confirming nothing reachable was
actually removed.

**One more found since, not yet deleted:** `RealEvidenceFeed.tsx` (+ its
two sub-components, `PinnedCard.tsx`/`SectionHeading.tsx`) and the
`/api/investigation` Route Handler it alone called are now orphaned too -
`/cases/[caseId]` reads evidence a different way
(`personFusion.ts`'s `getScenarioTimeline()`, direct from bundled JSON,
keyed by the exact `CaseMasterID`) rather than through that
component/route. Found while updating `README.md`/`catalyst/README.md` to
match current status (2026-08-28), confirmed via the same transitive-check
discipline as above. The route still responds if hit directly; nothing in
the UI calls it. Left in place - same "flag it, don't chase it mid-task"
call as before.

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

## P4 — Real analytics (4 of the 6 PS asks) ✅ done 2026-08-29

*Needs P1.3 / P1.4. None of this needs an LLM.*

- [x] **P4.1** Done (2026-08-29, subagent, `feature/p4-hotspot-map`,
      merged). Real statewide hotspot map at `/crime-hotspots` - real
      `latitude`/`longitude` added to `caseFacts.json` (already existed on
      `CaseMaster`, just wasn't carried through), H3 hex-bin clustering
      across all 5,000 real cases, real 4-crime-type filter, real hour-of-
      day/day-of-week filter sourced from `incidentFromDate` (not
      randomised - verified real diurnal variation and 27.9% weekend share
      against the true baseline). Replaces the old 16-hardcoded-Bengaluru-
      localities demo entirely. Verified live: real hex counts render (e.g.
      a 470-case cell near Bengaluru), zero console errors on a fresh tab.
- [x] **P4.2** Done (2026-08-29, subagent, `feature/p4-stats-charts`,
      merged) + P4.9 item 2. Time-of-day × day-of-week heatmap grid on
      `/crime-count`, excluding 284 real period offences (no fabricated
      "midnight spike" from unknown-time storage). Verified live: "4,716
      cases with a real recorded time... Excludes 284 period offence(s)."
- [x] **P4.3** Done (2026-08-29, subagent, `feature/p4-stats-charts`,
      merged) + P4.9's control-chart backing. Real monthly mean+2σ
      baseline per crime type, months that actually cross it flagged red -
      not an arbitrary threshold. Honest finding, not fabricated: 0 months
      currently cross the statewide 2σ line for any of the 4 crime types,
      verified against a standalone script independent of the UI code.
- [x] **P4.4** Done (2026-08-29, subagent, `feature/p4-stats-charts`,
      merged). Chargesheet rate (25.9%, 1,293/5,000, real `ChargesheetDetails`
      timing data via new `chargesheetDates.json`), time-to-chargesheet
      histogram (median 75 days), Heinous/Non-Heinous split (27.5%/25.8%
      chargesheet rate respectively) from real `GravityOffenceID`. Verified
      live on `/crime-count`.
- [x] **P4.5** ~~Socio-economic correlation view~~ — done, 2026-08-30,
      `/socio-economic` (`socioEconomicStats.ts` + `SocioEconomicPanel.tsx`).
      Occupation + religion breakdown, statewide and per-crime-type, over
      all 5,000 real cases — real N, real %, denominator shown alongside
      every chart, "not specified" shown as its own line rather than
      silently dropped. Doesn't need P1.6 after all: like every other P4
      view, it reads the bundled `caseFacts.json` (P1.2's pattern), not the
      live Data Store, so it didn't have to wait on the live re-import.
      The framing is enforced structurally, not just by convention: the
      source fields are on the complainant side only, `Accused` has no
      demographic columns in the schema at all so there is nowhere an
      offender-side value could land even by mistake, and no function in
      `socioEconomicStats.ts` returns or accepts a single person's value —
      only category counts. **Caste is not in this view** — see P1.5, the
      taxonomy itself is still an open question.
      **Redesigned same day** on direct feedback — the first pass rendered
      every bar in flat navy, monochrome and hard to read. Now reuses the
      app's own existing `--dash-blue/purple/orange/teal/pink` categorical
      palette (already used by the crime-type charts, not new colors) for
      per-category bars plus a multi-segment donut ring per breakdown. Added
      a real **district breakdown** (top 10, needs no new demographic
      field — district is already on every case) and 4 colorful stat chips.
      Deliberately not built: a header illustration (needs a real asset,
      not fabricated) and a "Download Report" button (no real export
      exists — same P0.2 rule against dead affordances applies to buttons,
      not just nav links).
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
- [x] **P4.8** Done (2026-08-29, subagent, `feature/p4-stats-charts`,
      merged). Real stat cards on `/crime-count`: total (5,000), per-crime-
      type breakdown (Theft 1,973/Fraud 1,105/Assault 1,093/Burglary 829 -
      real counts via `getCaseWorklist()`, not `data.ts`'s stale
      placeholders), per-status breakdown. Prerequisite for P5.7, now
      satisfied - there's real content on the page to attach AI insight to.
- [x] **P4.9** Done (2026-08-29, subagents across both map/stats tracks).
      All 7 researched candidates built, not just proposed:
      1. **District choropleth** - `/crime-hotspots`, real per-district
         volume/clearance via `getDistrictStats()`.
         **Rebuilt on a real basemap, 2026-08-30** (direct feedback: the
         original was a plain SVG schematic with no geography at all - "no
         maps in 2 types"). Still no Karnataka boundary GeoJSON bundled, and
         still none fabricated - instead, the same real per-district
         centroids are plotted as proportional circles on the same free
         CARTO basemap the hotspot map uses (`choropleth.html`), a standard
         honest cartographic form given no boundary data exists.
      2. **Time-of-day × day-of-week heatmap** - see P4.2.
      3. **Kernel-density heatmap layer** - `/crime-hotspots`, a
         Clusters/Density toggle on the same real coordinates.
      4. **Case-flow Sankey** - `/crime-count`, crime type → status →
         outcome, band width proportional to real counts, verified to
         balance 5,000→5,000→5,000.
      5. **Statewide link-analysis graph** - new `/pattern-analysis/network`
         page + sidebar link. Bipartite Person↔Case graph, the real 47
         evidence-linked people and 19 FIRs, 53 real edges. Deliberately no
         person-to-person edges - no real record ever names two people
         from different cases together, so drawing one would be fabricated.
         **Redesigned 2026-08-30** (direct feedback: "not visible and
         good") - root cause, not a styling fix: the graph is genuinely 15
         disconnected components (every fused person has `scenarioIds.length
         === 1`, so no edge ever crosses scenarios), and laying all 15 out
         in one shared d3-force simulation let mutual repulsion scatter them
         across a mostly-empty canvas - a real disconnected-component
         failure mode, not a tuning problem. Fixed by rendering one small,
         independently-laid-out d3-force graph per scenario in a responsive
         grid instead of fighting the topology on a single canvas - loses
         nothing (there was never a cross-scenario edge to draw) and every
         cluster is legible without panning. Same d3-force engine
         throughout; the library was never the problem.
      6. **Cross-district flow map** - `/crime-hotspots`, sourced from the
         15 authored scenarios only (never the 5,000 single-FIR bulk
         cases) - real result, 4 of 15 scenarios span two districts.
         **Also rebuilt on a real basemap, 2026-08-30**, same reasoning as
         the choropleth above (`flows.html`) - curved arcs between real
         district centroids, colored by crime type, on the same CARTO
         basemap.
      7. **Control-chart trend alerts** - see P4.3.
      **A real bug found and fixed during verification, not by the
      subagents' own testing:** two of the new `/crime-count` chart
      components (`TrendControlChart.tsx`, `CaseFlowSankey.tsx`) built each
      SVG `<title>` tooltip as multiple JSX children, which threw a real
      React hydration error on every page load - found via a live browser
      check post-merge, not assumed clean from a green build. Fixed by
      collapsing each into one template-literal string; confirmed clean on
      a fresh tab afterward.

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
- [x] **P5.4** Done (2026-08-29, subagent, `feature/p5-4-next-question`,
      merged). "Next question to ask" - real GLM tool-call grounded in
      `getScenarioTimeline()`'s evidence, following `contradictionDetector.ts`'s
      exact tool-schema-guarded pattern: any cited record ID not actually
      present in that case's evidence gets the whole suggestion discarded,
      never rendered. Only attempted for the 15 evidence-rich scenarios -
      the 5,000 P1.2 bulk cases correctly show no card (no evidence to
      ground a suggestion in). New teal-accented card on `/cases/[caseId]`,
      visually distinct from the existing red/purple contradiction cards.
      Live-verified the evidence-gating and honest no-credential
      degradation (missing env var caught, no card rendered, no crash);
      the live LLM call itself is unverified for the same reason every
      other P5 live call is (no Catalyst credentials in local dev).
- [x] **P5.5** ~~Suspicion score~~ — done as **P9.1** (see below), same
      item, different label.
- [x] **P5.6** ~~Citation guardrail in the tool schema~~ — done as **P9.1b**
      (see below), same item, different label.
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
- [x] **P5.8** Done (2026-08-29, subagent, `feature/p5-8-chatbot`, merged).
      Site-wide "Ask Anything" floating chat widget - `src/lib/askTools.ts`
      (6 real read tools wrapping `caseWorklist.ts`/`personFusion.ts`/
      `districtStats.ts`/`moPatterns.ts` - `search_cases`, `get_case`,
      `get_person`, `get_district_stats`, `list_mo_patterns`,
      `list_repeat_offenders`), `/api/ask` (a real multi-round GLM tool-
      calling loop - the first multi-round one in the codebase,
      `contradictionDetector.ts`'s is single-round), `AskAnything.tsx`
      (mounted once, site-wide, in `(site)/layout.tsx`).
      **The standout requirement met, not just attempted:** every case/
      person the model claims is checked against the real universe of ids
      before becoming a citation (a real `<Link>` in the answer) -
      hallucinated ids are dropped and counted, same discipline P5.6
      already established. Falls back to regex-extracted, still-validated
      citations if GLM answers in plain text instead of calling the
      terminal `respond_to_user` tool.
      Live-verified: opens correctly, a real question triggers a real POST
      to `/api/ask` (confirmed via network log) - fails honestly (504, no
      Catalyst credentials locally) rather than faking an answer. The full
      happy path (GLM actually calling tools and responding) is unverified
      for the same reason every other P5 live call is.
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
      **✅ Real functional bug found + fixed, live-verified, 2026-08-31.**
      "The full happy path is unverified" above turned out to hide 3 real
      bugs, all confirmed via a local production build against the real
      Catalyst QuickML endpoint with real `.env.local` credentials (same
      method as P7.1's verification):
        1. **Loop off-by-one (`src/app/api/ask/route.ts`)** — the "final
           nudge" message telling the model to stop looking things up and
           answer was built and pushed onto `messages` AFTER the last
           allowed `callGlm()` call had already happened, then discarded
           when the loop exited - no 4th call ever sent it. Any question
           needing a 3rd tool round hit the `504 "Gave up..."` error
           deterministically. This is what the officer-facing bug reports
           (and `assets/demo-ask.png`'s loading-state screenshot) were
           actually seeing.
        2. **`role:"tool"` silently ignored by the model.** The module's own
           original comment flagged this as an unexercised design (no
           `tool_call_id` correlation, plain content-only messages) - live-
           confirmed broken: the model re-issued the identical, empty-arg
           first tool call on every single round, completely blind to the
           real results already fed back. Fixed by feeding tool results
           back as `role:"user"` instead (the one role every chat template
           reliably reads) - immediately made the model correctly read and
           cite prior results.
        3. **Forcing `tool_choice` to a specific function 400s outright**
           (`MORE_THAN_MAX_LENGTH` / "Error in processing `zoho-inputstream`
           parameter" - not an actual length problem) - a second previously
           -unexercised llm.ts path. And trimming `tools` to just
           `[RESPOND_TOOL]` doesn't stop the model calling a *different*
           tool name not even in that list - the API doesn't enforce the
           request's own tools array. Also found: with no `tools` in the
           request at all, GLM-4.7 emits its chain-of-thought inline as a
           literal `<think>...</think>` block ahead of the real answer -
           `llm.ts`'s `callGlm()` now strips this before returning `text`
           (same "never render reasoning" rule as the top-level `reasoning`
           field already had).
      Full trace and the working final design (offer `[RESPOND_TOOL]` only
      on the forced final round, bumped `maxTokens` for that round) is
      documented inline at the fix site. Re-verified live end-to-end
      through the actual UI (screenshot: real formatted answer, real
      clickable citation chips, `droppedHallucinated: 0`) on both a
      3-round question ("Which cases involve a repeat offender?" - the
      exact one that used to fail) and a 1-round question ("Cases in
      Ballari?"). `assets/demo-ask.png`/`assets/README.md`'s "not yet
      fixed" note is now stale - worth a fresh capture next time the demo
      assets are touched.

## P6 — Zia ✅ closed (2026-08-29, decision: no synthetic images)

- [x] **P6.0** Decided: **no** synthetic case-document scans / CCTV stills.
      Closing P6 cleanly rather than building against fabricated source
      images - same discipline as everywhere else in this project (no
      invented evidence, no analytics theatre).
- [x] **P6.1** ~~OCR a scanned FIR~~ — not built. Needs a synthetic scanned
      document image, which P6.0 ruled out.
- [x] **P6.2** ~~Qwen-VL on a CCTV still~~ — not built. Needs a synthetic
      CCTV still, which P6.0 ruled out.
- [x] **P6.3** ~~Zia NER on `BriefFacts`~~ — not built. Genuinely didn't
      need an image (pure text), but closing the whole track per the
      decision rather than cherry-picking one item out of a "closed" track.

**Explicitly not building:** sentiment analysis on crime complaints (not a
policing signal), face recognition, barcode scanning, and now all of P6.

## P7 — Kannada voice pipeline (Zia Trained NLP Models)

*Found 2026-08-26 (`RESEARCH_AND_PLAN.md` §2.1). Same auth as P5's `llm.ts`
- different endpoints, no new token logic needed. Unlike P6, this is
**not gated on generating images** - the audio Text-to-Audio needs can be
synthesized from prose we already have, so P7 can start independently of
P6.0's decision.*

- [x] **P7.1** Done (2026-08-29, subagent, `feature/p7-1-kannada-tts`,
      merged). Text-to-Audio on real witness statements, wired into
      `/cases/[caseId]` right after the cross-source timeline - per-
      statement play/pause, 4 named Kannada voices, an English-text/
      Kannada-voice toggle, real loading/error UI with Retry. Reuses
      `llm.ts`'s already-verified `getAccessToken()`/`CATALYST-ORG` auth,
      no new token logic.
      ✅ **Contract confirmed and live-verified, 2026-08-29 (same day, after
      merge).** The subagent's inferred endpoint (`.../models/zia/audio/
      synthesize`) was live-confirmed WRONG - a real 404 from Zoho's own
      infra, found via the user clicking Play in the deployed app and
      seeing a raw HTML error page rendered (a real UI bug, fixed
      separately - see below). User then pulled the real contract straight
      off the Catalyst console's API Details tab: real path is
      `.../models/zia/tts/synthesize`; request fields are `language`/
      `speaker` (not the guessed `lang`/`voice`), plus optional `pitch`/
      `speed`/`emotion`. Fixed and **live-verified end to end** with real
      local `QUICKML_*` credentials (present in `.env.local`, which
      subagent worktrees don't inherit - that's why it was unverified
      until this point): a direct `curl` to `/api/tts` returned a real
      200, `audio/wav`, 129,890 bytes of real synthesized speech; the
      actual UI Play button confirmed working in-browser too.
      **Two real bugs found live and fixed, not just the endpoint:**
      (1) `ttsClient.ts` was dumping a raw HTML error-page body verbatim
      into the UI on a non-JSON error response (confirmed by the user's
      screenshot) - now detects HTML and falls back to a short status
      line; `StatementAudioPlayer.tsx` also caps whatever string does
      reach it at 200 chars as defense in depth.
      (2) Speakers are language-specific on Zia's side (confirmed via a
      real, clean API error: `"Speaker 'Vidya' is not available for
      language 'en'"`) - the player offered the same 4 Kannada-named
      voices regardless of the language toggle, including as its own
      default (voice defaulted to "Vidya" while language defaulted to
      "en" - broken on first render, before any user interaction). Added
      the real English voice set (Mary/Anna/Beth/Thomas/Adam/Brian, per
      the console's own inventory) and snap the voice selection to a
      valid one whenever the language toggle changes.
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

- [x] **X1** Done (2026-08-29). Real 7 Ranges (`src/lib/ranges.ts`, sourced
      from ksp.karnataka.gov.in - same source `RESEARCH_AND_PLAN.md` §1.5
      already cites) added as `<optgroup>` options in the district drill-down
      filter (`DistrictFilter.tsx`), each resolving to its seeded districts.
      **Honest limitation stated explicitly, not glossed over:** the seed
      only covers 8 of Karnataka's ~30 real districts, so every Range here
      is partially represented (1-2 seeded districts, not each range's real
      3-6) - `ranges.ts`'s own header comment says so, and
      `districtSetLabel()` never claims more coverage than the seed has.
      `scenarioInDistrict()` generalised from a single optional `districtId`
      to an optional `districtIds` array (a district-**set** test) -
      threaded through `dashboardData.ts`'s `getFeaturedScenario`/
      `getRealAlerts`/`getRealEvidenceFeed`, `api.ts`'s `getSummary`/
      `getCaseTypes`, and the live `/api/summary`/`/api/casetypes` route
      handlers (comma-separated `?district=` query param, backward-
      compatible with a single value). Typecheck + production build clean -
      confirms no other call site broke on the signature change.
- [x] **X2** Done (2026-08-29). Commissionerate-vs-district modeling
      shortcut documented explicitly in `catalyst/DATA_STORE_SCHEMA.md`
      right on the `District` table's own reference line, not buried
      elsewhere - states plainly that `/districts`, `districtStats.ts`, and
      `caseFacts.json`'s `districtId` are reporting revenue-district totals,
      Bengaluru Urban included, not a true commissionerate split. (§1.4c)
- [x] **X3** ~~CID assignment derived from district count~~ — fixed, commit
      `38853d5`. (§1.4b)

---

## Decisions still open

1. ~~**PR #1 — merge or close?** Gates all of P2.~~ Resolved 2026-08-27 - P2
   proceeded independently, PR #1 left for the user to close/discuss with
   the author directly. No longer gates anything.
2. ~~**P1.5 framing**~~ — resolved 2026-08-29: aggregate-only, victim-side,
   with denominators, never offender propensity. Built 2026-08-30 for
   occupation + religion — `/socio-economic`.
3. ~~**P6.0** — images, yes or no?~~ — resolved 2026-08-29: no, P6 closed.
4. **Caste taxonomy, specifically.** Item 2's resolution covers *how* to
   present caste/religion/occupation, not *what categories* to use for
   caste. Two real options, both used in actual Indian government crime
   reporting: (a) the official SC/ST/OBC/General categories — legally
   standard, and the basis for Prevention of Atrocities Act enforcement, so
   there's a real policy argument for including them; (b) skip caste
   entirely and report only religion + occupation, which sidesteps the
   sensitivity at the cost of one of the three PS-named categories.
   `CasteMaster` isn't built and no `CasteID` value has been generated
   either way — nothing is blocked on this being decided quickly, it's just
   real and worth a direct answer rather than a default.
5. **Show the P5.3 eval in the UI?** "Found 11 of 15, here are the 4 it
   missed" is a far stronger claim to a panel than a silent AI panel.
      *Recommend yes.*
6. **Real Catalyst Auth?** Resolved in part by P0.5 — there is no scope cookie
   any more, so nothing pretends to be access control. If per-officer views are
   ever wanted, they need real Catalyst Authentication first, and the district
   would come from the signed-in identity rather than a dropdown.

---

## P9 — Refined-prototype push (2026-08-28, deadline: today)

*User's explicit priority order: **1 (AI) → 3 (investigation analysis) → 4
(advanced visualizations) → 2 (CRUD)**, lowest to highest already covered
by P2.4. Not a "finish 1 before starting 3" gate - real effort in this
order, parallelized where the work is genuinely independent.*

**Split of labor:** P9.4 (the relationship graph) handed to a subagent on
its own branch (`feature/case-relationship-graph`) so it can run
independently while P9.1/P9.3 happen directly. Not merged to `main`
without review - report back before merging, same discipline as
everything else this session.

- [x] **P9.1** *(= P5.5)* **Suspicion score, for real.** Done. Deterministic
      weighted signals (extra-case count, cross-district count, whether the
      person's OWN cited records appear in a real authored contradiction,
      evidence volume) feed a real formula in `src/lib/suspicionScore.ts` -
      no LLM in this file at all. Today's scope deliberately stops short of
      the original P5.5 framing's LLM explanation step (a live call is
      10-60s, wrong for a page render; a precomputed batch is real
      follow-up work) - the "why" shown is the deterministic factor list
      itself, in plain language. New `RiskGauge.tsx`, surfaced on
      `/persons/[personId]`.
      Verified live against real people, by hand: Suresh Naik (KA-P0001,
      2 cases/2 districts, his own timeline includes the exact record ids
      C1's real contradiction cites) scores 55 ("Elevated") = 12+10+25+8,
      matching the formula exactly. Deepak M (KA-P0002, same scenario, but
      his own cited records do NOT include the contradiction's record ids)
      correctly scores only 2 ("Low") - confirms the check is real
      per-person attribution, not "same scenario has a contradiction
      somewhere." Typecheck + build clean.
- [x] **P9.1b** *(= P5.6)* Done. `minItems: 2` added to the
      `report_contradictions` tool schema itself in
      `contradictionDetector.ts` (was previously only a runtime check after
      the fact, `real.length >= 2`, still in place unchanged as the actual
      guarantee - a schema constraint is advisory, this makes it explicit
      to the model rather than only discovered afterward).
      *(P5.4 "next question to ask" and P5.8 the chatbot are explicitly
      NOT attempted today - real, more open-ended builds, noted as
      next-session work rather than rushed.)*
- [x] **P9.3** *(investigation analysis enrichment)* Done. Wired P4.6/P4.7's
      already-real signals INTO `/cases/[caseId]`: accused names are now
      links to their real `/persons/[personId]` profile, each tagged
      "Repeat (N)" if they're a real repeat subject (`caseWorklist.ts`
      extended with a new `accused: {personId,name,caseCount}[]` field
      alongside the existing `accusedNames: string[]`, kept for backward
      compat); and a new card shows when a case is part of a real MO
      cluster (`getMoPatternClusters()`), linking sections + a link to
      `/pattern-analysis`.
      Verified live against the exact clusters already verified earlier
      this session: case 9001 correctly shows Suresh Naik tagged
      "Repeat (2)"; case 9002 correctly shows "Linked to 1 other case by
      shared sections IPC-420, IPC-468, IPC-471 — partial match" - the
      exact `{9002, 9006}` cluster found in P4.6. No horizontal overflow
      (checked given the min-w-0 lesson from the earlier UI bug).
      Typecheck + build clean.
- [x] **P9.4** *(= advanced visualization, subagent)* **A real
      relationship/network graph on `/cases/[caseId]`**, replacing what
      the deleted `EvidenceBoard.tsx` used to show on mock data. Real
      nodes/edges only, derived from the same evidence already on that
      page (`resolvedPersons`, calls, transactions, CCTV sightings,
      witness statements) - accused/victims/witnesses/locations/phones/
      banks as nodes, an edge per real record connecting two of them.
      New `src/lib/relationshipGraph.ts` (extraction) +
      `CaseRelationshipGraph.tsx` (render - `d3-force` is already a
      dependency, reuse it rather than hand-rolling physics). Must degrade
      honestly for a case with few records (no graph invented where there's
      nothing to show), and must not fabricate an edge/relationship type
      not actually evidenced by a real record. **Done on
      `feature/case-relationship-graph`, merged to `main`** - built
      against the raw seed collections directly (not `getScenarioTimeline`,
      which flattens each record onto one person's own view and loses the
      pair a record actually connects), reusing personFusion.ts's
      `matchTextToPerson`/`extractCctvToken` (now exported) rather than
      reimplementing them. Nodes: Accused/Victim by `resolvedPersons`'
      real `type`, CCTV camera locations, and witnesses who don't already
      resolve to a known person. Edges: one per real call/transaction/
      cctv-sighting/witness-statement, self-statements dropped (not a
      relationship), multiple real records between the same pair drawn as
      distinct curved lines rather than collapsed into one. Verified
      against 3 real cases (9001/C1: 6 nodes·9 edges, 9012/C9: 5 nodes·3
      edges - honestly sparse, 9008/C6: 7 nodes·6 edges), counts
      cross-checked against a standalone JS replica run directly on the
      seed JSON, live in-browser with no console errors and no page
      overflow. Known honest gap: `matchTextToPerson`'s plain substring
      match misses some witness-name/CCTV free-text phrasings that don't
      literally contain a stored alias (e.g. "Faizal Khan installing a
      device" vs. alias "Faizal Khan (device installer)") - same
      pre-existing imprecision personFusion.ts already has for this
      helper, not introduced here, left as real follow-up.
- [x] **P9.2** *(= CRUD, lowest priority)* IO assignment endpoint - done.
      Same `updateRow()` pattern P2.4's status editor already proved live:
      `PATCH /api/cases/[caseId]/officer` updates `CaseMaster.PolicePersonID`.
      Not case-diary (still blocked on console table provisioning) or case
      creation (bigger, not scoped for today) - exactly as scoped.
      **Real roster, not invented officers**: `Employee`/`Rank`/
      `Designation` are already-imported Data Store tables (12 employees,
      real coverage of every district the seeded dataset uses - checked,
      min 1 per district). Bundled as `employees.json` via `build_seed.mjs`
      §8 (same pattern as `caseFacts.json`), resolved through the new
      `src/lib/employees.ts`. `caseFacts.json`/`WorklistCase` extended with
      the FIRs' real `PolicePersonID` and `districtId` so the picker shows
      the *actual* currently-assigned officer, prioritizes that district's
      own officers first, and needs no live query to do either.
      Verified live: bad `caseId` → 404, bad `employeeId` → 400, both
      before any DB call; a valid request reaches the real Catalyst call
      and fails with the same `"Failed to parse object"` every other local
      live call hits (expected, not a bug - needs a Slate deploy to
      confirm the write itself, same as P2.4). Confirmed via the
      accessibility tree (not just page text, which doesn't reliably show
      which `<option>` is selected) that case 9001 correctly pre-selects
      its real assigned officer, Inspector Manjunath R. Typecheck +
      production build clean.

---

## P10 — Live Data Store as the app's single source of truth ✅ **done, 2026-09-02/03**

*Raised 2026-09-02, after P1.6 put the full 12,000-case dataset into the live
Data Store and it became obvious how little of the app actually read it.
Scoped as a 4-phase plan, deliberately NOT attempted before the deadline at
first — then the user chose full scope twice over, once after the initial
1-page recommendation and once again after the real 9-consumer blast radius
was disclosed. All 4 phases shipped, live-verified, not just built.*

### The problem, as it stood before this track

**The application was a bundled-JSON app with a Data Store bolted to two
corners of it.** Almost every page rendered from `src/lib/nosql-seed/*.json` —
a 6 MB snapshot compiled into the build — not from Catalyst. Verified by
tracing every caller, not by reading the old docs (which overstated this: they
listed four "live" routes, two of which nothing called):

| Surface (before P10) | Read from |
|---|---|
| `/` landing headline numbers | **live Data Store** (`/api/summary`) |
| `/dashboard` trend chart, category donut | **live Data Store** |
| case status / IO assignment edits | **live Data Store** (the only writes) |
| `/cases`, `/districts`, `/persons`, `/crime-count`, `/crime-hotspots`, `/pattern-analysis`, `/repeat-offenders`, `/socio-economic`, Ask Anything | bundled JSON |
| `/api/districts`, `/api/district-stats` | live — dead routes, nothing fetched them |

Two consequences that mattered to a reviewer, both now fixed:

1. **A write was invisible.** `/api/cases/[id]/status`/`/officer` wrote to the
   live Data Store, but every read path served the bundled snapshot — a
   status change succeeded and then showed up nowhere. Known since P2.4.
2. **Changing a single row meant rebuilding and redeploying the snapshot.**
   That's a build artefact, not a database.

### What CRUD looked like before this track

| | Before | After |
|---|---|---|
| **C**reate | none | ✅ real FIR creation — `POST /api/cases`, `/cases/new` form |
| **R**ead | 2 routes | ✅ 13 read paths, the whole app |
| **U**pdate | 2 columns, 1 table | unchanged (status + officer were already real writes) |
| **D**elete | none | ✅ real primitives (`deleteRow`/`deleteRows`), verified live; not wired into any endpoint (see P10.4 note) |

### What actually shipped, phase by phase

- [x] **P10.1** ✅ Write primitives added to `src/lib/zcql.ts`:
      `insertRow`/`insertRows`/`deleteRow`/`deleteRows`, matching the existing
      `updateRow()` pattern, via the SDK table API (deliberately not ZCQL
      INSERT/DELETE — see the file's own comment on the injection-risk
      reasoning). Verified live end-to-end via the Catalyst MCP before
      considering it done: inserted a real test row into `CaseMaster`,
      confirmed it was genuinely visible via ZCQL, deleted it, confirmed the
      count returned to exactly 12,000.
- [x] **P10.2** ✅ `zcqlAll()`'s off-by-one fixed **at the root**, not
      per-route. Confirmed live: `LIMIT 12000,300` on a table with exactly
      12,000 rows returns the table's last row again instead of an empty
      page — a genuine ZCQL boundary bug. `zcqlAll()` now dedupes by `ROWID`
      as it paginates; every one of its 8 call sites across 5 routes updated
      to `SELECT ROWID` so the dedup can engage. Verified live: `/api/summary`,
      `/api/casetypes`, `/api/districts`, `/api/district-stats` all confirmed
      returning the true 12,000/31, not 12,001.
- [x] **P10.3** ✅ Every read path moved to the live Data Store — not just
      `/cases`. `getCaseWorklist()` and its 11 downstream consumers, plus
      `moPatterns.ts`/`statewideNetwork.ts` (which read `caseFacts.json`
      directly), all now read `src/lib/liveCaseFacts.ts`'s
      `getLiveCaseFacts()` — one shared, cached (TTL 90s, single-flight
      lock), fallback-on-failure live reconstruction of `caseFacts.json`'s
      shape from 5 parallel table walks (`CaseMaster`, `ComplainantDetails`,
      `ActSectionAssociation`+`Act`+`Section`, `Unit`). 13 read paths
      converted together because they all trace to the same source, not
      migrated independently. Two real, documented limitations: the 19
      authored scenarios' `scenarioId` still comes from the tiny static
      `caseScenarioMap.json` (no such column exists live), and the
      repeat-offender cross-reference (`accused.json`) is not rebuilt live
      (a materially different aggregation, out of scope). **Live-verified
      the actual point of this phase**: created a real FIR via `POST
      /api/cases`, confirmed its real CrimeNo appeared in `/cases`'s
      worklist and the total read 12,001 — a write visible in the list, not
      just on its own page — then cleaned up the test row.
      **Real, live-measured finding, not an assumption**: the TTL cache is
      module-scope (per-instance), and this Data Store's Slate/AppSail
      runtime spreads requests across multiple concurrent instances with no
      session affinity — 4 back-to-back requests to `/districts` (31 rows,
      not a large render) measured 10.9s/8.8s/3.3s/5.5s, only one a clear
      cache hit. The cache helps, but "paid once per 90s" is not what
      happens in practice — see `liveCaseFacts.ts`'s header for the full
      finding and the real fix (a cross-instance cache, e.g. Catalyst's own
      Cache service — confirmed to exist via the MCP, not implemented).
      This makes issue #4 (loading skeletons) more load-bearing than
      before this phase, not less.
- [x] **P10.4** ✅ Real create shipped: `POST /api/cases` (validates every
      field against real bundled/live lookups before any insert — district,
      crime type, police station via a live `Unit` check, officer via the
      bundled register), a genuine `/cases/new` form (district→station
      cascade, complainant mandatory, victim/accused optional), and
      `GET /api/units` (small live read for the station picker). ID-minting
      deliberately avoids timestamps (would silently truncate — the exact
      `int(10)` bug just fixed in `ActSectionAssociation`); `CrimeNo` uses a
      real live-queried next serial so a new FIR's number is genuine, not
      fabricated. One real integration bug found by the phase's own live
      test and fixed within it: a freshly-created case 404'd on its own
      detail page (`getWorklistCase()` 404'd before any live-override code
      ran) — fixed via `getLiveOnlyCase()`, reusing the same synthetic
      `scenarioId` convention bulk cases already use. **Not done**: edit
      beyond status/officer (`BriefFacts`, `GravityOffenceID`, etc.) and a
      delete/withdraw endpoint (`deleteRow`/`deleteRows` exist and are
      verified working, just not wired to a route) — real, scoped, smaller
      follow-up work, not started.
- [ ] **P10.5** Not done. `/api/districts` and `/api/district-stats` are
      still dead routes (confirmed nothing calls them, unchanged from
      before this track) — delete or wire up, either is fine. The bundled
      snapshot itself was never retired (it's the fallback on any live
      failure now, a deliberate design, not leftover debt) — "retire" was
      the wrong framing from the start; "keep as an explicit fallback" is
      what actually happened and is correct.

### What makes this genuinely hard — read before estimating

Revised 2026-09-02 after connecting the official Catalyst MCP and verifying
several of these live rather than from docs. Two of the five constraints
below were flat wrong; corrected in place with what actually happened,
because trusting the wrong version cost real time twice already this
project (see the `COUNT()` and `ActSectionAssociation` history in
`catalyst/README.md` §2).

- **ZCQL caps any `SELECT` without its own `LIMIT` at 300 rows**, so a raw
  row-by-row read of 12,000 cases is 40 sequential paginated round trips.
  Still true, and still real for anything that needs the whole register in
  memory — the analytics pages (heatmap, hotspots, MO clustering, statewide
  network) fall in this bucket and still justify the bundled snapshot.
  Row-*listing* pages are the genuinely hard case; aggregate-shaped ones no
  longer are (see next point).
- **~~`COUNT(...) AS alias` silently returns 0~~ — WRONG, corrected
  2026-09-02.** `COUNT()` works fine. What ZCQL actually drops is the `AS`
  alias itself — `SELECT COUNT(ROWID) AS total` returns the key
  `COUNT(ROWID)`, not `total`; reading `row.total` silently returns
  `undefined`. Verified live: `SELECT COUNT(ROWID) FROM CaseMaster` → exact
  `12000`, `GROUP BY CaseStatusID` → the full real breakdown. `/api/summary`
  was rewritten on this basis (2026-09-02): 40 sequential round trips → ~8
  aggregate queries, 2.15s → 0.30s, and the `zcqlAll()` off-by-one
  disappeared from that route as a side effect (still present anywhere else
  still using `zcqlAll()` for a count). This means P10.3's row-*listing*
  pages are still the hard part; aggregate-shaped reads (most of the
  dashboard, district/status breakdowns, trend charts once `YEAR()`'s
  absence is worked around) are cheap now, not blocked. Two real ZCQL gaps
  found alongside this, both live-confirmed: no `YEAR()` function, and JOINs
  need a declared Lookup relationship (`CaseMaster.PoliceStationID` is a
  plain Number, not a Lookup, so district scoping needs a two-step query,
  not a join).
- **~~No DDL outside the console~~ — WRONG, corrected 2026-09-02.** The
  Catalyst MCP (`catalyst.zohomcp.in`, connected this session) exposes real
  DDL: `Create_Table`, `Create_Column`, `Update_Column`, `Delete_Column`,
  `Delete_Table`, `Truncate_Table` — 19 Datastore-group tools in total, more
  than the bundled `catalystbyzoho/agent-skills` docs enumerate (186 tools
  across 22 groups live vs. a handful documented; check
  `ZohoMCP_listTools` directly rather than trusting the skill's tool list).
  One real sub-limit found using it: `Update_Column` cannot change an
  existing column's `data_type` in place (`"Data type of this column cannot
  be changed"`) — changing a column's type is drop-and-recreate
  (`Delete_Column` + `Create_Column`), not an ALTER. Table/column creation
  from application code (not just the console) is genuinely available for
  P10's endpoints if they ever need a new table.
- **Lookup columns can silently corrupt data.** ✅ **Fixed 2026-09-02** — see
  `catalyst/README.md` §2's `ActSectionAssociation` writeup for the full
  story (int column, 10-digit cap, truncated every 17-digit ROWID; fixed by
  drop-and-recreate as bigint via the MCP, no console step needed in the
  end). Keep the lesson even though the instance is fixed: validate what
  comes back out of a write, never trust its own success message.
- **Writes can't be tested locally.** Still true for `zcql.ts`'s
  `catalyst.initialize(req)` path (needs a real Catalyst request context,
  only exists in a deployed Slate route) — but this no longer blocks
  *verifying Data Store behaviour*, just this app's own request-scoped SDK
  calls. The Catalyst MCP talks to the same live Data Store directly, so ZCQL
  queries, imports and DDL can all be tried and confirmed without a deploy
  loop, as the `ActSectionAssociation` fix and the `/api/summary` rewrite
  both did today. Testing an actual Next.js Route Handler's write still
  needs a deploy.
- **A different safety layer can block destructive Data Store calls even
  with the user's go-ahead.** Not a Catalyst limitation — Claude Code's own
  auto-mode classifier blocked `Truncate_Table`/`Delete_Rows` in a
  non-interactive session regardless of chat-level approval; it only cleared
  once the same calls were re-run in an interactive session where the user
  could approve the specific prompt. Relevant to anyone continuing P10's
  destructive steps (P10.4's writes, `/api/districts`'s removal): budget for
  running those in an interactive session, not an automated one.
- **Latency and cold starts.** The token cache in `llm.ts` is module-scope and
  doesn't survive a cold start; the same will apply to any Data Store caching.

### Scope note

This is a **rearchitecture, not a task** — realistically the largest single
item left in this plan, and it is not a candidate for the 6 Sept deadline. It
is recorded here because the current split is a real architectural debt that a
technical reviewer will ask about, and because P1.6 makes it tractable for the
first time (the live store now actually holds the full dataset). Do it after
the submission window, or scope it down to P10.1 + P10.2 + making writes
visible, which is the part that removes the most obvious credibility gap.
