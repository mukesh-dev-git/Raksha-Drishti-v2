# Catalyst deployment & backend

This folder holds everything for the Zoho Catalyst side: static hosting, the
FIR Data Store schema, and seed data. Zone India (Asia/Kolkata).

**⚠️ Two Catalyst projects — always check which is active before deploying
or touching the Data Store** (`catalyst.cmd project:list`,
`catalyst.cmd project:use <name>`):
- **`RakshaDrishti`** (`56806000000019001`) — original submitted project,
  **frozen**. Only 4 tables live. Do not deploy or modify — it's the
  public submission's demo link.
- **`Raksha-Dhrishti-v2`** (`56806000000070001`) — **active** project for all
  continued work. Deploy URL:
  `https://raksha-dhrishti-v2-60079393411.development.catalystserverless.in/app/`.
  See §2 below for current Data Store status.

## 1. Host the frontend (Web Client Hosting — static)

The app is configured for static export (`next.config.mjs` → `output: "export"`).

### ⚠️ Subpath — set NEXT_PUBLIC_BASE_PATH before building
Catalyst Web Client Hosting serves this project at
`https://rakshadrishti-<id>.development.catalystserverless.in/app/` — **not** the
domain root. Next.js hardcodes asset URLs (`/_next/...`) as root-absolute, so
without telling it about the `/app` prefix, every JS chunk/image 404s and the
site loads blank (browser console shows "MIME type application/json" errors —
that's Catalyst's 404 fallback being mistaken for a script). Always build with:
```bash
NEXT_PUBLIC_BASE_PATH=/app npm run build
```
(PowerShell: `$env:NEXT_PUBLIC_BASE_PATH="/app"; npm run build`). Leave it unset
only if the app is ever mapped to a domain root instead of `/app/`.

```bash
npm install -g zcatalyst-cli
catalyst login
catalyst init          # select: Web Client Hosting  (+ Functions later)
```

Prepare the client folder from the static export (keeps `client-package.json`,
strips Next.js `.txt` payloads that exceed Catalyst's file limit), then deploy:

```bash
NEXT_PUBLIC_BASE_PATH=/app npm run build
npm run prepare:client
catalyst.cmd deploy --only client   # use catalyst.cmd on Windows PowerShell
```

(`npm run deploy:catalyst` runs build + prepare, but **won't** have
`NEXT_PUBLIC_BASE_PATH` set unless you export it in the shell first — safest to
run the three commands above explicitly until this is wired into the script.)

You get a live `*.catalystserverless.in/app/` URL. Everything the app serves is
local (pages, the `crime-map/*.html` embeds, the logo) — only the hero/footer
backdrops still hotlink Unsplash; localize those into `public/` to be fully
Catalyst-served.

## 2. Data Store (FIR schema)

See [`DATA_STORE_SCHEMA.md`](./DATA_STORE_SCHEMA.md) for the full table
reference. **Status in `Raksha-Dhrishti-v2`** (as of 2026-08-21): all 21 backbone tables
from `DATA_STORE_SCHEMA.md` are built and schema-verified (queried table by
table, columns confirmed correct — two tables even more complete than the
seed CSVs, see that doc). **No data imported yet** — next step is
`catalyst ds:import --table <Name> catalyst/seed/<Name>.csv` per table, then
converting FK `Number` columns to proper `Lookup` columns. 6 more tables
(arrest tracking + demographic lookups) are spec'd but not yet built — see
`DATA_STORE_SCHEMA.md`'s "Extended tables" section for exact columns before
building them from scratch.

Two things worth knowing if you ever redo this:
- **No CSV-import UI and no DDL via ZCQL or any SDK** on this Data Store —
  every table and column was created by hand in the console (Schema View →
  **+ New Table** / **+ New Column**). Confirmed via Zoho's own docs: schema
  management is console-only by design.
- **ZCQL caps any `SELECT` without its own `LIMIT` at 300 rows**, and
  `COUNT(...) AS alias` silently returns 0 rather than erroring — both cost a
  few debugging rounds. `rd_api`'s queries all use `zcqlAll()` (paginates via
  `LIMIT {offset},300`) instead of trusting either of those.

## 3. Functions (rd_api) — ✅ live

The Node Function lives in [`functions/rd_api/`](../functions/rd_api) and is
deployed. It runs ZCQL over the Data Store and returns the exact shapes the
frontend expects:

| Endpoint | Returns |
|---|---|
| `GET /summary` | dashboard totals (`District`, `CrimeSubHead`, `CaseMaster`) |
| `GET /casetypes` | crime sub-heads + counts (`CrimeSubHead`, `CaseMaster`) |
| `GET /districts` | district list (`District`) |
| `GET /district-stats?crime=<CrimeSubHeadID>` | per-district count, 5-yr trend, clearance rate (`CaseMaster`, `Unit`, joined in JS — no ZCQL JOIN) |

Redeploying after a code change:
```bash
catalyst.cmd deploy --only functions
```
(If ever re-scaffolding from scratch: `catalyst functions:add` — Advanced I/O,
Node.js, name `rd_api` — would generate a fresh boilerplate folder at that
same path, so move the real `index.js`/`package.json` aside first and copy
them back in after, merging `package.json`'s `dependencies`.)

### Wire the frontend to the Function — ✅ done
[`src/lib/api.ts`](../src/lib/api.ts) reads through `NEXT_PUBLIC_RD_API_BASE`
and **falls back to the bundled sample data** when it's unset — so a plain
`npm run build` (local dev) still always works. `npm run build:catalyst` has
the **`Raksha-Dhrishti-v2`** Function URL baked in (updated 2026-08-21 —
previously pointed at the original frozen project's URL, which would have
silently deployed against stale/frozen data), so every Catalyst deploy
serves live data from the active project automatically:
```bash
npm run deploy:catalyst
```
One important gotcha: the fetch **must not** use `cache: "no-store"` —
`output: "export"` resolves every fetch once at build time (there's no
request-time server for a static site), and Next treats a `no-store` fetch as
opting the route into dynamic rendering, which throws for a static export.
Default (cached) fetch is exactly "resolve once at build time", which is what
we want here.

Currently wired to live data: the **dashboard summary** and the
**district-wise** table (counts, trends, clearance). Case files, the
investigation workspace, and the case-file booklet still use the bundled
mock data in `data.ts`/`investigationData.ts` — extend the same `api.ts`
pattern if/when that's worth doing.

## 4. Auth (officer sign-in)
[`src/components/auth/AuthGate.tsx`](../src/components/auth/AuthGate.tsx) gates the
app via Catalyst Authentication. It is **off by default** (`NEXT_PUBLIC_RD_AUTH`
unset) so hosting is never blocked. To turn it on: enable Authentication in the
console, ensure the Catalyst web SDK is served with the client, then build with
`NEXT_PUBLIC_RD_AUTH=on`.

## 5. Next
- **Stratus**: move images + case-file evidence into blob storage.
- Extend live data to case files / investigation board (same `api.ts` pattern).
