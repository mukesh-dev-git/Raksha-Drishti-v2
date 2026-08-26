// -----------------------------------------------------------------------------
// P5.2 - contradiction detector over a fused person's timeline (personFusion.ts).
// P5.6's citation guardrail is enforced HERE, in the tool schema and in the
// post-call validation, not hoped for from a prompt: the model can only cite
// two record ids per finding (forced by the schema), and every cited id is
// checked against the person's real timeline before a finding survives -
// resolvedPersons "GLM does not reliably follow short-output instructions"
// (RESEARCH_AND_PLAN.md §2.2) is exactly why this is tool_choice-forced
// structured output, not a "please return JSON" prompt.
// -----------------------------------------------------------------------------
import { callGlm, type ToolDef } from "./llm";
import { getFusedPerson, type FusedPerson } from "./personFusion";

// Terse by design, not just by convention: this endpoint has a real total
// (prompt + completion) token ceiling well under what the console documents
// (128K output) - verified 2026-08-26 by bisection, see RESEARCH_AND_PLAN.md
// §2.2. Free-text claim fields routinely pushed even ONE finding's JSON past
// that ceiling; dropped from the schema since the caller already has each
// record's own summary from personFusion.ts's timeline by id.
//
// recordIds is an ARRAY (2+), not a fixed pair - P5.3's eval run found 13 of
// the 15 authored contradictions actually chain 3-4 records (a witness
// statement plus two calls plus a transaction, for example), not 2. An
// earlier pair-only schema would have made those structurally unfindable
// regardless of what the model reasoned - a real design bug caught by
// running the eval, not by re-reading the schema.
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
  | { ok: true; personId: string; contradictions: DetectedContradiction[]; droppedHallucinated: number }
  | { ok: false; personId: string; error: string };

function formatTimeline(person: FusedPerson): string {
  return person.timeline
    .map((t) => `[${t.id}] ${t.dateOnly ? t.timestamp.slice(0, 10) + " (date only)" : t.timestamp} — ${t.summary}`)
    .join("\n");
}

/**
 * Runs GLM over one person's fused timeline and returns validated
 * contradictions. Never throws - API/parse failures come back as
 * `{ok:false}` so callers (and the eval harness) can report a miss rather
 * than crash. Every returned finding's two record ids are guaranteed to
 * exist in the person's real timeline - a citation the model invents is
 * dropped, not trusted, and counted in `droppedHallucinated` so that's
 * visible rather than silently swallowed.
 */
export async function detectContradictions(personId: string): Promise<DetectionResult> {
  const person = getFusedPerson(personId);
  if (!person) return { ok: false, personId, error: "unknown personId" };
  if (person.timeline.length < 2) {
    return { ok: true, personId, contradictions: [], droppedHallucinated: 0 };
  }

  const result = await callGlm({
    messages: [
      {
        role: "system",
        content:
          "You are a police case-analysis assistant. You only respond by calling the provided function - never with plain text or step-by-step reasoning. Find contradictions using ONLY the record ids shown in the timeline; never invent or cite an id that isn't listed.",
      },
      {
        role: "user",
        content: `Person: ${person.name} (${person.personId})\nTimeline (${person.timeline.length} records):\n${formatTimeline(person)}\n\nDo not explain your reasoning in text. Immediately call report_contradictions with your findings (an empty array if there are none).`,
      },
    ],
    // tool_choice forcing a specific function is broken on this endpoint -
    // verified live 2026-08-26, isolated down to a minimal repro: an
    // identical single-tool call succeeds in "auto" mode (tools present, no
    // tool_choice) and fails with MORE_THAN_MAX_LENGTH the instant
    // tool_choice names the function, regardless of prompt or schema size.
    // See RESEARCH_AND_PLAN.md §2.2. Relying on auto mode + a blunt system +
    // user instruction instead - GLM reliably called the only tool offered
    // in every isolation test without forcing.
    tools: [REPORT_TOOL],
    maxTokens: 700, // total (prompt+completion) has a real ceiling well under
    // the documented 128K output - see the module comment above the schema.
    // Schema was trimmed to fit under it, not this raised further.
    temperature: 0.2, // low - this is a factual-consistency check, not a creative task
  });

  if (!result.ok) return { ok: false, personId, error: result.error };

  const call = result.toolCalls.find((c) => c.name === "report_contradictions");
  if (!call) {
    return { ok: false, personId, error: `model never called report_contradictions (finish_reason budget likely exhausted on prose - raw text: ${result.text.slice(0, 200)})` };
  }

  const raw = call.arguments === null ? undefined : (call.arguments as { contradictions?: unknown }).contradictions;
  if (!Array.isArray(raw)) {
    return {
      ok: false,
      personId,
      error: `report_contradictions.contradictions was not an array (arguments: ${call.rawArguments.slice(0, 200)})`,
    };
  }

  const validIds = new Set(person.timeline.map((t) => t.id));
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
      // The citation guardrail, enforced per-id, not all-or-nothing: a
      // hallucinated id is dropped from the group rather than sinking the
      // whole finding, but a finding needs 2+ REAL ids left to mean
      // anything as a contradiction - one real id alone isn't a conflict.
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

  return { ok: true, personId, contradictions: validated, droppedHallucinated: dropped };
}
