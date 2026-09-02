# Catalyst deployment & backend

This folder holds the Zoho Catalyst side: the FIR Data Store schema and seed
data. Zone India (Asia/Kolkata).

**⚠️ Two Catalyst projects — always check which is active before deploying
or touching the Data Store** (`catalyst.cmd project:list`,
`catalyst.cmd project:use <name>`):
- **`RakshaDrishti`** (`56806000000019001`) — original submitted project,
  **frozen**. Only 4 tables live, still on the old Web Client Hosting path.
  Do not deploy or modify — it's the public submission's demo link.
- **`Raksha-Dhrishti-v2`** (`56806000000070001`) — **active** project for all
  continued work. Live URL: `https://raksha-drishti-v2-byahjtre.onslate.in/`.

## 1. Host the frontend — Slate (✅ current path)

The app deploys to **Catalyst Slate**, not Web Client Hosting. Slate runs the
app via [OpenNext](https://opennext.js.org/), giving a real Next.js server
(SSR, image optimization, middleware) instead of a static-only file host —
confirmed via a live build log: it builds an actual "server function," not
just static assets.

Deployment is git-based and automatic: pushing to `main` on
[`Raksha-Drishti-v2`](https://github.com/mukesh-dev-git/Raksha-Drishti-v2)
triggers a build + deploy on Slate (Auto Deploy is enabled in the console).
No manual `catalyst deploy` step, no `NEXT_PUBLIC_BASE_PATH` — Slate serves at
the domain root. If a push doesn't pick up automatically, force it from the
Slate console → this deployment → **Sync Now** (this aborts any deploy
already in progress, so only do it if nothing is currently "Processing").

Build/deploy status and logs: Slate console → `raksha-drishti-v2` →
**Overview** / **History**.

### Why not `output: "export"` (the old static path)
`next.config.mjs` has no `output: "export"` — it broke OpenNext's routing
entirely (every nested dynamic route 404'd) when this app still had it from
the Web Client Hosting era. See `next.config.mjs`'s comments and git history
(commits around 2026-08-22/23) for the full story, including two other real
gotchas discovered the hard way:
- **`export const dynamicParams = false` + missing `export const dynamic =
  "force-dynamic"`** on a dynamic page silently kills its live-render
  fallback — a route with a static-manifest mismatch just 404s forever with
  no rescue, instead of falling back to server rendering. Every dynamic page
  under `src/app/cases/...` sets `dynamic = "force-dynamic"` for this reason.
- **Slate injects `X-Frame-Options: DENY` on every response**, including
  `public/` static files, and it *adds* this alongside anything you set
  yourself rather than replacing it — so you can't override it via
  `next.config.mjs` headers() or a Route Handler's own response headers.
  This is why the crime-map embeds (`src/components/MapEmbed.tsx`) fetch
  their HTML client-side and load it via a `blob:` URL instead of a normal
  `<iframe src>` — a `blob:` URL isn't a real HTTP request, so there's
  nothing for Slate's edge layer to inject a header into. (First tried
  `iframe.srcdoc`, which sidesteps the header problem the same way but
  broke `maplibre-gl` itself — its `load` event never fired inside an
  `about:srcdoc` document, silently, with no error. `blob:` avoids both
  problems. See `MapEmbed.tsx`'s comments for the full chain.)

## 2. Data Store (FIR schema) — ✅ 21-table backbone, **re-imported at full scale 2026-09-02 (P1.6)**

See [`DATA_STORE_SCHEMA.md`](./DATA_STORE_SCHEMA.md) for the full table
reference. All 21 backbone tables are built, schema-verified and seeded via
`catalyst ds:import --table <Name> catalyst/dataset-v2/out/csv/<Name>.csv`.

**P1.6 is done.** The live Data Store had been stuck at the original 19-case
seed while the generator moved on to 5,000 and then 12,000 cases. It now
matches the generator, verified row-by-row against the source CSVs by
re-exporting every table afterwards (not by trusting the import’s own
success message):

| Table | Was live | Now live | Source CSV | Verified |
|---|---|---|---|---|
| `District` | 8 | **31** | 31 | every field matches |
| `Unit` | 13 | **59** | 59 | count matches |
| `Court` | 8 | **31** | 31 | count matches |
| `Employee` | 12 | **58** | 58 | count matches |
| `CaseMaster` | 19 | **12,000** | 12,000 | every field matches¹ |
| `ComplainantDetails` | 22 | **12,003** | 12,003 | every field matches |
| `Victim` | 14 | **11,995** | 11,995 | count matches |
| `Accused` | 53 | **7,129** | 7,129 | every field matches (real `KA-Pnnnn` PersonIDs now live) |
| `ChargesheetDetails` | 0 | **2,962** | 2,962 | count matches |
| `ActSectionAssociation` | 0 | 16,395 rows present but **NOT correct** | 16,395 | ⚠️ see below |

¹ `latitude`/`longitude` round-trip at 4 decimal places, not the 6 the
generator emits — that’s the live Decimal column’s precision. Worst-case
ground error is **11 m**, which is immaterial for a hotspot map. Not a data
defect, but don’t be surprised by the diff.

### How it was done — no wipe was needed

P1.6 was originally written as “wipe the Data Store and re-import cleanly”.
There is **no wipe command**: the CLI has `ds:import`/`ds:export`/`ds:status`
and nothing else, ZCQL is SELECT-only, and the SDK’s `deleteRows()` needs a
Catalyst request context that only exists in a deployed function.

It turned out not to matter. Every ID already live was also present in the
new dataset (checked explicitly, per table, before importing anything), so an
**upsert** reaches exactly the same end state as a wipe-and-reimport with no
stale rows left behind — and without a destructive step. Verified by
re-importing an identical file and confirming the row count did not move.

```
# per table, find_by = that table's primary key
echo '{ "operation": "upsert", "find_by": "CaseMasterID" }' > cfg.json
catalyst ds:import --table CaseMaster --config cfg.json <csv>
```

Three practical gotchas, all real, all cost time:

- **The CLI prompts, and the prompt breaks non-interactive use.** `ds:import`
  asks which Stratus bucket to upload to, and `ds:export`/`ds:status` ask
  whether to download the report; unanswered, the command dies with
  “An unexpected error has occurred” *after* the job is already scheduled.
  Pipe an answer in (`printf '
' |` for the bucket list, `echo y |` for the
  report download). The bucket in this project is `rd-import-staging`.
- **Object keys must be unique per upload.** Re-uploading a file with the same
  basename returns `HTTP Error: 409`. Copy the CSV to a timestamped name first.
- **Imports are asynchronous.** A table can still read 0 rows for several
  minutes after a “successfully scheduled” message — `ChargesheetDetails`
  looked like a total failure until it suddenly held all 2,962 rows. Re-export
  and count before concluding anything failed.

### ⚠️ `ActSectionAssociation` is imported but wrong — needs a console fix

This table has **no primary key**, so it can’t be upserted, and it was empty
live, so it was imported as a plain insert. Both attempts were wrong, and the
second one left bad data:

1. Importing the generator’s own CSV (`ActID: "IPC"`, `SectionID: "379"`)
   failed **all 16,395 rows** with `Invalid input value for ActID. int value
   expected`. `ActID`/`SectionID` are Lookup columns and want the referenced
   row’s ROWID, not the semantic code. This is why the table had sat at 0
   rows since the beginning — a pre-existing gap, not a P1.7 regression.
2. Resolving the codes to real live ROWIDs (`prep_asa_import.mjs`, written
   for exactly this) made the import *succeed* — but the column silently
   **truncated every 17-digit ROWID to 10 digits**, so all 16,395 rows now
   hold the same meaningless value `5680600000` in both lookup columns.

**Nothing in the app reads this table** (`grep ActSectionAssociation src/`
returns only a comment; case sections come from the bundled
`caseFacts.json`), so nothing user-facing is broken. But the rows are wrong
and cannot be repaired in place: no PK means no upsert, and there is no
delete path outside the console.

**To fix, in the Catalyst console:** truncate `ActSectionAssociation`, change
`ActID` and `SectionID` from int to **Text**, then re-import the generator’s
portable CSV directly (no ROWID mapping, no `prep_asa_import.mjs`). Schema
changes are console-only on this Data Store — same constraint that forced
every other table to be hand-built.

### Known live-read bug found by the scale-up

`zcqlAll()` (`src/lib/zcql.ts`) returns **exactly one duplicate row** when it
walks 12,000 rows in 300-row pages. Every live figure is inflated by one:
`/api/summary` reports `totalCases: 12001` against 12,000 real rows,
`solvedCases: 6159` against 6,158. It is deterministic (four calls, same
numbers) and was invisible at 19 rows because that fit in a single page. The
paginator issues `LIMIT {offset},300` with no `ORDER BY`, so page boundaries
aren’t stable. Not yet fixed — it needs a live deploy to test, since ZCQL
can’t run locally.

Also surfaced: **5 cases are dated 2021**, but `/api/summary` hardcodes
`TREND_YEARS = [2022…2026]`, so the dashboard’s trend chart silently drops
them. Cosmetic, but it means the trend series doesn’t sum to the headline
total.

Details: `DATA_STORE_SCHEMA.md` → “`Accused.PersonID` — the person register”,
`dataset-v2/karnataka_districts.mjs` for the 31-district roster,
`dataset-v2/geo_time.mjs` for the coordinates, `dataset-v2/demographics.mjs`
for occupation/religion.

## 2b. NoSQL (investigation-intelligence collections) — ✅ created and seeded

The 6 new NoSQL collections for `features.md` (entity fusion, suspicion
scoring, contradiction detection, etc.) exist and are fully seeded as of
2026-08-24: `CallRecords`(41), `Transactions`(24), `CCTVSightings`(17),
`WitnessStatements`(22), `TimelineEvents`(75), `Contradictions`(15) — 194
records total, source data in `catalyst/dataset-v2/out/nosql/*.json`
(generated by `build_seed.mjs`), verified by directly querying a row in the
console.

Each table: partition key `id` (String), no sort key — created by hand in
the console (same DDL-only constraint as Data Store, confirmed via Zoho's
NoSQL docs). Loaded via a one-off Route Handler (since deleted) that called
`NoSQLItem.from(record)` + `table.insertItems({ item })` per record — **not**
`insertItems([...])` with an array, which fails on every record with a
generic "input value is not readable" error despite looking like the more
natural bulk-insert shape. One request per record, not batched - fine given
the small size (17-75 records/table).

One real data bug found this way: the `Contradictions` source objects (only
one per scenario) never had an `id` field like every other collection's
records do — every insert failed with `"Mandatory Key id is missing"` until
`build_seed.mjs` was fixed to synthesize `${scenarioId}-CD-1`.

**Route Handler reads it - see §3b.** One real limitation found doing that:
`queryTable()`'s `key_condition` only accepts `EQUALS` on a partition-key-only
table (confirmed via a live 400: `"PartitionKey operator must be equal"`) -
`BEGINS_WITH` is a real, documented operator but needs a sort key to do a
prefix/range scan, which none of these 6 tables have (partition key `id`
only). So a live "give me every record for scenario C1" query isn't
possible as designed - `/api/investigation` reads the identical bundled
seed JSON instead (see §3b) and reserves live NoSQL calls for exact-key
`EQUALS` operations, which do work fine.

Two things worth knowing if you ever redo the Data Store side:
- **No CSV-import UI and no DDL via ZCQL or any SDK** on this Data Store —
  every table and column was created by hand in the console (Schema View →
  **+ New Table** / **+ New Column**). Confirmed via Zoho's own docs: schema
  management is console-only by design. `ds:import`/`ds:export` handle bulk
  *data* once a table exists, nothing about schema.
- **ZCQL caps any `SELECT` without its own `LIMIT` at 300 rows**, and
  `COUNT(...) AS alias` silently returns 0 rather than erroring — both cost a
  few debugging rounds originally. Every query in `src/lib/zcql.ts` uses
  `zcqlAll()` (paginates via `LIMIT {offset},300`) instead of trusting
  either of those.
- Import error messages are genuinely useful and worth reading in full via
  `catalyst ds:status import <jobid>` (downloads a report zip) - e.g. this is
  how the `CaseNo` uniqueness-constraint bug and the ISO-datetime-format
  rejection got found and fixed in `catalyst/dataset-v2/build_seed.mjs`.

## 3. API — ✅ Route Handlers (rd_api Function retired)

There is **no separate Catalyst Function anymore**. The standalone `rd_api`
Advanced I/O Function (Node + Express) that used to run this logic has been
deleted from both Catalyst projects and the local `functions/` folder is
gone. Its 4 endpoints now live as Next.js Route Handlers, deployed as part of
the same Slate build:

| Route | Returns |
|---|---|
| `GET /api/summary` | dashboard totals (`District`, `CrimeSubHead`, `CaseMaster`) |
| `GET /api/casetypes` | crime sub-heads + counts (`CrimeSubHead`, `CaseMaster`) |
| `GET /api/districts` | district list (`District`) |
| `GET /api/district-stats?crime=<CrimeSubHeadID>` | per-district count, 5-yr trend, clearance rate (`CaseMaster`, `Unit`, joined in JS — no ZCQL JOIN) |

Shared ZCQL helpers (pagination, error serialization) live in
[`src/lib/zcql.ts`](../src/lib/zcql.ts). Each route file sets
`export const dynamic = "force-dynamic"` — without it Next tries to
statically prerender the route at build time (no real Catalyst request
context exists then), which is the same silent-failure class covered above.

`catalyst.initialize(req)` needs a plain `{ headers: <object> }` shape, not a
`NextRequest`/Fetch API `Request` (whose `.headers` is a `Headers`
instance) — see `initCatalyst()` in `zcql.ts`. Confirmed working this way in
a real deployed Route Handler on Slate (it was genuinely an open question
whether the SDK's auth-via-injected-request-context worked outside an
Advanced I/O Function at all — it does).

## 3b. Investigation evidence — ✅ built, ⚠️ now orphaned (see §5)

**As of the P2 cases restructure**, nothing in the UI calls this route any
more — `/cases/[caseId]` reads evidence directly via `getScenarioTimeline()`
instead, keyed by the exact `CaseMasterID` rather than resolved by crime
type + district. The mechanics below are accurate and the route still
works if hit directly; kept here as a reference and because
`RealEvidenceFeed.tsx` (its one caller) hasn't been deleted yet - full note
in §5.

`GET /api/investigation?caseType=<slug>&district=<slug>` resolves real
`CaseMasterID`s for the route (same `CaseMaster`/`Unit` ZCQL join as
`district-stats`), maps them to a `scenarioId` via a static
`CaseMasterID -> scenarioId` lookup baked at seed time
(`caseScenarioMap.json`, generated by `build_seed.mjs` from `cases.json`'s
FIR lists), then returns that scenario's evidence - calls, transactions,
CCTV sightings, witness statements, timeline, and the one contradiction -
filtered from the bundled `src/lib/nosql-seed/*.json` by each record's own
`scenarioId` field (see §2b for why this reads bundled JSON instead of a
live NoSQL query). Only 15 of the 32 `caseType` × `district` combinations
have a seeded scenario behind them; everything else returns
`{ "scenario": null }`.

**`src/lib/nosql-seed/` is a copy, and nothing keeps it in sync.**
`build_seed.mjs` writes to `catalyst/dataset-v2/out/nosql/`; the app imports
from `src/lib/nosql-seed/`. Regenerating without copying across leaves both
this route and the Dashboard serving the previous content, with no error to
notice:

```
node catalyst/dataset-v2/build_seed.mjs
cp catalyst/dataset-v2/out/nosql/*.json src/lib/nosql-seed/
```

Each record carries a `resolvedPersons` map so a citation like a call's
`"from": "P1"` resolves to the person it names. That map is keyed by the
scenario-local narrative token (`P1`, `P2`, …) — **not** by the global
`Accused.PersonID`, and not by every alias of both, because
`dashboardData.ts` counts suspects with `Object.values(resolvedPersons)` and
double-keying would double every count. Non-person refs (C1's `V4` is a SIM)
don't resolve by design, so readers must fall back to the raw token.

`RealEvidenceFeed.tsx` (client component) fetches this route from the
Investigation Workspace and renders a "Verified Evidence Feed" section
above the existing mock evidence board - a contradiction alert plus
citation-tagged evidence tables - rendering nothing when there's no
seeded scenario for that route, same graceful-fallback pattern as
`api.ts` elsewhere.

### Wire the frontend — ✅ done, same-origin now
[`src/lib/api.ts`](../src/lib/api.ts) calls `/api/...` directly (same
deployment, no CORS, no external URL) and **falls back to the bundled sample
data** in `data.ts` on any error — so the site is never broken by a Data
Store hiccup, just quietly shows fallback numbers. No env var needed anymore
(the old `NEXT_PUBLIC_RD_API_BASE` external-Function URL is retired).

**Every page that calls into `api.ts` must be `export const dynamic =
"force-dynamic"`** (`dashboard/page.tsx`, `crime-count/page.tsx`,
`crime-hotspots/page.tsx`) — otherwise the fetch resolves once at build time
and bakes in fallback data forever, the same static/dynamic classification
gotcha covered in §1.

Currently wired to **live** Data Store queries via `api.ts`: dashboard
summary and Crime Count/Crime Hotspots' underlying stats. `/cases` (the FIR
Index) moved *off* `api.ts` in the P2 restructure — it now reads bundled
seed JSON directly via `caseWorklist.ts`, not a live call, same as
`/districts` and `/persons`; there's no fallback path to describe there
because there's no live call to fall back from. `investigationData.ts` (the
mock generator the old case-files/investigation-workspace pages used) is
deleted, not extended — the NoSQL collections in §2b were already seeded
and ready for a real evidence path, which is what the P2 restructure built
instead of ever wiring the mock generator to live data.

## 4. Auth (officer sign-in)
[`src/components/auth/AuthGate.tsx`](../src/components/auth/AuthGate.tsx) gates the
app via Catalyst Authentication. It is **off by default** (`NEXT_PUBLIC_RD_AUTH`
unset) so hosting is never blocked. To turn it on: enable Authentication in the
console, ensure the Catalyst web SDK is served with the client, then build with
`NEXT_PUBLIC_RD_AUTH=on`.

## 4b. District drill-down — ✅ a filter, not a role

The app is built for the **SCRB** (see
[`RESEARCH_AND_PLAN.md`](../RESEARCH_AND_PLAN.md) §1.2), so the statewide
view is the default and the product. `/dashboard?district=<DistrictID>`
narrows every figure, the Featured Investigation, Alerts and the Evidence
Feed to one district — the PS's "District-Level Drill-down" ask. The control
is [`DistrictFilter.tsx`](../src/components/dashboard/DistrictFilter.tsx);
the filter state lives in the URL, so a filtered view is shareable and
bookmarkable.

> ~~Earlier this was a login-time **role**: a "Viewing as" switcher
> (State/CID Officer vs. District Officer) writing an `rd-view-scope`
> cookie, read in `(site)/layout.tsx` and threaded through the sidebar,
> topbar and every page below (`viewScope.ts` / `viewScope.server.ts` /
> `ViewScopeSwitcher.tsx`, all now deleted).~~ **Wrong shape.** The PS asks
> for SCRB to drill into districts, not for district officers to get
> restricted logins; and with §4's Auth off there is no signed-in identity,
> so the officer picked their own jurisdiction from a dropdown — the one
> thing real authentication would decide. Looking like access control while
> being a display preference is worse than not having it. It also forced a
> two-branch Featured Investigation rule and an empty state for districts
> with no "own" case. Removed in `db5b1bd` (net −77 lines).

**There is no access control here at all, by design.** Nothing in the app
restricts what anyone can see. If per-officer views are ever wanted they
need real Catalyst Authentication first (§4), with the district coming from
the signed-in identity rather than a query param.

`assignedTo` ("District" vs. "CID") is **hand-authored per scenario in
`cases.json`**, with an `assignmentReason` string alongside it.

> ~~Earlier this was *derived*: `build_seed.mjs` marked a scenario "State
> CID" exactly when its FIRs spanned more than one district
> (`districts.length > 1`), on the reasoning that a single district SP has
> no jurisdiction across district lines.~~ **That was wrong.** Karnataka
> CID takes a case by *explicit assignment* — order of the State
> Government, the DGP, or the High Court/Supreme Court — plus category
> triggers (Economic Offences Wing above ₹1 crore, the Cyber Crimes and
> Narcotics Wing, the Forest Cell, human trafficking) and one automatic
> trigger, custodial death. Two district SPs coordinating across a
> boundary, or their Range IGP coordinating them, is the *ordinary* path.
> The old rule wrongly flagged C1 and C7 (routine cross-district property
> crime) as CID, and wrongly missed C4, C8 and C12 (single-district
> economic/cyber offences that genuinely are CID cases). Ref:
> [CID — Organisation](https://cid.karnataka.gov.in/2/organisation/en);
> see also [`RESEARCH_AND_PLAN.md`](../RESEARCH_AND_PLAN.md) §1.4.

5 of the 15 scenarios are CID-assigned today: C3, C4, C8, C12, C13.

Filtering is one rule, server-side in `src/lib/dashboardData.ts`:
`scenarioInDistrict(scenarioId, districtId?)` — a scenario is in view if the
filtered district is one of the real districts its FIRs touch (undefined =
statewide). Featured Investigation, Alerts and the Evidence Feed all use it.
CID-assigned scenarios are **included** when drilling into a district: an
SCRB viewer looking at Tumakuru wants that district's whole picture, not
just what its own unit runs. The "CID" badge (carrying its
`assignmentReason`) marks them rather than hiding them.

`/api/summary` and `/api/casetypes` both take an optional `?district=` that
does the same `CaseMaster`/`Unit` join every other district-scoped route
already uses (§3).

## 5. Next
- Real backend-enforced RBAC - a signed-in officer's role/district actually
  restricting what they can see/do, once §4's Auth is turned on with real
  roles. Note §4b: the app currently has no access control of any kind, and
  the district drill-down is deliberately a filter, not a permission.
- **See [`PLAN.md`](../PLAN.md)** for the sequenced execution plan (data
  foundation, route restructure, person spine, analytics, AI) and
  [`RESEARCH_AND_PLAN.md`](../RESEARCH_AND_PLAN.md) for the KSP domain
  research and Data Store audit behind it.
- Convert Data Store FK `Number` columns to `Lookup` columns now that parent
  rows actually exist.
- **CRUD — first endpoint shipped and confirmed, 2026-08-28.** `PATCH
  /api/cases/[caseId]/status` (`src/app/api/cases/[caseId]/status/route.ts`)
  writes to the live **Data Store**, not NoSQL — via a *different* SDK
  surface than ZCQL (which is SELECT-only): `capp.datastore()
  .table("CaseMaster").updateRow({ROWID, CaseStatusID})`. `ROWID` (the
  table's real, implicit system PK, not the business key `CaseMasterID`) is
  fetched with one ZCQL `SELECT` first. Confirmed against the **live**
  deployment via curl, both directions, not just a 200 taken on faith:
  `{"statusId":3}` then `{"statusId":2}` on case 9001, both `{"ok":true,...}`
  (200). New helper: `updateRow()` in `zcql.ts`. Not built yet: IO
  assignment (same pattern, lower value without a real Employee picker) and
  case-diary entries — **genuinely blocked**, not a priority call: no
  `CaseDiary` table exists, and this Data Store has no CSV-import UI or DDL
  via any SDK (see the "console-only" note earlier in this file) — a human
  needs to create it by hand before any endpoint for it can exist.
  ⚠️ One real gap this surfaced: the write path hits the live Data Store,
  but every *read* path in the app (`/cases`, `/districts`, `/persons`, the
  dashboard) serves the bundled seed JSON snapshot under
  `src/lib/nosql-seed/`, not a live query — so a successful write is
  currently invisible in the UI. A live write to the 6 NoSQL evidence
  collections (calls/transactions/CCTV/statements/timeline/contradictions)
  is separate, still unbuilt work — would use `fetchItem`/`updateItems`/
  `deleteItems`, all `EQUALS`-based, confirmed working per Zoho's own SDK
  docs but not yet exercised by any code here.
- `RealEvidenceFeed.tsx` and the `/api/investigation` Route Handler it alone
  called (§3b) are now **orphaned** — the P2 restructure's case-detail page
  reads evidence a different way (`personFusion.ts`'s
  `getScenarioTimeline()`, direct from bundled JSON, keyed by the exact
  `CaseMasterID` rather than "first scenario matching this crime type +
  district"). The route still runs if hit directly; nothing in the UI calls
  it any more. Flagged for a cleanup pass, not deleted yet.
- Case files / the case-file flipbook and their mock generator
  (`investigationData.ts`) are **deleted**, not just unwired — see
  `PLAN.md` P2's dead-code note. `/cases/[caseId]` replaced both the
  flipbook and the real half of the old investigation-workspace in one
  page.
- **Stratus**: move images + case-file evidence into blob storage.
- ~~`spatiotemporal.html` Crime Hotspots map "flaky CDN"~~ **fixed** (was
  never actually flaky): `spatiotemporal.html` hand-rolled its own style
  object with a hardcoded glyphs URL,
  `https://basemaps.cartocdn.com/gl/dark-matter-gl-style/{fontstack}/{range}.pbf`
  - an outdated Carto path that 404s on every single request, unconditionally
  (confirmed via curl with no origin header at all, not something retrying
  could ever fix). The browser reports a 404 response with no
  `Access-Control-Allow-Origin` header as "blocked by CORS policy" rather
  than a plain 404, which is what made this look like intermittent network/
  CDN flakiness in the console for most of this project's history.
  `map.html` never hit this because it fetches Carto's real
  `dark-matter-gl-style/style.json` directly instead of hand-rolling a style
  object, so it always had the *current* glyphs URL Carto's own style
  declares. Fixed both files to use the correct, curl-verified path,
  `https://tiles.basemaps.cartocdn.com/fonts/{fontstack}/{range}.pbf`. Also
  added automatic retry-with-backoff (2 attempts, sessionStorage-tracked
  since `location.reload()` clears in-memory state) to both map files as a
  defensive measure for genuine transient failures - the underlying bug is
  fixed, but a real network blip is still possible.
