// -----------------------------------------------------------------------------
// P5.7 (2026-09-03) - the AI insights panel for /crime-count and
// /crime-hotspots. Plain narrative prose via GLM-4.7-Flash (no tools -
// this is a summary, not a structured, citation-checked finding like
// contradictionDetector.ts or askTools.ts).
//
// GENERATED ON-DEMAND, NOT ONCE AT BUILD TIME - a deliberate departure from
// P5.3b's "generated once, bundled" precedent. That pattern was right for
// P5.3b's context (15 fixed authored scenarios, an immutable dataset); it
// would be WRONG here, now that P10 made this app's case data live and
// mutable (a real POST /api/cases can add a new FIR at any time) - a
// build-time-baked insight would silently go stale the moment someone
// registers a case. This calls GLM live, on the real numbers AT THE TIME OF
// THE CLICK, same "always current" reasoning as P13's forecast panel's own
// "Predict" button.
//
// HALLUCINATION DISCIPLINE, without a tool-schema CITATION guardrail: this
// isn't a structured citation-checked answer (askTools.ts's pattern doesn't
// apply - there's no case ID to validate against a real universe here), so
// the defense against fabricated NUMBERS is at the prompt level instead -
// every real number the narrative is allowed to reference is handed to the
// model explicitly, and it's told plainly not to invent, estimate, or
// extrapolate anything beyond them.
//
// A DIFFERENT, real bug found live 2026-09-03, unrelated to citations: with
// no `tools` at all, GLM-4.7 consistently produces a full draft/refine/
// review scratchpad ("1. Analyze the Request... 2. Analyze the Data...
// 3. Drafting... 6. Final Review") even when explicitly told not to (tried
// once, plainly ignored) - a DIFFERENT failure mode from the documented
// <think>-tag case llm.ts already strips (this has no <think> wrapper at
// all, so that stripping never engages). The real, buried final answer was
// genuinely good every time - just not the only thing in the response. Fixed
// by forcing the answer through a single-tool call (`write_briefing`),
// the exact same "forced final answer" pattern askTools.ts's
// RESPOND_TOOL/P5.8 already proved reliable for this model - not by fighting
// the prompt further. P5.7's original framing ("no tools/tool_choice needed
// here") turned out to be wrong once tested live; this diverges from it
// deliberately, not by oversight.
// -----------------------------------------------------------------------------
const WRITE_BRIEFING_TOOL: ToolDef = {
  type: "function",
  function: {
    name: "write_briefing",
    description: "Submit your final 3-4 sentence briefing. Call this exactly once, with only the finished text - no draft notes, no reasoning, no numbered steps.",
    parameters: {
      type: "object",
      properties: {
        briefing: { type: "string", description: "The finished briefing: 3-4 plain prose sentences, no markdown, no headers, no bullet points." },
      },
      required: ["briefing"],
    },
  },
};
import { callGlm, type ChatMessage, type ToolDef } from "./llm";
import type { Summary } from "./api";
import type { CaseType } from "./data";
import type { DistrictStat } from "./districtStats";

export type CrimeInsightResult =
  | { ok: true; text: string }
  | { ok: false; error: string };

function buildPrompt(summary: Summary, caseTypes: CaseType[], districtStats: DistrictStat[]): ChatMessage[] {
  const byTotal = [...districtStats].sort((a, b) => b.totalCases - a.totalCases);
  const topDistricts = byTotal.slice(0, 5).map((d) => `${d.name}: ${d.totalCases} cases, ${d.clearanceRate}% clearance`);
  const bottomDistricts = byTotal.slice(-5).map((d) => `${d.name}: ${d.totalCases} cases, ${d.clearanceRate}% clearance`);
  const clearanceSpread = districtStats.map((d) => d.clearanceRate);
  const highestClearance = districtStats.reduce((a, b) => (b.clearanceRate > a.clearanceRate ? b : a));
  const lowestClearance = districtStats.reduce((a, b) => (b.clearanceRate < a.clearanceRate ? b : a));

  const trendLines = summary.years.map((y, i) => `  ${y}: ${summary.yearlyTrend[i]} registered, ${summary.yearlySolved[i]} solved`);

  const facts = `
STATEWIDE TOTALS
  Total registered cases: ${summary.totalCases}
  Solved cases: ${summary.solvedCases}
  Active investigations: ${summary.activeInvestigations}
  Detection rate: ${summary.detectionRate}%
  Districts covered: ${summary.districtsCovered}

YEAR-OVER-YEAR (registered vs. solved)
${trendLines.join("\n")}

CRIME TYPE TOTALS
${caseTypes.map((c) => `  ${c.name}: ${c.total} cases`).join("\n")}

TOP 5 DISTRICTS BY CASE VOLUME
${topDistricts.map((l) => `  ${l}`).join("\n")}

BOTTOM 5 DISTRICTS BY CASE VOLUME
${bottomDistricts.map((l) => `  ${l}`).join("\n")}

CLEARANCE RATE: highest is ${highestClearance.name} at ${highestClearance.clearanceRate}%, lowest is ${lowestClearance.name} at ${lowestClearance.clearanceRate}% (statewide spread: ${Math.min(...clearanceSpread)}%-${Math.max(...clearanceSpread)}%)
`.trim();

  return [
    {
      role: "system",
      content: "You write short, direct crime-statistics briefings for a state police records bureau, then submit the finished text via the write_briefing tool.",
    },
    {
      role: "user",
      content:
        `${facts}\n\nCall write_briefing with a 3-4 sentence briefing using only the numbers above. Do not ` +
        `invent, estimate, or extrapolate any number, percentage, district name, or crime type beyond what is ` +
        `listed. Only yearly comparisons are valid - never imply a monthly or quarterly trend. Point out one or ` +
        `two genuinely notable patterns (e.g. a district with low clearance relative to its case volume, or a ` +
        `dominant crime type) with specific real numbers. Do not editorialize or recommend policy - describe ` +
        `what the data shows.`,
    },
  ];
}

export async function generateCrimeInsight(
  summary: Summary,
  caseTypes: CaseType[],
  districtStats: DistrictStat[]
): Promise<CrimeInsightResult> {
  if (districtStats.length === 0) {
    return { ok: false, error: "no district data available" };
  }
  // toolChoice is "auto", NOT a forced {type:"function", function:{name:...}}
  // - live-tested 2026-09-03: the forced-specific-tool form makes this
  // endpoint's own gateway 400 with a completely unrelated-sounding error
  // ("MORE_THAN_MAX_LENGTH" / "Error in processing `zoho-inputstream`
  // parameter"), REGARDLESS of prompt size - reproduced with a two-word
  // prompt and a trivial one-field tool schema, so this is a real endpoint
  // bug/limitation, not a size issue despite what the error name implies.
  // "auto" with exactly one tool and an explicit "call write_briefing with…"
  // instruction reliably gets the model to call it anyway - verified live.
  const result = await callGlm({
    messages: buildPrompt(summary, caseTypes, districtStats),
    tools: [WRITE_BRIEFING_TOOL],
    toolChoice: "auto",
    maxTokens: 700,
    temperature: 0.4,
  });
  if (!result.ok) {
    return { ok: false, error: `GLM call failed (HTTP ${result.status}): ${result.error}` };
  }
  const call = result.toolCalls.find((c) => c.name === "write_briefing");
  const args = call?.arguments as { briefing?: unknown } | undefined;
  const text = typeof args?.briefing === "string" ? args.briefing.trim() : "";
  if (!text) {
    return { ok: false, error: "GLM did not return a write_briefing call with real text" };
  }
  return { ok: true, text };
}
