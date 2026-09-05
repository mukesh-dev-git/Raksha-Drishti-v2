"use client";

import { useState } from "react";
import { Languages, Loader2, AlertTriangle } from "lucide-react";

// -----------------------------------------------------------------------------
// P7.3 - Kannada <-> English translation, built against Zia's Trained NLP
// Models Text Translation via /api/translate (see src/lib/translateClient.ts
// for the full, honest verification-status note - unlike its P7.1/P7.2
// siblings, this endpoint's exact field-name contract resisted live
// discovery: ~40 request variants tried, all rejected, with no combination
// reaching a real 200). Calling this button today is expected to surface a
// real, honest error until the Catalyst console's own API Details tab
// resolves the field names - never a fabricated translation.
//
// Generic/reusable rather than hardcoded to one field, so both real
// integration points issue #7 names can share it:
//   - CreateCaseForm's Brief facts (kn -> en): closes the loop with P7.2's
//     Kannada dictation - an officer dictates in Kannada, then translates
//     the same field to English before submitting the real FIR.
//   - Witness statement text on the case-detail page (en -> kn): the seed
//     data's only source language, translated the other direction as a
//     genuine exercise of the same real API on real case text.
// -----------------------------------------------------------------------------

type Status = "idle" | "loading" | "error";

export default function TranslateButton({
  text,
  sourceLanguage,
  targetLanguage,
  onTranslated,
  label,
  disabled = false,
}: {
  text: string;
  sourceLanguage: "kn" | "en";
  targetLanguage: "kn" | "en";
  onTranslated: (translatedText: string) => void;
  label?: string;
  disabled?: boolean;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  async function translate() {
    if (!text.trim()) {
      setStatus("error");
      setError("Nothing to translate yet");
      return;
    }
    setStatus("loading");
    setError(null);
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, sourceLanguage, targetLanguage }),
      });
      const body = await res.json().catch(() => null);

      if (!res.ok) {
        setStatus("error");
        setError(typeof body?.error === "string" ? body.error : `HTTP ${res.status}`);
        return;
      }
      if (typeof body?.translatedText !== "string" || !body.translatedText.trim()) {
        setStatus("error");
        setError("Server returned an empty translation");
        return;
      }

      onTranslated(body.translatedText);
      setStatus("idle");
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "Network error contacting /api/translate");
    }
  }

  const isBusy = status === "loading";

  return (
    <div className="inline-block">
      <button
        type="button"
        disabled={disabled || isBusy}
        onClick={translate}
        className="flex items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1 text-[12px] font-medium text-muted transition hover:border-dash-teal hover:text-dash-teal disabled:opacity-60"
      >
        {isBusy ? <Loader2 size={12} className="animate-spin" aria-hidden="true" /> : <Languages size={12} aria-hidden="true" />}
        {label ?? `Translate to ${targetLanguage === "en" ? "English" : "Kannada"}`}
      </button>

      {status === "error" && error && (
        <div className="mt-1.5 flex items-start gap-1.5 rounded-md border border-danger bg-danger-bg px-2 py-1.5 text-[11.5px] text-danger">
          <AlertTriangle size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
          <p className="min-w-0 break-words">Translation failed: {error.length > 200 ? `${error.slice(0, 200)}…` : error}</p>
        </div>
      )}
    </div>
  );
}
