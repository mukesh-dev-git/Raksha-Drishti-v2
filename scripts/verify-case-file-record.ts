// Step 6 verification: structured Case File record adapter.
import { getScenarioIds } from "../src/lib/investigation/seedData";
import { normalizeInvestigationCase } from "../src/lib/investigation/normalize";
import { adaptToCaseFileRecord } from "../src/lib/investigation/adaptToCaseFileRecord";

let failures = 0;
function check(label: string, ok: boolean, detail?: string) {
  if (ok) console.log(`  ok   ${label}`);
  else { failures++; console.log(`  FAIL ${label}${detail ? " — " + detail : ""}`); }
}

for (const scenarioId of getScenarioIds()) {
  const kase = normalizeInvestigationCase(scenarioId)!;
  for (const fir of kase.firs) {
    const rec = adaptToCaseFileRecord(kase, fir.caseMasterId);
    check(`${scenarioId}/${fir.caseMasterId}: caseCategory resolved`, rec.legal.caseCategory !== "Not available in current records", rec.legal.caseCategory);
    check(`${scenarioId}/${fir.caseMasterId}: gravityOffence resolved`, rec.legal.gravityOffence !== "Not available in current records", rec.legal.gravityOffence);
    check(`${scenarioId}/${fir.caseMasterId}: custody honestly unavailable (no synthetic custody data)`, rec.evidence.custodyAvailable === false);
    check(`${scenarioId}/${fir.caseMasterId}: forensics honestly unavailable`, rec.supporting.forensicsAvailable === false);
    check(`${scenarioId}/${fir.caseMasterId}: search & seizure honestly unavailable`, rec.supporting.searchSeizureAvailable === false);
    check(`${scenarioId}/${fir.caseMasterId}: evidence register count matches real evidence count`, rec.evidence.register.length === kase.evidence.length);
    const personIds = new Set(kase.persons.map((p) => p.id));
    const dangling = rec.evidence.register.flatMap((e) => e.linkedPeople).filter((p) => !personIds.has(p.id));
    check(`${scenarioId}/${fir.caseMasterId}: zero dangling linked-people ids in evidence register`, dangling.length === 0);
    // every person listed under this FIR must actually belong to this FIR
    const allRows = [...rec.persons.complainant, ...rec.persons.victim, ...rec.persons.accused, ...rec.persons.witness, ...rec.persons.io];
    const wrongFir = allRows.filter((r) => {
      const p = kase.persons.find((pp) => pp.id === r.id);
      return !p || !p.caseMasterIds.includes(fir.caseMasterId);
    });
    check(`${scenarioId}/${fir.caseMasterId}: every listed person actually belongs to this FIR`, wrongFir.length === 0, wrongFir.map(r=>r.id).join(","));
  }
}

console.log("\n=== Determinism ===");
for (const scenarioId of getScenarioIds()) {
  const kase = normalizeInvestigationCase(scenarioId)!;
  const fir = kase.firs[0];
  const a = JSON.stringify(adaptToCaseFileRecord(kase, fir.caseMasterId));
  const b = JSON.stringify(adaptToCaseFileRecord(kase, fir.caseMasterId));
  check(`${scenarioId}: deterministic`, a === b);
}

console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
