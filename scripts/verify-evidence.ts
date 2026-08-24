// Step 8 verification: Evidence tab adapter.
import { getScenarioIds } from "../src/lib/investigation/seedData";
import { normalizeInvestigationCase } from "../src/lib/investigation/normalize";
import { adaptToEvidence } from "../src/lib/investigation/adaptToEvidence";

let failures = 0;
function check(label: string, ok: boolean, detail?: string) {
  if (ok) console.log(`  ok   ${label}`);
  else { failures++; console.log(`  FAIL ${label}${detail ? " — " + detail : ""}`); }
}

for (const scenarioId of getScenarioIds()) {
  const kase = normalizeInvestigationCase(scenarioId)!;
  const ev = adaptToEvidence(kase);

  check(`${scenarioId}: row count matches real evidence count`, ev.rows.length === kase.evidence.length);
  check(`${scenarioId}: custody honestly unavailable everywhere (no synthetic custody data)`, ev.rows.every((r) => r.custodyAvailable === false));

  const personIds = new Set(kase.persons.map((p) => p.id));
  const timelineIds = new Set(kase.timelineEvents.map((t) => t.id));
  let danglingPeople = 0, danglingTimeline = 0;
  for (const r of ev.rows) {
    for (const p of r.linkedPeople) if (!personIds.has(p.id)) danglingPeople++;
    for (const t of r.linkedTimelineEvents) if (!timelineIds.has(t.id)) danglingTimeline++;
  }
  check(`${scenarioId}: zero dangling linked-people ids`, danglingPeople === 0);
  check(`${scenarioId}: zero dangling linked-timeline ids`, danglingTimeline === 0);

  // every timeline event whose sourceType is cctv/call/transaction must
  // show up under its evidence row's linkedTimelineEvents
  for (const t of kase.timelineEvents) {
    if (t.sourceType !== "cctv" && t.sourceType !== "call" && t.sourceType !== "transaction") continue;
    const row = ev.rows.find((r) => r.id === t.sourceId);
    check(`${scenarioId}: timeline event ${t.id} appears under evidence ${t.sourceId}`, !!row && row.linkedTimelineEvents.some((x) => x.id === t.id));
  }

  const sumByType = ev.countByType.reduce((s, t) => s + t.count, 0);
  check(`${scenarioId}: countByType sums to total rows`, sumByType === ev.rows.length);

  // sorted chronologically
  const sorted = ev.rows.every((r, i) => i === 0 || (ev.rows[i - 1].date + ev.rows[i - 1].time) <= (r.date + r.time));
  check(`${scenarioId}: rows sorted chronologically`, sorted);
}

console.log("\n=== Determinism ===");
for (const scenarioId of getScenarioIds()) {
  const kase = normalizeInvestigationCase(scenarioId)!;
  const a = JSON.stringify(adaptToEvidence(kase));
  const b = JSON.stringify(adaptToEvidence(kase));
  check(`${scenarioId}: deterministic`, a === b);
}

console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
