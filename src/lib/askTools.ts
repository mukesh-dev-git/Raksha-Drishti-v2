// -----------------------------------------------------------------------------
// P5.8 - tool definitions + executors for the "Ask Anything" chatbot
// (src/app/api/ask/route.ts). Server-only (reads bundled seed JSON via
// caseWorklist.ts/personFusion.ts/districtStats.ts/moPatterns.ts, same
// module-scope-cache pattern every one of those already uses) - never
// import this from a client component.
//
// Deliberate design, per PLAN.md P5.8: this answers over the WHOLE seeded
// dataset (5,019 real cases, 47 evidence-linked people, 8 districts, 3 MO
// clusters), not one page's worth - "which cases involve Suresh Naik" needs
// the former. GLM is a TOOL-CALLING agent here, not a prompt stuffed with
// every row: each tool below calls the same real, already-verified library
// functions the rest of the app renders from, and returns small, structured
// JSON - never the full 5,019-row worklist in one shot (search_cases caps
// at 20 results per call, same instinct as CaseWorklistClient's P1.2
// pagination).
//
// Citation grounding (P5.8's "standout requirement" + same discipline as
// contradictionDetector.ts's P5.6 guardrail): getRealCaseIds()/
// getRealPersonIds() give route.ts the full universe of real ids to check
// every citation the model claims against, BEFORE it's ever turned into a
// clickable link. A tool here never fabricates an id - every id returned
// came from getCaseWorklist()/fuseAllPersons(), so anything route.ts
// rejects was invented downstream, by the model, not by these functions.
// -----------------------------------------------------------------------------
import type { ToolDef } from "./llm";
import { getCaseWorklist, getWorklistCase, getSiblingCases, caseDetailLink } from "./caseWorklist";
import { fuseAllPersons, getRepeatCaseSuspects } from "./personFusion";
import { getDistrictStats } from "./districtStats";
import { getMoPatternClusters } from "./moPatterns";
import scenarioMetaRaw from "./nosql-seed/scenarioMeta.json";

const SCENARIO_META = scenarioMetaRaw as Record<string, { title: string; summary: string }>;

/** Real /persons/[personId] link - no existing exported helper for this
 *  (unlike caseDetailLink), every call site so far just inlines the
 *  template (see RepeatOffendersClient.tsx, searchIndex.ts, etc.) - kept
 *  consistent with that exact shape rather than inventing a new one. */
export function personDetailLink(personId: string): string {
  return `/persons/${personId}`;
}

export type ToolResult = Record<string, unknown>;

// ---------------------------------------------------------------------------
// search_cases
// ---------------------------------------------------------------------------
export type SearchCasesArgs = {
  query?: string;
  district?: string;
  crimeType?: string;
  status?: string;
  limit?: number;
};

function toolSearchCases(args: SearchCasesArgs): ToolResult {
  const all = getCaseWorklist();
  const q = args.query?.trim().toLowerCase();
  const districtQ = args.district?.trim().toLowerCase();
  const crimeTypeQ = args.crimeType?.trim().toLowerCase();
  const statusQ = args.status?.trim().toLowerCase();
  const limit = Math.max(1, Math.min(20, Math.floor(Number(args.limit) || 10)));

  const filtered = all.filter((c) => {
    if (districtQ && !(c.districtName.toLowerCase().includes(districtQ) || c.districtSlug.toLowerCase().includes(districtQ))) return false;
    if (crimeTypeQ && !(c.crimeTypeName.toLowerCase().includes(crimeTypeQ) || c.crimeTypeSlug.toLowerCase().includes(crimeTypeQ))) return false;
    if (statusQ && !c.statusLabel.toLowerCase().includes(statusQ)) return false;
    if (q) {
      const hay = `${c.title} ${c.crimeNo} ${c.accusedNames.join(" ")} ${c.policeStationName ?? ""} ${c.districtName} ${c.crimeTypeName}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const results = filtered.slice(0, limit).map((c) => ({
    caseMasterId: c.caseMasterId,
    crimeNo: c.crimeNo,
    title: c.title,
    crimeTypeName: c.crimeTypeName,
    districtName: c.districtName,
    statusLabel: c.statusLabel,
    registeredDate: c.registeredDate,
    accusedNames: c.accusedNames,
    link: caseDetailLink(c.caseMasterId),
  }));

  return {
    totalMatches: filtered.length,
    returned: results.length,
    note: filtered.length > results.length ? `Only the first ${results.length} of ${filtered.length} matches are shown - narrow the query (district/crimeType/status) for the rest.` : undefined,
    results,
  };
}

// ---------------------------------------------------------------------------
// get_case
// ---------------------------------------------------------------------------
function toolGetCase(args: { caseMasterId?: unknown }): ToolResult {
  const id = Number(args.caseMasterId);
  if (!Number.isFinite(id)) return { error: "caseMasterId must be a number" };

  const c = getWorklistCase(id);
  if (!c) return { error: `No case with CaseMasterID ${id} exists in the real register.` };

  const meta = SCENARIO_META[c.scenarioId];
  const siblings = getSiblingCases(id).map((s) => ({ caseMasterId: s.caseMasterId, crimeNo: s.crimeNo, link: caseDetailLink(s.caseMasterId) }));

  return {
    caseMasterId: c.caseMasterId,
    crimeNo: c.crimeNo,
    title: c.title,
    crimeTypeName: c.crimeTypeName,
    districtName: c.districtName,
    statusLabel: c.statusLabel,
    registeredDate: c.registeredDate,
    sections: c.sections,
    accused: c.accused,
    policeStationName: c.policeStationName,
    // Only populated for the 15 authored scenarios (see scenarioMeta.json) -
    // a P1.2 bulk case's scenarioId is synthetic ("BULK-<id>") and has no
    // entry here, which is real, not a bug: it has no hand-authored
    // narrative, only the generated CaseMaster/Accused rows.
    scenarioSummary: meta?.summary ?? null,
    siblingCases: siblings,
    link: caseDetailLink(c.caseMasterId),
  };
}

// ---------------------------------------------------------------------------
// get_person
// ---------------------------------------------------------------------------
function toolGetPerson(args: { personIdOrName?: unknown }): ToolResult {
  const q = typeof args.personIdOrName === "string" ? args.personIdOrName.trim() : "";
  if (!q) return { error: "personIdOrName is required" };

  const all = [...fuseAllPersons().values()];
  let person = all.find((p) => p.personId.toLowerCase() === q.toLowerCase());

  if (!person) {
    const ql = q.toLowerCase();
    const matches = all.filter((p) => p.name.toLowerCase().includes(ql) || p.aliases.some((a) => a.toLowerCase().includes(ql)));
    if (matches.length === 0) {
      return {
        error: `No person matching "${q}" in the real, evidence-linked register (47 people). Note: a bulk-generated case's accused may be a real name without an evidence-linked profile - try search_cases instead.`,
      };
    }
    if (matches.length > 1) {
      return {
        ambiguous: true,
        candidates: matches.slice(0, 10).map((p) => ({ personId: p.personId, name: p.name, link: personDetailLink(p.personId) })),
      };
    }
    person = matches[0];
  }

  const worklist = getCaseWorklist();
  const cases = person.caseMasterIds.map((id) => {
    const c = worklist.find((x) => x.caseMasterId === id);
    return c
      ? { caseMasterId: id, crimeNo: c.crimeNo, title: c.title, districtName: c.districtName, statusLabel: c.statusLabel, link: caseDetailLink(id) }
      : { caseMasterId: id, link: caseDetailLink(id) };
  });

  return {
    personId: person.personId,
    name: person.name,
    aliases: person.aliases,
    types: person.types,
    caseCount: person.caseMasterIds.length,
    cases,
    // Terse by design (same reasoning as REPORT_TOOL in contradictionDetector.ts)
    // - a few representative timeline items to ground an answer, not the
    // whole cross-source merge.
    recentTimeline: person.timeline.slice(-8).map((t) => ({ kind: t.kind, timestamp: t.timestamp, summary: t.summary })),
    link: personDetailLink(person.personId),
  };
}

// ---------------------------------------------------------------------------
// get_district_stats
// ---------------------------------------------------------------------------
function toolGetDistrictStats(args: { district?: unknown }): ToolResult {
  const all = getDistrictStats();
  const districtArg = typeof args.district === "string" ? args.district.trim() : "";

  if (districtArg) {
    const q = districtArg.toLowerCase();
    const d = all.find((x) => x.slug.toLowerCase() === q || x.name.toLowerCase().includes(q));
    if (!d) return { error: `No district matching "${districtArg}". Real districts: ${all.map((x) => x.name).join(", ")}` };
    return {
      slug: d.slug,
      name: d.name,
      totalCases: d.totalCases,
      statusCounts: d.statusCounts,
      clearanceRate: d.clearanceRate,
      repeatSubjectCount: d.repeatSubjectCount,
      link: `/districts/${d.slug}`,
    };
  }

  return {
    districts: all.map((d) => ({
      slug: d.slug,
      name: d.name,
      totalCases: d.totalCases,
      clearanceRate: d.clearanceRate,
      repeatSubjectCount: d.repeatSubjectCount,
      link: `/districts/${d.slug}`,
    })),
  };
}

// ---------------------------------------------------------------------------
// list_mo_patterns
// ---------------------------------------------------------------------------
function toolListMoPatterns(): ToolResult {
  const clusters = getMoPatternClusters();
  return {
    clusterCount: clusters.length,
    clusters: clusters.map((c) => ({
      id: c.id,
      strength: c.strength,
      linkingSections: c.linkingSections,
      members: c.members.map((m) => ({
        caseMasterId: m.caseMasterId,
        scenarioTitle: m.scenarioTitle,
        crimeTypeName: m.crimeTypeName,
        districtName: m.districtName,
        sections: m.sections,
        link: m.link,
      })),
    })),
  };
}

// ---------------------------------------------------------------------------
// list_repeat_offenders
// ---------------------------------------------------------------------------
function toolListRepeatOffenders(args: { district?: unknown }): ToolResult {
  const worklist = getCaseWorklist();
  const people = getRepeatCaseSuspects();
  const dq = typeof args.district === "string" ? args.district.trim().toLowerCase() : "";

  const withDistricts = people.map((p) => {
    const districtNames = [
      ...new Set(
        p.caseMasterIds
          .map((id) => worklist.find((c) => c.caseMasterId === id)?.districtName)
          .filter((x): x is string => !!x)
      ),
    ];
    return { personId: p.personId, name: p.name, caseCount: p.caseMasterIds.length, districts: districtNames, link: personDetailLink(p.personId) };
  });

  const filtered = dq ? withDistricts.filter((p) => p.districts.some((d) => d.toLowerCase().includes(dq))) : withDistricts;

  return { count: filtered.length, people: filtered.slice(0, 20) };
}

// ---------------------------------------------------------------------------
// Tool schemas (GLM native tool calling, same ToolDef shape llm.ts exports
// and contradictionDetector.ts already uses) + dispatcher.
// ---------------------------------------------------------------------------
export const READ_TOOLS: ToolDef[] = [
  {
    type: "function",
    function: {
      name: "search_cases",
      description:
        "Search the real FIR/case register (5,000+ real cases) by free text, district, crime type, or status. Returns up to 20 matching cases with real case IDs and clickable links. Use this to find cases before answering.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Free text to match against case title, FIR/crime number, accused name, or police station (case-insensitive substring)." },
          district: { type: "string", description: "District name or slug, e.g. 'Bengaluru Urban' or 'bengaluru'." },
          crimeType: { type: "string", description: "Crime type name or slug, e.g. 'Theft', 'Fraud', 'Assault', 'Burglary'." },
          status: { type: "string", description: "Case status: 'Open', 'Charge Sheeted', 'Closed', or 'Under Investigation'." },
          limit: { type: "number", description: "Max results to return, default 10, max 20." },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_case",
      description: "Get full real details for one case by its exact CaseMasterID (a number), including sections, accused, sibling FIRs in the same investigation, and the real link.",
      parameters: { type: "object", properties: { caseMasterId: { type: "number" } }, required: ["caseMasterId"] },
    },
  },
  {
    type: "function",
    function: {
      name: "get_person",
      description:
        "Look up a real person in the evidence-linked register (47 people with cross-case timelines) by exact personId (e.g. 'KA-P0001') or by name/alias (case-insensitive partial match). Returns every real case they're linked to.",
      parameters: { type: "object", properties: { personIdOrName: { type: "string" } }, required: ["personIdOrName"] },
    },
  },
  {
    type: "function",
    function: {
      name: "get_district_stats",
      description: "Get real per-district case totals, clearance rate and repeat-subject count. Omit district to get all 8 districts.",
      parameters: { type: "object", properties: { district: { type: "string", description: "District name or slug; omit for all districts." } }, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "list_mo_patterns",
      description: "List real Modus-Operandi clusters - groups of cases across districts linked by shared, distinctive charge sections. Returns each cluster's member cases with real links.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "list_repeat_offenders",
      description: "List real people who appear as accused in 2+ real cases (repeat/cross-jurisdiction subjects), optionally filtered to one district. Returns real personId and links.",
      parameters: { type: "object", properties: { district: { type: "string", description: "Optional district name or slug filter." } }, required: [] },
    },
  },
];

/** The terminal tool - the model calls this exactly once, with the exact
 *  real ids its answer depends on. route.ts is the ONLY thing that decides
 *  what becomes a clickable citation, and it does so by checking every id
 *  here against getRealCaseIds()/getRealPersonIds() - this tool's schema is
 *  advisory (same "advisory, not a guarantee" note as P9.1b's minItems on
 *  contradictionDetector.ts's schema), the real guardrail is that check. */
export const RESPOND_TOOL: ToolDef = {
  type: "function",
  function: {
    name: "respond_to_user",
    description:
      "Give your final answer to the officer. Call this exactly once, after gathering what you need with the other tools (or immediately if no lookup is needed). List every real case and person id your answer relies on - each becomes a clickable link shown to the officer. Never invent an id that wasn't returned by a tool.",
    parameters: {
      type: "object",
      properties: {
        answer: { type: "string", description: "Your natural-language answer, 1-4 sentences. Do not include raw links in this text - list the ids separately below." },
        caseIds: { type: "array", items: { type: "number" }, description: "Real CaseMasterIDs (numbers) your answer relies on, exactly as returned by search_cases/get_case/list_mo_patterns. Empty array if none." },
        personIds: { type: "array", items: { type: "string" }, description: "Real personIds (e.g. 'KA-P0001') your answer relies on, exactly as returned by get_person/list_repeat_offenders. Empty array if none." },
      },
      required: ["answer", "caseIds", "personIds"],
    },
  },
};

export function executeTool(name: string, args: Record<string, unknown>): ToolResult {
  switch (name) {
    case "search_cases":
      return toolSearchCases(args as SearchCasesArgs);
    case "get_case":
      return toolGetCase(args);
    case "get_person":
      return toolGetPerson(args);
    case "get_district_stats":
      return toolGetDistrictStats(args);
    case "list_mo_patterns":
      return toolListMoPatterns();
    case "list_repeat_offenders":
      return toolListRepeatOffenders(args);
    default:
      return { error: `Unknown tool: ${name}` };
  }
}

/** The full universe of real, resolvable CaseMasterIDs - route.ts's
 *  citation guardrail checks every id the model claims against this before
 *  it ever becomes a link. */
export function getRealCaseIds(): Set<number> {
  return new Set(getCaseWorklist().map((c) => c.caseMasterId));
}

/** The full universe of real, evidence-linked personIds - same role as
 *  getRealCaseIds() but for /persons/[personId]. */
export function getRealPersonIds(): Set<string> {
  return new Set(fuseAllPersons().keys());
}
