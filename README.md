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
any `ds:import`/`ds:export`. Full detail, current schema-build status, and
what's still missing vs. the organizer's ER diagram:
[`catalyst/README.md`](catalyst/README.md) and
[`catalyst/DATA_STORE_SCHEMA.md`](catalyst/DATA_STORE_SCHEMA.md) — **read
those before adding or changing any Data Store table**, rather than
re-deriving the schema from `Police_FIR_ER_Diagram.pdf` by hand.

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000 → redirects to `/dashboard`.

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
| Dashboard | `src/app/dashboard/page.tsx` | Navy hero, summary stat tiles, 3 module cards |
| Crime Count | `src/app/crime-count/page.tsx` | Stats + charts placeholders |
| Crime Hotspots | `src/app/crime-hotspots/page.tsx` | Map / heatmap placeholder |
| Cases | `src/app/cases/page.tsx` | Case-type cards |
| District-wise | `src/app/cases/[caseType]/district-wise/page.tsx` | Ranked district table |
| Investigation Workspace | `.../[district]/investigation-workspace/page.tsx` | Relationship graph, timeline, evidence, AI insights |
| Case Files | `.../[district]/case-files/page.tsx` | Case-file list with status badges |
| Case File (booklet) | `.../case-files/[caseId]/page.tsx` | Page-turning digital case-file flipbook |

Placeholder boxes marked **"Pending — feature to be added"** show teammates
where data features slot in. Sample data lives in
[`src/lib/data.ts`](src/lib/data.ts); the investigation board's seeded mock data
is in [`src/lib/investigationData.ts`](src/lib/investigationData.ts).

## Shared building blocks

- `src/components/layout/` — `SiteHeader`, `EmergencyBar`, `SiteNav`,
  `SiteFooter`, `AccessibilityControls`
- `src/components/ui/` — `Breadcrumb`, `StatTile`, `StatusBadge`
- `src/components/` — `PageShell`, `LinkCard`, `Placeholder`
- `src/components/investigation/` and `src/components/flipbook/` — the
  investigation board and case-file flipbook

## Assets

The masthead emblem is served from `public/karnataka-state-police.png`. Replace
it with a clean, licensed asset before any non-demo use.

## Tech

Next.js 15 · React 19 · TypeScript · Tailwind CSS · d3-force · Framer Motion.
