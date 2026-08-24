// Step 7 verification: People tab adapter.
import { getScenarioIds } from "../src/lib/investigation/seedData";
import { normalizeInvestigationCase } from "../src/lib/investigation/normalize";
import { adaptToPeople } from "../src/lib/investigation/adaptToPeople";

let failures = 0;
function check(label: string, ok: boolean, detail?: string) {
  if (ok) console.log(`  ok   ${label}`);
  else { failures++; console.log(`  FAIL ${label}${detail ? " — " + detail : ""}`); }
}

for (const scenarioId of getScenarioIds()) {
  const kase = normalizeInvestigationCase(scenarioId)!;
  const people = adaptToPeople(kase);
  const allRows = Object.values(people).flat();

  check(`${scenarioId}: total person count matches kase.persons`, allRows.length === kase.persons.length, `${allRows.length} vs ${kase.persons.length}`);

  const ids = new Set(kase.persons.map((p) => p.id));
  const evidenceIds = new Set(kase.evidence.map((e) => e.id));
  const statementIds = new Set(kase.witnessStatements.map((s) => s.id));

  let dangling = 0;
  for (const row of allRows) {
    for (const s of row.statements) if (!statementIds.has(s.id)) dangling++;
    for (const e of row.relatedEvidence) if (!evidenceIds.has(e.id)) dangling++;
  }
  check(`${scenarioId}: zero dangling statement/evidence refs`, dangling === 0, String(dangling));

  // every accused with a real WitnessStatement pointing at them shows up in their statements list
  for (const s of kase.witnessStatements) {
    if (!s.witnessPersonId) continue;
    const row = allRows.find((r) => r.id === s.witnessPersonId);
    check(`${scenarioId}: statement ${s.id} appears under person ${s.witnessPersonId}`, !!row && row.statements.some((x) => x.id === s.id));
  }

  check(`${scenarioId}: role ids referenced are real`, allRows.every((r) => ids.has(r.id)));
}

console.log("\n=== Determinism ===");
for (const scenarioId of getScenarioIds()) {
  const kase = normalizeInvestigationCase(scenarioId)!;
  const a = JSON.stringify(adaptToPeople(kase));
  const b = JSON.stringify(adaptToPeople(kase));
  check(`${scenarioId}: deterministic`, a === b);
}

console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
