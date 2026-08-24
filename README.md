# Raksha-Drishti

**Karnataka State Police — Crime Analytics & Investigation Portal.**

A Next.js (App Router) portal for viewing crime counts and hotspots, browsing
cases by district, and working individual investigations through to the digital
case file. Built with a dignified, accessible government-portal design system.

## Project status — read before deploying or touching the Data Store

This is the **private** continuation repo for KSP Datathon26 (team Apex
Analytics). The original submitted repo (public,
`github.com/mukesh-dev-git/Raksha-Drishti-final`) is **frozen** — don't push
there, don't change its visibility. This repo's `main` tracks a separate
private remote.

Same split on the backend: **two Zoho Catalyst projects** exist —
`RakshaDrishti` (original, frozen, only 4 Data Store tables) and
`Raksha-Dhrishti-v2` (active, all continued work). **Always confirm the
active project** (`catalyst.cmd project:list`) before running `deploy` or
any `ds:import`/`ds:export`. The app is hosted on **Catalyst Slate**
(git-push-based auto-deploy, not the old Web Client Hosting path) at
`https://raksha-drishti-v2-byahjtre.onslate.in/`.

**[`catalyst/README.md`](catalyst/README.md) is the source of truth for
everything backend** — Slate hosting/deploy gotchas, the full 21-table Data
Store schema build status, the 6 seeded NoSQL investigation-intelligence
collections, and every live API route. **Read it before touching the Data
Store, NoSQL, or deploy config** — don't re-derive the schema from
`Police_FIR_ER_Diagram.pdf` by hand, and don't assume a Slate quirk is a
platform bug before checking there (several "bugs" turned out to be our own
code — see that file's notes on `dynamicParams`/`force-dynamic` and
`X-Frame-Options`). Column-level schema reference:
[`catalyst/DATA_STORE_SCHEMA.md`](catalyst/DATA_STORE_SCHEMA.md).

**Live data status:** Dashboard summary, Cases list, District-wise stats,
and Crime Count/Crime Hotspots' underlying stats all pull real data through
`/api/*` Route Handlers. The Investigation Workspace additionally shows a
"Verified Evidence Feed" panel of real seeded case data for the 15 (of 32)
caseType/district combinations that have an authored scenario behind them —
see
[`catalyst/README.md` §3](catalyst/README.md#3-api--️-route-handlers-rd_api-function-retired).
Everything else (case files, the case-file flipbook, and any
caseType/district combo without a seeded scenario) still runs on the
bundled mock generators in `src/lib/data.ts` /
`src/lib/investigationData.ts` — every live call falls back to that mock
data automatically on any API error, so the site never breaks from a Data
Store hiccup.

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000 → redirects to `/dashboard`.

Local `npm run dev` has no real Catalyst request context, so every `/api/*`
route's Data Store/NoSQL call fails and the site transparently falls back to
the bundled mock data in `src/lib/data.ts` / `investigationData.ts` — this is
expected, not a bug. To see real data you need the deployed Slate app.

## Navigation flow

```
/                                    -> redirects to /dashboard
/dashboard                           -> hero, summary stats, 3 modules
   |- /crime-count
   |- /crime-hotspots
   |- /cases
        |- /cases/[caseType]/district-wise            (ranked district table)
             |- .../[district]/investigation-workspace   (the investigation board)
                  |- .../case-files                       (case-file list)
                       |- .../[caseId]                    (digital case-file flipbook)
```

## Design system

The visual language models an official Indian State Police portal — calm,
trustworthy authority over flash.

- **Colour**: deep navy (`#0B2E59`) primary on an off-white base; a single
  saffron/white/green tricolor divider per screen; muted, functional status
  colours (green verified, amber pending, red alert only).
- **Type**: Inter throughout, generous 1.6 line-height, weight/colour for
  emphasis (no italics, no display fonts).
- **Layout**: grid-based, symmetrical, generous whitespace; solid cards with
  soft shadows and 6–10px radius; barely-rounded rectangular buttons.
- **Chrome**: a persistent first-class emergency/helpline bar (112 + Police,
  Women, Child, Ambulance), navy masthead with the Karnataka State Police
  emblem, and a simple click-first horizontal nav.

### Accessibility (WCAG 2.1 AA)

- Visible **font-size** stepper (A / A+ / A++) and **high-contrast** toggle in
  the header, persisted to `localStorage` and applied via `<html>` data-attrs.
- Skip link, visible focus rings on every interactive element, `aria-current`
  on the active nav/breadcrumb, and status never conveyed by colour alone.

### Design tokens

Semantic CSS variables in [`globals.css`](src/app/globals.css) (surfaces, ink,
navy, tricolor, status, focus) are exposed to Tailwind in
[`tailwind.config.ts`](tailwind.config.ts) as `paper`, `surface`, `line`,
`ink`, `muted`, `navy`, `saffron`, `success`, `warning`, `danger`. High-contrast
and font-size modes override the same variables.

## Screens

| Page | File | Notes |
|------|------|-------|
| Dashboard | `src/app/dashboard/page.tsx` | Navy hero, summary stat tiles, 3 module cards — **live** (`/api/summary`) |
| Crime Count | `src/app/crime-count/page.tsx` | District/crime-type stats + charts — **live** (`/api/casetypes`, `/api/districts`) |
| Crime Hotspots | `src/app/crime-hotspots/page.tsx` | MapLibre spatiotemporal heatmap, embedded via `MapEmbed.tsx` (see its comments for the Slate `X-Frame-Options` workaround) |
| Cases | `src/app/cases/page.tsx` | Case-type cards — **live** (`/api/casetypes`) |
| District-wise | `src/app/cases/[caseType]/district-wise/page.tsx` | Ranked district table — **live** (`/api/district-stats`) |
| Investigation Workspace | `.../[district]/investigation-workspace/page.tsx` | Relationship graph, timeline, evidence, AI insights (mock) + a **Verified Evidence Feed** panel showing real seeded case data when available (`/api/investigation`, see `RealEvidenceFeed.tsx`) |
| Case Files | `.../[district]/case-files/page.tsx` | Case-file list with status badges — mock data |
| Case File (booklet) | `.../case-files/[caseId]/page.tsx` | Page-turning digital case-file flipbook — mock data |

Sample/fallback data lives in [`src/lib/data.ts`](src/lib/data.ts); the
investigation board's seeded mock generator is in
[`src/lib/investigationData.ts`](src/lib/investigationData.ts) — every "live"
row above calls a Route Handler under `src/app/api/` first and only falls
back to these on error (see `catalyst/README.md` §3/§3b for how each one
resolves real data).

## Shared building blocks

- `src/components/layout/` — `SiteHeader`, `EmergencyBar`, `SiteNav`,
  `SiteFooter`, `AccessibilityControls`
- `src/components/ui/` — `Breadcrumb`, `StatTile`, `StatusBadge`
- `src/components/` — `PageShell`, `LinkCard`, `Placeholder`
- `src/components/investigation/` and `src/components/flipbook/` — the
  investigation board and case-file flipbook
- `src/lib/api.ts` — same-origin `fetch("/api/...")` helpers with automatic
  fallback to `data.ts`; `src/lib/zcql.ts` — shared ZCQL/NoSQL helpers used
  by every Route Handler under `src/app/api/`

## Assets

The masthead emblem is served from `public/karnataka-state-police.png`. Replace
it with a clean, licensed asset before any non-demo use.

## Tech

Next.js 15 · React 19 · TypeScript · Tailwind CSS · d3-force · Framer Motion.
