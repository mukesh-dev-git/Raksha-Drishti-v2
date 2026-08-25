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

Open http://localhost:3000 → the Home welcome page.

Local `npm run dev` has no real Catalyst request context, so every `/api/*`
route's Data Store/NoSQL call fails and the site transparently falls back to
the bundled mock data in `src/lib/data.ts` / `investigationData.ts` — this is
expected, not a bug. To see real data you need the deployed Slate app.

## Navigation flow

```
/                                    -> Home (public welcome screen, no sidebar)
/dashboard                           -> analytics home (sidebar shell begins here)
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
- **Chrome**: two shells (see "Home + sidebar shell" below) — the Home
  sign-in page (`/`) has a minimal header (emblem + Emergency 112) and
  deliberately **no navigation**; every other page runs a persistent
  sidebar + top bar. Both end in the same `SiteFooter`, which hides its
  "Quick links" column on Home for the same reason.

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
| Home | `src/app/page.tsx` | Public welcome screen (see below) — **live** (`/api/summary`) |
| Dashboard | `src/app/(site)/dashboard/page.tsx` | Sidebar-shell analytics home (see below) — **live** (`/api/summary`, `/api/casetypes`) + real seeded scenario data |
| Crime Count | `src/app/(site)/crime-count/page.tsx` | District/crime-type stats + charts — **live** (`/api/casetypes`, `/api/districts`) |
| Crime Hotspots | `src/app/(site)/crime-hotspots/page.tsx` | MapLibre spatiotemporal heatmap, embedded via `MapEmbed.tsx` (see its comments for the Slate `X-Frame-Options` workaround) |
| Cases | `src/app/(site)/cases/page.tsx` | Case-type cards — **live** (`/api/casetypes`) |
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

### Home + sidebar shell (site-wide)

The app has two distinct shells:

- **Home** (`/`, `src/app/page.tsx`) — the **sign-in screen**, kept
  deliberately *outside* the sidebar: `HomeHeader` (emblem + Emergency
  112, no nav), `HomeHero` with a live stat overview, a descriptive
  `FeatureGrid`, `MissionStrip`, `SiteFooter`, and the `LoginPanel`
  sidebar. **Nothing here links past the sign-in** — the header nav, the
  five feature-card links, the two hero CTAs and the footer quick links
  were all removed, because a landing page that routes around its own
  sign-in makes signing in decorative. The one forward action is
  "Continue to Dashboard".
- **Everything else** (Dashboard, Cases, Crime Count, Crime Hotspots, and
  everything under them) — a persistent sidebar + top bar shell instead of
  the horizontal nav. Structurally this is a Next.js route-group split:
  every one of those pages lives under `src/app/(site)/`, whose
  `layout.tsx` renders `DashboardSidebar` + `DashboardTopbar` (+ the same
  `SiteFooter` Home uses, kept on every page). Route groups don't affect
  URLs, so no page's path changed — this was originally a dashboard-only
  shell, widened to site-wide by a later request; see git history on
  `(site)/layout.tsx` for both steps.

**Every sidebar item navigates somewhere real** — Home, Dashboard, Crime
Overview, Crime Hotspots, Cases. Twelve further entries (Investigation
Workspace, Evidence Feed, Persons & Entities, Alerts & Leads, all of
Reports and System) used to render disabled with a "Soon" pill; against
three that worked they advertised a product four times the size of the
real one, so they were removed. `Item.href` is required, so a dead entry
is now a type error rather than a grey row. `PLAN.md` P2/P3 bring several
back as real pages — add each one back to the sidebar only once its page
exists. Every number in either shell is either live (`getSummary`/`getCaseTypes`, same fallback
pattern as elsewhere) or real seeded scenario data (Featured Investigation,
Alerts & Leads, Verified Evidence Feed — see `src/lib/dashboardData.ts`);
nothing is fabricated, including no invented "vs. last month" deltas (stat
cards show a real year-over-year sparkline instead). The dashboard's
colourful accent palette (`--dash-*` tokens in `globals.css`) is
deliberately scoped to the sidebar shell — Home keeps the muted navy/
saffron system unchanged.

The Crime Hotspots mini-map preview shares its source with the full
`/crime-hotspots` map. That map's "flaky CDN" failures turned out to be a
real bug in our own code (a hardcoded, outdated glyphs URL that 404'd
unconditionally) rather than actual network flakiness — fixed, see
`catalyst/README.md` §5 for the full story. Both map files also gained
automatic retry-with-backoff as a defensive measure for genuine transient
failures.

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
