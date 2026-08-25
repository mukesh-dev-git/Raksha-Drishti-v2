# Domain research + AI build plan

Two things in one doc, because they constrain each other:

1. **Who Karnataka State Police actually is**, and what that means for how this
   app should be scoped — research done 2026-08-25 against KSP's own org pages.
2. **What AI we can actually build now** on the Zoho Catalyst capabilities
   available to us (2 served LLMs + Zia microservices), and in what order.

> **This doc is the *why*.** The sequenced *what and when* now lives in
> [`PLAN.md`](PLAN.md) — check there for current task status before acting on
> any checklist here; several items below have been superseded or already
> done, and are marked inline where so.

Status: research + rationale. Companion docs:
[`features.md`](features.md) (the 6 proposed investigation-intelligence
features, still valid), [`catalyst/README.md`](catalyst/README.md) (backend
source of truth), [`catalyst/DATA_STORE_SCHEMA.md`](catalyst/DATA_STORE_SCHEMA.md).

---

# Part 1 — How Karnataka State Police actually works

## 1.1 The command chain is five tiers, not two

We built `state` vs `district` as a binary. The real structure has more levels,
and two of them matter for this app.

```
                    DGP & IGP (State Police HQ)
                              |
        +---------------------+---------------------+------------------+
        |                     |                     |                  |
  ADGP Law & Order     ADGP Crime & Tech        CID (DGP-rank)    6 City
        |                     |                  state-wide,      Commissionerates
   7 RANGES (IGP)          **SCRB**              by assignment          |
   3-6 districts each   statewide crime data                      DCP Divisions
        |                 & statistics                                 |
   31 DISTRICTS (SP)      (since 1977)                            City Police
        |                                                           Stations
   91 Sub-Divisions (SDPO) / 230 Circles
        |
   906 POLICE STATIONS  <- FIRs are registered here
```

Key facts (sources at the bottom of Part 1):

- **7 Ranges**, each headed by an IGP, each covering **3–6 districts**.
  e.g. Southern Range = Mysuru + Kodagu + Mandya + Hassan + Chamarajanagara.
- **31 District Police Offices**, headed by an SP ("unit officers"),
  **91 SDPOs**, **230 circles**, **906 police stations**.
- **6 City Commissionerates** run *in parallel* to the district structure —
  Bengaluru's CP is ADGP-rank, the rest DIG-rank. Bengaluru City alone is
  **11 law-and-order DCP divisions + 4 traffic divisions**. A commissionerate
  is **not** a district.
- **SCRB** sits under the ADGP (Crime & Technical Services) via the Police
  Computer Wing. Since 1977 its statutory job is to compile crime/criminal
  information statewide and feed NCRB.
- **CID** is DGP-rank with four wings — CID proper (homicide/burglary/special
  inquiries), Economic Offences, Cyber Crimes & Narcotics, and the Forest Cell.

## 1.2 The single most important finding: SCRB is the customer

Re-read the problem statement with the org chart in hand:

> *"The State Crime Records Bureau currently receives limited, fragmented
> information, hindering its ability to perform comprehensive state-wide
> analysis."*

That is not a general grievance about policing. It **names one specific desk**,
and it describes exactly that desk's statutory function failing. SCRB's whole
purpose is to be the point where every district's and every commissionerate's
crime returns converge into one state picture. Today that convergence happens
on paper and in Excel.

Every one of the six capabilities the PS asks for — hotspot maps, link
analysis, socio-economic overlays, predictive risk, trend discovery, ML
intelligence — is only possible *after* that convergence exists.

**Implication for us:** the statewide Dashboard is not a peer view sitting
alongside the District view. It **is the product**. District and station views
exist so the data SCRB depends on gets entered once, correctly, where the
incident happened. We should stop presenting the two as symmetric options.

## 1.3 What each tier needs from this app

| Tier | Sees | Job in this app | Current build |
|---|---|---|---|
| **SCRB / State HQ** | All districts + commissionerates | Cross-district correlation, overlays, predictive risk, trend discovery | Statewide dashboard ✅ · all AI ❌ |
| **Range (IGP)** | 3–6 districts | Compare districts in a region; catch a pattern crossing 2–3 neighbours before it reaches state level | **Missing tier** ❌ |
| **District (SP)** | One district, all its stations | Own cases, hotspots, repeat offenders; drill into any station | ✅ as a **filter** — `/dashboard?district=NNN`, not a login role (see below) |
| **Commissionerate (CP/DCP)** | One city, its DCP divisions | Same shape of need as a District SP, different unit type | **Not modeled** ❌ |
| **CID** | Only cases assigned to it | Track its caseload — a *list*, not a geography | **Wrong model** ⚠️ (see 1.4) |
| **Station / IO** | Their own case | Timeline, evidence, network graph, MO | ✅ Investigation Workspace |

## 1.4 Three corrections the current build needs

### (a) Add the Range tier — small, mechanical
**Reframed since this was written.** District turned out not to belong as a
login *role* at all — the PS asks for SCRB to drill into districts, not for
district officers to get restricted logins, and with no real auth a
self-selected jurisdiction implied an access boundary the app doesn't have.
`viewScope.ts` / `viewScope.server.ts` / `ViewScopeSwitcher.tsx` are deleted;
district is now a URL filter (`/dashboard?district=`, `DistrictFilter.tsx`).

So the Range tier is no longer "a third role" — it's a **coarser filter
option**: one entry per Range in the same drill-down control, resolving to
that Range's 3–6 districts. `scenarioInDistrict(id, districtId?)` generalises
to a district-*set* test. Tracked as X1 in [`PLAN.md`](PLAN.md).

### (b) Stop deriving CID from geography — this one is actually wrong
`catalyst/dataset-v2/build_seed.mjs` currently does:

```js
handlingLevel = districtIds.length > 1 ? "State CID" : "District"
```

Real CID intake has nothing to do with how many districts a case touches. Per
CID's own org page, cases reach CID by **explicit assignment**: order of the
Government of Karnataka, order of the DGP, or Supreme Court / High Court
referral — plus category-based intake (economic offences above ₹1 crore,
cybercrime, human trafficking) and one automatic trigger: **police custodial
death is always taken up by CID.** Organized-crime cases run under KCOCA 2000.

Cross-district ≠ CID. Two district SPs coordinating directly, or the Range IGP
coordinating them, is the *normal* path.

**Fix:** replace the derived field with a seeded, explicit
`assignedTo: "District" | "CID"` plus a stated `assignmentReason` (e.g.
`"EOW — fraud > ₹1cr"`, `"DGP order"`, `"custodial death — automatic"`). Then
the "State CID" badge in the UI means something real.

### (c) Commissionerates aren't districts
If the seed folds Bengaluru/Mysuru/etc. into `DistrictID` alongside revenue
districts, that's a modeling shortcut. Even if the UI keeps treating them
identically for now, it needs to be **stated explicitly** in
`DATA_STORE_SCHEMA.md` rather than left implicit — otherwise the next person
reads district counts as revenue districts and is wrong.

## 1.5 Sources

- [KSP — Organization](https://ksp.karnataka.gov.in/page/About+Us/Organization/en) — ranges, districts, SCRB under Police Computer Wing, hierarchy
- [Karnataka CID — Organisation](https://cid.karnataka.gov.in/2/organisation/en) — four wings, case categories, escalation/assignment rules
- [Wikipedia — Karnataka State Police](https://en.wikipedia.org/wiki/Karnataka_State_Police) — station/circle/SDPO/DPO counts
- [Wikipedia — Bengaluru City Police](https://en.wikipedia.org/wiki/Bengaluru_City_Police) — DCP division structure

> Treat exact commissionerate city lists and rank details as approximate —
> verify against ksp.karnataka.gov.in before quoting externally.

---

# Part 2 — What AI we actually have available

## 2.1 Inventory

**QuickML → Generative AI → LLM Serving** (2 models deployed in our project):

| Model | Shape | Notes |
|---|---|---|
| **GLM-4.7-Flash** | MoE text LLM | 200K input context, up to 128K output cap (4,096 max_tokens per response, default 500), temperature 0.0–1.0 (default 0.7), **native tool calling**, "Enable Thinking" step-reasoning mode, custom system Instructions. Available in the IN data centre. |
| **Qwen 3.6 – 35B Vision Language** | 35B MoE, 3B active, multimodal | Image + text in. |

**Zia microservices** (ready-made, no training):
Text Analytics (sentiment + NER + keyword extraction, **1500 char limit per
request**), OCR (beta), Face Analytics, Identity Scanner (beta), Image
Moderation, Object Recognition, Barcode Scanner.

**Also present in the console, not yet evaluated:** RAG, Knowledge Base,
Trained NLP Models, Pipelines, Endpoints.

## 2.2 The one blocker to resolve first

**The LLM Serving API endpoint format is not in the public docs.** The docs say
to get it from the console: *Generative AI → LLM Serving → model → Model
Details → API Details*. Auth is OAuth-based; the ML-endpoint pattern documented
nearby uses `Authorization: Zoho-oauthtoken <token>` +
`X-QUICKML-ENDPOINT-KEY` + `CATALYST-ORG` headers with scope
`QuickML.deployment.READ`, but **do not assume LLM Serving is identical** —
read the actual API Details panel and paste the real contract here before
anyone writes client code against a guess.

**Task 0 for whoever starts this: open the console, copy the exact endpoint +
headers + request/response schema into this doc.** Everything in Part 3 is
blocked on that one screenshot's worth of information.

## 2.3 What our data can actually feed

This is the part that determines what's buildable *now* vs. what needs new data.

**Real free text we already have (this is the good news):**
- `CaseMaster.BriefFacts` (Text) — a narrative per case, **populated in the seed**
- `WitnessStatements.json` — 22 statements, real `statementText` prose
- `scenarioMeta.json` — 15 scenarios with `title` + `summary` prose
- `Contradictions.json` — **15 hand-authored contradiction descriptions**
- `CallRecords`, `Transactions`, `CCTVSightings`, `TimelineEvents` — structured

**The critical observation about `Contradictions.json`:** those 15
contradictions are *pre-authored by us*, not detected. Right now the app
"finds" contradictions it was told about. That's the honest gap — and it's also
a gift: **those 15 become the ground-truth eval set.** If a detector we build
independently rediscovers them from `WitnessStatements` + `CCTVSightings` +
`CallRecords`, we have a real, measurable claim. If it doesn't, we know.

**What we do NOT have:** any images. So Qwen-VL, OCR, Face Analytics, Identity
Scanner, Image Moderation, Object Recognition and Barcode Scanner have **no
input** unless we generate or source case-document scans / CCTV stills. This is
why Zia goes last — agreed.

## 2.4 Honest fit assessment per capability

| Capability | Tool | Verdict |
|---|---|---|
| Contradiction detection across sources | GLM-4.7-Flash (tool calling + 200K ctx) | ✅ **Best fit.** Whole scenario fits in context; tool calling gives us structured, citable output |
| "Next question to ask" agent | GLM-4.7-Flash | ✅ Same engine, different phrasing step |
| Entity fusion / repeat-offender linking | **Deterministic code, not LLM** | ✅ Union-find over name variants + IDs. Don't reach for an LLM here — it's a correctness problem, not a language problem |
| Suspicion score + explainability | Weighted signals in code; LLM only writes the explanation | ✅ Keep the number deterministic and auditable |
| FIR narrative → structured entities | Zia NER, or GLM | ⚠️ Zia caps at 1500 chars; GLM has no such limit and gives citations. **Prefer GLM**, keep Zia as a cheap cross-check |
| Sentiment on complainant statements | Zia Text Analytics | ❌ **Skip.** Sentiment on a crime complaint is not a meaningful policing signal — it would be analytics theatre |
| Case-document OCR, CCTV image analysis | Zia OCR / Qwen-VL | ⏸️ Blocked on having images at all |
| Predictive risk scoring / hotspot forecast | QuickML Pipelines (classical ML) | ⏸️ Needs a real historical baseline the seed doesn't carry yet |
| Socio-economic overlays | — | ⏸️ Needs an external census/urbanization dataset we have no source for |

---

# Part 3 — Things to be done

Three tracks. **A and B run in parallel** (different people, no shared files).
C is gated behind having images at all.

## Track A — Domain correctness (no AI, unblocks nothing else)

Small, safe, mostly mechanical. Good for whoever isn't on the AI track.

- [x] **A1.** ~~Replace derived `handlingLevel` with seeded `assignedTo` +
      `assignmentReason`~~ — **done**, commit `38853d5`.
- [ ] **A2.** Add Range options to the district drill-down filter (see §1.4a
      as reframed); generalise `scenarioInDistrict()` to a district-set test.
      Now tracked as **X1** in [`PLAN.md`](PLAN.md).
- [ ] **A3.** Document the commissionerate-vs-district modeling shortcut in
      `DATA_STORE_SCHEMA.md`.
- [x] **A4.** ~~Reframe the Dashboard copy so statewide reads as the SCRB
      intelligence view~~ — **done** (P0.4/P0.5, `c349d48` / `db5b1bd`).
- [x] **A5.** ~~Decide the fate of `feature/state-district-scope`~~ — merged
      to `main` and the branch deleted. The Crime Hotspots fix it carried is
      now live; the scope model it carried was reworked (P0.5).

## Track B — AI, on GLM-4.7-Flash (the real differentiator)

- [ ] **B0. 🚧 BLOCKER — get the real LLM Serving API contract** from the
      console (2.2) and paste endpoint + headers + request/response schema
      into this doc. Nobody writes client code before this.
- [ ] **B1.** `src/lib/llm.ts` — a thin server-side GLM client. Route
      Handler-only (credentials never reach the browser), typed request/
      response, timeout + graceful fallback, and **every call logged with its
      prompt + response** so we can show the working.
- [ ] **B2.** **Entity fusion (deterministic).** Union-find over
      `Accused`/`Victim`/`ComplainantDetails` + NoSQL persons. Canonical person
      ID stable across cases. **No LLM.** This is `features.md` #1 and it is
      still the foundation — B3/B4/B5 are all reasoning over it.
- [ ] **B3.** **Cross-source timeline merge** (`features.md` #6) — one ordered
      timeline per person, each event tagged with which source reported it.
- [ ] **B4.** **Contradiction detector.** GLM + tool calling over a fused
      person's timeline, returning structured `{claim, conflictingClaim,
      sourceRecordIds[], confidence}`. **Evaluate against the 15 authored
      contradictions in `Contradictions.json`** — report the real hit rate,
      including misses.
- [ ] **B5.** **"Next question to ask"** — phrasing layer on B4's output.
      Same engine, different prompt.
- [ ] **B6.** **Suspicion score** — deterministic weighted signals feeding the
      existing `RiskGauge` in `AIPanel.tsx`; GLM only writes the prose
      explanation, never the number.
- [ ] **B7.** **Citation guardrail** (`features.md` #5) — enforce in the tool
      schema itself: no finding is renderable without at least one real record
      ID. Build this into B4's contract from day one, not after.
- [ ] **B8.** **Repeat-offender view** — the cross-case surface B2 unlocks.
      This is the PS's "impossible in Excel" claim made literal, and it's
      SCRB/CID-facing, not IO-facing.

## Track C — Zia (last, and only if we get images)

- [ ] **C1.** Decide: do we generate synthetic case-document scans / CCTV
      stills at all? If no, Track C is closed — say so and stop.
- [ ] **C2.** If yes: OCR on a scanned FIR → extracted text → GLM structuring.
      A genuinely good demo of "paper record → queryable intelligence," which
      is exactly the PS's framing.
- [ ] **C3.** Qwen-VL on a CCTV still → description cross-checked against the
      `CCTVSightings` record. Only meaningful *after* B4 exists to check against.
- [ ] **C4.** Zia NER on `BriefFacts` as a cheap cross-check on B2's entity
      extraction. Cap-aware (1500 chars) — chunk or skip long narratives.
- [ ] **Explicitly not doing:** sentiment analysis on complaints, face
      recognition on synthetic faces, barcode scanning. No policing value here;
      including them would be feature theatre. (Face recognition on real police
      data would also be a serious civil-liberties question we should not
      hand-wave in a demo.)

## Sequencing at a glance

```
Track A  ──────────────────────────────────>  (independent, any time)

Track B  B0 ──> B1 ──> B2 ──> B3 ──┬──> B4 ──> B5
  blocker      client   fusion   timeline │      B6, B7, B8
                                          └── eval vs. the 15 authored contradictions

Track C                                    ────> gated on C1 (do images exist?)
```

---

# Part 4 — Open decisions (for the planning session)

1. **Merge or rebase `feature/state-district-scope`?** It's unmerged and Track
   A builds on it. Decide before A1.
2. **Who takes which track?** A and B genuinely don't collide — different files.
3. **Do we invest in images at all** (C1)? A yes/no now saves arguing later.
4. **Does the 15-contradiction eval get shown in the UI?** Reporting "our
   detector found 11 of 15, and here are the 4 it missed" is a much stronger
   claim to a judging panel than a silent AI panel. Recommend yes.
5. **Is the Range tier worth the effort**, or is it academically correct but
   demo-irrelevant? It's cheap (A2), but it's not zero.
6. **Do we ever wire real Catalyst Authentication?** Everything scope-related
   today is a client-writable cookie — a display preference, not access
   control. Fine for a demo; needs saying out loud, not discovering.

---

# Part 5 — Data Store audit (added 2026-08-25)

Triggered by the right question: *"are we using all the tables they gave us?"*
The organizers' ER diagram is not documentation — **it is a specification of
the features they expect.** Every column they defined and we ignore is an
unmet requirement.

## 5.1 The headline numbers

| | Count |
|---|---|
| Tables in the organizers' ER diagram | **27** (21 backbone + 6 extended) |
| Tables built + seeded in Catalyst | 20 |
| **Tables the app ever reads** | **4** |
| Tables seeded but never read once | 16 |
| Backbone tables never even seeded | 1 (`ChargesheetDetails`) |
| Extended tables never built | 6 |

The four we read: `CaseMaster`, `CrimeSubHead`, `District`, `Unit`.
That is **15% of the schema we were handed.**

It's worse one level down. `CaseMaster` has 18 columns; we read **5** —
`CaseMasterID`, `CrimeRegisteredDate`, `CaseStatusID`, `PoliceStationID`,
`CrimeMinorHeadID`. Confirmed by grep: **nothing in `src/` reads**
`latitude`, `longitude`, `IncidentFromDate`, `IncidentToDate`, `BriefFacts`,
`GravityOffenceID`, `CaseCategoryID`, `CourtID`, or `PolicePersonID`.

## 5.2 The unused columns ARE the unbuilt PS capabilities

This is the part that matters. Line up what we ignore against what the
problem statement asks for:

| Unused table / column | PS capability it directly unlocks |
|---|---|
| `CaseMaster.latitude` / `longitude` | Hotspot map on **real incident coordinates** — the map's headline feature |
| `CaseMaster.IncidentFromDate` (time of day) | *"Spatiotemporal Clusters: layering **time of day** with location"* — **named verbatim in the PS**, and the column is already seeded |
| `Accused.PersonID` | **Repeat-offender tracking across jurisdictions** — the organizers gave us a person key on purpose |
| `GravityOffenceID` (Heinous / Non-Heinous) | The primary NCRB/SCRB severity split; every state crime report leads with it |
| `ChargesheetDetails` | Chargesheet rate + **time-to-chargesheet** — a core SCRB performance metric |
| `Act` / `Section` / `ActSectionAssociation` | MO by legal section; "same sections charged" is a real case-linkage signal |
| `Employee` / `Rank` / `Designation` | IO workload, clearance rate by officer and unit |
| `Court` | Disposal and prosecution tracking |
| `CasteMaster` / `ReligionMaster` / `OccupationMaster` | *"Socio-Economic Correlation... urbanization, population, socio-economic indicators"* — **also named in the PS.** `ComplainantDetails` already has all three FK columns |
| `CaseCategory` (FIR / UDR / **Zero FIR** / PAR) | Zero FIR = registered outside jurisdiction then transferred — inherently an SCRB-level view |

**Conclusion: we do not have an "AI features missing" problem so much as a
"we are using 15% of the given schema" problem.** Most of what the PS asks
for is reachable from columns already sitting in the Data Store.

## 5.3 Two bugs found during the audit

### (a) `Accused.PersonID` is unusable as a person key
The organizers put a `PersonID` Text column on `Accused` — the natural
cross-case person identifier. Our seed populated it with **scenario-local
labels** (`A1`, `A2`, `A3`, `A4`) that collide across scenarios:

```
A1 -> 17 distinct names: Suresh Naik / Suresh N. / Praveen Achari / Zoya Merchant ...
A2 -> 18 distinct names: Deepak M / Manoj Kumar S / Tarun Bhatia ...
A3 -> 12 distinct names   A4 -> 5 distinct names
```

The one column designed for repeat-offender tracking currently makes 17
different people look like the same person. **Must be globally unique before
any entity-fusion or person-spine work** (Track B2 / the `/persons/[id]`
route). This is a seed bug, not a schema bug.

### (b) We swapped a 406-case dataset for a 19-case one
Two seeds exist and only one is live:

| | `catalyst/seed/` (original) | `catalyst/dataset-v2/` (**live**) |
|---|---|---|
| `CaseMaster` | **406** | **19** |
| `Victim` / `Accused` / `Complainant` | 406 / 406 / 406 | 14 / 53 / 22 |
| `ChargesheetDetails` | **233** | **absent** |
| Authored scenarios + evidence | none | **15, with NoSQL evidence** |

dataset-v2 is far richer *per case* but **21× smaller**. Across 8 districts
and 5 years, 19 cases is roughly **half a case per district per year** —
you cannot do trend analysis, hotspot clustering, anomaly detection or
predictive risk on that, and those are four of the PS's six asks.

Note the local dashboard shows ~2,880 FIRs; that is the **mock fallback** in
`data.ts` (local dev has no Catalyst context). The deployed app's real
number is 19. Worth being clear-eyed about before any demo.

## 5.4 On wiping the Data Store

Wiping is safe and cheap — every table is regenerated deterministically from
`cases.json` via `build_seed.mjs`, and re-imported with `catalyst ds:import`.

**But do not wipe first.** The rows aren't the problem; the *generator* is.
Wiping now just reproduces the same 15%-of-schema dataset. Correct order:

1. Fix the generator (Track D below).
2. Regenerate locally and verify the CSVs.
3. **Then** wipe and re-import once, cleanly.

## 5.5 Track D — make the seed match the schema

Runs alongside Tracks A and B; it is the true unblocker for most of B and C.

- [ ] **D1.** Make `Accused.PersonID` globally unique and stable, and reuse
      the same ID for the same human across scenarios — this is what makes
      repeat-offender tracking real rather than claimed.
- [ ] **D2.** **Merge the two seeds.** One dataset that is both broad
      (hundreds of cases, for statistics to mean anything) and deep (the 15
      authored scenarios with full evidence). Generate the bulk cases
      statistically, keep the 15 hand-authored ones as the rich subset.
- [ ] **D3.** Populate `latitude`/`longitude` with real per-incident
      coordinates inside the right district, so the hotspot map plots
      genuine data instead of synthetic points.
- [ ] **D4.** Give `IncidentFromDate` a realistic **time-of-day**
      distribution per crime type (burglary skews night, pickpocketing to
      market hours). Unlocks the PS's spatiotemporal ask directly.
- [ ] **D5.** Seed `ChargesheetDetails` (it exists in the original seed —
      port it) to unlock chargesheet rate and time-to-chargesheet.
- [ ] **D6.** Populate `OccupationID` / `ReligionID` / `CasteID` and build
      the three lookup tables, for the socio-economic correlation the PS
      names. **Handle with care** — caste/religion breakdowns of crime data
      are legitimate NCRB reporting practice but trivially misread; present
      them as victim/complainant demographics with explicit denominators,
      never as an offender-propensity signal.
- [ ] **D7.** Then wipe + re-import, and record row counts here.

## 5.6 Revised priority

Track D outranks most of Track B. Contradiction detection over 15 scenarios
is a nice demo; **hotspots, trends, anomaly detection and predictive risk
are four of the six PS asks and all four are blocked on D2/D3/D4**, not on
any LLM. Sequence: **D1–D4 → Phase 1/2 UI work → B2 person spine → B4 AI.**
