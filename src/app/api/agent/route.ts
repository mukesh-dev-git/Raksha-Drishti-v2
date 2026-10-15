import { NextRequest } from "next/server";
import { callGlm, type ChatMessage } from "@/lib/llm";
import { AGENT_TOOLS, ANSWER_TOOL, runAgentTool } from "@/lib/agent/tools";
import type { AgentEvent } from "@/lib/agent/blocks";

// -----------------------------------------------------------------------------
// Agent Workspace (#16) - POST { question, history?, context? } -> an NDJSON
// stream of AgentEvents: progress steps, result blocks, then the answer.
//
// Same GLM tool loop as /api/ask (see that route for the live-found bugs
// this copies the fixes for): tool results go back as role:"user" (role:
// "tool" is ignored by this model), every round gets a paired assistant
// turn, and toolChoice stays "auto" - the forced-function form 400s on this
// endpoint. Two differences:
//   1. Tools return blocks built in code (src/lib/agent/tools.ts); the
//      model only picks tools/arguments and writes the short answer.
//   2. The final round offers ONLY write_answer and never falls back to the
//      model's free text: without a tool to answer through, GLM leaks its
//      draft/review scratchpad (crimeInsights.ts). If it still won't answer,
//      the analyst gets the blocks plus a plain fixed sentence instead.
//
// Every number in the answer is checked against the numbers the tools
// actually returned; any that can't be found are sent as `unverified` and
// flagged in the UI instead of being presented as checked figures.
// -----------------------------------------------------------------------------
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const MAX_GATHER_ROUNDS = 3;
const MAX_TOOL_CALLS = 6;
const MAX_QUESTION = 600;

const SYSTEM_PROMPT = `You are the Agent Workspace assistant for analysts at Karnataka's State Crime Records Bureau (SCRB), inside the Raksha-Drishti portal.

Answer by calling the tools. Every tool draws its own chart or map for the analyst automatically - you never draw charts or write numbers that a tool did not return.

Data sources - always keep them apart:
- district_crime_rates and the "real" part of district_profile are REAL Karnataka State Police figures (2022, 2023, 2025) with Census 2011 population.
- count_cases, compare_periods, show_hotspots, list_repeat_offenders and the "demo" part of district_profile use the app's DEMO case records (generated, Jan 2022 - Aug 2026).

Pick the fewest tools that answer the question (usually 1-3). Then call write_answer exactly once: 2-4 plain sentences, no markdown, quoting only numbers the tools returned, and saying which figures are real KSP data and which are demo data. If the tools cannot answer the question, say so plainly in write_answer instead of guessing.`;

type HistoryTurn = { question: string; answer: string };
const isTurn = (v: unknown): v is HistoryTurn =>
  !!v && typeof (v as HistoryTurn).question === "string" && typeof (v as HistoryTurn).answer === "string";

/** Every number appearing anywhere in the tool results, for answer checking. */
function collectNumbers(v: unknown, out: Set<number>) {
  if (typeof v === "number" && Number.isFinite(v)) out.add(v);
  else if (typeof v === "string") for (const m of v.matchAll(/-?\d[\d,]*(?:\.\d+)?/g)) out.add(Number(m[0].replace(/,/g, "")));
  else if (Array.isArray(v)) v.forEach((x) => collectNumbers(x, out));
  else if (v && typeof v === "object") Object.values(v).forEach((x) => collectNumbers(x, out));
}

function unverifiedNumbers(answer: string, known: Set<number>): string[] {
  const knownList = [...known];
  const bad: string[] = [];
  for (const m of answer.matchAll(/(?<![\w-])\d[\d,]*(?:\.\d+)?/g)) {
    const raw = m[0];
    const n = Number(raw.replace(/,/g, ""));
    if (!Number.isFinite(n) || n < 10) continue; // small counts/ordinals aren't worth flagging
    if (n >= 2000 && n <= 2035 && Number.isInteger(n)) continue; // years
    // Allow the rounding a person would do when quoting a figure (225.9 -> 226, 17.6 -> 18).
    const ok = knownList.some((k) => Math.abs(k - n) <= Math.max(0.5, Math.abs(k) * 0.005) || Math.abs(Math.abs(k) - n) <= 0.5);
    if (!ok && !bad.includes(raw)) bad.push(raw);
  }
  return bad;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const question = typeof body?.question === "string" ? body.question.trim() : "";
  if (!question || question.length > MAX_QUESTION) {
    return Response.json({ error: question ? `Question too long (max ${MAX_QUESTION} characters).` : "question is required" }, { status: 400 });
  }
  const history: HistoryTurn[] = Array.isArray(body?.history) ? body.history.filter(isTurn).slice(-3) : [];
  const context = typeof body?.context === "string" ? body.context.slice(0, 300) : "";

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (e: AgentEvent) => controller.enqueue(encoder.encode(JSON.stringify(e) + "\n"));
      try {
        const messages: ChatMessage[] = [{ role: "system", content: SYSTEM_PROMPT }];
        for (const h of history) {
          messages.push({ role: "user", content: h.question });
          messages.push({ role: "assistant", content: h.answer });
        }
        messages.push({ role: "user", content: context ? `(The analyst opened this from: ${context})\n\n${question}` : question });

        const known = new Set<number>();
        const seenCalls = new Set<string>();
        let toolCalls = 0;
        let blockCount = 0;
        send({ type: "step", text: "Reading the question" });

        for (let round = 0; round <= MAX_GATHER_ROUNDS; round++) {
          const final = round === MAX_GATHER_ROUNDS || toolCalls >= MAX_TOOL_CALLS;
          if (final) {
            messages.push({ role: "user", content: "No more lookups are available. Call write_answer now, using only the numbers already returned above." });
          }
          const result = await callGlm({
            messages,
            tools: final ? [ANSWER_TOOL] : [...AGENT_TOOLS, ANSWER_TOOL],
            toolChoice: "auto",
            maxTokens: final ? 900 : 700,
            temperature: 0.2,
          });
          if (!result.ok) {
            send({ type: "error", text: `The AI model couldn't be reached (${result.error}). Any results already shown are still valid.` });
            break;
          }

          const answerCall = result.toolCalls.find((c) => c.name === "write_answer");
          const lookups = final ? [] : result.toolCalls.filter((c) => c.name !== "write_answer");

          if (lookups.length) {
            const assistantNote = `Calling: ${lookups.map((c) => `${c.name}(${JSON.stringify(c.arguments ?? {})})`).join(", ")}`;
            messages.push({ role: "assistant", content: assistantNote });
            for (const call of lookups) {
              const args = (call.arguments && typeof call.arguments === "object" ? call.arguments : {}) as Record<string, unknown>;
              const key = `${call.name}:${JSON.stringify(args)}`;
              if (seenCalls.has(key) || toolCalls >= MAX_TOOL_CALLS) continue;
              seenCalls.add(key);
              toolCalls++;
              const out = await runAgentTool(call.name, args);
              send({ type: "step", text: out.step });
              for (const block of out.blocks) { send({ type: "block", block }); blockCount++; }
              collectNumbers(out.result, known);
              // role:"user", not "tool" - see /api/ask for why.
              messages.push({ role: "user", content: `Result of ${call.name}(${JSON.stringify(args)}):\n${JSON.stringify(out.result)}` });
            }
          }

          if (answerCall && (!lookups.length || final)) {
            const args = (answerCall.arguments ?? {}) as { answer?: unknown };
            const text = typeof args.answer === "string" ? args.answer.trim() : "";
            if (text) {
              send({ type: "answer", text, unverified: unverifiedNumbers(text, known) });
              break;
            }
          }
          if (final) {
            send({ type: "answer", unverified: [], text: blockCount
              ? "The results are above. The AI model didn't write a summary this time; every chart was built directly from the data."
              : "I couldn't answer that from the available data. Try asking about district crime rates, trends over time, a specific district, hotspots or repeat offenders." });
            break;
          }
          if (!lookups.length && !answerCall) {
            // Plain text instead of a tool call - not shown (it may be leaked
            // reasoning); nudge once more toward the tools.
            messages.push({ role: "assistant", content: "(no tool call)" });
            messages.push({ role: "user", content: "Use the tools to look this up, then call write_answer." });
          }
        }
      } catch (e) {
        console.error("[api/agent] failed", e);
        send({ type: "error", text: e instanceof Error ? e.message : "Something went wrong." });
      } finally {
        send({ type: "done" });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store", "X-Accel-Buffering": "no" },
  });
}
