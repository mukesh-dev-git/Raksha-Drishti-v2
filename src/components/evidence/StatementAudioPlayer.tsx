"use client";

import { useEffect, useRef, useState } from "react";
import { Volume2, Loader2, AlertTriangle, Pause, Play } from "lucide-react";

// -----------------------------------------------------------------------------
// P7.1 - self-contained audio-player control for one witness statement, built
// against Zia's Trained NLP Models Text-to-Audio Synthesis via /api/tts (see
// src/lib/ttsClient.ts for the full, honest verification-status note - this
// endpoint's exact request/response contract was inferred by analogy with
// its two confirmed sibling endpoints, not read live off the console).
//
// Deliberately a standalone component, not a CrossSourceTimeline addition -
// see PLAN.md P7.1 / the task brief: another concurrent change may be
// touching timeline/evidence-adjacent files, so this mounts on the
// case-detail page instead (src/app/(site)/cases/[caseId]/page.tsx), one
// card per witness statement.
//
// No fake audio, ever: a failed /api/tts call renders a real error message
// with a Retry action, never silence, never a canned clip, never a
// synthetic success.
//
// The seeded statementText is English prose - there is no Kannada-source
// field in WitnessStatements.json (see src/lib/witnessStatements.ts's module
// comment). The language toggle below is honest about that: "English text"
// plays the real statement as written; "Kannada voice" is explicitly labeled
// as a synthesis demo of the Kannada-capable voice model on this same text,
// not a translation of it.
// -----------------------------------------------------------------------------

type Voice = "Suresh" | "Chetan" | "Anu" | "Vidya";
const VOICES: { id: Voice; label: string }[] = [
  { id: "Vidya", label: "Vidya" },
  { id: "Anu", label: "Anu" },
  { id: "Suresh", label: "Suresh" },
  { id: "Chetan", label: "Chetan" },
];

type Status = "idle" | "loading" | "ready" | "playing" | "error";

export default function StatementAudioPlayer({
  statementId,
  text,
  className = "",
}: {
  statementId: string;
  text: string;
  className?: string;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [voice, setVoice] = useState<Voice>("Vidya");
  const [language, setLanguage] = useState<"en" | "kn">("en");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  // Revoke any object URL we created, on unmount or before creating the next one.
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  async function synthesizeAndPlay() {
    setStatus("loading");
    setError(null);

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }

    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voice, language }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        setStatus("error");
        setError(typeof body?.error === "string" ? body.error : `HTTP ${res.status}`);
        return;
      }

      const blob = await res.blob();
      if (!blob.size) {
        setStatus("error");
        setError("Server returned an empty audio response");
        return;
      }

      const url = URL.createObjectURL(blob);
      objectUrlRef.current = url;
      if (audioRef.current) {
        audioRef.current.src = url;
        await audioRef.current.play().catch((e) => {
          // Autoplay can be blocked by the browser - not a synthesis
          // failure, so land on "ready" (controls visible) rather than
          // "error" (which would wrongly blame the TTS call).
          console.warn("[StatementAudioPlayer] autoplay blocked", e);
        });
      }
      setStatus("playing");
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "Network error contacting /api/tts");
    }
  }

  function togglePlayPause() {
    const el = audioRef.current;
    if (!el || !el.src) {
      synthesizeAndPlay();
      return;
    }
    if (el.paused) {
      el.play();
      setStatus("playing");
    } else {
      el.pause();
      setStatus("ready");
    }
  }

  const isBusy = status === "loading";

  return (
    <div className={`rounded-lg border border-line bg-surface-2/40 p-3 ${className}`}>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={togglePlayPause}
          disabled={isBusy}
          aria-label={status === "playing" ? "Pause statement audio" : "Play statement audio"}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-dash-teal text-white transition hover:opacity-90 disabled:opacity-60"
        >
          {isBusy ? (
            <Loader2 size={15} className="animate-spin" aria-hidden="true" />
          ) : status === "playing" ? (
            <Pause size={14} aria-hidden="true" />
          ) : (
            <Play size={14} aria-hidden="true" />
          )}
        </button>

        <span className="flex items-center gap-1 text-[11.5px] font-medium text-muted">
          <Volume2 size={13} aria-hidden="true" /> Zia Text-to-Audio
        </span>

        <div className="ml-auto flex items-center gap-1">
          <LanguageToggle value={language} onChange={setLanguage} disabled={isBusy} />
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span className="text-[10.5px] uppercase tracking-[0.08em] text-muted/80">Voice</span>
        {VOICES.map((v) => (
          <button
            key={v.id}
            type="button"
            disabled={isBusy}
            onClick={() => setVoice(v.id)}
            className={
              "rounded-full border px-2 py-0.5 text-[11px] font-medium transition disabled:opacity-60 " +
              (voice === v.id
                ? "border-dash-teal bg-dash-teal-bg text-dash-teal"
                : "border-line bg-surface text-muted hover:border-dash-teal")
            }
          >
            {v.label}
          </button>
        ))}
      </div>

      {language === "kn" && (
        <p className="mt-2 text-[11px] italic text-muted">
          Demo of the Kannada-capable voice model on this statement&apos;s text - the seed data has no
          Kannada-source field, so this is not a translation.
        </p>
      )}

      {status === "error" && error && (
        <div className="mt-2 flex items-start gap-1.5 rounded-md border border-danger bg-danger-bg px-2 py-1.5 text-[11.5px] text-danger">
          <AlertTriangle size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
          <div className="min-w-0">
            <p className="break-words">Audio synthesis failed: {error}</p>
            <button type="button" onClick={synthesizeAndPlay} className="mt-1 font-semibold underline underline-offset-2">
              Retry
            </button>
          </div>
        </div>
      )}

      <audio
        ref={audioRef}
        onEnded={() => setStatus("ready")}
        onPause={() => setStatus((s) => (s === "playing" ? "ready" : s))}
        className="hidden"
        data-statement-id={statementId}
      />
    </div>
  );
}

function LanguageToggle({
  value,
  onChange,
  disabled,
}: {
  value: "en" | "kn";
  onChange: (v: "en" | "kn") => void;
  disabled: boolean;
}) {
  const options: { id: "en" | "kn"; label: string }[] = [
    { id: "en", label: "English text" },
    { id: "kn", label: "Kannada voice" },
  ];
  return (
    <div className="flex overflow-hidden rounded-full border border-line text-[11px] font-medium">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          disabled={disabled}
          onClick={() => onChange(o.id)}
          className={
            "px-2 py-0.5 transition disabled:opacity-60 " +
            (value === o.id ? "bg-dash-teal text-white" : "bg-surface text-muted hover:bg-surface-2")
          }
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
