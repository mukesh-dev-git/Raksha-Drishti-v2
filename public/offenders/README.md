# Offender photos

Drop images here named by `personId`, matching one of the 6 real repeat
offenders (`src/lib/personFusion.ts`'s `getRepeatCaseSuspects()`), shown on
[`/repeat-offenders`](../../src/app/(site)/repeat-offenders/page.tsx).

Supported extensions: `.jpg`, `.jpeg`, `.png`, `.webp` — checked in that
order by `src/lib/offenderPhotos.ts`. No code change or restart needed to
pick up a new file; it's resolved per-request from disk.

A person with no matching file falls back to an initials avatar
automatically — this list doesn't need to be complete to ship.

| File name (any supported extension) | Person |
|---|---|
| `KA-P0001` | Suresh Naik |
| `KA-P0008` | Z. Merchant |
| `KA-P0009` | Tarun Bhatia |
| `KA-P0020` | Halappa D |
| `KA-P0021` | Somesh K |
| `KA-P0039` | Deepak Rathore |

Example: `public/offenders/KA-P0001.jpg`.
