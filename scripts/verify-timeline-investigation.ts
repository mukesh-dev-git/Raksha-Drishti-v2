// Step 5 verification: Timeline detail + Investigation tab adapters.
import { getScenarioIds } from "../src/lib/investigation/seedData";
import { normalizeInvestigationCase } from "../src/lib/investigation/normalize";
import { adaptToTimelineDetail } from "../src/lib/investigation/adaptToTimeline";
import { adaptToInvestigation } from "../src/lib/investigation/adaptToInvestigation";

let failures = 0;
function check(label: string, ok: boolean, detail?: string) {
  if (ok) console.log(`  ok   ${label}`);
  else { failures++; console.log(`  FAIL ${label}${detail ? " — " + detail : ""}`); }
}

console.log("=== Timeline detail: real ids, no dangling relatedPeople, matches raw count ===");
for (const scenarioId of getScenarioIds()) {
  const kase = normalizeInvestigationCase(scenarioId)!;
  const detail = adaptToTimelineDetail(kase);
  check(`${scenarioId}: detail count matches raw timelineEvents count`, detail.length === kase.timelineEvents.length);
  const personIds = new Set(kase.persons.map((p) => p.id));
  const badPeople = detail.flatMap((e) => e.relatedPeople).filter((p) => !personIds.has(p.id));
  check(`${scenarioId}: every relatedPeople id resolves to a real person`, badPeople.length === 0);
  const idsMatch = detail.every((e) => kase.timelineEvents.some((t) => t.id === e.id));
  check(`${scenarioId}: every detail event id is a real seed id`, idsMatch);
}

console.log("\n=== Investigation tab: activities/diary trace to real timeline, tasks/gaps honest ===");
for (const scenarioId of getScenarioIds()) {
  const kase = normalizeInvestigationCase(scenarioId)!;
  const fir = kase.firs[0];
  const inv = adaptToInvestigation(kase, fir.caseMasterId);
  check(`${scenarioId}: activities count == timeline events count (1:1 derivation)`, inv.activities.length === kase.timelineEvents.length);
  check(`${scenarioId}: diary count == activities count (1:1 derivation)`, inv.diary.length === inv.activities.length);
  check(`${scenarioId}: forensic task present (no forensic data exists)`, inv.tasks.some((t) => t.sourceType === "forensic"));
  check(`${scenarioId}: seizure task present (no seizure data exists)`, inv.tasks.some((t) => t.sourceType === "seizure"));
  check(`${scenarioId}: recommendedActions count == contradictions count`, inv.recommendedActions.length === kase.contradictions.length);
  check(`${scenarioId}: no task has sourceType contradiction (split correctly into recommendedActions)`, inv.tasks.every((t) => t.sourceType !== "contradiction"));
}

console.log("\n=== Determinism ===");
for (const scenarioId of getScenarioIds()) {
  const kase = normalizeInvestigationCase(scenarioId)!;
  const fir = kase.firs[0];
  const a = JSON.stringify([adaptToTimelineDetail(kase), adaptToInvestigation(kase, fir.caseMasterId)]);
  const b = JSON.stringify([adaptToTimelineDetail(kase), adaptToInvestigation(kase, fir.caseMasterId)]);
  check(`${scenarioId}: deterministic on repeat calls`, a === b);
}

console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
