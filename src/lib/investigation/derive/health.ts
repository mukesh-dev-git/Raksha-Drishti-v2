// -----------------------------------------------------------------------------
// Investigation Health — a separate, deliberately-not-identical-to-Progress
// score. Where Progress asks "which stage has this case reached" (a
// milestone checklist), Health asks "how complete/well-documented is what
// exists so far" — weighted across dimensions, two of which are genuine
// coverage RATIOS (not just presence/absence), computed from real,
// already-linked data built in Step 1/2:
//   - Evidence linkage coverage: fraction of evidence records that have at
//     least one resolved relatedPersonId (real output of normalize.ts's
//     person-matching, not invented here).
//   - Accused statement coverage: fraction of accused persons who have at
//     least one recorded statement (real WitnessStatement resolution).
// The remaining two dimensions are presence checks, same data source as
// Progress but scored independently so Health is its own computation, not
// an alias for Progress.
//
// No fabrication: every input is a real count from InvestigationCase. When
// a case has zero evidence or zero accused, that dimension is scored 100
// (vacuously — nothing to fall short of) rather than 0, documented at each
// spot below, to avoid penalizing a case for a category that isn't
// applicable rather than one that's incomplete.
// -----------------------------------------------------------------------------
import type { InvestigationCase } from "../model";

export interface HealthDimension {
  key: string;
  label: string;
  percent: number;
  detail: string;
}

export interface InvestigationHealth {
  percent: number;
  dimensions: HealthDimension[];
}

export function computeInvestigationHealth(kase: InvestigationCase): InvestigationHealth {
  const dimensions: HealthDimension[] = [];

  // Evidence linkage coverage
  {
    const total = kase.evidence.length;
    const linked = kase.evidence.filter((e) => e.relatedPersonIds.length > 0).length;
    const percent = total === 0 ? 100 : Math.round((linked / total) * 100);
    dimensions.push({
      key: "evidenceLinkage",
      label: "Evidence Linkage",
      percent,
      detail: total === 0 ? "No evidence on record" : `${linked} of ${total} exhibits linked to a person`,
    });
  }

  // Accused statement coverage
  {
    const accused = kase.persons.filter((p) => p.role === "accused");
    const withStatement = accused.filter((p) =>
      kase.witnessStatements.some((s) => s.witnessPersonId === p.id)
    ).length;
    const percent = accused.length === 0 ? 100 : Math.round((withStatement / accused.length) * 100);
    dimensions.push({
      key: "accusedStatements",
      label: "Accused Statement Coverage",
      percent,
      detail: accused.length === 0 ? "No accused on record" : `${withStatement} of ${accused.length} accused have a recorded statement`,
    });
  }

  // Timeline documentation (presence)
  {
    const percent = kase.timelineEvents.length > 0 ? 100 : 0;
    dimensions.push({
      key: "timelineDocumentation",
      label: "Timeline Documentation",
      percent,
      detail: kase.timelineEvents.length > 0 ? `${kase.timelineEvents.length} events logged` : "No timeline events on record",
    });
  }

  // Forensic status (presence) — honestly 0 for every scenario today.
  {
    const percent = kase.forensicRequests.length > 0 ? 100 : 0;
    dimensions.push({
      key: "forensicStatus",
      label: "Forensic Status",
      percent,
      detail: kase.forensicRequests.length > 0 ? `${kase.forensicRequests.length} request(s) on record` : "No forensic request on record",
    });
  }

  const percent = Math.round(dimensions.reduce((sum, d) => sum + d.percent, 0) / dimensions.length);
  return { percent, dimensions };
}
