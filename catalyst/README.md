# Catalyst deployment & backend

Project: **RakshaDrishti** · ID `56806000000019001` · zone India (Asia/Kolkata).

This folder holds everything for the Zoho Catalyst side: static hosting, the
FIR Data Store schema, and seed data.

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

## 2. Create the Data Store (FIR schema)

See [`DATA_STORE_SCHEMA.md`](./DATA_STORE_SCHEMA.md) for the full 21-table
schema and import order — that's the complete picture, but you don't need all
of it to get live data flowing.

### Fast path — the 4 tables `rd_api` actually queries
`rd_api`'s ZCQL is deliberately written as plain `SELECT ... WHERE` /
`GROUP BY` queries with **no JOINs and no Lookup columns required** (JOIN
semantics weren't testable ahead of a live Data Store, so the risk was
designed out). That means these 4 tables, imported as plain CSVs with no
further column configuration, are enough for **all four endpoints** to work:

1. Run `python gen_seed.py` (already generated into [`seed/`](./seed)).
2. In the console → Data Store → **Create Table → Import CSV**, for each of:
   `District.csv`, `Unit.csv`, `CrimeSubHead.csv`, `CaseMaster.csv` — any order,
   no Lookup conversion needed. Let Catalyst auto-infer column types.
3. That's it — no other tables needed for the current UI.

The seed gives you 8 districts, 4 crime types, and **406 CaseMaster rows**
(2022–2026, per-district clearance skew) so the district trends, clearance
rates, and case lists are computed from real data. The other 17 tables in
`seed/` (Victim, Accused, Act, Court, Employee, …) are ready whenever the app
extends past these 4 endpoints — import them later, same way.

## 3. Functions (rd_api) — live FIR data

The Node Function lives in [`functions/rd_api/`](../functions/rd_api). It runs
**ZCQL** over the Data Store and returns the exact shapes the frontend expects:

| Endpoint | Returns |
|---|---|
| `GET /summary` | dashboard totals (`District`, `CrimeSubHead`, `CaseMaster`) |
| `GET /casetypes` | crime sub-heads + counts (`CrimeSubHead`, `CaseMaster`) |
| `GET /districts` | district list (`District`) |
| `GET /district-stats?crime=<CrimeSubHeadID>` | per-district count, 5-yr trend, clearance rate (`CaseMaster`, `Unit`, joined in JS) |

### ⚠️ Deploy carefully — don't let the CLI scaffold over the existing code
`functions/rd_api/index.js` and `package.json` already exist in this repo with
the working logic. Running `catalyst functions:add` naming it `rd_api` would
scaffold a **fresh, boilerplate** folder at that same path and could clobber
them. Do this instead:
```bash
mv functions/rd_api functions/rd_api.src   # move the real code aside
catalyst functions:add                     # choose Advanced I/O, Node.js, name: rd_api
# this creates a fresh functions/rd_api/ wired correctly into catalyst.json
cp functions/rd_api.src/index.js functions/rd_api/index.js
# merge the "dependencies" from functions/rd_api.src/package.json into the
# newly-scaffolded functions/rd_api/package.json (keep the scaffolded file's
# other fields — main, catalyst-specific keys — as the CLI wrote them)
rm -rf functions/rd_api.src
cd functions/rd_api && npm install && cd ../..
catalyst deploy --only functions
```
Then hit the deployed URL directly (e.g. `.../server/rd_api/summary`) and
check it returns real JSON before wiring the frontend to it. **If a ZCQL query
errors, send the exact error back — the query syntax was written without
being able to test against a live Data Store, so a quick fix is expected.**

### Wire the frontend to the Function
The app reads through [`src/lib/api.ts`](../src/lib/api.ts), which **falls back
to the bundled sample data** when no backend is set — so the site always builds
and hosts. To serve live data, set the Function base URL and rebuild:
```bash
# .env.local
NEXT_PUBLIC_RD_API_BASE=https://<project>.<zone>.catalystserverless.com/server/rd_api
npm run build     # ./out now baked from live Data Store
```
Currently wired to live data: the **dashboard summary** and the **district-wise**
table (counts, trends, clearance). Everything else uses the bundled data until
extended the same way.

## 4. Auth (officer sign-in)
[`src/components/auth/AuthGate.tsx`](../src/components/auth/AuthGate.tsx) gates the
app via Catalyst Authentication. It is **off by default** (`NEXT_PUBLIC_RD_AUTH`
unset) so hosting is never blocked. To turn it on: enable Authentication in the
console, ensure the Catalyst web SDK is served with the client, then build with
`NEXT_PUBLIC_RD_AUTH=on`.

## 5. Next
- **Stratus**: move images + case-file evidence into blob storage.
- Extend live data to case files / investigation board (same `api.ts` pattern).
