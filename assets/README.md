# Assets — animated brief

Everything here is referenced by the root [`README.md`](../README.md).

## Generated, no action needed

| File | What it is |
|---|---|
| `hero.svg` | Animated masthead (SMIL — typing wordmark, self-drawing tricolor rule, pulsing hotspots, cross-district links). |
| `stats.svg` | Animated count-up of the five headline dataset figures. |
| `architecture.svg` | The data pipeline, with records travelling the path on a loop. |

These are hand-authored SVG with SMIL animation. GitHub proxies them through
camo and **does** run the animation — inline `<style>`/`<script>` in Markdown
does not, which is why the motion lives inside the SVG files rather than in
the README.

## Static screenshots — landed, real GIF upgrade still open

The four `.svg` placeholders were replaced with real **static PNG
screenshots** (2026-08-30), captured against a local production build
(`next start`, real `.env.local` credentials — not `npm run dev`, and not
the deployed Slate app, since the Claude Browser tooling used to capture
these can't render Catalyst-hosted (`onslate.in`) pages, a known
environment limitation) at exactly **1280×800**, using a headless Chromium
driven directly (Puppeteer), not a manual screenshot tool.

| File | Shot | Real finding while capturing |
|---|---|---|
| `demo-hotspots.png` | Kernel-density mode, statewide, all 8 districts' real clusters visible at once | — |
| `demo-case.png` | Case 9001, scrolled to the verified + AI-detected contradiction cards, cited record IDs legible | — |
| `demo-fusion.png` | KA-P0001 (Suresh Naik), scrolled to show the suspicion score's real factor breakdown *and* the full cross-source timeline in one frame | — |
| `demo-ask.png` | Ask Anything, **mid-query** (loading state), not a completed answer | The real question ("Which cases involve a repeat offender?") did not complete: the multi-round tool-calling loop gave up after too many rounds without reaching a final answer (a real, honest error message, not a crash or a fake answer — but a real functional gap, not yet fixed). Using the loading state was the honest choice here, not a stylistic one. |

**Still open: upgrade these to real animated GIFs.** The shot list originally
planned for each (layer transitions + time scrub for hotspots, the full FIR
→ case → contradiction click-through, a person profile assembling live, a
full question → cited-answer round trip) needs an actual screen recording,
which needs the `claude-in-chrome` MCP's `gif_creator` tool against a real
Chrome tab with the user's permission — not available in the tool context
these PNGs were captured from. Re-run against a working Ask Anything round
trip once that bug is fixed, so the GIF shows a real cited answer, not a
timeout.

**To swap a PNG for a GIF later:**

1. Record at **1280×800**, trim to the beats below.
2. Export GIF, target **≤ 8 MB** each (GitHub renders larger, but the page
   gets slow and the jury is on conference wifi).
3. Save as `assets/demo-<name>.gif`, delete the `.png`.
4. In the root `README.md`, change that one `<img src="assets/demo-<name>.png">`
   to `.gif`.

### Recording notes that matter for the jury

- **Shot 02** (case/contradiction) is the money shot — hold long enough on
  the contradiction panel that the cited record IDs are legible. That is
  the claim the whole AI section rests on.
- **Shot 04** (Ask Anything): do not cut the loading state, and do not
  record a run until the real answer round-trip completes — a visible
  multi-second tool round is honest; a timeout error is not the shot to use.
- Pick a **scenario** case for shot 02, not a bulk FIR — bulk cases carry no
  evidence records by design (documented scope boundary), so they have no
  contradictions to show.
