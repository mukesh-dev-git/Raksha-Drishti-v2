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

## 2. Data Store (FIR schema) — ✅ 21-table backbone imported

See [`DATA_STORE_SCHEMA.md`](./DATA_STORE_SCHEMA.md) for the full table
reference. **Status in `Raksha-Dhrishti-v2`** (as of 2026-08-24): all 21
backbone tables are built, schema-verified, and **seeded** — imported via
`catalyst ds:import --table <Name> catalyst/dataset-v2/out/csv/<Name>.csv`.
`CaseMaster` is individually confirmed clean (19/19 rows, zero import
errors); the other 20 tables were scheduled/imported successfully but not
all re-verified row-by-row after the fact — worth a spot-check with
`catalyst ds:export --table <Name>` before relying on any specific one.

FK `Number` columns have **not** been converted to proper `Lookup` columns
yet (still plain numbers, not enforced relationships) — that's still open.
6 more tables (arrest tracking + demographic lookups) are spec'd but not
built — see `DATA_STORE_SCHEMA.md`'s "Extended tables" section.

**Also open: the 6 new NoSQL collections** (`CallRecords`, `Transactions`,
`CCTVSightings`, `WitnessStatements`, `TimelineEvents`, `Contradictions` —
see `features.md`) have their JSON generated locally in
`catalyst/dataset-v2/out/nosql/`, but nothing has been created or imported
in Catalyst NoSQL yet.

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

### Wire the frontend — ✅ done, same-origin now
[`src/lib/api.ts`](../src/lib/api.ts) calls `/api/...` directly (same
deployment, no CORS, no external URL) and **falls back to the bundled sample
data** in `data.ts` on any error — so the site is never broken by a Data
Store hiccup, just quietly shows fallback numbers. No env var needed anymore
(the old `NEXT_PUBLIC_RD_API_BASE` external-Function URL is retired).

**Every page that calls into `api.ts` must be `export const dynamic =
"force-dynamic"`** (`dashboard/page.tsx`, `cases/page.tsx`,
`cases/[caseType]/district-wise/page.tsx`) — otherwise the fetch resolves
once at build time and bakes in fallback data forever, the same static/
dynamic classification gotcha covered in §1.

Currently wired to live data: **dashboard summary**, the **cases list**, and
**district-wise** stats. Case files, the investigation workspace, and the
case-file booklet still use the bundled mock data in
`data.ts`/`investigationData.ts` — extend the same `api.ts` pattern if/when
that's worth doing (needs the NoSQL collections in §2 first for the richer
investigation data specifically).

## 4. Auth (officer sign-in)
[`src/components/auth/AuthGate.tsx`](../src/components/auth/AuthGate.tsx) gates the
app via Catalyst Authentication. It is **off by default** (`NEXT_PUBLIC_RD_AUTH`
unset) so hosting is never blocked. To turn it on: enable Authentication in the
console, ensure the Catalyst web SDK is served with the client, then build with
`NEXT_PUBLIC_RD_AUTH=on`.

## 5. Next
- Create + seed the 6 NoSQL collections (§2) for the investigation-intelligence
  features in `features.md`.
- Convert Data Store FK `Number` columns to `Lookup` columns now that parent
  rows actually exist.
- CRUD (create/edit/delete) endpoints + auth-gated writes, per the
  production-readiness discussion — not started.
- Extend live data to case files / investigation board once the NoSQL data exists.
- **Stratus**: move images + case-file evidence into blob storage.
