// -----------------------------------------------------------------------------
// Resolves an optional photo for a repeat-offender card (P4.7,
// /repeat-offenders). Deliberately NOT auto-sourced from an image search or
// generation service - see PLAN.md's note on why (a real, identifiable
// stranger's photo has no business being labeled a fictional offender's
// face, generated or scraped, without a real synthesis pipeline behind it).
// User-supplied only: drop a file in public/offenders/, see that folder's
// README.md for exact expected names.
//
// Checked from disk per request (fs.existsSync, server-only) rather than a
// build-time manifest - a demo folder gets filled in incrementally, and this
// way a new file just works on the next request, no rebuild needed. Costs a
// few sync stat() calls per page render, which is fine at today's scale (6
// people); revisit if this page ever lists hundreds.
// -----------------------------------------------------------------------------
import { existsSync } from "fs";
import path from "path";
import { BASE_PATH } from "./basePath";

const EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];

/** Public URL for `personId`'s photo if one has been dropped into
 *  public/offenders/, else null - callers fall back to an initials avatar. */
export function getOffenderPhotoUrl(personId: string): string | null {
  for (const ext of EXTENSIONS) {
    const abs = path.join(process.cwd(), "public", "offenders", `${personId}${ext}`);
    if (existsSync(abs)) {
      return `${BASE_PATH}/offenders/${personId}${ext}`;
    }
  }
  return null;
}
