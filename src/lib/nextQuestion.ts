// -----------------------------------------------------------------------------
// P5.4 - "Next question to ask", a phrasing layer over the same grounded
// evidence P5.2b's contradiction detector already reasons over
// (personFusion.ts's getScenarioTimeline). PLAN.md's own framing: "Same
// engine, different phrasing step" (RESEARCH_AND_PLAN.md §2.4).
//
// Deliberately its own tool call rather than reusing REPORT_TOOL from
// contradictionDetector.ts - a contradiction (2+ conflicting records) and a
// follow-up question (usually motivated by 1+ records - a single unexplained
// lead is a perfectly good reason to ask a question, unlike a "contradiction"
// which is meaningless with fewer than two records) are different shapes of
// finding, so they get different schemas. The call/validate/retry SKELETON
// is copied deliberately from contradictionDetector.ts's runDetection() -
// same tool-schema-guarded pattern, same citation guardrail enforced in the
// schema AND in a runtime check afterward, same "empty tool call" retry for
// the same documented transient GLM behavior (RESEARCH_AND_PLAN.md §2.2) -
// but it is its own small function, not a shared one, because the two
// validation shapes (minItems 2 vs 1, contradictions[] vs one question)
// don't actually share code once written out, and forcing them through one
// generic would just make both harder to read.
//
// P5.6's citation guardrail applies here exactly as it does to
// contradictionDetector.ts: every cited record id is checked against the
// real timeline handed to the model before the suggestion survives. An
// invented id gets dropped from citedRecordIds individually; if NONE of the
// cited ids turn out real, the whole suggestion is discarded (ok:false) -
// this module never hands the UI a question with zero grounding.
//
// Called live, per case-detail page render, for the ~15 authored scenarios
// that have real fused evidence (see cases/[caseId]/page.tsx's `evidence`
// gate) - NOT pre-generated into a seed file the way P5.3b's
// AIContradictions.json is. That's a deliberate difference from P5.2b, not
// an oversight: P5.3b batches 15 scenarios in one offline run because
// generating ALL 15 up front at 10-60s each is impractical to wait on; this
// generates exactly ONE scenario's suggestion, for the one case page an
// officer is actually looking at, so there's no batch to avoid. The cost is
// the same 10-45s latency landing on that one page's render instead - see
// this file's caller in page.tsx and the P5.4 handoff notes for that
// tradeoff spelled out.
// -----------------------------------------------------------------------------
import { callGlm, type ToolDef } from "./llm";
import { getScenarioTimeline, type ScenarioEvidenceItem } from "./personFusion";

const SUGGEST_TOOL: ToolDef = {
  type: "function",
  function: {
    name: "suggest_next_question",
    description:
      "Suggest the single most useful next question the investigating officer should ask, grounded in a specific gap, inconsistency, or unexplained lead in the evidence timeline. Do not call this if nothing in the timeline motivates a genuine follow-up.",
    parameters: {
      type: "object",
      properties: {
        question: {
          type: "string",
          description: "One question the officer should ask next - specific, actionable, phrased for a real interview or follow-up lead, not generic ('why did X happen' rather than 'investigate further')",
        },
        citedRecordIds: {
          type: "array",
          items: { type: "string" },
          minItems: 1,
          description: "1 or more record ids (from the timeline given to you) that motivate this question",
        },
        rationale: { type: "string", description: "One short sentence: why this question matters given the cited records" },
      },
      required: ["question", "citedRecordIds", "rationale"],
    },
  },
};

export type NextQuestionResult =
  | { ok: true; scenarioId: string; question: string; citedRecordIds: string[]; rationale: string }
  | { ok: false; scenarioId: string; error: string };

const SYSTEM_PROMPT =
  "You are a police case-analysis assistant. You only respond by calling the provided function - never with plain text or step-by-step reasoning. Suggest exactly one incisive next question the investigating officer should ask, grounded in a genuine gap, inconsistency, or unexplained lead in the timeline shown. Cite the record id(s) - from the timeline shown - that motivate the question; never invent or cite an id that isn't listed. If the timeline has no records at all, do not call the function.";

function formatItem(t: ScenarioEvidenceItem): string {
  const when = t.dateOnly ? t.timestamp.slice(0, 10) + " (date only)" : t.timestamp;
  return `[${t.id}] ${when} — about: ${t.personNames.join(" & ")} — ${t.summary}`;
}

/**
 * MAX_ATTEMPTS is 2, not contradictionDetector.ts's 3 - that function's
 * retries run inside an offline batch script where extra latency is free;
 * this one sits in a case-detail page's render path, so a bounded worst
 * case (2 * llm.ts's 45s timeout) matters more than squeezing out the same
 * marginal reliability gain a 3rd attempt would give.
 */
const MAX_ATTEMPTS = 2;

async function suggestOnce(scenarioId: string, timelineText: string, recordCount: number, validIds: Set<string>): Promise<NextQuestionResult> {
  const result = await callGlm({
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Scenario: ${scenarioId} (evidence merged across every person involved)\nTimeline (${recordCount} records):\n${timelineText}\n\nDo not explain your reasoning in text. Immediately call suggest_next_question with the single best next question.`,
      },
    ],
    // tool_choice forcing a specific function is broken on this endpoint -
    // verified live 2026-08-26, RESEARCH_AND_PLAN.md §2.2. Same auto-mode +
    // blunt instruction workaround contradictionDetector.ts uses.
    tools: [SUGGEST_TOOL],
    // One question + one short rationale is a much smaller completion than
    // contradictionDetector.ts's array of findings - 500 gives real headroom
    // without inviting the truncation failure mode found live at maxTokens
    // 700 there (RESEARCH_AND_PLAN.md §2.2).
    maxTokens: 500,
    temperature: 0.3,
  });

  if (!result.ok) return { ok: false, scenarioId, error: result.error };

  const call = result.toolCalls.find((c) => c.name === "suggest_next_question");
  if (!call) {
    return {
      ok: false,
      scenarioId,
      error: `model never called suggest_next_question (finish_reason budget likely exhausted on prose - raw text: ${result.text.slice(0, 200)})`,
    };
  }

  const args = call.arguments === null ? undefined : (call.arguments as { question?: unknown; citedRecordIds?: unknown; rationale?: unknown });
  if (!args || typeof args.question !== "string" || !args.question.trim() || typeof args.rationale !== "string" || !Array.isArray(args.citedRecordIds)) {
    return {
      ok: false,
      scenarioId,
      error: `suggest_next_question arguments malformed (arguments: ${call.rawArguments.slice(0, 200)})`,
    };
  }

  const citedRaw = args.citedRecordIds.filter((id): id is string => typeof id === "string");
  const real = citedRaw.filter((id) => validIds.has(id));
  if (real.length === 0) {
    // Every cited id was hallucinated (or none were cited at all) - P5.6's
    // citation guardrail: a suggestion with zero real grounding never
    // reaches the UI, same discipline as contradictionDetector.ts dropping
    // an under-grounded finding rather than trusting it.
    return { ok: false, scenarioId, error: "suggest_next_question cited no real record ids - discarded as ungrounded" };
  }

  return { ok: true, scenarioId, question: args.question.trim(), citedRecordIds: real, rationale: args.rationale.trim() };
}

/**
 * P5.4 entry point. Calls GLM over one scenario's already-fused, cross-source
 * evidence timeline (personFusion.ts's getScenarioTimeline - the same real
 * grounding data P5.2b uses) and returns a single suggested next question,
 * every citation checked against that timeline's own real record ids before
 * it's trusted.
 *
 * Never throws - a missing env var (llm.ts's requireEnv), a network failure,
 * a malformed model response, or a fully-hallucinated citation all come back
 * as `{ok:false}` so the caller (cases/[caseId]/page.tsx) can render nothing
 * rather than crash the page. Retries once (MAX_ATTEMPTS=2) on the "model
 * returned ok:true with an empty tool call" failure mode documented in
 * contradictionDetector.ts / RESEARCH_AND_PLAN.md §2.2 - a real API error
 * is not retried.
 */
export async function suggestNextQuestion(scenarioId: string): Promise<NextQuestionResult> {
  try {
    const timeline = getScenarioTimeline(scenarioId);
    if (timeline.length === 0) {
      return { ok: false, scenarioId, error: "unknown scenarioId or no fused evidence" };
    }

    const timelineText = timeline.map(formatItem).join("\n");
    const validIds = new Set(timeline.map((t) => t.id));

    let lastResult: NextQuestionResult | null = null;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      lastResult = await suggestOnce(scenarioId, timelineText, timeline.length, validIds);
      const isEmptyToolCall = !lastResult.ok && lastResult.error.startsWith("model never called suggest_next_question");
      if (!isEmptyToolCall) return lastResult;
      if (attempt < MAX_ATTEMPTS) {
        console.warn(`[nextQuestion] ${scenarioId}: empty tool call on attempt ${attempt}/${MAX_ATTEMPTS}, retrying`);
      }
    }
    return lastResult!;
  } catch (e) {
    // Defensive catch-all: e.g. llm.ts's requireEnv() throws (missing
    // config) rather than returning ok:false, since that's a setup bug, not
    // a runtime condition - but this call site is a page render, so it must
    // never crash the page over a missing/misconfigured secret. Log and
    // degrade to "no suggestion", exactly like every other failure path
    // here.
    console.error("[nextQuestion] suggestNextQuestion threw", e);
    return { ok: false, scenarioId, error: e instanceof Error ? e.message : "unknown error" };
  }
}
