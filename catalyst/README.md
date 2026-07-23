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

## 3. Next (Functions + Auth)
- **Functions**: Node endpoints running ZCQL over the Data Store
  (`/api/districts`, `/api/cases`, `/api/case-files`, clearance/trend
  aggregations), then rewire the frontend to fetch them instead of `src/lib/data.ts`.
- **Auth**: Catalyst Authentication login gate (officer sign-in) via the web SDK.
- **Stratus**: move images + case-file evidence into blob storage.
