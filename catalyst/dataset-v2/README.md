# Dataset v2 — 15 hand-authored case scenarios

Brand-new, hand-authored data (per user instruction: **not** a reuse of
`catalyst/seed/`'s procedurally-generated 406 rows — this replaces that
approach entirely for CaseMaster/Accused/Victim/etc). Built specifically to
give the Investigation Workspace's entity graph and timeline real,
interconnected, multi-source data to render, per
[`features.md`](../../features.md)'s "data model first" recommendation.

## Files
- **`geo_time.mjs`** — where and when an incident happened (P1.3/P1.4).
  Real locality tables for all 13 police stations, so a generated coordinate
  lands on a place that exists in the right district rather than in a lake or
  across a district line. `placeIncident()` scatters within a station's
  jurisdiction — pass an existing coordinate as the anchor to keep an
  authored location put; omit it for generated cases. `incidentHour()` gives
  a crime type a realistic hour. Both deterministic in a seed (use
  `CaseMasterID`) so regenerating never relocates an existing case.
  `isPeriodOffence()` marks the crimes that legitimately have no time of day
  — **P4.2 must exclude those**, or their stored `00:00` becomes a fake
  midnight spike.
- **`demographics.mjs`** — victim/complainant occupation and religion
  (P1.5). `assignOccupation()`/`assignReligion()` draw from a Karnataka-
  representative distribution (Census 2011 proportions for religion),
  deterministically in `ComplainantID` — a statistical population draw, not
  a narrative choice about any named individual; see the file's header for
  why that distinction matters. Only ever touches `ComplainantDetails` — the
  `Accused` table has no demographic columns in the schema at all, so there
  is nowhere an offender-side value could land even by mistake.
  `CasteID`/`CasteMaster` deliberately absent — see `DATA_STORE_SCHEMA.md`'s
  "Extended tables" for why that one's still an open decision, not a gap in
  this file.
- ⚠️ *`bulk_cases.mjs` (P1.2, generates the 4,981 bulk cases) belongs in this
  list and isn't yet documented here — pre-existing gap, not introduced by
  this entry, flagged rather than silently left.*
- **`lookups.json`** — fresh reference/taxonomy data for all 15 Data Store
  lookup tables (State, District, UnitType, Unit, Rank, Designation,
  Employee, Court, CaseCategory, GravityOffence, CaseStatusMaster,
  CrimeHead, CrimeSubHead, Act, Section). District IDs (4401-4408) and
  CrimeSubHead IDs (1-4) are pinned to match `src/lib/data.ts`'s existing
  slugs/dbIds — changing them would break routing. CaseStatusID 2/3 are
  pinned to "Charge Sheeted"/"Closed" — `rd_api`'s clearance-rate math
  hardcodes those exact IDs.
- **`cases.json`** — the 15 scenarios: `CaseMaster`/`ComplainantDetails`/
  `Victim`/`Accused`/`ActSectionAssociation` rows (real Data Store shape)
  plus `calls`/`transactions`/`cctv`/`witnessStatements`/`timeline` (new
  data, destined for Catalyst NoSQL per the earlier decision — no
  Data Store table exists for these yet).

### How people are identified (P1.1)

Three things that are easy to confuse, because they look alike and mean
different things:

| | What it is | Scope |
|---|---|---|
| `Accused.PersonID` | `KA-P0001`…`KA-P0047` — the **global person register**. One ID per human. | Whole dataset |
| `personIndex` | `{"P1": "KA-P0001", …}` — resolves a scenario's narrative tokens to global IDs. **Machine-readable, this is the join.** | Per scenario |
| `personRefs` | `{"P1": "Suresh Naik / Suresh N. (… entity-fusion target)"}` — the hand-authored glossary. | Per scenario, humans only |

Evidence records (`calls`, `cctv`, `witnessStatements`, `timeline`) cite
people by the narrative token — `"from": "P1"` — never by the global ID
directly. `build_seed.mjs` uses `personIndex` to attach a `resolvedPersons`
map to every emitted record, keyed by those tokens.

Two rules that matter when editing this file:

- **`P<n>` is positional** — `P1` is the 1st distinct accused of that
  scenario, `P2` the 2nd, and so on. Reordering a scenario's `accused` array
  silently re-points every evidence citation in it. Regenerate and re-verify
  after any such edit.
- **Not every token is a person.** `personRefs` also holds non-person refs —
  C1's `V4` is an unregistered SIM, C9's `W1` is a witness with no `Accused`
  row. These deliberately have no `personIndex` entry, and readers must fall
  back to the raw token rather than assuming resolution.

Aliases are load-bearing. `KA-P0001` appears as both "Suresh Naik" and
"Suresh N."; `KA-P0008` as "Zoya Merchant" and "Z. Merchant". Do **not**
normalise these to one spelling — that discrepancy is exactly what P3.1's
entity fusion has to detect, and flattening it deletes the test case.

Both validated: JSON parses cleanly, zero duplicate IDs within any table,
every FK in `cases.json` resolves to a real row in `lookups.json`.

## The 15 scenarios

| # | Title | District(s) | Crime type | Entity-fusion hook |
|---|---|---|---|---|
| C1 | Yeshwanthpur Fencing Ring | Bengaluru Urban → Tumakuru | Theft → Fraud | "Suresh Naik" vs "Suresh N." across 2 FIRs |
| C2 | K.R. Market Jewellery Heist | Mysuru | Theft | fence's denial vs CCTV + planning call |
| C3 | QuickCash Loan-App Extortion | Belagavi + Bengaluru | Fraud | same operator, 2 front-company names |
| C4 | Kalaburagi Land Title Forgery | Kalaburagi | Fraud | notary's "arm's length" claim vs direct buyer contact |
| C5 | Mangaluru Warehouse Burglary-Resale | Dakshina Kannada | Burglary | fence's "no questions asked" vs same-morning payout |
| C6 | Ballari Mining Contract Assault | Ballari | Assault | contractor's "routine call" vs assault mobilization |
| C7 | Shivamogga-Tumakuru Cattle Corridor | Shivamogga → Tumakuru | Theft | "Somesh K" vs "Somesh Kumar", repeat-pattern truck |
| C8 | Whitefield Fake Tech-Support Centre | Bengaluru Urban | Fraud | "landlord" claim vs shell-company payout to her account |
| C9 | Mysuru Domestic Dispute Escalation | Mysuru | Assault | witness intimidation — recant timed to a visit |
| C10 | Belagavi Auto Chop-Shop | Belagavi | Burglary | "bulk scrap buyer" vs same-morning cash + tight timing |
| C11 | Kalaburagi Wedding Robbery Gang | Kalaburagi | Theft | caterer-informant's denial vs tip-off call + cut |
| C12 | Mangaluru Coastal Investment Ponzi | Dakshina Kannada | Fraud | "fellow victim" recruiter vs advance-knowledge call |
| C13 | Ballari-Bengaluru ATM Skimming | Ballari + Bengaluru Urban | Fraud | "Ballari only" claim vs shared cash-out account |
| C14 | Shivamogga Forest Produce Theft | Shivamogga | Burglary | insider's "routine duty" vs coordination call + cut |
| C15 | Bengaluru Turf Assault | Bengaluru Urban | Assault | mutual self-defense claims vs wide-angle CCTV |

Every scenario has **one explicit, citation-backed contradiction**
(`cases.json`'s `contradiction` field per case — description, the exact
conflicting record IDs, and a ready-made "next question to ask"). This is
deliberately feature #5-compliant from the start: nothing here is a vague
suspicion, every claim traces to a specific `call`/`transaction`/`cctv`/
`statement` record ID.

## Build

```
node catalyst/dataset-v2/build_seed.mjs
```

Reads `lookups.json` + `cases.json`, writes `out/csv/<Table>.csv` (one per
Data Store table) and `out/nosql/<Collection>.json` (the 6 evidence
collections, plus `caseScenarioMap.json` and `scenarioMeta.json`). The NoSQL
JSON is also **bundled into the app** at `src/lib/nosql-seed/` — copy it
across after regenerating, or `/api/investigation` and the Dashboard keep
serving the previous content:

```
cp catalyst/dataset-v2/out/nosql/*.json src/lib/nosql-seed/
```

## Status

Done: build script, `ds:import` into `Raksha-Dhrishti-v2`, the 6 NoSQL
collections seeded, and `/api/investigation` + the Dashboard reading real
records. See [`../README.md`](../README.md) for live row counts and the
Slate deploy notes.

⚠️ **The live Data Store's `Accused.PersonID` is still the pre-P1.1
`A1`-style value.** Re-importing is deliberately deferred to **P1.6** so the
wipe-and-reimport happens exactly once, after the rest of P1 lands. Nothing
in the app reads `PersonID` today, so the staleness is inert — but don't
build a person-spine feature against the live table until P1.6 is done.

**P1.2 done** (2026-08-29), scaled to SCRB volume same day: `bulk_cases.mjs`
generates additional, statistically-real `CaseMaster` rows using this same
`lookups.json`/`geo_time.mjs` - real district/crime-type/status
distributions, real coordinates and time-of-day via `placeIncident()`/
`incidentHour()`, a real `ChargesheetDetails` table (ported from
`catalyst/seed/`'s shape, not its rows - see PLAN.md P1.2 for why). First
landed at 409 total (over the original "≳400" bar); scaled the same day to
**5,000 total** (`BULK_CASE_COUNT` in `build_seed.mjs`) on direct request -
19 real FIRs plus 4,981 generated is closer to what a statewide bureau
actually handles. `caseFacts.json`/`accused.json` write minified JSON at
this size (the two files that scale with case count; everything else stays
pretty-printed). All 19 authored FIRs still resolve unchanged - verified,
not assumed, at both scales.
Deliberately NOT merged: no calls/transactions/CCTV/statements for bulk
cases, and P4.6 (MO-clustering)/P4.7 (repeat-offenders)/`/persons` stay
scoped to the 15 authored scenarios - see `bulk_cases.mjs`'s own header for
why flooding an evidence-dependent feature with statistically-generated
cases would fabricate signal, not just add volume.
⚠️ This is the LOCAL/bundled seed only. The live Data Store still holds just
the 19 real FIRs - importing the other 390 is folded into **P1.6**'s
wipe-and-reimport, same reason P1.1's PersonID fix is deferred there (do the
wipe once, not per-fix).

Still open (tracked in [`../../PLAN.md`](../../PLAN.md)): converting
`CaseMaster`'s FK `Number` columns to real `Lookup` columns.
