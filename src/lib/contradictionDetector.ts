// -----------------------------------------------------------------------------
// P5.2 (person-level) + P5.2b (scenario-level) contradiction detection,
// sharing one tool schema, one prompt shape, and one citation guardrail via
// runDetection() - PLAN.md P5.2b's own wording is "same detector, same
// schema, same guardrail", so this is one core function with two entry
// points, not two parallel implementations that could drift.
//
// P5.2 (detectContradictions, one person's fused timeline) is verified
// correct for genuinely single-person cases (C1: Suresh's own statement vs.
// a sighting of his own vehicle - exact match with ground truth). P5.3's
// eval run then proved it's the wrong SCOPE for most of this dataset: 13 of
// 15 authored contradictions cite records belonging to two different
// people (verified on C2 - RESEARCH_AND_PLAN.md Part 6), which one
// person's timeline can never contain. P5.2b (detectScenarioContradictions,
// personFusion.ts's getScenarioTimeline) exists because of that finding,
// not speculatively - it's what closes the gap the eval actually measured.
//
// P5.6's citation guardrail is enforced HERE, in the tool schema and in the
// post-call validation, not hoped for from a prompt: every cited id is
// checked against the real timeline given to the model before a finding
// survives, per-id rather than all-or-nothing.
// -----------------------------------------------------------------------------
import { callGlm, type ToolDef } from "./llm";
import { getFusedPerson, getScenarioTimeline, type FusedEvidenceItem } from "./personFusion";

// Terse by design, not just by convention - fewer output tokens needed per
// finding means less chance of the completion getting cut off before a
// tool call lands (see runDetection's maxTokens comment - the real failure
// mode found live is truncation on a too-small budget, not a hard
// server-side length ceiling as first suspected). Free-text claim fields
// were dropped from the schema since the caller already has each record's
// own summary by id.
//
// recordIds is an ARRAY (2+), not a fixed pair - P5.3's eval run found 13 of
// the 15 authored contradictions actually chain 3-4 records, not 2. A
// pair-only schema would make those structurally unfindable regardless of
// what the model reasoned.
//
// P9.1b (= P5.6) - `minItems: 2` added to the schema itself, not just the
// runtime check below. The runtime check (`real.length >= 2` after
// filtering to real, non-hallucinated ids) was already the actual
// guarantee and stays exactly as it was - a schema constraint is advisory
// (a model can still ignore it), so this doesn't replace that check, it
// just tells the model the constraint upfront instead of only discovering
// a too-short finding gets silently dropped after the fact.
const REPORT_TOOL: ToolDef = {
  type: "function",
  function: {
    name: "report_contradictions",
    description: "Report contradicting record groups from the timeline. Empty array if none.",
    parameters: {
      type: "object",
      properties: {
        contradictions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              recordIds: {
                type: "array",
                items: { type: "string" },
                minItems: 2,
                description: "2 or more record ids (from the timeline given to you) whose claims cannot all be true together",
              },
              reasoning: { type: "string", description: "One short sentence: why they conflict" },
              confidence: { type: "number", description: "0.0-1.0" },
            },
            required: ["recordIds", "reasoning", "confidence"],
          },
        },
      },
      required: ["contradictions"],
    },
  },
};

export type DetectedContradiction = {
  recordIds: string[];
  reasoning: string;
  confidence: number;
};

export type DetectionResult =
  | { ok: true; subjectId: string; contradictions: DetectedContradiction[]; droppedHallucinated: number }
  | { ok: false; subjectId: string; error: string };

const SYSTEM_PROMPT =
  "You are a police case-analysis assistant. You only respond by calling the provided function - never with plain text or step-by-step reasoning. A contradiction can involve TWO OR MORE records, not only a pair - group every record that's part of the same conflict together in one finding rather than reporting overlapping pairs separately. Find contradictions using ONLY the record ids shown in the timeline; never invent or cite an id that isn't listed.";

/**
 * Shared core: calls GLM over a formatted timeline (already assembled by the
 * caller - one person's, or a whole scenario's merged evidence) and returns
 * validated contradictions. Never throws - API/parse failures come back as
 * `{ok:false}` so callers (and the eval harness) can report a miss rather
 * than crash. Every returned finding's record ids are guaranteed to exist
 * in `validIds` - a citation the model invents is dropped, not trusted, and
 * counted in `droppedHallucinated` so that's visible rather than silently
 * swallowed. A hallucinated id is dropped from its group individually
 * rather than sinking the whole finding, but a finding needs 2+ REAL ids
 * left to mean anything as a contradiction.
 *
 * Retries up to 2 extra times, but ONLY on "the model returned ok:true with
 * no tool call at all" - found live to be non-deterministic (the AIContradictions.json
 * generation run got a genuinely empty response on 8 of 15 scenarios that
 * had returned a real tool call minutes earlier on the identical prompt,
 * confirmed by re-running the same scenario twice). That is a transient
 * gap in this endpoint's behavior, not a wrong answer, so retrying is a
 * reliability fix - NOT re-running until a preferred number shows up. A
 * real API error (bad request, auth, non-JSON body) is NOT retried here;
 * those aren't transient in the same way and callGlm already logs them.
 */
async function runDetection(subjectId: string, subjectLabel: string, timelineText: string, recordCount: number, validIds: Set<string>): Promise<DetectionResult> {
  if (recordCount < 2) {
    return { ok: true, subjectId, contradictions: [], droppedHallucinated: 0 };
  }

  const MAX_ATTEMPTS = 3;
  let lastResult: DetectionResult | null = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    lastResult = await runDetectionOnce(subjectId, subjectLabel, timelineText, recordCount, validIds);
    const isEmptyToolCall = !lastResult.ok && lastResult.error.startsWith("model never called report_contradictions");
    if (!isEmptyToolCall) return lastResult;
    if (attempt < MAX_ATTEMPTS) {
      console.warn(`[contradictionDetector] ${subjectId}: empty tool call on attempt ${attempt}/${MAX_ATTEMPTS}, retrying`);
    }
  }
  return lastResult!;
}

async function runDetectionOnce(subjectId: string, subjectLabel: string, timelineText: string, recordCount: number, validIds: Set<string>): Promise<DetectionResult> {
  const result = await callGlm({
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `${subjectLabel}\nTimeline (${recordCount} records):\n${timelineText}\n\nDo not explain your reasoning in text. Immediately call report_contradictions with your findings (an empty array if there are none).`,
      },
    ],
    // tool_choice forcing a specific function is broken on this endpoint -
    // verified live 2026-08-26. See RESEARCH_AND_PLAN.md §2.2. Relying on
    // auto mode + a blunt system + user instruction instead.
    tools: [REPORT_TOOL],
    // 1500, not 700: the "there's a hard total-token ceiling" theory from
    // the first eval pass was itself wrong, found live on the P5.2b re-run
    // - calls with 1923 total tokens (prompt+completion) returned clean
    // 200s. What actually failed was completion_tokens landing exactly on
    // the old maxTokens:700 ceiling on every miss - real truncation before
    // a tool call, not a server-side length rejection. Confirmed via
    // server logs: toolCallCount was 0 on every response whose
    // completion_tokens equalled the max exactly, and 1 on every response
    // that stopped under it. Scenario-level prompts are also naturally
    // longer than one-person prompts (more merged records), which made the
    // old ceiling bite harder here than it had in the person-level pass.
    maxTokens: 1500,
    temperature: 0.2, // low - this is a factual-consistency check, not a creative task
  });

  if (!result.ok) return { ok: false, subjectId, error: result.error };

  const call = result.toolCalls.find((c) => c.name === "report_contradictions");
  if (!call) {
    return { ok: false, subjectId, error: `model never called report_contradictions (finish_reason budget likely exhausted on prose - raw text: ${result.text.slice(0, 200)})` };
  }

  const raw = call.arguments === null ? undefined : (call.arguments as { contradictions?: unknown }).contradictions;
  if (!Array.isArray(raw)) {
    return {
      ok: false,
      subjectId,
      error: `report_contradictions.contradictions was not an array (arguments: ${call.rawArguments.slice(0, 200)})`,
    };
  }

  const validated: DetectedContradiction[] = [];
  let dropped = 0;

  for (const item of raw) {
    const c = item as Partial<DetectedContradiction>;
    if (
      Array.isArray(c.recordIds) &&
      c.recordIds.every((id) => typeof id === "string") &&
      typeof c.reasoning === "string" &&
      typeof c.confidence === "number"
    ) {
      const real = c.recordIds.filter((id) => validIds.has(id));
      if (real.length >= 2) {
        validated.push({ recordIds: real, reasoning: c.reasoning, confidence: c.confidence });
        if (real.length < c.recordIds.length) dropped += c.recordIds.length - real.length;
      } else {
        dropped++;
      }
    } else {
      dropped++;
    }
  }

  return { ok: true, subjectId, contradictions: validated, droppedHallucinated: dropped };
}

function formatItem(t: FusedEvidenceItem): string {
  return `[${t.id}] ${t.dateOnly ? t.timestamp.slice(0, 10) + " (date only)" : t.timestamp} — ${t.summary}`;
}

/** P5.2 - one person's fused timeline. Correct for a contradiction entirely
 *  within one person's own claims (e.g. C1). See the module comment for why
 *  this misses most of the dataset and detectScenarioContradictions exists. */
export async function detectContradictions(personId: string): Promise<DetectionResult> {
  const person = getFusedPerson(personId);
  if (!person) return { ok: false, subjectId: personId, error: "unknown personId" };

  const timelineText = person.timeline.map(formatItem).join("\n");
  const validIds = new Set(person.timeline.map((t) => t.id));
  return runDetection(personId, `Person: ${person.name} (${person.personId})`, timelineText, person.timeline.length, validIds);
}

/** P5.2b - a whole scenario's evidence, every person's timeline merged
 *  (personFusion.ts's getScenarioTimeline). Each line names who it's about,
 *  so a finding can span two different people's records - what P5.3's eval
 *  run proved most of this dataset's contradictions actually need. */
export async function detectScenarioContradictions(scenarioId: string): Promise<DetectionResult> {
  const timeline = getScenarioTimeline(scenarioId);
  if (timeline.length === 0) return { ok: false, subjectId: scenarioId, error: "unknown scenarioId or no fused evidence" };

  const timelineText = timeline.map((t) => `${formatItem(t)} — about: ${t.personNames.join(" & ")}`).join("\n");
  const validIds = new Set(timeline.map((t) => t.id));
  return runDetection(scenarioId, `Scenario: ${scenarioId} (evidence merged across every person involved)`, timelineText, timeline.length, validIds);
}
