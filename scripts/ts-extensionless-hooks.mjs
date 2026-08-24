// -----------------------------------------------------------------------------
// Node ESM loader hook — resolves (a) extensionless relative TypeScript
// imports (the project's normal `from "./seedData"` style, written for
// Next.js's bundler-mode resolution) and (b) the project's `@/*` -> `src/*`
// tsconfig path alias, when running a script directly via plain Node with
// --experimental-strip-types, which otherwise requires an explicit file
// extension and knows nothing about tsconfig path aliases. Dev-tooling
// only — never imported by application code, and does not modify any src/
// file or the resolution Next.js itself uses at build/runtime.
// -----------------------------------------------------------------------------
import { pathToFileURL } from "node:url";

const EXTS = [".ts", ".mts", ".js"];
const SRC_ROOT = new URL("../src/", import.meta.url);

export async function resolve(specifier, context, nextResolve) {
  let target = specifier;
  let base = context;

  if (specifier.startsWith("@/")) {
    const mapped = new URL(specifier.slice(2), SRC_ROOT).href;
    target = mapped;
    base = { ...context, parentURL: pathToFileURL(process.cwd() + "/").href };
    if (!/\.[a-zA-Z0-9]+$/.test(target)) {
      for (const ext of EXTS) {
        try {
          return await nextResolve(target + ext, base);
        } catch {
          // try the next extension
        }
      }
    }
    return nextResolve(target, base);
  }

  if ((specifier.startsWith("./") || specifier.startsWith("../")) && !/\.[a-zA-Z0-9]+$/.test(specifier)) {
    for (const ext of EXTS) {
      try {
        return await nextResolve(specifier + ext, context);
      } catch {
        // try the next extension
      }
    }
  }
  return nextResolve(specifier, context);
}
