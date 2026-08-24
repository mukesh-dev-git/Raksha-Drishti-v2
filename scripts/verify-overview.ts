// Step-4 verification: Overview adapter + derived logic. Dev-tooling only.
import { getScenarioIds } from "../src/lib/investigation/seedData";
import { normalizeInvestigationCase } from "../src/lib/investigation/normalize";
import { adaptToOverview } from "../src/lib/investigation/adaptToOverview";

let failures = 0;
function check(label: string, ok: boolean, detail?: string) {
  if (ok) console.log(`  ok   ${label}`);
  else { failures++; console.log(`  FAIL ${label}${detail ? " — " + detail : ""}`); }
}

console.log("=== Overview builds for all 15 scenarios, all FIRs ===");
for (const scenarioId of getScenarioIds()) {
  const kase = normalizeInvestigationCase(scenarioId)!;
  for (const fir of kase.firs) {
    const ov = adaptToOverview(kase, fir.caseMasterId);
    check(`${scenarioId}/${fir.caseMasterId}: progress in [0,100]`, ov.progress.percent >= 0 && ov.progress.percent <= 100);
    check(`${scenarioId}/${fir.caseMasterId}: health in [0,100]`, ov.health.percent >= 0 && ov.health.percent <= 100);
    check(`${scenarioId}/${fir.caseMasterId}: forensic/seizure milestones honestly unmet (no synthetic data)`,
      !ov.progress.milestones.find(m => m.key === "forensic")!.met && !ov.progress.milestones.find(m => m.key === "seizure")!.met);
    check(`${scenarioId}/${fir.caseMasterId}: recentEvents <= 4`, ov.recentEvents.length <= 4);
    check(`${scenarioId}/${fir.caseMasterId}: AI disclaimer present verbatim`,
      ov.ai.disclaimer === "AI-generated decision support based on synthetic case data. Verify against official case records before taking action.");
  }
}

console.log("\n=== Determinism ===");
for (const scenarioId of getScenarioIds()) {
  const kase = normalizeInvestigationCase(scenarioId)!;
  const fir = kase.firs[0];
  const a = JSON.stringify(adaptToOverview(kase, fir.caseMasterId));
  const b = JSON.stringify(adaptToOverview(kase, fir.caseMasterId));
  check(`${scenarioId}: adaptToOverview deterministic`, a === b);
}

console.log("\n=== Spot check: C3 (FIR 9005) ===");
{
  const kase = normalizeInvestigationCase("C3")!;
  const ov = adaptToOverview(kase, 9005);
  console.log(JSON.stringify(ov, null, 2));
}

console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
