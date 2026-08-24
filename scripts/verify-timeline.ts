// -----------------------------------------------------------------------------
// Step-3 verification: Timeline-only wiring. Dev-tooling only, not part of
// the app. Run:
//   node --experimental-strip-types --import ./scripts/register-ts-hooks.mjs \
//     scripts/verify-timeline.ts
// -----------------------------------------------------------------------------
import { readFileSync } from "node:fs";
import path from "node:path";
import { getScenarioIds, getAllTimelineEvents, forScenario } from "../src/lib/investigation/seedData";
import { normalizeInvestigationCase } from "../src/lib/investigation/normalize";
import { resolveInvestigationCase, resolveFirsForPair } from "../src/lib/investigation/caseResolver";
import { adaptToLegacyTimelineEvents } from "../src/lib/investigation/adaptToTimeline";

let failures = 0;
function check(label: string, ok: boolean, detail?: string) {
  if (ok) console.log(`  ok   ${label}`);
  else { failures++; console.log(`  FAIL ${label}${detail ? " — " + detail : ""}`); }
}

console.log("=== 1. Event IDs / dates preserved exactly, per scenario ===");
for (const scenarioId of getScenarioIds()) {
  const kase = normalizeInvestigationCase(scenarioId)!;
  const rawCount = forScenario(getAllTimelineEvents(), scenarioId).length;
  const legacy = adaptToLegacyTimelineEvents(kase);
  check(`${scenarioId}: legacy event count matches real seed count`, legacy.length === rawCount, `${legacy.length} vs ${rawCount}`);

  const rawIds = new Set(forScenario(getAllTimelineEvents(), scenarioId).map((r) => r.id));
  const idsMatch = legacy.every((e) => rawIds.has(e.id));
  check(`${scenarioId}: every legacy event id is a real seed TimelineEvent id`, idsMatch);

  // chronological order preserved
  const sorted = legacy.every((e, i) => i === 0 || (legacy[i - 1].date + legacy[i - 1].time) <= (e.date + e.time));
  check(`${scenarioId}: chronological order preserved`, sorted);

  // dates non-empty and look like ISO dates
  const datesOk = legacy.every((e) => /^\d{4}-\d{2}-\d{2}$/.test(e.date));
  check(`${scenarioId}: every event has a real ISO date`, datesOk);
}

console.log("\n=== 2. relatedIds trace to real records (no dangling) ===");
for (const scenarioId of getScenarioIds()) {
  const kase = normalizeInvestigationCase(scenarioId)!;
  const legacy = adaptToLegacyTimelineEvents(kase);
  const knownIds = new Set<string>([
    ...kase.persons.map((p) => p.id),
    ...kase.evidence.map((e) => e.id),
    ...kase.witnessStatements.map((s) => s.id),
  ]);
  let dangling: string[] = [];
  for (const e of legacy) {
    for (const rid of e.relatedIds) {
      if (!knownIds.has(rid)) dangling.push(`${e.id}->${rid}`);
    }
  }
  check(`${scenarioId}: zero dangling relatedIds`, dangling.length === 0, dangling.join(", "));
}

console.log("\n=== 3. Spot check: C1 timeline titles trace to real sourceType ===");
{
  const kase = normalizeInvestigationCase("C1")!;
  const legacy = adaptToLegacyTimelineEvents(kase);
  const bySourceEvent = new Map(kase.timelineEvents.map((t) => [t.id, t]));
  const titleMap: Record<string, string> = {
    fir: "FIR Registered", cctv: "CCTV Sighting Logged", call: "Call Record Logged",
    transaction: "Financial Transaction Logged", statement: "Witness Statement Recorded",
  };
  let ok = true;
  for (const e of legacy) {
    const src = bySourceEvent.get(e.id)!;
    if (e.title !== titleMap[src.sourceType]) ok = false;
  }
  check("C1: every title matches its real sourceType label", ok);
  console.log("  C1 sample:", legacy.slice(0, 2).map((e) => `${e.id} [${e.date} ${e.time}] "${e.title}" related=${JSON.stringify(e.relatedIds)}`).join("\n              "));
}

console.log("\n=== 4. Empty state for unsupported (caseType, district) pairs ===");
{
  const lookup = resolveInvestigationCase("burglary", "bengaluru");
  check("burglary x bengaluru resolves to 'unavailable'", lookup.status === "unavailable");
  const timeline = lookup.status === "ok" && lookup.investigationCase ? adaptToLegacyTimelineEvents(lookup.investigationCase) : [];
  check("timeline is an explicit empty array (no fabricated events)", Array.isArray(timeline) && timeline.length === 0);
}

console.log("\n=== 5. Supported pair, workspace-level (no caseId) resolves to primary scenario's real timeline ===");
{
  const matches = resolveFirsForPair("fraud", "bengaluru");
  check("fraud x bengaluru has 3 real FIRs", matches.length === 3);
  const lookup = resolveInvestigationCase("fraud", "bengaluru");
  check("primary is deterministically the lowest CaseMasterID (9005 / scenario C3)", lookup.status === "ok" && lookup.investigationCase?.id === "C3");
  const timeline = lookup.status === "ok" && lookup.investigationCase ? adaptToLegacyTimelineEvents(lookup.investigationCase) : [];
  check("non-empty real timeline for the primary scenario", timeline.length > 0, `${timeline.length} events`);
}

console.log("\n=== 6. Determinism (repeat calls, identical output) ===");
for (const scenarioId of getScenarioIds()) {
  const kase = normalizeInvestigationCase(scenarioId)!;
  const a = JSON.stringify(adaptToLegacyTimelineEvents(kase));
  const b = JSON.stringify(adaptToLegacyTimelineEvents(kase));
  check(`${scenarioId}: adaptToLegacyTimelineEvents is deterministic`, a === b);
}

console.log("\n=== 7. No RNG in the new Step 3 file ===");
{
  const src = readFileSync(path.join(process.cwd(), "src/lib/investigation/adaptToTimeline.ts"), "utf-8");
  const stripped = src.split("\n").map((l) => l.replace(/\/\/.*$/, "")).join("\n");
  check("adaptToTimeline.ts contains no Math.random() call", !stripped.includes("Math.random"));
  check("adaptToTimeline.ts does not call the old RNG generator functions", !stripped.includes("getInvestigationData(") && !stripped.includes("getCaseFileContent("));
}

console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
