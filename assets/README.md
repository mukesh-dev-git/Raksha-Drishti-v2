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

## Placeholders — replace these

Four screen recordings carry the demo section. Each placeholder frame states
its own shot list on the plate.

| Placeholder | Replace with | Shot |
|---|---|---|
| `demo-hotspots.svg` | `demo-hotspots.gif` | Statewide hotspots — layer transitions + time scrub (~8s) |
| `demo-case.svg` | `demo-case.gif` | FIR Index → case detail → contradiction with citations (~10s) |
| `demo-fusion.svg` | `demo-fusion.gif` | Person fusion — one profile assembling from five sources (~8s) |
| `demo-ask.svg` | `demo-ask.gif` | Ask Anything — question → tool rounds → cited answer (~12s) |

**To swap one in:**

1. Record against the deployed Slate app (not `npm run dev` — local has no
   Catalyst request context, so live routes fall back to sample data).
2. Record at **1280×800**, trim to the beats listed on the placeholder frame.
3. Export GIF, target **≤ 8 MB** each (GitHub renders larger, but the page
   gets slow and the jury is on conference wifi).
4. Save as `assets/demo-<name>.gif`.
5. In the root `README.md`, change that one `<img src="assets/demo-<name>.svg">`
   to `.gif`. Each line is flagged with an HTML comment.

Delete the `.svg` placeholder once its `.gif` is in.

### Recording notes that matter for the jury

- **Shot 02** is the money shot — hold long enough on the contradiction
  panel that the cited record IDs are legible. That is the claim the whole
  AI section rests on.
- **Shot 04**: do not cut the loading state. A visible multi-second tool
  round is honest and shows a real model call rather than a canned string.
- Pick a **scenario** case for shot 02, not a bulk FIR — bulk cases carry no
  evidence records by design (documented scope boundary), so they have no
  contradictions to show.
