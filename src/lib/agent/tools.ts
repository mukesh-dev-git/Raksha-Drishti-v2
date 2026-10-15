// -----------------------------------------------------------------------------
// Agent Workspace (#16) - the agent's read-only tools. Server-only.
//
// Each tool returns three things:
//   - `result`: small JSON the model reads to write its answer,
//   - `blocks`: the charts/tables/maps shown on screen, built HERE in code
//     from the same numbers (never by the model - see blocks.ts),
//   - `step`:   a plain-language progress line for the live step log.
//
// Two data sources, never mixed without saying so:
//   REAL - KSP/SCRB district IPC counts (2022, 2023, 2025) + Census 2011,
//          from src/lib/real-data/districtMap.json (build.mjs).
//   DEMO - the app's 12,000 generated cases (getCaseWorklist()), calibrated
//          to the real 2024 KSP crime-type mix but synthetic.
// Every block's provenance says which one it came from.
//
// Arguments are validated and normalised here, never trusted: an unknown
// district or crime type is an error the model sees and can correct, not a
// silent empty chart.
// -----------------------------------------------------------------------------
import type { ToolDef } from "../llm";
import type { Block, DataKind, Provenance } from "./blocks";
import districtMap from "../real-data/districtMap.json";
import { districts, caseTypes } from "../data";
import { getCaseWorklist, type WorklistCase } from "../caseWorklist";
import { isPeriodOffence, incidentHourOfDay, incidentDayOfWeek } from "../incidentTime";
import { executeTool as executeAskTool } from "../askTools";

export type ToolOutput = { result: Record<string, unknown>; blocks: Block[]; step: string };

const REAL_SOURCE = "Karnataka State Police / SCRB district IPC counts (2022, 2023, 2025) and Census of India 2011";
const DEMO_SOURCE = "Raksha-Drishti demo case records (12,000 generated FIRs, Jan 2022 – Aug 2026)";

let blockSeq = 0;
const newId = () => `b${Date.now().toString(36)}${(blockSeq++).toString(36)}`;
const prov = (tool: string, args: Record<string, unknown>, kind: DataKind, rows: number, notes?: string[]): Provenance => ({
  tool, args, kind, rows, notes, source: kind === "real" ? REAL_SOURCE : DEMO_SOURCE,
});
const fmt = (n: number) => n.toLocaleString("en-IN");
const signed = (n: number) => `${n > 0 ? "+" : ""}${n}%`;

// ---------------------------------------------------------------------------
// Lookups
// ---------------------------------------------------------------------------
type MapProps = {
  censusCode: number; name: string; label: string; appDistricts: { slug: string; id: number }[]; kspUnits: string[];
  population2011: number; urbanHouseholdPct: number; ipc: Record<string, number>;
  ratePerLakh2025: number; baselineRatePerLakh: number; changePct: number;
};
const MAP_FEATURES = (districtMap.features as unknown as { properties: MapProps }[]).map((f) => f.properties);

// Old and alternate spellings people actually type.
const ALIASES: Record<string, string> = {
  bangalore: "bengaluru", "bengaluru urban": "bengaluru", "bangalore urban": "bengaluru", "bengaluru city": "bengaluru",
  "bangalore rural": "bengaluru-rural", mysore: "mysuru", belgaum: "belagavi", gulbarga: "kalaburagi",
  bijapur: "vijayapura", shimoga: "shivamogga", tumkur: "tumakuru", bellary: "ballari", hubli: "dharwad",
  "hubballi": "dharwad", mangalore: "dakshina-kannada", mangaluru: "dakshina-kannada", "bengaluru south": "ramanagara",
  chikmagalur: "chikkamagaluru", chamrajnagar: "chamarajanagar", bagalkot: "bagalkote", hospet: "vijayanagara", hosapete: "vijayanagara",
};

function resolveDistrict(q: unknown): (typeof districts)[number] | null {
  if (typeof q !== "string" || !q.trim()) return null;
  const s = q.trim().toLowerCase().replace(/\s+district$/, "");
  const slug = ALIASES[s] ?? s.replace(/\s+/g, "-");
  return (
    districts.find((d) => d.slug === slug) ??
    districts.find((d) => d.name.toLowerCase() === s) ??
    districts.find((d) => d.name.toLowerCase().startsWith(s) || d.slug.startsWith(slug)) ??
    null
  );
}
function resolveCrimeType(q: unknown) {
  if (typeof q !== "string" || !q.trim()) return null;
  const s = q.trim().toLowerCase();
  return caseTypes.find((t) => t.slug === s || t.name.toLowerCase() === s || s.startsWith(t.slug)) ?? null;
}
const featureForSlug = (slug: string) => MAP_FEATURES.find((f) => f.appDistricts.some((a) => a.slug === slug)) ?? null;

/** "2024", "2024-03" or "2024-03-15" -> inclusive [from, to] day strings. */
function parsePeriod(from: unknown, to: unknown): { from: string | null; to: string | null; error?: string } {
  const norm = (v: unknown, end: boolean): string | null | undefined => {
    if (v == null || v === "") return null;
    if (typeof v !== "string") return undefined;
    const t = v.trim();
    if (/^\d{4}$/.test(t)) return end ? `${t}-12-31` : `${t}-01-01`;
    if (/^\d{4}-\d{2}$/.test(t)) return end ? `${t}-31` : `${t}-01`;
    if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
    return undefined;
  };
  const f = norm(from, false), t = norm(to, true);
  if (f === undefined || t === undefined) return { from: null, to: null, error: "dates must be YYYY, YYYY-MM or YYYY-MM-DD" };
  return { from: f, to: t };
}

type CaseFilter = { district?: unknown; crimeType?: unknown; status?: unknown; from?: unknown; to?: unknown };

async function filterCases(f: CaseFilter): Promise<{ cases: WorklistCase[]; applied: Record<string, string>; error?: string }> {
  const applied: Record<string, string> = {};
  const d = f.district != null && f.district !== "" ? resolveDistrict(f.district) : undefined;
  if (d === null) return { cases: [], applied, error: `Unknown district "${String(f.district)}". Use one of Karnataka's 31 districts.` };
  const t = f.crimeType != null && f.crimeType !== "" ? resolveCrimeType(f.crimeType) : undefined;
  if (t === null) return { cases: [], applied, error: `Unknown crime type "${String(f.crimeType)}". Available: Theft, Assault, Fraud, Burglary.` };
  const period = parsePeriod(f.from, f.to);
  if (period.error) return { cases: [], applied, error: period.error };
  const status = typeof f.status === "string" && f.status.trim() ? f.status.trim().toLowerCase() : null;

  if (d) applied.district = d.name;
  if (t) applied.crimeType = t.name;
  if (status) applied.status = status;
  if (period.from) applied.from = period.from;
  if (period.to) applied.to = period.to;

  const all = await getCaseWorklist();
  const cases = all.filter((c) => {
    if (d && c.districtSlug !== d.slug) return false;
    if (t && c.crimeTypeSlug !== t.slug) return false;
    if (status && !c.statusLabel.toLowerCase().includes(status)) return false;
    const day = c.registeredDate?.slice(0, 10);
    if ((period.from || period.to) && !day) return false;
    if (period.from && day! < period.from) return false;
    if (period.to && day! > period.to) return false;
    return true;
  });
  return { cases, applied };
}

const describe = (applied: Record<string, string>) => {
  const parts = [applied.crimeType, applied.district && `in ${applied.district}`, applied.status && `with status "${applied.status}"`,
    applied.from && `from ${applied.from}`, applied.to && `to ${applied.to}`].filter(Boolean);
  return parts.length ? parts.join(" ") : "all cases";
};

// ---------------------------------------------------------------------------
// district_crime_rates (REAL)
// ---------------------------------------------------------------------------
function districtCrimeRates(args: Record<string, unknown>): ToolOutput {
  const metric = args.metric === "change" ? "changePct" : "ratePerLakh2025";
  const order = args.order === "asc" ? "asc" : "desc";
  const limit = Math.max(3, Math.min(30, Math.floor(Number(args.limit) || 10)));
  const sorted = [...MAP_FEATURES].sort((a, b) => (order === "asc" ? a[metric] - b[metric] : b[metric] - a[metric]));
  const top = sorted.slice(0, limit);
  const state = districtMap.meta.state;
  const notes = [
    "City police commissionerates are counted inside their district; Vijayanagara is counted inside Ballari (no separate 2011 boundary).",
    metric === "changePct"
      ? "Change compares 2025 with the 2022–23 average. 2024 is excluded: KSP's 2024 file counts crime differently."
      : "Rates use 2011 Census population, so fast-growing districts (Bengaluru above all) are overstated.",
  ];
  const label = metric === "changePct" ? "Change in IPC/BNS cases, 2025 vs 2022–23 average" : "IPC/BNS cases per lakh population, 2025";
  const p = prov("district_crime_rates", { metric: args.metric ?? "rate", order, limit }, "real", MAP_FEATURES.length, notes);
  return {
    step: `Ranking Karnataka's districts by ${metric === "changePct" ? "change in crime since 2022–23" : "crime rate per lakh"} (real KSP data)`,
    result: {
      metric: metric === "changePct" ? "change_pct_2025_vs_2022_23" : "ipc_per_lakh_2025",
      statewide: { ipc2025: state.ipc["2025"], ratePerLakh2025: state.ratePerLakh2025, changePct: state.changePct },
      districts: top.map((f) => ({ district: f.label, ratePerLakh2025: f.ratePerLakh2025, changePct: f.changePct, ipc2025: f.ipc["2025"] })),
      notes,
    },
    blocks: [
      {
        id: newId(), kind: "districtMap", title: label, metric,
        values: Object.fromEntries(MAP_FEATURES.map((f) => [String(f.censusCode), f[metric]])),
        highlight: top.map((f) => f.censusCode), provenance: p,
      },
      {
        id: newId(), kind: "bar", title: `${order === "desc" ? "Top" : "Bottom"} ${top.length} districts`, subtitle: label,
        unit: metric === "changePct" ? "%" : " /lakh", signed: metric === "changePct",
        rows: top.map((f) => ({ label: f.label, value: f[metric] })), provenance: p,
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// district_profile (REAL + DEMO, labelled separately)
// ---------------------------------------------------------------------------
async function districtProfile(args: Record<string, unknown>): Promise<ToolOutput> {
  const d = resolveDistrict(args.district);
  if (!d) return errorOutput("district_profile", `Unknown district "${String(args.district)}".`);
  const f = featureForSlug(d.slug);
  const { cases } = await filterCases({ district: d.slug });
  const byType = caseTypes.map((t) => ({ label: t.name, value: cases.filter((c) => c.crimeTypeSlug === t.slug).length }));
  const stations = countBy(cases, (c) => c.policeStationName ?? "Unknown station").slice(0, 8);
  const cleared = cases.filter((c) => /charge|closed/i.test(c.statusLabel)).length;
  const blocks: Block[] = [];
  const realNotes: string[] = [];
  if (f) {
    if (f.censusCode === 565) realNotes.push("Real figures for Ballari include Vijayanagara (one 2011 Census district).");
    if (f.censusCode === 583) realNotes.push("Rate likely overstated: KSP's Bengaluru District police unit covers more people than the 2011 Bengaluru Rural boundary.");
    if (f.censusCode === 572) realNotes.push("Rate overstated: Bengaluru's population has grown far past its 2011 figure.");
    realNotes.push(`KSP units counted: ${f.kspUnits.join(", ")}. 2024 excluded (different counting).`);
    const rp = prov("district_profile", { district: d.name }, "real", 3, realNotes);
    blocks.push({
      id: newId(), kind: "stats", title: `${f.label}: real crime figures`, provenance: rp,
      items: [
        { label: "IPC/BNS cases, 2025", value: fmt(f.ipc["2025"]) },
        { label: "Per lakh population", value: String(Math.round(f.ratePerLakh2025)), hint: `state ${Math.round(districtMap.meta.state.ratePerLakh2025)}` },
        { label: "Change vs 2022–23", value: signed(f.changePct), hint: f.changePct >= 10 ? "trend alert" : undefined },
        { label: "Population (2011)", value: fmt(f.population2011), hint: `${f.urbanHouseholdPct}% urban households` },
      ],
    });
    blocks.push({
      id: newId(), kind: "line", title: `${f.label}: IPC/BNS cases by year`, subtitle: "2024 not shown (different counting)",
      points: ["2022", "2023", "2025"].map((y) => ({ label: y, value: f.ipc[y] })), provenance: rp,
    });
  }
  const dp = prov("district_profile", { district: d.name }, "demo", cases.length);
  blocks.push({ id: newId(), kind: "bar", title: `${d.name}: cases by crime type`, rows: byType, provenance: dp });
  blocks.push({ id: newId(), kind: "bar", title: `${d.name}: busiest police stations`, rows: stations, provenance: dp });
  return {
    step: `Building a profile of ${d.name}: real KSP figures, then the app's case records`,
    result: {
      district: d.name,
      real: f ? { ipc: f.ipc, ratePerLakh2025: f.ratePerLakh2025, changePct: f.changePct, population2011: f.population2011, urbanHouseholdPct: f.urbanHouseholdPct, notes: realNotes } : null,
      demo: { totalCases: cases.length, byCrimeType: byType, topStations: stations.slice(0, 5), clearedPct: cases.length ? Math.round((cleared / cases.length) * 100) : null },
    },
    blocks,
  };
}

// ---------------------------------------------------------------------------
// count_cases (DEMO)
// ---------------------------------------------------------------------------
const GROUPS = ["district", "crimeType", "status", "policeStation", "month", "year", "hourOfDay", "dayOfWeek"] as const;
type Group = (typeof GROUPS)[number];
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function countBy(cases: WorklistCase[], key: (c: WorklistCase) => string | null) {
  const m = new Map<string, number>();
  for (const c of cases) {
    const k = key(c);
    if (k != null) m.set(k, (m.get(k) ?? 0) + 1);
  }
  return [...m.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
}

async function countCases(args: Record<string, unknown>): Promise<ToolOutput> {
  const groupBy = (GROUPS as readonly string[]).includes(String(args.groupBy)) ? (args.groupBy as Group) : null;
  if (!groupBy) return errorOutput("count_cases", `groupBy must be one of: ${GROUPS.join(", ")}`);
  const { cases, applied, error } = await filterCases(args);
  if (error) return errorOutput("count_cases", error);
  const limit = Math.max(3, Math.min(31, Math.floor(Number(args.limit) || 15)));
  const notes: string[] = [];
  let rows: { label: string; value: number }[];
  let time = false;

  switch (groupBy) {
    case "district": rows = countBy(cases, (c) => c.districtName).slice(0, limit); break;
    case "crimeType": rows = countBy(cases, (c) => c.crimeTypeName); break;
    case "status": rows = countBy(cases, (c) => c.statusLabel); break;
    case "policeStation": rows = countBy(cases, (c) => c.policeStationName).slice(0, limit); break;
    case "month":
    case "year": {
      const len = groupBy === "month" ? 7 : 4;
      rows = countBy(cases, (c) => c.registeredDate?.slice(0, len) ?? null).sort((a, b) => a.label.localeCompare(b.label));
      // The demo data ends in Aug 2026 apart from a handful of stray later dates; don't plot those as a crash.
      const median = [...rows].sort((a, b) => a.value - b.value)[Math.floor(rows.length / 2)]?.value ?? 0;
      const tail = rows.filter((r) => groupBy === "month" && r.label > "2026-08" && r.value < median * 0.2);
      if (tail.length) { rows = rows.filter((r) => !tail.includes(r)); notes.push("Dropped a few stray months after Aug 2026 where the demo data ends."); }
      if (groupBy === "year") notes.push("2026 is a partial year (demo data ends in Aug 2026).");
      time = true;
      break;
    }
    case "hourOfDay": {
      const discrete = cases.filter((c) => c.incidentFromDate && !isPeriodOffence(c.incidentFromDate, c.incidentToDate));
      notes.push(`${fmt(cases.length - discrete.length)} cases spread over days (no real time of day) are left out.`);
      const counts = Array.from({ length: 24 }, (_, h) => ({ label: `${String(h).padStart(2, "0")}:00`, value: 0 }));
      for (const c of discrete) counts[incidentHourOfDay(c.incidentFromDate!)].value++;
      rows = counts; time = true; break;
    }
    case "dayOfWeek": {
      const discrete = cases.filter((c) => c.incidentFromDate && !isPeriodOffence(c.incidentFromDate, c.incidentToDate));
      const counts = [1, 2, 3, 4, 5, 6, 0].map((d) => ({ label: DAY_NAMES[d], value: 0, d }));
      for (const c of discrete) counts.find((x) => x.d === incidentDayOfWeek(c.incidentFromDate!))!.value++;
      rows = counts.map(({ label, value }) => ({ label, value })); break;
    }
  }

  const what = describe(applied);
  const byLabel: Record<Group, string> = { district: "district", crimeType: "crime type", status: "status", policeStation: "police station",
    month: "month", year: "year", hourOfDay: "hour of day", dayOfWeek: "day of week" };
  const p = prov("count_cases", { groupBy, ...applied }, "demo", cases.length, notes.length ? notes : undefined);
  const title = `Cases by ${byLabel[groupBy]}`;
  return {
    step: `Counting ${what} by ${byLabel[groupBy]} (${fmt(cases.length)} demo cases)`,
    result: { filters: applied, totalCases: cases.length, groupBy, rows, notes },
    blocks: [time
      ? { id: newId(), kind: "line", title, subtitle: what === "all cases" ? undefined : what, points: rows, provenance: p }
      : { id: newId(), kind: "bar", title, subtitle: what === "all cases" ? undefined : what, rows, provenance: p }],
  };
}

// ---------------------------------------------------------------------------
// compare_periods (DEMO)
// ---------------------------------------------------------------------------
async function comparePeriods(args: Record<string, unknown>): Promise<ToolOutput> {
  const groupBy = args.groupBy === "crimeType" ? "crimeType" : "district";
  const a = (args.periodA ?? {}) as Record<string, unknown>;
  const b = (args.periodB ?? {}) as Record<string, unknown>;
  const base = { district: args.district, crimeType: args.crimeType };
  const A = await filterCases({ ...base, from: a.from, to: a.to });
  const B = await filterCases({ ...base, from: b.from, to: b.to });
  const err = A.error ?? B.error;
  if (err) return errorOutput("compare_periods", err);
  if (!A.applied.from || !B.applied.from) return errorOutput("compare_periods", "periodA and periodB each need a from date (YYYY, YYYY-MM or YYYY-MM-DD).");
  const key = (c: WorklistCase) => (groupBy === "district" ? c.districtName : c.crimeTypeName);
  const ca = new Map(countBy(A.cases, key).map((r) => [r.label, r.value]));
  const cb = new Map(countBy(B.cases, key).map((r) => [r.label, r.value]));
  const labels = [...new Set([...ca.keys(), ...cb.keys()])];
  const rows = labels.map((l) => {
    const va = ca.get(l) ?? 0, vb = cb.get(l) ?? 0;
    return { label: l, a: va, b: vb, changePct: va ? Math.round(((vb - va) / va) * 1000) / 10 : null };
  }).filter((r) => r.a >= 5).sort((x, y) => (y.changePct ?? 0) - (x.changePct ?? 0));
  const notes = ["Groups with fewer than 5 cases in the first period are left out, so tiny counts don't show as huge swings."];
  const pa = `${A.applied.from} – ${A.applied.to ?? "…"}`, pb = `${B.applied.from} – ${B.applied.to ?? "…"}`;
  const p = prov("compare_periods", { groupBy, periodA: pa, periodB: pb, ...base }, "demo", A.cases.length + B.cases.length, notes);
  return {
    step: `Comparing ${pa} with ${pb} by ${groupBy === "district" ? "district" : "crime type"} (demo cases)`,
    result: { periodA: pa, periodB: pb, totalA: A.cases.length, totalB: B.cases.length, rows: rows.slice(0, 31), notes },
    blocks: [
      { id: newId(), kind: "bar", title: `Change by ${groupBy === "district" ? "district" : "crime type"}`, subtitle: `${pb} vs ${pa}`,
        unit: "%", signed: true, rows: rows.slice(0, 15).map((r) => ({ label: r.label, value: r.changePct ?? 0 })), provenance: p },
      { id: newId(), kind: "table", title: "Counts behind the change", columns: [groupBy === "district" ? "District" : "Crime type", pa, pb, "Change"],
        rows: rows.map((r) => [r.label, r.a, r.b, r.changePct == null ? "—" : signed(r.changePct)]), provenance: p },
    ],
  };
}

// ---------------------------------------------------------------------------
// show_hotspots + list_repeat_offenders
// ---------------------------------------------------------------------------
async function showHotspots(args: Record<string, unknown>): Promise<ToolOutput> {
  const d = args.district ? resolveDistrict(args.district) : null;
  if (args.district && !d) return errorOutput("show_hotspots", `Unknown district "${String(args.district)}".`);
  const t = args.crimeType ? resolveCrimeType(args.crimeType) : null;
  // The map itself is visual; give the model the numbers behind it so its
  // answer can say something concrete (and checkable) about the clusters.
  const { cases } = await filterCases({ district: d?.slug, crimeType: t?.slug });
  const discrete = cases.filter((c) => c.incidentFromDate && !isPeriodOffence(c.incidentFromDate, c.incidentToDate));
  const hours = countBy(discrete, (c) => `${String(incidentHourOfDay(c.incidentFromDate!)).padStart(2, "0")}:00`).slice(0, 3);
  return {
    step: `Opening the hotspot map${d ? ` for ${d.name}` : ""}${t ? ` (${t.name})` : ""}`,
    result: {
      district: d?.name ?? "Karnataka", crimeType: t?.name ?? "all", totalCases: cases.length,
      busiestStations: countBy(cases, (c) => c.policeStationName).slice(0, 3),
      peakHours: hours,
      note: "The map shows where these cases cluster; the analyst can filter it by time of day.",
    },
    blocks: [{ id: newId(), kind: "hotspotMap", title: `Hotspots${d ? `: ${d.name}` : ": Karnataka"}${t ? ` · ${t.name}` : ""}`,
      district: d?.slug ?? null, crimeType: t?.slug ?? null,
      provenance: prov("show_hotspots", { district: d?.name ?? null, crimeType: t?.name ?? null }, "demo", cases.length, ["Clusters are by location; use the time-of-day slider on the map."]) }],
  };
}

async function listRepeatOffenders(args: Record<string, unknown>): Promise<ToolOutput> {
  const d = args.district ? resolveDistrict(args.district) : null;
  const r = (await executeAskTool("list_repeat_offenders", d ? { district: d.name } : {})) as { count?: number; people?: { personId: string; name: string; caseCount: number; districts: string[]; link: string }[] };
  const people = r.people ?? [];
  return {
    step: `Finding people accused in more than one case${d ? ` in ${d.name}` : ""}`,
    result: { count: r.count ?? 0, people: people.map(({ personId, name, caseCount, districts }) => ({ personId, name, caseCount, districts })) },
    blocks: [{ id: newId(), kind: "table", title: `Repeat offenders${d ? `: ${d.name}` : ""}`, columns: ["Person", "Cases", "Districts"],
      rows: people.map((p) => [`${p.name} (${p.personId})`, p.caseCount, p.districts.join(", ")]), links: people.map((p) => p.link),
      provenance: prov("list_repeat_offenders", { district: d?.name ?? null }, "demo", people.length) }],
  };
}

function errorOutput(tool: string, error: string): ToolOutput {
  return { step: `${tool}: ${error}`, result: { error }, blocks: [] };
}

// ---------------------------------------------------------------------------
// Schemas + dispatcher
// ---------------------------------------------------------------------------
const periodSchema = { type: "object", properties: { from: { type: "string" }, to: { type: "string" } }, required: ["from"] };

export const AGENT_TOOLS: ToolDef[] = [
  { type: "function", function: { name: "district_crime_rates",
    description: "REAL data. Rank Karnataka's districts by 2025 crime rate per lakh population, or by change in crime (2025 vs the 2022-23 average). Use for 'which districts are rising', 'highest crime rate', state-level comparisons. Draws a district map and a ranked chart.",
    parameters: { type: "object", properties: {
      metric: { type: "string", enum: ["rate", "change"], description: "rate = cases per lakh in 2025; change = % change vs 2022-23 average" },
      order: { type: "string", enum: ["desc", "asc"], description: "desc = highest first (default)" },
      limit: { type: "number", description: "How many districts to list, 3-30 (default 10)" } }, required: ["metric"] } } },
  { type: "function", function: { name: "district_profile",
    description: "Profile of ONE district: real KSP crime figures (2022/2023/2025, rate per lakh, change, population) plus the app's demo case records (by crime type, busiest police stations).",
    parameters: { type: "object", properties: { district: { type: "string", description: "District name, e.g. Kodagu, Mysuru, Bengaluru Urban" } }, required: ["district"] } } },
  { type: "function", function: { name: "count_cases",
    description: "DEMO case records. Count cases grouped by district, crimeType, status, policeStation, month, year, hourOfDay or dayOfWeek, with optional filters. Use for time-of-day patterns, monthly trends, breakdowns within a district.",
    parameters: { type: "object", properties: {
      groupBy: { type: "string", enum: [...GROUPS] },
      district: { type: "string" }, crimeType: { type: "string", enum: ["Theft", "Assault", "Fraud", "Burglary"] },
      status: { type: "string" }, from: { type: "string", description: "YYYY, YYYY-MM or YYYY-MM-DD" }, to: { type: "string" },
      limit: { type: "number" } }, required: ["groupBy"] } } },
  { type: "function", function: { name: "compare_periods",
    description: "DEMO case records. Compare two time periods by district or crime type and show the % change. Use for 'this year vs last year' within the app's case data.",
    parameters: { type: "object", properties: {
      groupBy: { type: "string", enum: ["district", "crimeType"] }, periodA: periodSchema, periodB: periodSchema,
      district: { type: "string" }, crimeType: { type: "string" } }, required: ["groupBy", "periodA", "periodB"] } } },
  { type: "function", function: { name: "show_hotspots",
    description: "Show the hotspot map (where cases cluster, with a time-of-day filter), optionally zoomed to one district and one crime type.",
    parameters: { type: "object", properties: { district: { type: "string" }, crimeType: { type: "string" } }, required: [] } } },
  { type: "function", function: { name: "list_repeat_offenders",
    description: "List people accused in two or more cases, optionally in one district, with links to their profiles.",
    parameters: { type: "object", properties: { district: { type: "string" } }, required: [] } } },
];

export const ANSWER_TOOL: ToolDef = { type: "function", function: { name: "write_answer",
  description: "Give the analyst your final answer: 2-4 plain sentences using only numbers the tools returned. Say which figures are real KSP data and which are demo case data. Call exactly once, after the lookups you need.",
  parameters: { type: "object", properties: { answer: { type: "string" } }, required: ["answer"] } } };

export async function runAgentTool(name: string, args: Record<string, unknown>): Promise<ToolOutput> {
  switch (name) {
    case "district_crime_rates": return districtCrimeRates(args);
    case "district_profile": return districtProfile(args);
    case "count_cases": return countCases(args);
    case "compare_periods": return comparePeriods(args);
    case "show_hotspots": return showHotspots(args);
    case "list_repeat_offenders": return listRepeatOffenders(args);
    default: return errorOutput(name, `There is no tool called "${name}". Use one of: ${AGENT_TOOLS.map((t) => t.function.name).join(", ")}.`);
  }
}
