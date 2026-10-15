"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ArrowUp, Check, CircleAlert, Download, Loader2, Plus, Printer, Sparkles, Trash2, X } from "lucide-react";
import { BASE_PATH } from "@/lib/basePath";
import type { AgentEvent, Block } from "@/lib/agent/blocks";
import { BlockCard, blockToCsv } from "./AgentBlocks";

// -----------------------------------------------------------------------------
// Agent Workspace (#16) - full-screen workspace, like VS Code's "Open in
// Agents": sessions on the left, the conversation and its generated results
// in the middle, the analyst's pinned board on the right.
//
// Sessions and the pinned board live in this browser's localStorage (per
// analyst, per device) - wrapped in try/catch everywhere, and the page works
// without it. Nothing here talks to the model directly: /api/agent streams
// NDJSON AgentEvents (steps, blocks, answer) and this only renders them.
// -----------------------------------------------------------------------------

type Turn = {
  id: string;
  question: string;
  steps: string[];
  blocks: Block[];
  answer: string | null;
  unverified: string[];
  error: string | null;
  status: "running" | "done";
};
type Session = { id: string; title: string; createdAt: number; turns: Turn[] };

const SESSIONS_KEY = "rd.agent.sessions.v1";
const BOARD_KEY = "rd.agent.board.v1";

const SUGGESTIONS = [
  "Which districts had the biggest rise in crime, and what's happening in Kodagu?",
  "Which districts have the highest crime rate per lakh population?",
  "At what time of day do burglaries happen in Bengaluru?",
  "Compare theft cases by district in 2024 and 2025",
  "Show me assault hotspots in Mysuru",
  "Who are the repeat offenders in Belagavi?",
];

const uid = () => Math.random().toString(36).slice(2, 10);
function load<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? (JSON.parse(v) as T) : fallback; } catch { return fallback; }
}
function save(key: string, v: unknown) {
  try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* storage full or blocked - workspace still works for this visit */ }
}

export default function AgentWorkspace() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [board, setBoard] = useState<Block[]>([]);
  const [input, setInput] = useState("");
  const [context, setContext] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  const active = sessions.find((s) => s.id === activeId) ?? null;

  const updateSessions = useCallback((fn: (prev: Session[]) => Session[]) => {
    setSessions((prev) => { const next = fn(prev); save(SESSIONS_KEY, next.slice(0, 30)); return next; });
  }, []);
  const updateTurn = useCallback((sid: string, tid: string, fn: (t: Turn) => Turn) => {
    updateSessions((prev) => prev.map((s) => (s.id !== sid ? s : { ...s, turns: s.turns.map((t) => (t.id === tid ? fn(t) : t)) })));
  }, [updateSessions]);

  const ask = useCallback(async (question: string, sessionId?: string) => {
    const q = question.trim();
    if (!q || busy) return;
    setBusy(true);
    setInput("");
    let sid = sessionId ?? activeId;
    const existing = sessions.find((s) => s.id === sid);
    const history = (existing?.turns ?? []).filter((t) => t.answer).slice(-3).map((t) => ({ question: t.question, answer: t.answer! }));
    const turn: Turn = { id: uid(), question: q, steps: [], blocks: [], answer: null, unverified: [], error: null, status: "running" };
    if (!existing) {
      sid = uid();
      const s: Session = { id: sid, title: q.length > 60 ? `${q.slice(0, 57)}…` : q, createdAt: Date.now(), turns: [turn] };
      updateSessions((prev) => [s, ...prev]);
      setActiveId(sid);
    } else {
      updateSessions((prev) => prev.map((s) => (s.id === sid ? { ...s, turns: [...s.turns, turn] } : s)));
    }
    const S = sid!;

    try {
      const res = await fetch("/api/agent", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, history, context: history.length ? "" : context }),
      });
      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let nl;
        while ((nl = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, nl).trim();
          buf = buf.slice(nl + 1);
          if (!line) continue;
          const e = JSON.parse(line) as AgentEvent;
          updateTurn(S, turn.id, (t) => {
            switch (e.type) {
              case "step": return { ...t, steps: [...t.steps, e.text] };
              case "block": return { ...t, blocks: [...t.blocks, e.block] };
              case "answer": return { ...t, answer: e.text, unverified: e.unverified };
              case "error": return { ...t, error: e.text };
              case "done": return { ...t, status: "done" };
            }
          });
        }
      }
    } catch (err) {
      updateTurn(S, turn.id, (t) => ({ ...t, error: err instanceof Error ? err.message : "Request failed" }));
    } finally {
      updateTurn(S, turn.id, (t) => ({ ...t, status: "done" }));
      setBusy(false);
    }
  }, [busy, activeId, sessions, context, updateSessions, updateTurn]);

  // Load saved state, then honour ?q= / ?context= from the page that opened the workspace.
  useEffect(() => {
    setSessions(load<Session[]>(SESSIONS_KEY, []).map((s) => ({ ...s, turns: s.turns.map((t) => ({ ...t, status: "done" as const })) })));
    setBoard(load<Block[]>(BOARD_KEY, []));
    const qs = new URLSearchParams(window.location.search);
    const ctx = qs.get("context");
    if (ctx) setContext(ctx.slice(0, 200));
    const q = qs.get("q");
    if (q && !started.current) {
      started.current = true;
      window.history.replaceState(null, "", window.location.pathname);
      setTimeout(() => setInput(q), 0);
    }
  }, []);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [active?.turns]);

  const pinned = (b: Block) => board.some((x) => x.id === b.id);
  const togglePin = (b: Block) => setBoard((prev) => {
    const next = prev.some((x) => x.id === b.id) ? prev.filter((x) => x.id !== b.id) : [...prev, b];
    save(BOARD_KEY, next);
    return next;
  });

  const exportCsv = () => {
    const out: string[] = [];
    for (const b of board) {
      const rows = blockToCsv(b);
      if (!rows) continue;
      out.push(`# ${b.title}${b.subtitle ? ` (${b.subtitle})` : ""} — ${b.provenance.kind === "real" ? "Real" : "Demo data"}: ${b.provenance.source}`);
      out.push(...rows.map((r) => r.map((c) => (/[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(",")), "");
    }
    const url = URL.createObjectURL(new Blob([out.join("\n")], { type: "text/csv" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: `scrb-board-${new Date().toISOString().slice(0, 10)}.csv` });
    a.click();
    URL.revokeObjectURL(url);
  };

  const deleteSession = (id: string) => {
    updateSessions((prev) => prev.filter((s) => s.id !== id));
    if (activeId === id) setActiveId(null);
  };

  return (
    <div className="flex h-screen flex-col bg-paper text-ink print:h-auto">
      <header className="flex items-center gap-3 border-b border-line bg-surface px-4 py-2.5 print:hidden">
        <Link href="/dashboard" className="flex items-center gap-1.5 rounded px-2 py-1 text-[13px] text-muted hover:bg-surface-2 hover:text-navy">
          <ArrowLeft size={15} /> Back to portal
        </Link>
        <span className="h-5 w-px bg-line" />
        <Image src={`${BASE_PATH}/karnataka-state-police.png`} alt="" width={26} height={26} className="h-[26px] w-[26px] object-contain" />
        <h1 className="text-[15px] font-semibold text-navy">Agent Workspace</h1>
        <span className="text-[12px] text-muted">SCRB · ask a question, get the chart</span>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-[210px_minmax(0,1fr)_280px] 2xl:grid-cols-[240px_minmax(0,1fr)_340px] print:block">
        {/* Sessions */}
        <aside className="flex min-h-0 flex-col border-r border-line bg-surface print:hidden">
          <div className="p-3">
            <button type="button" onClick={() => { setActiveId(null); setInput(""); }}
              className="flex w-full items-center justify-center gap-1.5 rounded-md border border-line bg-surface px-3 py-2 text-[13px] font-medium text-navy hover:border-navy">
              <Plus size={15} /> New session
            </button>
          </div>
          <p className="px-4 pb-1 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted">Sessions</p>
          <ul className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
            {sessions.length === 0 && <li className="px-2 py-1 text-[12px] text-muted">Your questions will appear here.</li>}
            {sessions.map((s) => (
              <li key={s.id} className="group flex items-center">
                <button type="button" onClick={() => setActiveId(s.id)}
                  className={`min-w-0 flex-1 truncate rounded px-2 py-1.5 text-left text-[12.5px] ${s.id === activeId ? "bg-navy/10 font-medium text-navy" : "text-ink hover:bg-surface-2"}`}>
                  {s.title}
                </button>
                <button type="button" onClick={() => deleteSession(s.id)} aria-label="Delete session"
                  className="rounded p-1 text-muted opacity-0 hover:text-danger focus:opacity-100 group-hover:opacity-100">
                  <Trash2 size={13} />
                </button>
              </li>
            ))}
          </ul>
        </aside>

        {/* Conversation */}
        <main id="main-content" className="flex min-h-0 flex-col print:hidden">
          <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            {!active ? (
              <div className="mx-auto max-w-2xl pt-10">
                <Sparkles className="text-navy" size={26} />
                <h2 className="mt-3 text-[22px] font-semibold text-ink">What do you want to know?</h2>
                <p className="mt-1 text-[13.5px] leading-relaxed text-muted">
                  Ask in plain language. The agent looks the answer up with read-only tools and draws each chart from the data
                  itself — it never writes the numbers. Every result says whether it is real Karnataka State Police data or the
                  app&apos;s demo case records, and shows how it was made.
                </p>
                {context && <p className="mt-3 text-[12.5px] text-muted">Opened from: <span className="text-ink">{context}</span></p>}
                <div className="mt-6 grid gap-2 sm:grid-cols-2">
                  {SUGGESTIONS.map((s) => (
                    <button key={s} type="button" onClick={() => ask(s)} disabled={busy}
                      className="rounded-md border border-line bg-surface px-3 py-2.5 text-left text-[13px] text-ink hover:border-navy disabled:opacity-60">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mx-auto max-w-5xl space-y-8">
                {active.turns.map((t) => (
                  <TurnView key={t.id} turn={t} pinned={pinned} onTogglePin={togglePin} />
                ))}
              </div>
            )}
          </div>

          <form onSubmit={(e) => { e.preventDefault(); ask(input); }} className="border-t border-line bg-surface px-6 py-3">
            <div className="mx-auto flex max-w-5xl items-end gap-2 rounded-lg border border-line-strong bg-surface px-3 py-2 focus-within:border-navy">
              <textarea value={input} onChange={(e) => setInput(e.target.value)} rows={1} maxLength={600}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(input); } }}
                placeholder={active ? "Ask a follow-up…" : "e.g. Which districts are rising fastest?"}
                aria-label="Ask the agent"
                className="max-h-32 min-h-[24px] flex-1 resize-none bg-transparent text-[14px] text-ink outline-none placeholder:text-muted" />
              <button type="submit" disabled={busy || !input.trim()} aria-label="Ask"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-navy text-white disabled:opacity-40">
                {busy ? <Loader2 size={16} className="animate-spin" /> : <ArrowUp size={16} />}
              </button>
            </div>
            <p className="mx-auto mt-1.5 max-w-5xl text-[11px] text-muted">Read-only. The agent can look up and chart data; it can&apos;t change any record.</p>
          </form>
        </main>

        {/* Board */}
        <aside className="flex min-h-0 flex-col border-l border-line bg-surface-2/60 print:border-0 print:bg-white">
          <div className="flex items-center gap-2 border-b border-line px-4 py-3">
            <h2 className="flex-1 text-[13px] font-semibold text-ink">Pinned board <span className="font-normal text-muted">({board.length})</span></h2>
            <button type="button" onClick={exportCsv} disabled={!board.length} title="Download pinned data as CSV"
              className="flex items-center gap-1 rounded px-2 py-1 text-[12px] text-muted hover:text-navy disabled:opacity-40 print:hidden"><Download size={13} /> CSV</button>
            <button type="button" onClick={() => window.print()} disabled={!board.length} title="Print or save as PDF"
              className="flex items-center gap-1 rounded px-2 py-1 text-[12px] text-muted hover:text-navy disabled:opacity-40 print:hidden"><Printer size={13} /> PDF</button>
          </div>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
            {board.length === 0 ? (
              <p className="px-1 text-[12px] leading-relaxed text-muted">Pin any result with the pin icon to build a board for your report. Pinned items stay here across sessions on this device.</p>
            ) : board.map((b) => (
              <div key={b.id} className="relative">
                <BlockCard block={b} pinned onTogglePin={() => togglePin(b)} compact />
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

function TurnView({ turn, pinned, onTogglePin }: { turn: Turn; pinned: (b: Block) => boolean; onTogglePin: (b: Block) => void }) {
  const running = turn.status === "running";
  const [stepsOpen, setStepsOpen] = useState(true);
  useEffect(() => { if (!running) setStepsOpen(false); }, [running]);
  const wide = (b: Block) => b.kind === "hotspotMap" || b.kind === "table" || b.kind === "line";

  return (
    <article>
      <div className="flex justify-end">
        <p className="max-w-[80%] rounded-lg bg-navy px-3.5 py-2 text-[14px] text-white">{turn.question}</p>
      </div>

      <div className="mt-3">
        <button type="button" onClick={() => setStepsOpen((v) => !v)} className="flex items-center gap-1.5 text-[12px] text-muted hover:text-navy" aria-expanded={stepsOpen}>
          {running ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} className="text-success" />}
          {running ? turn.steps[turn.steps.length - 1] ?? "Working…" : `${turn.steps.length} step${turn.steps.length === 1 ? "" : "s"}`}
        </button>
        {stepsOpen && turn.steps.length > 0 && (
          <ol className="mt-1.5 space-y-0.5 border-l border-line pl-3 text-[12px] text-muted">
            {turn.steps.map((s, i) => <li key={i}>{s}</li>)}
          </ol>
        )}
      </div>

      {/* Side by side only when each card gets at least 340px - the middle
          column's width depends on the window, not the viewport breakpoints. */}
      {turn.blocks.length > 0 && (
        <div className="mt-4 grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(340px,1fr))]">
          {turn.blocks.map((b) => (
            <div key={b.id} className={wide(b) ? "col-span-full" : ""}>
              <BlockCard block={b} pinned={pinned(b)} onTogglePin={() => onTogglePin(b)} />
            </div>
          ))}
        </div>
      )}

      {turn.answer && (
        <div className="mt-4 rounded-lg border border-line bg-surface px-4 py-3">
          <p className="text-[14px] leading-relaxed text-ink">{turn.answer}</p>
          {turn.unverified.length === 0 ? (
            <p className="mt-2 flex items-center gap-1 text-[11.5px] text-success"><Check size={12} /> Every figure in this answer matches the tool results above.</p>
          ) : (
            <p className="mt-2 flex items-start gap-1 text-[11.5px] text-warning">
              <CircleAlert size={12} className="mt-0.5 shrink-0" /> These figures don&apos;t appear in the tool results; check them against the charts: {turn.unverified.join(", ")}
            </p>
          )}
        </div>
      )}
      {turn.error && (
        <p className="mt-3 flex items-start gap-1.5 rounded-md border border-danger bg-danger-bg px-3 py-2 text-[12.5px] text-danger">
          <X size={14} className="mt-0.5 shrink-0" /> {turn.error}
        </p>
      )}
    </article>
  );
}
