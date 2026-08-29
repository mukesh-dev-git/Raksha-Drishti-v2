# Page-hero illustrations

Optional top-right header illustration for a page's title band, rendered by
`PageShell`'s `heroImageSrc` prop (`src/components/PageShell.tsx`, added
2026-08-30). Same precedent as `public/offenders/` — externally-generated
files dropped straight into `public/`, referenced by a plain `<img>` with
`onError` hiding the element, so a page can reference a file before it
exists on disk without ever showing a broken-image icon.

## Convention

One PNG per page, named by route slug: `<slug>.png`. `PageShell` prefixes
`BASE_PATH` automatically — pass `heroImageSrc="/page-hero/<slug>.png"`.

## Spec every image must follow

- **Format:** PNG, transparent background (sits directly on the page
  background, not in a card — a rectangular background would look like a
  stray box).
- **Size:** 960×400px (renders at 480×200 logical px on 2x displays).
  Landscape, not square — it sits beside a title+description block, not
  above it.
- **Style:** flat, minimal vector illustration — no photorealism, no 3D
  render, no drop shadows. Restrained palette: navy `#0b2e59`, plus the
  app's categorical accents `#2563eb` (blue) `#7c3aed` (purple)
  `#ea8a1f` (orange) `#0d9488` (teal) `#db2777` (pink) — pick 2–3 per image,
  not all five. Dignified and calm, matching a government analytics
  portal — never cartoonish, never alarmist (no flashing sirens, no
  weapons, no depictions of a specific real crime in progress).
- **Content:** an abstract representation of the page's subject (a map, a
  chart, a network of linked dots, a person silhouette) — never a specific
  person, face, or identifiable individual, and never text/numbers baked
  into the image (any numbers must come from the live page, not a frozen
  picture).
