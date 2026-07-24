# Catalyst deployment & backend

Project: **RakshaDrishti** · ID `56806000000019001` · zone India (Asia/Kolkata).

This folder holds everything for the Zoho Catalyst side: static hosting, the
FIR Data Store schema, and seed data.

## 1. Host the frontend (Web Client Hosting — static)

The app is configured for static export (`next.config.mjs` → `output: "export"`).

```bash
npm run build          # produces ./out (a static site)
npm install -g zcatalyst-cli
catalyst login
catalyst init          # select: Web Client Hosting  (+ Functions later)
```

Point the client-hosting folder at the exported `out/` (copy `out/*` into the
generated `client/`), then:

```bash
catalyst deploy
```

You get a live `*.catalystserverless.com` URL. Everything the app serves is
local (pages, the `crime-map/*.html` embeds, the logo) — only the hero/footer
backdrops still hotlink Unsplash; localize those into `public/` to be fully
Catalyst-served.

## 2. Create the Data Store (FIR schema)

See [`DATA_STORE_SCHEMA.md`](./DATA_STORE_SCHEMA.md) for the full table→column
mapping and import order.

Fastest path — **CSV import** in the Catalyst console:
1. Run `python gen_seed.py` (already generated into [`seed/`](./seed)).
2. In the console → Data Store → import each CSV **in the order listed in the
   schema doc** (parents before children).
3. After import, convert the `*ID` foreign-key columns to **Lookup** columns
   pointing at their parent table.

The seed gives you 8 districts, 4 crime types, and **406 CaseMaster rows**
(2022–2026, per-district clearance skew) so the district trends, clearance
rates, and case lists are computed from real data.

## 3. Functions (rd_api) — live FIR data

The Node Function lives in [`functions/rd_api/`](../functions/rd_api). It runs
**ZCQL** over the Data Store and returns the exact shapes the frontend expects:

| Endpoint | Returns |
|---|---|
| `GET /summary` | dashboard totals |
| `GET /casetypes` | crime sub-heads + counts |
| `GET /districts` | district list |
| `GET /district-stats?crime=<CrimeSubHeadID>` | per-district count, 5-yr trend, clearance rate |

Deploy (scaffold once via CLI so the config matches your CLI version, then keep
this `index.js`):
```bash
catalyst functions:add        # choose Advanced I/O, Node — name it rd_api
# copy functions/rd_api/index.js + package.json into the generated folder
catalyst deploy
```

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
