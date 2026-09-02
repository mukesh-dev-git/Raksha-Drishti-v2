// -----------------------------------------------------------------------------
// crimeCountStats.ts — P4.8/P4.4/P4.2/P4.3/P4.9 deterministic analytics for
// /crime-count. No LLM anywhere in this file (PLAN.md P4's own framing: "none
// of this needs an LLM") - every number here is a real aggregate computed
// once, server-side, from await getCaseWorklist() (the same real 5,000-case FIR
// Index every other real page reads) plus the new chargesheetDates.json
// (P4.4). Nothing here fabricates a count, a trend, or a "spike" - the
// control chart flags months against their own computed mean+stddev, not an
// arbitrary threshold.
// -----------------------------------------------------------------------------
import { getCaseWorklist, type WorklistCase } from "./caseWorklist";
import { caseTypes } from "./data";
import { CASE_STATUS_LABEL, type CaseStatusId } from "./caseStatus";
import chargesheetDatesRaw from "./nosql-seed/chargesheetDates.json";
import { isPeriodOffence, incidentHourOfDay, incidentDayOfWeek } from "./incidentTime";

const CHARGESHEET_DATES = chargesheetDatesRaw as Record<string, string>;

// --- P4.8 baseline: total / per-type / per-status ----------------------------
export type CrimeCountSummary = {
  totalCases: number;
  byCrimeType: { slug: string; name: string; total: number }[];
  byStatus: { statusId: CaseStatusId; label: string; total: number }[];
};

export async function getCrimeCountSummary(): Promise<CrimeCountSummary> {
  const cases = await getCaseWorklist();

  const typeCounts = new Map<string, number>();
  for (const c of cases) typeCounts.set(c.crimeTypeSlug, (typeCounts.get(c.crimeTypeSlug) ?? 0) + 1);
  const byCrimeType = caseTypes
    .map((t) => ({ slug: t.slug, name: t.name, total: typeCounts.get(t.slug) ?? 0 }))
    .sort((a, b) => b.total - a.total);

  const statusCounts = new Map<CaseStatusId, number>();
  for (const c of cases) statusCounts.set(c.statusId, (statusCounts.get(c.statusId) ?? 0) + 1);
  const byStatus = ([1, 2, 3, 4] as CaseStatusId[]).map((id) => ({
    statusId: id,
    label: CASE_STATUS_LABEL[id],
    total: statusCounts.get(id) ?? 0,
  }));

  return { totalCases: cases.length, byCrimeType, byStatus };
}

// --- P4.4: chargesheet rate + time-to-chargesheet + heinous split -----------
export type ChargesheetAnalytics = {
  totalCases: number;
  chargesheetedCases: number;
  chargesheetRatePct: number;
  medianDaysToChargesheet: number | null;
  timeToChargesheetHistogram: { bucketLabel: string; count: number }[];
  gravity: {
    heinous: { total: number; chargesheeted: number; ratePct: number };
    nonHeinous: { total: number; chargesheeted: number; ratePct: number };
  };
  /** Honest-degrade note: a case with CaseStatusID=2 but no matching
   *  chargesheetDates.json entry is still counted in the rate/heinous split
   *  (its status is real), just excluded from the day-count histogram since
   *  there's no real date to diff. Should be 0 given how both are generated
   *  from the same source row - surfaced rather than silently swallowed. */
  chargesheetedWithoutDate: number;
};

const DAY_BUCKETS: [number, number][] = [
  [0, 30],
  [30, 60],
  [60, 90],
  [90, 120],
  [120, Infinity],
];

export async function getChargesheetAnalytics(): Promise<ChargesheetAnalytics> {
  const cases = await getCaseWorklist();
  const days: number[] = [];
  let chargesheetedCases = 0;
  let chargesheetedWithoutDate = 0;
  let heinousTotal = 0,
    heinousCS = 0,
    nonHeinousTotal = 0,
    nonHeinousCS = 0;

  for (const c of cases) {
    const isHeinous = c.gravityOffenceId === 1;
    if (isHeinous) heinousTotal++;
    else nonHeinousTotal++;

    if (c.statusId !== 2) continue; // 2 = Charge Sheeted
    chargesheetedCases++;
    if (isHeinous) heinousCS++;
    else nonHeinousCS++;

    const csDate = CHARGESHEET_DATES[String(c.caseMasterId)];
    if (!csDate || !c.registeredDate) {
      chargesheetedWithoutDate++;
      continue;
    }
    const regTime = new Date(`${c.registeredDate}T00:00:00`).getTime();
    const csTime = new Date(csDate.replace(" ", "T")).getTime();
    if (Number.isNaN(regTime) || Number.isNaN(csTime)) {
      chargesheetedWithoutDate++;
      continue;
    }
    const d = Math.round((csTime - regTime) / 86_400_000);
    if (d >= 0) days.push(d);
  }

  const timeToChargesheetHistogram = DAY_BUCKETS.map(([lo, hi]) => ({
    bucketLabel: hi === Infinity ? `${lo}+ days` : `${lo}–${hi} days`,
    count: days.filter((d) => d >= lo && d < hi).length,
  }));

  const sortedDays = [...days].sort((a, b) => a - b);
  const medianDaysToChargesheet = sortedDays.length
    ? sortedDays.length % 2 === 1
      ? sortedDays[(sortedDays.length - 1) / 2]
      : Math.round((sortedDays[sortedDays.length / 2 - 1] + sortedDays[sortedDays.length / 2]) / 2)
    : null;

  const pct = (num: number, denom: number) => (denom ? Math.round((num / denom) * 1000) / 10 : 0);

  return {
    totalCases: cases.length,
    chargesheetedCases,
    chargesheetRatePct: pct(chargesheetedCases, cases.length),
    medianDaysToChargesheet,
    timeToChargesheetHistogram,
    gravity: {
      heinous: { total: heinousTotal, chargesheeted: heinousCS, ratePct: pct(heinousCS, heinousTotal) },
      nonHeinous: { total: nonHeinousTotal, chargesheeted: nonHeinousCS, ratePct: pct(nonHeinousCS, nonHeinousTotal) },
    },
    chargesheetedWithoutDate,
  };
}

// --- P4.2 + P4.9: time-of-day x day-of-week heatmap --------------------------
export type TimeHeatmapData = {
  /** grid[dayOfWeek][hour], dayOfWeek 0=Sunday..6=Saturday */
  grid: number[][];
  maxCount: number;
  includedCases: number;
  excludedPeriodOffences: number;
  excludedMissingTime: number;
};

export async function getTimeHeatmapData(): Promise<TimeHeatmapData> {
  const cases = await getCaseWorklist();
  const grid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
  let included = 0,
    excludedPeriodOffences = 0,
    excludedMissingTime = 0;

  for (const c of cases) {
    if (!c.incidentFromDate) {
      excludedMissingTime++;
      continue;
    }
    // P4.2's data-honesty requirement: a period offence's stored 00:00 is not
    // a real time-of-day and must not be counted as one.
    if (isPeriodOffence(c.incidentFromDate, c.incidentToDate)) {
      excludedPeriodOffences++;
      continue;
    }
    const dow = incidentDayOfWeek(c.incidentFromDate);
    const hr = incidentHourOfDay(c.incidentFromDate);
    grid[dow][hr]++;
    included++;
  }

  let maxCount = 0;
  for (const row of grid) for (const v of row) if (v > maxCount) maxCount = v;

  return { grid, maxCount, includedCases: included, excludedPeriodOffences, excludedMissingTime };
}

// --- P4.3 + P4.9: control-chart emerging-trend detection ---------------------
export type ControlChartSeries = {
  crimeTypeSlug: string;
  crimeTypeName: string;
  months: string[]; // "YYYY-MM", chronological
  counts: number[];
  mean: number;
  stdDev: number;
  upperBand: number; // mean + 2*stdDev
  flaggedMonths: string[];
};

function monthRange(start: string, end: string): string[] {
  const [sy, sm] = start.split("-").map(Number);
  const [ey, em] = end.split("-").map(Number);
  const months: string[] = [];
  let y = sy,
    m = sm;
  while (y < ey || (y === ey && m <= em)) {
    months.push(`${y}-${String(m).padStart(2, "0")}`);
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
  return months;
}

export async function getTrendControlChartData(): Promise<ControlChartSeries[]> {
  const cases = (await getCaseWorklist()).filter((c) => c.registeredDate);
  if (cases.length === 0) return [];

  const monthKeys = cases.map((c) => c.registeredDate!.slice(0, 7));
  const minMonth = monthKeys.reduce((a, b) => (a < b ? a : b));
  const maxMonth = monthKeys.reduce((a, b) => (a > b ? a : b));
  const months = monthRange(minMonth, maxMonth);

  return caseTypes.map((t) => {
    const byMonth = new Map<string, number>();
    for (const c of cases) {
      if (c.crimeTypeSlug !== t.slug) continue;
      const key = c.registeredDate!.slice(0, 7);
      byMonth.set(key, (byMonth.get(key) ?? 0) + 1);
    }
    const counts = months.map((m) => byMonth.get(m) ?? 0);
    const n = counts.length;
    const mean = counts.reduce((a, b) => a + b, 0) / n;
    const variance = counts.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
    const stdDev = Math.sqrt(variance);
    // "statistical outlier" per PLAN.md P4.3: >2 std-dev above the crime
    // type's OWN monthly baseline, not an arbitrary fixed threshold.
    const upperBand = mean + 2 * stdDev;
    const flaggedMonths = months.filter((m, i) => counts[i] > upperBand);

    return {
      crimeTypeSlug: t.slug,
      crimeTypeName: t.name,
      months,
      counts,
      mean: Math.round(mean * 100) / 100,
      stdDev: Math.round(stdDev * 100) / 100,
      upperBand: Math.round(upperBand * 100) / 100,
      flaggedMonths,
    };
  });
}

// --- P4.9: case-flow Sankey (crime type -> status -> pendency bucket) --------
export type SankeyLink = { source: string; target: string; value: number };
export type CaseFlowSankeyData = {
  crimeTypeNodes: string[];
  statusNodes: string[];
  bucketNodes: string[];
  crimeToStatus: SankeyLink[];
  statusToBucket: SankeyLink[];
};

// Open + Under Investigation both collapse into "Still Pending" - the point
// of this middle bucket is to show the pipeline hasn't just recorded a
// status, it's shown whether the case actually resolved (charge-sheeted or
// closed) or is still sitting in the pendency queue either way.
const STATUS_TO_BUCKET: Record<CaseStatusId, string> = {
  1: "Still Pending",
  4: "Still Pending",
  2: "Charge Sheeted",
  3: "Closed",
};

export async function getCaseFlowSankeyData(): Promise<CaseFlowSankeyData> {
  const cases = await getCaseWorklist();
  const crimeToStatusCounts = new Map<string, number>();
  const statusToBucketCounts = new Map<string, number>();

  for (const c of cases) {
    const k1 = `${c.crimeTypeName}||${c.statusLabel}`;
    crimeToStatusCounts.set(k1, (crimeToStatusCounts.get(k1) ?? 0) + 1);
    const bucket = STATUS_TO_BUCKET[c.statusId];
    const k2 = `${c.statusLabel}||${bucket}`;
    statusToBucketCounts.set(k2, (statusToBucketCounts.get(k2) ?? 0) + 1);
  }

  const toLinks = (m: Map<string, number>): SankeyLink[] =>
    [...m.entries()].map(([k, value]) => {
      const [source, target] = k.split("||");
      return { source, target, value };
    });

  return {
    crimeTypeNodes: caseTypes.map((t) => t.name),
    statusNodes: ([1, 2, 3, 4] as CaseStatusId[]).map((id) => CASE_STATUS_LABEL[id]),
    bucketNodes: ["Charge Sheeted", "Closed", "Still Pending"],
    crimeToStatus: toLinks(crimeToStatusCounts),
    statusToBucket: toLinks(statusToBucketCounts),
  };
}

export type { WorklistCase };
