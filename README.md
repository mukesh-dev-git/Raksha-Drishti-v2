# Raksha-Drishti

Crime analytics & investigation dashboard — **page/navigation scaffold**.

This repo currently contains only **pages, links, and placeholder descriptions**.
Every feature area is marked with a dashed box and a `TODO: teammate` comment
showing what to build there.

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000 → redirects to `/dashboard`.

## Navigation flow

```
/                                    -> redirects to /dashboard
/dashboard                           -> 3 box links
   |- /crime-count
   |- /crime-hotspots
   |- /cases
        |- /cases/[caseType]/district-wise            (click a case)
             |- .../[district]/investigation-workspace   (click a district)
                  |- .../case-files                       (link in workspace)
                       |- .../[caseId]                    (click a file = booklet)
```

## Where teammates add features

| Page | File | What to add |
|------|------|-------------|
| Crime Count | `src/app/crime-count/page.tsx` | Charts/KPIs of crime totals |
| Crime Hotspots | `src/app/crime-hotspots/page.tsx` | Map / heatmap |
| Cases | `src/app/cases/page.tsx` | Real case-type list |
| District-wise | `src/app/cases/[caseType]/district-wise/page.tsx` | Real district counts |
| Investigation Workspace | `.../[district]/investigation-workspace/page.tsx` | Socio-economic graph + MO |
| Case Files | `.../[district]/case-files/page.tsx` | Real case-file list |
| Case Booklet | `.../case-files/[caseId]/page.tsx` | FIR, timeline, suspects, evidence |

Sample/placeholder data lives in `src/lib/data.ts` — replace with real API data.

## Shared building blocks

- `src/components/PageShell.tsx` — breadcrumb + title + description wrapper
- `src/components/LinkCard.tsx` — the box-template link
- `src/components/Placeholder.tsx` — dashed "add feature here" box
