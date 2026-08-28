# Raksha-Drishti

**Karnataka State Police — Crime Analytics & Investigation Portal.**

A Next.js (App Router) portal for viewing crime counts and hotspots,
searching cases/persons/districts directly, working a real FIR Index down to
one case's full record, and surfacing cross-district patterns and repeat
offenders statewide. Built with a dignified, accessible government-portal
design system.

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

**Live data status:** as of the P2 cases restructure (2026-08-28), **every
page under `/cases`, `/districts`, `/persons`, `/repeat-offenders`,
`/pattern-analysis`, and the dashboard's attention list is built from real
seeded data** — the bundled seed JSON under `src/lib/nosql-seed/`, not a
mock generator. There is no fallback-to-fake-data path left in this part of
the app; the old `data.ts` placeholder rows (`caseFiles`) and the RNG mock
generator (`investigationData.ts`) were deleted along with everything that
only they fed once nothing reachable used them any more.

Dashboard summary and Crime Count/Crime Hotspots' underlying stats
separately pull **live** data through `/api/*` Route Handlers (real Data
Store queries, not seed JSON) — see
[`catalyst/README.md` §3](catalyst/README.md#3-api--️-route-handlers-rd_api-function-retired).
(`/cases`'s FIR Index used to be one of these live-query pages too, before
the P2 restructure moved it onto the seed-JSON path described above.)

**The app also has its first real write endpoint**: `PATCH
/api/cases/[caseId]/status`, confirmed working against the live Data Store
(not just locally typechecked) — see `catalyst/README.md` §5. One honest
gap: that endpoint writes live, but every read path above still serves the
bundled seed JSON snapshot, so a live write doesn't show up anywhere in the
UI yet.

## Where the work stands

**[`PLAN.md`](PLAN.md) is the tracker** — it holds the live checkbox state
and is the source of truth for what's done and what's next.
[`RESEARCH_AND_PLAN.md`](RESEARCH_AND_PLAN.md) holds the *why*: the KSP
domain research, the AI capability survey, and the Data Store audit. This
section is just the orientation summary; when the two disagree, PLAN.md wins.

*Last swept 2026-08-28.*

**Done**

- **P2 — the cases restructure (whole track), merged and live.** The old
  `/cases/[caseType]/[district]/...` route tree (investigation-workspace,
  case-files, district-wise) is retired — Next.js won't let it coexist with
  the replacement anyway, two differently-named dynamic segments at the same
  path level is a hard build error. In its place: a real FIR Index
  (`/cases`), a real single-case detail page (`/cases/[caseId]`), a district
  lens (`/districts`), a full person register (`/persons`), a working header
  search, an attention-list dashboard surfacing cross-district pattern
  signals for the first time, and the app's first real write endpoint
  (`PATCH /api/cases/[caseId]/status`, confirmed against the live Data
  Store). Full writeup, including two real bugs found and fixed along the
  way and what's deliberately *not* built yet (IO assignment, case-diary —
  the latter genuinely blocked on a table only a human can create in the
  Catalyst console): `PLAN.md` P2.
- **P0 — credibility.** Removed 11 login-bypass links from Home (plus 4 more
  in the shared footer), deleted 12 dead "Soon" nav items, made the maps
  responsive, reframed the state scope as **SCRB**, and demoted district from
  a login-time role to a URL filter. Every visible nav item now goes
  somewhere real.
- **P1.1 — one person identity.** `Accused.PersonID` went from scenario-local
  labels (where a single ID covered 17 different people) to a global register,
  `KA-P0001`–`KA-P0047`. Fixed alongside it: the evidence layer's person
  citations resolved **0 of 47** — the two ID spaces never met — now 107/107.
- **P1.3 — per-incident coordinates.** 19 FIRs shared 14 points because five
  station centroids each served two cases. Now 19/19 distinct, each anchored
  on its authored location so scenarios stay in the neighbourhood their
  narrative names.
- **P3.1/P3.3 — the person spine.** Entity fusion + cross-source timeline
  merge across all 15 scenarios — the engine behind `/persons` and
  `/repeat-offenders`.
- **P4.6/P4.7 — pattern analysis + repeat offenders.** Deterministic MO
  clustering (`/pattern-analysis`) and the statewide repeat-offender view
  (`/repeat-offenders`), both real, both now also surfaced on the dashboard.
- **P5.0–P5.3, P5.2b, P5.3b — AI contradiction detection**, visible in the
  Investigation Workspace's successor, `/cases/[caseId]` (verified vs.
  AI-detected findings, kept honestly distinct).

**Next up**

**P1.2 — merge the two seeds** into one generator that is both broad and
deep. This is the highest-value unblocked item: `P4.1–P4.3` (real
hotspot/trend/time-of-day analytics) are waiting on case volume, not on AI
and not on anyone's decision. 19 cases across 8 districts cannot show a
hotspot, a trend, or a time-of-day distribution. **Note:** this is a
separate, larger decision from everything above — it ends in a one-time
wipe-and-reimport of the *live* Data Store (P1.6), not something to start on
momentum from an unrelated branch.

Also unblocked and needing nothing from anyone: **P2.2's IO assignment /
case-diary** follow-ups (diary genuinely needs a human to create a table in
the Catalyst console first), plus the two cross-cutting items X1 and X2.

**Blocked on a decision, not on effort**

| Blocked | Waiting on |
|---|---|
| All of **P5** (AI) *(the parts not already shipped)* | Ongoing — P5.4/P5.8 open |
| All of **P6** (Zia) | Whether we generate case-document images at all |
| **P1.5** / **P4.5** | Agreeing the caste/religion presentation first |

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000 → the Home welcome page.

Local `npm run dev` has no real Catalyst request context, so every `/api/*`
route's live Data Store/NoSQL call fails (`"Failed to parse object"`) — this
is expected, not a bug. The read-side `/api/*` routes (summary, casetypes,
districts, district-stats) transparently fall back to bundled sample data in
`src/lib/data.ts` on any error, so the site never breaks from this locally.
The **write** endpoint (`PATCH /api/cases/[caseId]/status`) has no fallback
by design — a write either really happens or it clearly fails; it cannot be
exercised end-to-end locally at all, only on the deployed Slate app. Every
page under `/cases`, `/districts`, `/persons`, `/repeat-offenders`,
`/pattern-analysis` reads bundled *seed* JSON directly (not a mock, not a
live call) and works identically local or deployed.

## Navigation flow

Grounded in real CCTNS/Karnataka-police workflow research (`PLAN.md` P2's
own note), not an arbitrary redesign: real police software is search-first
(FIR number / person / district), with a flat FIR Index worklist as the
daily-use screen — not a mandatory "pick a category, then a district" gate
to reach one case. As of the P2 restructure:

```
/                          -> Home (public welcome screen, no sidebar)
/dashboard                 -> analytics home (attention list: alerts + cross-district
                               pattern signals first, totals demoted to a strip)
   |- header search        -> real, searches cases + persons + districts at once
   |- /crime-count
   |- /crime-hotspots
   |- /pattern-analysis    -> real MO-clustering across all 19 seeded FIRs
   |- /cases               -> the FIR Index: every real case, filterable by
   |    |                     type/district/status/text - not a category picker
   |    \- /cases/[caseId] -> one real case: facts, sections, evidence timeline,
   |                          contradiction findings, status editor (real write)
   |- /districts           -> pendency + clearance per district
   |    \- /districts/[district] -> that district's real case list
   |- /persons             -> every person in the register, searchable
   |    \- /persons/[personId]   -> a real profile: identity, cases, timeline
   \- /repeat-offenders    -> filtered view into /persons (2+ cases)
```

The old `/cases/[caseType]/[district]/investigation-workspace` /
`case-files` / `case-files/[caseId]` / `district-wise` tree 301/308-redirects
to its closest real equivalent (`next.config.mjs`) — nothing bookmarked
against the old shape just 404s.

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
| Dashboard | `src/app/(site)/dashboard/page.tsx` | Attention-list home — real alerts + cross-district pattern signals first, totals demoted to a strip (`StatStrip.tsx`) — **live** (`/api/summary`, `/api/casetypes`) + real seeded scenario data |
| Crime Count | `src/app/(site)/crime-count/page.tsx` | District/crime-type stats + charts — **live** (`/api/casetypes`, `/api/districts`) |
| Crime Hotspots | `src/app/(site)/crime-hotspots/page.tsx` | MapLibre spatiotemporal heatmap, embedded via `MapEmbed.tsx` (see its comments for the Slate `X-Frame-Options` workaround) |
| Pattern Analysis | `src/app/(site)/pattern-analysis/page.tsx` | Real MO-clustering (shared/rare Act+Section signatures) across all 19 real FIRs — `src/lib/moPatterns.ts` |
| Cases | `src/app/(site)/cases/page.tsx` | The real FIR Index — every seeded case, filterable by type/district/status/text — `src/lib/caseWorklist.ts` |
| Case detail | `src/app/(site)/cases/[caseId]/page.tsx` | One real case, keyed by `CaseMasterID`: facts, sections, sibling-FIR cross-links, cross-source evidence timeline, verified + AI-detected contradiction findings, and a real status editor (`PATCH /api/cases/[caseId]/status`) |
| Districts | `src/app/(site)/districts/page.tsx` | Real pendency/clearance/repeat-subject count per district — `src/lib/districtStats.ts` |
| District detail | `src/app/(site)/districts/[district]/page.tsx` | That district's real case list (reuses the FIR Index's own table component) |
| Persons | `src/app/(site)/persons/page.tsx` | Every person in the global register (47), searchable by name |
| Person detail | `src/app/(site)/persons/[personId]/page.tsx` | A real profile: photo/initials, registered identity (Aadhaar/phone/address — synthetic, documented as such), every case, cross-source timeline |
| Repeat Offenders | `src/app/(site)/repeat-offenders/page.tsx` | Filtered view into Persons: subjects named across 2+ cases, master-detail layout |

Sample/fallback data for the **live Data Store `/api/*` routes only**
(summary, casetypes, districts, district-stats) lives in
[`src/lib/data.ts`](src/lib/data.ts). Everything in the table above reads
**bundled seed JSON** (`src/lib/nosql-seed/`) directly, not a mock and not a
live call — see `catalyst/README.md` §2b/§3b for how that seed data is
generated and kept in sync. The old case-type-scoped route tree, its mock
generator (`investigationData.ts`), and everything that only fed it
(`AIPanel.tsx`, `EvidenceBoard.tsx`, `flipbook/*`, and more) were deleted in
the P2 restructure — confirmed unreachable with a full transitive import
check, not just a page-level grep.

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
Overview, Crime Hotspots, Pattern Analysis, Cases, Districts, Persons,
Repeat Offenders. Twelve entries (Investigation Workspace, Evidence Feed,
Persons & Entities, Alerts & Leads, all of Reports and System) used to
render disabled with a "Soon" pill against three that worked, advertising a
product four times the size of the real one — removed in P0. `Item.href` is
required, so a dead entry is a type error rather than a grey row. Every one
of P0's placeholder gaps that PLAN.md flagged as "add back once real" now
has a real page and is in the sidebar (Districts and Persons landed with the
P2 restructure). Every number in either shell is either live
(`getSummary`/`getCaseTypes`, same fallback pattern as elsewhere) or real
seeded data (Featured Investigation, Alerts & Leads, the two attention-list
pattern signals — see `src/lib/dashboardData.ts`, `moPatterns.ts`,
`personFusion.ts`); nothing is fabricated, including no invented "vs. last
month" deltas (stat cards show a real year-over-year sparkline instead).
The dashboard's colourful accent palette (`--dash-*` tokens in
`globals.css`) is deliberately scoped to the sidebar shell — Home keeps the
muted navy/saffron system unchanged.

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
- `src/components/` — `PageShell`, `LinkCard`, `Placeholder`,
  `CaseStatusPill`, `CrossSourceTimeline` (the real evidence timeline graph,
  used on case/person detail pages)
- `src/components/cases/` — `CaseWorklistClient` (the FIR Index table,
  reused as-is on district detail), `CaseStatusEditor` (the real write
  control)
- `src/components/dashboard/` — `AttentionSignals`, `StatStrip` (the P2.3
  dashboard rebuild), `DashboardTopbar` (real search)
- `src/lib/caseWorklist.ts`, `districtStats.ts`, `searchIndex.ts`,
  `caseStatus.ts` — the P2 restructure's data layer, all built from bundled
  seed JSON (`src/lib/nosql-seed/`), no live calls
- `src/lib/api.ts` — same-origin `fetch("/api/...")` helpers with automatic
  fallback to `data.ts`, for the **live Data Store** routes only
  (summary/casetypes/districts/district-stats); `src/lib/zcql.ts` — shared
  ZCQL read helpers + the Data Store write helper (`updateRow()`) used by
  every Route Handler under `src/app/api/`

**Known dead code, not yet removed**: `src/components/investigation/`
(`RealEvidenceFeed.tsx`, `PinnedCard.tsx`, `SectionHeading.tsx`) and the
`/api/investigation` Route Handler it alone called are unreachable from any
page as of the P2 restructure — case-detail's evidence timeline now reads
`personFusion.ts`'s `getScenarioTimeline()` directly instead. Left in place
pending a dedicated cleanup pass; see `PLAN.md`'s dead-code note for the
full, verified list (checked with a transitive import scan, not a
single-directory grep).

## Assets

The masthead emblem is served from `public/karnataka-state-police.png`. Replace
it with a clean, licensed asset before any non-demo use.

## Tech

Next.js 15 · React 19 · TypeScript · Tailwind CSS · d3-force · Framer Motion.
