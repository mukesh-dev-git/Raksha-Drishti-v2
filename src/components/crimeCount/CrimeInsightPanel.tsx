"use client";

import { useState } from "react";
import { Sparkles, RotateCw } from "lucide-react";

// -----------------------------------------------------------------------------
// P5.7 (2026-09-03) - shared between /crime-count and /crime-hotspots.
// User-triggered, not auto-loaded - a GLM call is genuinely slow (8-45s,
// same latency this app has documented since P5.1) and this app doesn't
// force every visitor to wait for one just to see the page.
//
// HONESTY LABEL, always visible, not just on first load: this is a live AI
// narrative over real numbers, not a verified finding - no citation
// guardrail applies to prose the way it does for askTools.ts's structured
// answers. Regenerating can produce a differently-worded (occasionally
// differently-emphasized) summary of the same real facts - stated plainly
// so it's never mistaken for a fixed, authoritative number.
// -----------------------------------------------------------------------------
export default function CrimeInsightPanel() {
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [requested, setRequested] = useState(false);

  async function generate() {
    setLoading(true);
    setError(null);
    setRequested(true);
    try {
      const res = await fetch("/api/crime-insight");
      const data: { ok: boolean; text?: string; error?: string } = await res.json();
      if (data.ok && data.text) {
        setText(data.text);
      } else {
        setError(data.error ?? "unknown error");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-line bg-surface p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-dash-purple" aria-hidden="true" />
          <p className="text-[15px] font-semibold text-ink">AI Insight</p>
        </div>
        <button
          type="button"
          onClick={generate}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-sm border border-line px-3 py-1.5 text-[12.5px] font-medium text-ink hover:border-navy disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RotateCw size={12} className={loading ? "animate-spin" : ""} aria-hidden="true" />
          {loading ? "Generating…" : requested ? "Regenerate" : "Generate insight"}
        </button>
      </div>

      {!requested && (
        <p className="mt-2 text-xs text-muted">
          A live GLM-4.7-Flash narrative reasoning over the real numbers on this page — generated on demand
          (not baked in), so it&apos;s never stale. Takes 10–30 seconds; not a verified, citation-checked finding
          like the case-level AI features elsewhere in this app — treat it as a starting read, not ground truth.
        </p>
      )}

      {loading && <p className="mt-3 text-[13px] text-muted">Reasoning over the real statewide/district numbers…</p>}

      {!loading && text && (
        <div className="mt-3 rounded-lg border border-line bg-surface-2 p-4">
          <p className="text-[13.5px] leading-relaxed text-ink">{text}</p>
          <p className="mt-2.5 text-[10.5px] uppercase tracking-wide text-muted">
            AI-generated narrative — GLM-4.7-Flash, real numbers only, not a verified finding
          </p>
        </div>
      )}

      {!loading && error && (
        <p className="mt-3 text-[13px] text-danger">
          Live insight unavailable ({error}). Shown honestly, not a fabricated summary.
        </p>
      )}
    </div>
  );
}
