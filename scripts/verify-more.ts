// Step 9 verification: More tab (Crime Scene, Forensics, Search & Seizure, Related Cases).
import { getScenarioIds } from "../src/lib/investigation/seedData";
import { normalizeInvestigationCase } from "../src/lib/investigation/normalize";
import { adaptToMore } from "../src/lib/investigation/adaptToMore";

let failures = 0;
function check(label: string, ok: boolean, detail?: string) {
  if (ok) console.log(`  ok   ${label}`);
  else { failures++; console.log(`  FAIL ${label}${detail ? " — " + detail : ""}`); }
}

let totalRelated = 0;
for (const scenarioId of getScenarioIds()) {
  const kase = normalizeInvestigationCase(scenarioId)!;
  const more = adaptToMore(kase);

  check(`${scenarioId}: crimeScenes count matches real FIR count`, more.crimeScenes.length === kase.firs.length);
  check(`${scenarioId}: forensics honestly unavailable`, more.forensicsAvailable === false);
  check(`${scenarioId}: search & seizure honestly unavailable`, more.searchSeizureAvailable === false);
  check(`${scenarioId}: sceneEvidence count matches real CCTV evidence count`, more.sceneEvidence.length === kase.evidence.filter(e => e.type === "CCTV Footage").length);

  // never "related" to itself
  check(`${scenarioId}: never lists itself as a related case`, more.relatedCases.every((r) => r.scenarioId !== scenarioId));

  // every related case's reason is real: re-derive independently
  for (const r of more.relatedCases) {
    const otherKase = normalizeInvestigationCase(r.scenarioId)!;
    const fir = otherKase.firs.find((f) => f.caseMasterId === r.caseMasterId)!;
    const sharesIo = kase.firs.some((f) => f.ioPersonId && f.ioPersonId === fir.ioPersonId);
    const sharesStation = kase.firs.some((f) => f.policeStationName && f.policeStationName === fir.policeStationName);
    const claimedIo = r.reasons.includes("Same Investigating Officer");
    const claimedStation = r.reasons.includes("Same Police Station");
    check(`${scenarioId} -> ${r.scenarioId}/${r.caseMasterId}: "Same Investigating Officer" claim is real`, claimedIo === sharesIo);
    check(`${scenarioId} -> ${r.scenarioId}/${r.caseMasterId}: "Same Police Station" claim is real`, claimedStation === sharesStation);
  }
  totalRelated += more.relatedCases.length;
}
check("at least one scenario has a real related-case match (confirms the derivation isn't vacuously empty everywhere)", totalRelated > 0, `total=${totalRelated}`);

console.log("\n=== Determinism ===");
for (const scenarioId of getScenarioIds()) {
  const kase = normalizeInvestigationCase(scenarioId)!;
  const a = JSON.stringify(adaptToMore(kase));
  const b = JSON.stringify(adaptToMore(kase));
  check(`${scenarioId}: deterministic`, a === b);
}

console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
