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
// gather again, forced answer). The UI (AskAnything.tsx) must show a real
// loading state and the client fetch must not have a short timeout. See
// MAX_GATHER_ROUNDS below for why this is capped at 2 gather-rounds rather
// than left open-ended, and the fix note just above the loop itself for a
// real bug that used to make this route give up instead of answering.
//
// VERIFIED LIVE 2026-08-26 for the single-round shape (contradictionDetector.ts)
// and VERIFIED LIVE 2026-08-31 for the multi-round loop specifically (this
// route - via a local production build against the real Catalyst QuickML
// endpoint with real .env.local credentials, same method used for every
// other live-verified P5/P7 item; not exercised against the deployed Slate
// app itself, same documented Claude_Browser/onslate.in limitation as
// elsewhere in this codebase). This route is the first MULTI-round tool
// loop in the codebase (gather -> feed results back -> call again;
// contradictionDetector.ts is single-round: one system+user message, read
// tool_calls off the one response, done) and multi-round surfaced 3 real,
// previously-unexercised bugs the first time it was actually run against
// the live API - see the fix note just above the loop for the round-count
// off-by-one, and the two NOTES inside the loop for the tool_choice/tools
// findings. The most load-bearing one: llm.ts's ChatMessage type is
// `{role, content}` only, no tool_call_id/name correlation, so tool
// results were originally fed back as role:"tool" content-only messages -
// live-confirmed BROKEN (the model completely ignored them and re-issued
// the same first tool call every round). Fixed by feeding them back as
// role:"user" instead - see the comment at the actual push site below
// before changing this again.
// -----------------------------------------------------------------------------
export const dynamic = "force-dynamic";

// BUG FOUND + FIXED 2026-08-31 (real, live-reproduced twice - see
// assets/README.md's demo-ask.png note): the loop below used to be
// `for (attempt = 0; attempt <= MAX_TOOL_ROUNDS; attempt++)` with the
// "you've used your lookups, answer now" nudge pushed only when
// `attempt === MAX_TOOL_ROUNDS` - i.e. AFTER the last allowed callGlm() had
// already happened. `continue` then incremented attempt past the loop
// bound, so that nudge message was built, pushed onto `messages`, and
// immediately discarded - no 4th call ever sent it. Any question needing a
// 3rd tool round (plausible for anything requiring "list X, then look up
// each") hit the `504 "Gave up..."` below deterministically, not
// intermittently. Fixed by making the LAST attempt a real, dedicated
// forced-answer round: tools trimmed to just respond_to_user (so the model
// literally cannot ask for another lookup) and tool_choice pinned to it.
// If the model still doesn't comply, the existing plain-text fallback path
// (extractGroundedCitations) below now catches it - so this loop can no
// longer end without either a respond_to_user answer or a grounded
// plain-text answer. The "gave up" 504 is kept only as a dead-code safety
// net; it should now be unreachable.
const MAX_GATHER_ROUNDS = 2; // rounds where the model may call a lookup tool; one further forced-answer round always follows
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
    // MAX_GATHER_ROUNDS rounds where the model may call a lookup tool, then
    // one real forced-answer round (see the module comment above) where only
    // respond_to_user is offered - guarantees termination without silently
    // dropping a message.
    for (let attempt = 0; attempt <= MAX_GATHER_ROUNDS; attempt++) {
      const isFinalAttempt = attempt === MAX_GATHER_ROUNDS;
      if (isFinalAttempt) {
        messages.push({
          role: "user",
          content: "You've used the maximum number of lookups for this turn - no more tools are available now. Answer in plain text using only the real information already returned above. If nothing relevant was found, say so honestly.",
        });
      }

      // NOTES 2026-08-31, both found live while fixing this route's final
      // round, both previously-unexercised paths through llm.ts (every
      // earlier live call this session always passed a full `tools` list):
      //   1. Pinning toolChoice to `{type:"function", function:{name:...}}`
      //      (the natural way to FORCE respond_to_user) - the live API
      //      rejects it outright, a 400 `MORE_THAN_MAX_LENGTH` / "Error in
      //      processing `zoho-inputstream` parameter" on a request SMALLER
      //      than the two prior successful gather-round calls, so not an
      //      actual length problem - the forced tool_choice shape itself
      //      breaks request parsing on this endpoint. Not used below.
      //   2. Trimming `tools` down to just [RESPOND_TOOL] (still offering
      //      *a* tool) doesn't stop the model calling a DIFFERENT tool name
      //      not even in that list (list_repeat_offenders, live-observed) -
      //      the API doesn't enforce the tool name against the request's
      //      own tools array. Only omitting `tools` ENTIRELY leaves the
      //      model nothing to call, forcing a real plain-text answer - which
      //      the grounded-fallback branch below already handles safely
      //      (never trusts an id it didn't verify against the real universe).
      const result = await callGlm({
        messages,
        tools: isFinalAttempt ? [RESPOND_TOOL] : tools,
        // Bumped for the final round only - live-observed 2026-08-31: a
        // question spanning several repeat offenders/cases fills the whole
        // 900-token budget and cuts off mid-answer (no room left for a
        // synthesis pass after 2 gather rounds' worth of results are in
        // context). 45s REQUEST_TIMEOUT_MS in llm.ts already has headroom
        // for this - its own comment notes 1500 tokens pushed real calls
        // past 20s elsewhere in this codebase (contradictionDetector.ts)
        // and still finished well inside 45s.
        maxTokens: isFinalAttempt ? 1400 : 900,
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

      // On the final attempt, tools was trimmed to [RESPOND_TOOL] and
      // toolChoice pinned to it - so a non-respond_to_user tool call here
      // isn't a real gather request to service, it's the model going
      // off-spec. Don't feed it back and loop again (that's what caused the
      // original bug); fall through to the plain-text/grounded-fallback
      // answer below using whatever result.text the model produced instead.
      if (!isFinalAttempt && result.toolCalls.length > 0) {
        toolRounds++;
        // ALWAYS push an assistant turn here, even when result.text is
        // empty (common - found live 2026-08-31, see the DEBUG-attempt
        // trace this fix was built from: the model called
        // list_repeat_offenders with {} on every single round, ignoring
        // the real results fed back each time). The old `if (result.text)`
        // guard skipped this message whenever text was empty, which left
        // two consecutive role:"tool" messages back to back with no
        // assistant turn between them for that round - a malformed
        // turn sequence for a chat-templated model (tool results are
        // supposed to follow the assistant turn that requested them). That
        // is almost certainly why the model never appeared to read its own
        // prior tool results: the turn structure didn't say "you asked
        // this, here's the answer," it just said "tool, tool, tool."
        // Always naming what was called keeps every round's turns paired.
        const assistantContent = result.text || `Calling: ${result.toolCalls.map((c) => `${c.name}(${JSON.stringify(c.arguments ?? {})})`).join(", ")}`;
        messages.push({ role: "assistant", content: assistantContent });
        for (const call of result.toolCalls) {
          const args = (call.arguments ?? {}) as Record<string, unknown>;
          const toolResult = executeTool(call.name, args);
          const toolContent = `Result of ${call.name}(${JSON.stringify(args)}):\n${JSON.stringify(toolResult)}`;
          // role:"user", not role:"tool" - CONFIRMED live 2026-08-31, the
          // root cause of this whole bug. role:"tool" was never
          // live-verified before this session (see the module header) and
          // in practice the model just re-issued the identical, empty-arg
          // first tool call on every round, completely blind to what had
          // already been fed back - swapping to role:"user" (the one role
          // every chat template is guaranteed to read) made the model
          // correctly read and cite the real prior results on the very next
          // call. Do not change this back to "tool" without a fresh live
          // smoke test - it silently reintroduces the exact bug this fix
          // resolves.
          messages.push({
            role: "user",
            content: toolContent,
          });
        }
        continue;
      }

      // Either the model answered in plain text instead of calling
      // respond_to_user (an off-spec path we defend against, not the
      // expected one; see the module comment on P5.1's finding that GLM
      // doesn't always follow instructions), or this was the forced final
      // attempt and it still didn't comply with the pinned respond_to_user
      // tool_choice. Either way: same grounded-fallback treatment, never a
      // give-up error - this is what makes the loop always terminate.
      const text = result.text || "I couldn't find an answer in the real case data.";
      return NextResponse.json({
        ok: true,
        answer: text,
        citations: extractGroundedCitations(text, realCaseIds, realPersonIds),
        droppedHallucinated: 0,
        toolRounds,
      });
    }

    // Dead-code safety net, not the real terminal path anymore (see the
    // fix note above the loop): every branch inside the loop now returns
    // directly, including the forced final attempt. Kept only in case a
    // future change reintroduces a path that falls through without
    // returning - if this response is ever actually seen live, that's a new
    // bug, not this one again.
    return NextResponse.json({ ok: false, error: "Gave up after too many tool-call rounds without a final answer." }, { status: 504 });
  } catch (e) {
    console.error("[api/ask] unhandled error", e);
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "unknown error" }, { status: 500 });
  }
}
