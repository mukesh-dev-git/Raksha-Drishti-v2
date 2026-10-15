import { NextRequest } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { callGlm, type ChatMessage } from "@/lib/llm";
import { AGENT_TOOLS, ANSWER_TOOL, runAgentTool } from "@/lib/agent/tools";
import type { AgentEvent } from "@/lib/agent/blocks";

// -----------------------------------------------------------------------------
// Agent Workspace (#16) - POST { question, history?, context? } runs the
// FIRST round; POST { state } runs the next one. Each response is an NDJSON
// stream of AgentEvents and ends with either `continue` (signed state for
// the next round) or `done`.
//
// ONE ROUND PER REQUEST, found live 2026-10-15: the deployed Slate app runs
// inside a Catalyst Function that buffers the whole response (it even
// strips X-Accel-Buffering) - a single long streamed request showed nothing
// for ~22s, then everything at once. Splitting the loop into short requests
// means each round's charts reach the analyst as soon as that round ends,
// on any host. Locally the events still stream within a round.
//
// The state carried between rounds (conversation + tool results + the
// numbers already returned) is HMAC-signed, so a client can't edit tool
// results to fake the answer check below.
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
export const maxDuration = 60;

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

type LoopState = { messages: ChatMessage[]; known: number[]; seen: string[]; toolCalls: number; blocks: number; round: number };

// --- signed state ------------------------------------------------------------
function secret(): string {
  const s = process.env.AGENT_STATE_SECRET ?? process.env.QUICKML_CLIENT_SECRET;
  if (!s) throw new Error("No signing secret configured (AGENT_STATE_SECRET or QUICKML_CLIENT_SECRET).");
  return s;
}
const sign = (payload: string) => createHmac("sha256", secret()).update(payload).digest("base64url");
function packState(st: LoopState): string {
  const payload = Buffer.from(JSON.stringify(st)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}
function unpackState(token: unknown): LoopState | null {
  if (typeof token !== "string" || token.length > 400_000) return null;
  const [payload, mac] = token.split(".");
  if (!payload || !mac) return null;
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(mac);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try { return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as LoopState; } catch { return null; }
}

// --- answer checking ----------------------------------------------------------
/** Every number appearing anywhere in the tool results, for answer checking. */
function collectNumbers(v: unknown, out: Set<number>) {
  if (typeof v === "number" && Number.isFinite(v)) out.add(v);
  else if (typeof v === "string") for (const m of v.matchAll(/-?\d[\d,]*(?:\.\d+)?/g)) out.add(Number(m[0].replace(/,/g, "")));
  else if (Array.isArray(v)) v.forEach((x) => collectNumbers(x, out));
  else if (v && typeof v === "object") Object.values(v).forEach((x) => collectNumbers(x, out));
}

function unverifiedNumbers(answer: string, known: number[]): string[] {
  const bad: string[] = [];
  for (const m of answer.matchAll(/(?<![\w-])\d[\d,]*(?:\.\d+)?/g)) {
    const raw = m[0];
    const n = Number(raw.replace(/,/g, ""));
    if (!Number.isFinite(n) || n < 10) continue; // small counts/ordinals aren't worth flagging
    if (n >= 2000 && n <= 2035 && Number.isInteger(n)) continue; // years
    // Allow the rounding a person would do when quoting a figure (225.9 -> 226, 17.6 -> 18).
    const ok = known.some((k) => Math.abs(k - n) <= Math.max(0.5, Math.abs(k) * 0.005) || Math.abs(Math.abs(k) - n) <= 0.5);
    if (!ok && !bad.includes(raw)) bad.push(raw);
  }
  return bad;
}

// --- one round ------------------------------------------------------------------
async function runRound(st: LoopState, send: (e: AgentEvent) => void): Promise<"done" | "continue"> {
  const known = new Set(st.known);
  const final = st.round >= MAX_GATHER_ROUNDS || st.toolCalls >= MAX_TOOL_CALLS;
  if (final) {
    st.messages.push({ role: "user", content: "No more lookups are available. Call write_answer now, using only the numbers already returned above." });
  }
  const result = await callGlm({
    messages: st.messages,
    tools: final ? [ANSWER_TOOL] : [...AGENT_TOOLS, ANSWER_TOOL],
    toolChoice: "auto",
    maxTokens: final ? 900 : 700,
    temperature: 0.2,
  });
  if (!result.ok) {
    send({ type: "error", text: `The AI model couldn't be reached (${result.error}). Any results already shown are still valid.` });
    return "done";
  }

  const answerCall = result.toolCalls.find((c) => c.name === "write_answer");
  const lookups = final ? [] : result.toolCalls.filter((c) => c.name !== "write_answer");

  let ran = 0;
  if (lookups.length) {
    st.messages.push({ role: "assistant", content: `Calling: ${lookups.map((c) => `${c.name}(${JSON.stringify(c.arguments ?? {})})`).join(", ")}` });
    for (const call of lookups) {
      const args = (call.arguments && typeof call.arguments === "object" ? call.arguments : {}) as Record<string, unknown>;
      const key = `${call.name}:${JSON.stringify(args)}`;
      if (st.seen.includes(key) || st.toolCalls >= MAX_TOOL_CALLS) continue;
      st.seen.push(key);
      st.toolCalls++;
      ran++;
      const out = await runAgentTool(call.name, args);
      send({ type: "step", text: out.step });
      for (const block of out.blocks) { send({ type: "block", block }); st.blocks++; }
      collectNumbers(out.result, known);
      // role:"user", not "tool" - see /api/ask for why.
      st.messages.push({ role: "user", content: `Result of ${call.name}(${JSON.stringify(args)}):\n${JSON.stringify(out.result)}` });
    }
  }
  st.known = [...known];

  if (answerCall && (!lookups.length || final)) {
    const args = (answerCall.arguments ?? {}) as { answer?: unknown };
    const text = typeof args.answer === "string" ? args.answer.trim() : "";
    if (text) {
      send({ type: "answer", text, unverified: unverifiedNumbers(text, st.known) });
      return "done";
    }
  }
  if (final) {
    send({ type: "answer", unverified: [], text: st.blocks
      ? "The results are above. The AI model didn't write a summary this time; every chart was built directly from the data."
      : "I couldn't answer that from the available data. Try asking about district crime rates, trends over time, a specific district, hotspots or repeat offenders." });
    return "done";
  }
  if (lookups.length && !ran) {
    // Every lookup was a repeat (seen live: the model re-requests what it
    // already has instead of answering) - say so, rather than spend a round.
    st.messages.push({ role: "user", content: "Those lookups were already done - their results are above. Call write_answer now." });
  }
  if (!lookups.length && !answerCall) {
    // Plain text instead of a tool call - not shown (it may be leaked
    // reasoning); nudge once more toward the tools.
    st.messages.push({ role: "assistant", content: "(no tool call)" });
    st.messages.push({ role: "user", content: "Use the tools to look this up, then call write_answer." });
  }
  st.round++;
  return "continue";
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  let st: LoopState;

  if (body?.state !== undefined) {
    const restored = unpackState(body.state);
    if (!restored) return Response.json({ error: "Invalid or expired agent state - ask the question again." }, { status: 400 });
    st = restored;
  } else {
    const question = typeof body?.question === "string" ? body.question.trim() : "";
    if (!question || question.length > MAX_QUESTION) {
      return Response.json({ error: question ? `Question too long (max ${MAX_QUESTION} characters).` : "question is required" }, { status: 400 });
    }
    const history: HistoryTurn[] = Array.isArray(body?.history) ? body.history.filter(isTurn).slice(-3) : [];
    const context = typeof body?.context === "string" ? body.context.slice(0, 300) : "";
    const messages: ChatMessage[] = [{ role: "system", content: SYSTEM_PROMPT }];
    for (const h of history) {
      messages.push({ role: "user", content: h.question });
      messages.push({ role: "assistant", content: h.answer });
    }
    messages.push({ role: "user", content: context ? `(The analyst opened this from: ${context})\n\n${question}` : question });
    st = { messages, known: [], seen: [], toolCalls: 0, blocks: 0, round: 0 };
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (e: AgentEvent) => controller.enqueue(encoder.encode(JSON.stringify(e) + "\n"));
      try {
        const outcome = await runRound(st, send);
        if (outcome === "continue") send({ type: "continue", state: packState(st) });
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
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store, no-transform" },
  });
}
