// -----------------------------------------------------------------------------
// Step-1 verification for the Investigation Module's normalization layer.
// Dev-tooling only — not imported by application code, not part of the
// production build. Run from the repo root:
//
//   node --experimental-strip-types --import ./scripts/register-ts-hooks.mjs \
//     scripts/verify-investigation-data.ts
//
// Checks (per the approved plan):
//   - all 15 scenarios load correctly
//   - all 19 FIRs resolve correctly
//   - the 17 supported caseType × district combinations work
//   - the 15 unsupported combinations correctly have no scenario
//   - Fraud × Bengaluru correctly exposes all 3 FIRs
//   - IDs stay consistent across persons/evidence/timeline/witnesses/related records
//   - no dangling references exist anywhere in a normalized case
//   - no RNG-generated investigation data is involved anywhere in this path
// -----------------------------------------------------------------------------
import { getScenarioIds, getCasesFile } from "../src/lib/investigation/seedData";
import { normalizeInvestigationCase, verifyInvestigationCase } from "../src/lib/investigation/normalize";

let failures = 0;
function check(label: string, ok: boolean, detail?: string) {
  if (ok) {
    console.log(`  ok   ${label}`);
  } else {
    failures++;
    console.log(`  FAIL ${label}${detail ? " — " + detail : ""}`);
  }
}

// --- crime-type / district slug tables (mirrors src/lib/data.ts) --------------
const CRIME_MINOR_HEAD_TO_SLUG: Record<number, string> = { 1: "theft", 2: "assault", 3: "fraud", 4: "burglary" };
const DISTRICT_ID_TO_SLUG: Record<number, string> = {
  4401: "bengaluru", 4402: "mysuru", 4403: "belagavi", 4404: "kalaburagi",
  4405: "dakshina-kannada", 4406: "tumakuru", 4407: "ballari", 4408: "shivamogga",
};

console.log("=== 1. All 15 scenarios load correctly ===");
const scenarioIds = getScenarioIds();
check("exactly 15 scenario ids in cases.json", scenarioIds.length === 15, `got ${scenarioIds.length}`);
const cases = [];
for (const id of scenarioIds) {
  const kase = normalizeInvestigationCase(id);
  check(`normalizeInvestigationCase("${id}") returns a case`, kase !== null);
  if (kase) cases.push(kase);
}

console.log("\n=== 2. All 19 FIRs resolve correctly ===");
const allFirIds = new Set<number>();
for (const kase of cases) {
  for (const fir of kase.firs) {
    check(
      `FIR ${fir.caseMasterId} (${kase.id}) has district + crime type resolved`,
      !!fir.districtName && !!fir.crimeTypeName,
      `districtName=${fir.districtName} crimeTypeName=${fir.crimeTypeName}`
    );
    allFirIds.add(fir.caseMasterId);
  }
}
check("19 distinct real FIRs across all scenarios", allFirIds.size === 19, `got ${allFirIds.size}`);

console.log("\n=== 3/4/5. caseType × district coverage (17 supported / 15 unsupported) + Fraud×Bengaluru = 3 FIRs ===");
// Build the coverage map straight from the raw FIR data (not hand-copied),
// so this check independently re-derives what the plan's audit claimed.
const pairToFirs = new Map<string, number[]>();
for (const kase of cases) {
  for (const fir of kase.firs) {
    const typeSlug = CRIME_MINOR_HEAD_TO_SLUG[fir.crimeMinorHeadId];
    const distSlug = DISTRICT_ID_TO_SLUG[fir.districtId];
    const key = `${typeSlug}::${distSlug}`;
    if (!pairToFirs.has(key)) pairToFirs.set(key, []);
    pairToFirs.get(key)!.push(fir.caseMasterId);
  }
}
const supportedPairs = Array.from(pairToFirs.keys());
check("17 supported (caseType, district) combinations", supportedPairs.length === 17, `got ${supportedPairs.length}`);
const allPairs: string[] = [];
for (const t of Object.values(CRIME_MINOR_HEAD_TO_SLUG)) {
  for (const d of Object.values(DISTRICT_ID_TO_SLUG)) allPairs.push(`${t}::${d}`);
}
const unsupportedPairs = allPairs.filter((p) => !pairToFirs.has(p));
check("15 unsupported combinations (of 32 total)", unsupportedPairs.length === 15, `got ${unsupportedPairs.length} of ${allPairs.length}`);
const fraudBengaluru = pairToFirs.get("fraud::bengaluru") ?? [];
check(
  "fraud × bengaluru exposes exactly 3 FIRs (9005, 9011, 9017)",
  fraudBengaluru.length === 3 && [9005, 9011, 9017].every((id) => fraudBengaluru.includes(id)),
  `got [${fraudBengaluru.join(", ")}]`
);

console.log("\n=== 6/7. ID consistency + no dangling references ===");
let totalIssues = 0;
for (const kase of cases) {
  const issues = verifyInvestigationCase(kase);
  totalIssues += issues.length;
  check(`${kase.id}: zero dangling references`, issues.length === 0, issues.slice(0, 5).join(" | "));
  // Same-person-same-id spot check: every person id referenced anywhere in
  // this case must appear exactly once in kase.persons (no duplicate ids,
  // no drift between what evidence/timeline/diary reference and who exists).
  const idCounts = new Map<string, number>();
  for (const p of kase.persons) idCounts.set(p.id, (idCounts.get(p.id) ?? 0) + 1);
  const dupes = Array.from(idCounts.entries()).filter(([, n]) => n > 1);
  check(`${kase.id}: no duplicate person ids`, dupes.length === 0, dupes.map(([id]) => id).join(", "));
}
check("zero dangling references across all 15 scenarios", totalIssues === 0, `${totalIssues} total`);

console.log("\n=== 8. No RNG-generated investigation data in this path ===");
// Static-source check: normalize.ts/seedData.ts must not reference Math.random
// or the old mock generator. Confirms by grep-equivalent scan of the module
// source text (loaded already, so re-read the two files directly).
import { readFileSync } from "node:fs";
import path from "node:path";
const stripComments = (src: string) =>
  src
    .split("\n")
    .map((line) => line.replace(/\/\/.*$/, ""))
    .join("\n");
const normalizeSrc = readFileSync(path.join(process.cwd(), "src/lib/investigation/normalize.ts"), "utf-8");
const seedDataSrc = readFileSync(path.join(process.cwd(), "src/lib/investigation/seedData.ts"), "utf-8");
check("normalize.ts contains no Math.random() call (outside comments)", !stripComments(normalizeSrc).includes("Math.random"));
check("seedData.ts contains no Math.random() call (outside comments)", !stripComments(seedDataSrc).includes("Math.random"));
check("normalize.ts does not import investigationData.ts (the old RNG generator)", !normalizeSrc.includes("investigationData"));
check("seedData.ts does not import investigationData.ts (the old RNG generator)", !seedDataSrc.includes("investigationData"));

// Determinism check: normalizing the same scenario twice must produce
// byte-identical JSON — the strongest practical proof of "no randomness".
console.log("\n=== Determinism (same scenario, two independent calls, identical output) ===");
for (const id of scenarioIds) {
  const a = JSON.stringify(normalizeInvestigationCase(id));
  const b = JSON.stringify(normalizeInvestigationCase(id));
  check(`${id}: identical output on repeated normalization`, a === b);
}

console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
