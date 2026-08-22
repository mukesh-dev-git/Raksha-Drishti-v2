# Dataset v2 — 15 hand-authored case scenarios

Brand-new, hand-authored data (per user instruction: **not** a reuse of
`catalyst/seed/`'s procedurally-generated 406 rows — this replaces that
approach entirely for CaseMaster/Accused/Victim/etc). Built specifically to
give the Investigation Workspace's entity graph and timeline real,
interconnected, multi-source data to render, per
[`features.md`](../../features.md)'s "data model first" recommendation.

## Files
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

## What this does NOT include yet
- **Actual Catalyst-importable CSVs/NoSQL JSON.** This is source data, not
  yet transformed into the exact shapes `ds:import` or a NoSQL collection
  write needs.
- **Import into the Data Store.** `Raksha-Dhrishti-v2`'s tables are still
  empty — this data hasn't been pushed there yet.
- **Wiring `api.ts`/`investigationData.ts`** to read any of this instead of
  the seeded RNG mock generator.

## Next steps (not yet done)
1. Write a build script (`build_seed.py`/`.mjs`, same pattern as
   `catalyst/gen_seed.py`) that reads `lookups.json` + `cases.json` and
   emits: (a) one CSV per Data Store table with exact column headers, (b)
   one JSON document set per new NoSQL collection (`CallRecords`,
   `Transactions`, `CCTVSightings`, `WitnessStatements`).
2. `catalyst ds:import` each Data Store CSV into `Raksha-Dhrishti-v2`.
3. Create the NoSQL collections in the console and seed them.
4. Convert `CaseMaster`'s FK `Number` columns to real `Lookup` columns now
   that the parent rows they'd point to actually exist.
5. Extend `src/lib/api.ts` (new endpoints in `rd_api`) and replace
   `investigationData.ts`'s mock generator with real reads — this is where
   features.md's #1 (entity fusion) and #6 (shared timeline) actually get
   built, using this data as the fixture.
