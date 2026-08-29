"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Sparkles, X, Send, Loader2 } from "lucide-react";

// -----------------------------------------------------------------------------
// P5.8 - "Ask Anything": a persistent, site-wide floating Q&A widget. Calls
// the real GLM-4.7-Flash tool-calling agent at POST /api/ask
// (src/app/api/ask/route.ts) - never invents an answer client-side.
//
// Every case/person the answer relies on comes back as a `citations[]`
// entry with a real, already-validated href (route.ts checked it against
// getRealCaseIds()/getRealPersonIds() before it ever reached this
// component) - rendered as an actual <Link>, not text, per P5.8's "standout
// requirement": a clickable real link, not just a name/number in prose.
//
// LATENCY IS REAL, not a bug to hide: the route can make up to 3 sequential
// GLM calls (RESEARCH_AND_PLAN.md §2.2's own vendor sample is ~9s per call
// for a couple hundred tokens) - so this shows an honest, indefinite loading
// state ("Looking through the case files...") rather than a fast spinner
// that implies something's wrong when it takes 10-30s.
// -----------------------------------------------------------------------------

type Citation = { type: "case" | "person"; id: number | string; label: string; href: string };
type Turn = {
  question: string;
  answer: string;
  citations: Citation[];
  droppedHallucinated?: number;
  error?: string;
};

const STARTER_PROMPTS = ["Which cases involve a repeat offender?", "Any patterns across districts?", "Cases in Ballari?"];

export default function AskAnything() {
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [turns, pending]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  async function ask(question: string) {
    const q = question.trim();
    if (!q || pending) return;
    setInput("");
    setPending(true);

    const history = turns.filter((t) => !t.error).slice(-4).map((t) => ({ question: t.question, answer: t.answer }));

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: q, history }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        throw new Error(data?.error || `Request failed (${res.status})`);
      }
      setTurns((prev) => [...prev, { question: q, answer: data.answer, citations: Array.isArray(data.citations) ? data.citations : [], droppedHallucinated: data.droppedHallucinated }]);
    } catch (e) {
      setTurns((prev) => [...prev, { question: q, answer: "", citations: [], error: e instanceof Error ? e.message : String(e) }]);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
      {open && (
        <div className="flex h-[min(600px,75vh)] w-[min(380px,92vw)] flex-col overflow-hidden rounded-lg border border-line bg-surface shadow-md">
          <div className="flex items-center justify-between gap-2 border-b border-line bg-navy px-4 py-3">
            <div className="flex items-center gap-2 text-navy-ink">
              <Sparkles size={16} aria-hidden="true" />
              <div>
                <p className="text-[13px] font-semibold leading-tight">Ask Anything</p>
                <p className="text-[11px] leading-tight text-navy-ink opacity-80">Grounded in the real case register</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-sm p-1 text-navy-ink hover:bg-navy-hover"
              aria-label="Close Ask Anything"
            >
              <X size={16} />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
            {turns.length === 0 && (
              <div className="space-y-3">
                <p className="text-[12.5px] text-muted">
                  Ask about any real case, person, district, or pattern in the seeded register - e.g. FIR status, repeat offenders, or MO
                  clusters. Every case or person mentioned comes with a real link.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {STARTER_PROMPTS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => ask(p)}
                      className="rounded-full border border-line bg-surface-2 px-2.5 py-1 text-[11.5px] text-ink hover:border-navy"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {turns.map((t, i) => (
              <div key={i} className="space-y-2">
                <div className="ml-auto max-w-[85%] rounded-lg rounded-br-sm bg-navy px-3 py-2 text-[12.5px] text-navy-ink">{t.question}</div>
                {t.error ? (
                  <div className="max-w-[85%] rounded-lg rounded-bl-sm border border-danger bg-danger-bg px-3 py-2 text-[12.5px] text-danger">
                    Couldn&apos;t get an answer: {t.error}
                  </div>
                ) : (
                  <div className="max-w-[90%] space-y-2 rounded-lg rounded-bl-sm border border-line bg-surface-2 px-3 py-2 text-[12.5px] text-ink">
                    <p className="whitespace-pre-wrap">{t.answer}</p>
                    {t.citations.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 border-t border-line pt-2">
                        {t.citations.map((c, ci) => (
                          <Link
                            key={`${c.type}-${c.id}-${ci}`}
                            href={c.href}
                            className="rounded-full border border-navy bg-surface px-2 py-0.5 text-[11px] font-medium text-navy hover:bg-navy hover:text-navy-ink"
                          >
                            {c.type === "case" ? `Case ${c.id}` : c.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {pending && (
              <div className="flex max-w-[85%] items-center gap-2 rounded-lg rounded-bl-sm border border-line bg-surface-2 px-3 py-2 text-[12.5px] text-muted">
                <Loader2 size={13} className="animate-spin" aria-hidden="true" />
                Looking through the case files - this can take up to a minute.
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              ask(input);
            }}
            className="flex items-center gap-2 border-t border-line bg-surface px-3 py-2.5"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about a case, person, or district..."
              disabled={pending}
              maxLength={500}
              className="min-w-0 flex-1 rounded-sm border border-line bg-surface px-2.5 py-1.5 text-[12.5px] text-ink placeholder:text-muted disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={pending || !input.trim()}
              className="flex items-center justify-center rounded-sm bg-navy p-1.5 text-navy-ink hover:bg-navy-hover disabled:opacity-40"
              aria-label="Send question"
            >
              {pending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full bg-navy px-4 py-3 text-navy-ink shadow-md hover:bg-navy-hover"
        aria-expanded={open}
        aria-label={open ? "Close Ask Anything" : "Open Ask Anything"}
      >
        {open ? <X size={18} /> : <Sparkles size={18} />}
        {!open && <span className="text-[13px] font-medium">Ask Anything</span>}
      </button>
    </div>
  );
}
