import { NextRequest, NextResponse } from "next/server";
import { callGlm, type ChatMessage, type ToolDef } from "@/lib/llm";
import { READ_TOOLS, RESPOND_TOOL, executeTool, getRealCaseIds, getRealPersonIds, personDetailLink } from "@/lib/askTools";
import { caseDetailLink } from "@/lib/caseWorklist";

// -----------------------------------------------------------------------------
// P5.8 - the "Ask Anything" chatbot. A real GLM-4.7-Flash tool-calling agent
// (llm.ts, P5.1, verified live) over the whole seeded dataset via
// askTools.ts's read tools - never a raw prompt-stuffed dump of 5,019 cases.
//
// force-dynamic: every call is a live model round-trip, nothing here should
// ever be statically cached or ISR'd.
//
// LATENCY: this is genuinely slow, by design of the underlying API, not a
// bug - RESEARCH_AND_PLAN.md §2.2's own vendor sample is 8.9s for 256
// output tokens, and this route can make up to 3 sequential calls (gather,
// gather again, answer). The UI (AskAnything.tsx) must show a real loading
// state and the client fetch must not have a short timeout. See MAX_TOOL_ROUNDS
// below for why this is capped at 2 gather-rounds rather than left open-ended.
//
// UNVERIFIED AGAINST A LIVE CALL - same honest limitation as every other
// P5 item: local dev has no Catalyst request context (RESEARCH_AND_PLAN.md
// §2.2, PLAN.md P2.4). One thing here is genuinely NEW territory beyond
// what's been verified live elsewhere in this codebase: every existing
// tool-calling caller (contradictionDetector.ts) is single-round - one
// system+user message, read the tool_calls off the one response, done. This
// route is the first MULTI-round tool loop (gather -> feed results back ->
// call again). llm.ts's ChatMessage type is `{role, content}` only - no
// `tool_call_id`/`name` fields for a tool-result message, because nothing
// before this needed them. Tool results are therefore fed back as plain
// role:"tool" content-only messages (still a role the type supports), not
// OpenAI's full tool_call_id-correlated shape. This is a reasonable design
// given the documented flat request/response contract, but it has not been
// exercised against a real multi-turn call - flag this explicitly if a live
// smoke test surfaces a different requirement.
// -----------------------------------------------------------------------------
export const dynamic = "force-dynamic";

const MAX_TOOL_ROUNDS = 2; // gather-rounds before we force a final answer
const MAX_MESSAGE_LEN = 500;
const MAX_HISTORY_TURNS = 4;

const SYSTEM_PROMPT = `You are "Ask Anything", an assistant for Karnataka State Police officers using the Raksha-Drishti crime analytics portal. You answer questions ONLY using the real, seeded case data reachable through the tools you are given - never from general knowledge, and never by inventing a case number, FIR, person, or district that a tool did not actually return to you.

Use search_cases / get_case / get_person / get_district_stats / list_mo_patterns / list_repeat_offenders to look things up. Call as many as you need, in any order.

When you have enough to answer, call respond_to_user EXACTLY ONCE with your answer text and the exact real caseIds/personIds (as returned by the tools above) that your answer relies on. If nothing relevant was found, say so honestly in the answer text and leave caseIds/personIds empty - never guess an id just to fill the list. If a lookup came back ambiguous (multiple candidates), either pick the most likely one and say so, or ask a brief clarifying question via respond_to_user with empty id arrays.`;

type HistoryTurn = { question: string; answer: string };
type Citation = { type: "case" | "person"; id: number | string; label: string; href: string };

function isHistoryTurn(v: unknown): v is HistoryTurn {
  return !!v && typeof v === "object" && typeof (v as Record<string, unknown>).question === "string" && typeof (v as Record<string, unknown>).answer === "string";
}

/** Fallback grounding for the off-spec path where the model answers in
 *  plain text instead of calling respond_to_user (GLM is documented - P5.1 -
 *  as not reliably following instructions). Same discipline as
 *  contradictionDetector.ts: never trust an id unless it resolves against
 *  the real universe. Weaker than the respond_to_user path (checks against
 *  every real id, not just ones actually surfaced this conversation), but
 *  still never fabricates a link to something that doesn't exist. */
function extractGroundedCitations(text: string, realCaseIds: Set<number>, realPersonIds: Set<string>): Citation[] {
  const citations: Citation[] = [];
  const seen = new Set<string>();

  const personRe = /KA-P\d{4}/gi;
  let m: RegExpExecArray | null;
  while ((m = personRe.exec(text))) {
    const id = m[0].toUpperCase();
    if (realPersonIds.has(id) && !seen.has(`p:${id}`)) {
      seen.add(`p:${id}`);
      citations.push({ type: "person", id, label: id, href: personDetailLink(id) });
    }
  }

  const caseRe = /\b(\d{3,6})\b/g;
  while ((m = caseRe.exec(text))) {
    const n = Number(m[1]);
    if (realCaseIds.has(n) && !seen.has(`c:${n}`)) {
      seen.add(`c:${n}`);
      citations.push({ type: "case", id: n, label: `Case ${n}`, href: caseDetailLink(n) });
    }
  }

  return citations;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const message = typeof body?.message === "string" ? body.message.trim() : "";
    if (!message) {
      return NextResponse.json({ ok: false, error: "message is required" }, { status: 400 });
    }
    if (message.length > MAX_MESSAGE_LEN) {
      return NextResponse.json({ ok: false, error: `message too long (max ${MAX_MESSAGE_LEN} characters)` }, { status: 400 });
    }

    const history: HistoryTurn[] = Array.isArray(body?.history) ? body.history.filter(isHistoryTurn).slice(-MAX_HISTORY_TURNS) : [];

    const messages: ChatMessage[] = [{ role: "system", content: SYSTEM_PROMPT }];
    for (const h of history) {
      messages.push({ role: "user", content: h.question });
      messages.push({ role: "assistant", content: h.answer });
    }
    messages.push({ role: "user", content: message });

    const tools: ToolDef[] = [...READ_TOOLS, RESPOND_TOOL];
    const realCaseIds = getRealCaseIds();
    const realPersonIds = getRealPersonIds();

    let toolRounds = 0;
    // MAX_TOOL_ROUNDS gather-rounds, plus one final round where we nudge the
    // model to stop looking things up and answer with what it has.
    for (let attempt = 0; attempt <= MAX_TOOL_ROUNDS; attempt++) {
      const result = await callGlm({
        messages,
        tools,
        maxTokens: 900,
        temperature: 0.3,
      });

      if (!result.ok) {
        return NextResponse.json({ ok: false, error: `LLM call failed: ${result.error}` }, { status: 502 });
      }

      const respondCall = result.toolCalls.find((c) => c.name === "respond_to_user");
      if (respondCall) {
        const args = (respondCall.arguments ?? {}) as { answer?: unknown; caseIds?: unknown; personIds?: unknown };
        const answer = typeof args.answer === "string" && args.answer.trim() ? args.answer : result.text || "I couldn't produce an answer.";
        const rawCaseIds = Array.isArray(args.caseIds) ? args.caseIds : [];
        const rawPersonIds = Array.isArray(args.personIds) ? args.personIds : [];

        const citations: Citation[] = [];
        let droppedHallucinated = 0;
        for (const id of rawCaseIds) {
          const n = Number(id);
          if (Number.isFinite(n) && realCaseIds.has(n)) {
            citations.push({ type: "case", id: n, label: `Case ${n}`, href: caseDetailLink(n) });
          } else {
            droppedHallucinated++;
          }
        }
        for (const id of rawPersonIds) {
          const s = String(id).toUpperCase();
          if (realPersonIds.has(s)) {
            citations.push({ type: "person", id: s, label: s, href: personDetailLink(s) });
          } else {
            droppedHallucinated++;
          }
        }

        return NextResponse.json({ ok: true, answer, citations, droppedHallucinated, toolRounds });
      }

      if (result.toolCalls.length > 0) {
        toolRounds++;
        if (result.text) messages.push({ role: "assistant", content: result.text });
        for (const call of result.toolCalls) {
          const args = (call.arguments ?? {}) as Record<string, unknown>;
          const toolResult = executeTool(call.name, args);
          messages.push({
            role: "tool",
            content: `Result of ${call.name}(${JSON.stringify(args)}):\n${JSON.stringify(toolResult)}`,
          });
        }
        if (attempt === MAX_TOOL_ROUNDS) {
          messages.push({
            role: "user",
            content: "You've used the maximum number of lookups for this turn. Answer now with what you have by calling respond_to_user - do not call another lookup tool.",
          });
        }
        continue;
      }

      // No tool call at all - the model answered in plain text instead of
      // calling respond_to_user (an off-spec path we defend against, not
      // the expected one; see the module comment on P5.1's finding that
      // GLM doesn't always follow instructions).
      const text = result.text || "I couldn't find an answer in the real case data.";
      return NextResponse.json({
        ok: true,
        answer: text,
        citations: extractGroundedCitations(text, realCaseIds, realPersonIds),
        droppedHallucinated: 0,
        toolRounds,
      });
    }

    return NextResponse.json({ ok: false, error: "Gave up after too many tool-call rounds without a final answer." }, { status: 504 });
  } catch (e) {
    console.error("[api/ask] unhandled error", e);
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "unknown error" }, { status: 500 });
  }
}
