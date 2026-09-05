"use client";

import { useRef, useState } from "react";
import { Sparkles, Mic, Square, Upload, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";

// -----------------------------------------------------------------------------
// P7.4 - "wire it together": one action that runs the full Kannada intake
// pipeline (transcribe -> translate -> summarize, src/lib/
// kannadaIntakePipeline.ts via /api/kannada-intake) against one recording
// and shows every real stage result, not just a final answer. This
// complements, not replaces, KannadaDictationButton (raw transcript only)
// and TranslateButton (translate whatever's already in the field) - those
// stay useful for manual control; this is the single-action version the
// issue's "one pipeline" framing describes.
//
// Honesty contract, mirrored from every P7.x component so far: no stage's
// output is ever fabricated. Transcription (P7.2) is confirmed working
// live; translation (P7.3) is NOT (see translateClient.ts) - if it fails,
// the summary is still produced from the RAW Kannada transcript and
// labeled "not translated" rather than silently claiming an English
// summary that never went through a real translation step. "Insert into
// Brief facts" is only offered when a real summary exists.
// -----------------------------------------------------------------------------

type StageResult<T> = { ok: true; value: T } | { ok: false; error: string };
type PipelineResponse = {
  transcript: StageResult<string>;
  translation: StageResult<string> | null;
  summary: StageResult<string> | null;
  usedTranslation: boolean;
};

type Status = "idle" | "recording" | "processing" | "done" | "error";

export default function KannadaIntakePipelineButton({ onSummaryAccepted }: { onSummaryAccepted: (summary: string) => void }) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PipelineResponse | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  async function runPipeline(blob: Blob, filename: string) {
    setStatus("processing");
    setError(null);
    setResult(null);
    try {
      const form = new FormData();
      form.append("audio", blob, filename);

      const res = await fetch("/api/kannada-intake", { method: "POST", body: form });
      const body = await res.json().catch(() => null);

      if (!res.ok || !body) {
        setStatus("error");
        setError(typeof body?.transcript?.error === "string" ? body.transcript.error : `HTTP ${res.status}`);
        return;
      }

      setResult(body as PipelineResponse);
      setStatus("done");
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "Network error contacting /api/kannada-intake");
    }
  }

  async function startRecording() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stopStream();
        const mimeType = recorder.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const ext = mimeType.includes("ogg") ? "ogg" : mimeType.includes("wav") ? "wav" : "webm";
        runPipeline(blob, `dictation.${ext}`);
      };
      recorder.start();
      setStatus("recording");
    } catch (e) {
      setStatus("error");
      setError(
        e instanceof DOMException && e.name === "NotAllowedError"
          ? 'Microphone access denied - allow microphone access, or use "Upload audio" instead'
          : e instanceof Error
            ? e.message
            : "Could not access the microphone"
      );
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
  }

  function handleFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    runPipeline(file, file.name);
  }

  const isBusy = status === "processing";
  const isRecording = status === "recording";

  return (
    <div className="rounded-lg border border-line bg-surface-2 p-3">
      <p className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold text-ink">
        <Sparkles size={13} className="text-dash-teal" aria-hidden="true" /> Dictate &amp; summarize (Kannada)
      </p>
      <p className="mb-2 text-[11px] text-muted">
        One action: transcribe your spoken Kannada, translate it to English, then have GLM turn it into a clean
        summary you can drop into Brief facts.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={isBusy}
          onClick={isRecording ? stopRecording : startRecording}
          className={
            "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-medium transition disabled:opacity-60 " +
            (isRecording ? "border-danger bg-danger-bg text-danger" : "border-line bg-surface text-muted hover:border-dash-teal hover:text-dash-teal")
          }
        >
          {isRecording ? <Square size={12} aria-hidden="true" /> : <Mic size={12} aria-hidden="true" />}
          {isRecording ? "Stop recording" : "Record"}
        </button>
        <button
          type="button"
          disabled={isBusy || isRecording}
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1 text-[12px] font-medium text-muted transition hover:border-dash-teal hover:text-dash-teal disabled:opacity-60"
        >
          <Upload size={12} aria-hidden="true" />
          Upload audio
        </button>
        <input ref={fileInputRef} type="file" accept="audio/wav,audio/mpeg,audio/mp3,.wav,.mp3" className="hidden" onChange={handleFileChosen} />
        {isBusy && (
          <span className="flex items-center gap-1 text-[11.5px] text-muted">
            <Loader2 size={12} className="animate-spin" aria-hidden="true" /> Running pipeline…
          </span>
        )}
      </div>

      {status === "error" && error && (
        <div className="mt-2 flex items-start gap-1.5 rounded-md border border-danger bg-danger-bg px-2 py-1.5 text-[11.5px] text-danger">
          <AlertTriangle size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
          <p className="min-w-0 break-words">{error.length > 200 ? `${error.slice(0, 200)}…` : error}</p>
        </div>
      )}

      {result && (
        <div className="mt-3 space-y-2">
          <PipelineStage label="1. Transcript (Kannada)" result={result.transcript} />
          <PipelineStage label="2. Translation (English)" result={result.translation} skippedNote="Not run - transcription failed." />
          <PipelineStage
            label="3. Summary"
            result={result.summary}
            skippedNote="Not run - transcription failed."
            extraNote={result.summary?.ok && !result.usedTranslation ? "Based on the raw Kannada transcript - translation failed, so this was not produced from English text." : undefined}
          />

          {result.summary?.ok && (
            <button
              type="button"
              onClick={() => onSummaryAccepted(result.summary!.ok ? result.summary!.value : "")}
              className="flex items-center gap-1.5 rounded-full border border-dash-teal bg-dash-teal-bg px-2.5 py-1 text-[12px] font-semibold text-dash-teal transition hover:opacity-90"
            >
              <CheckCircle2 size={13} aria-hidden="true" />
              Insert summary into Brief facts
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function PipelineStage({
  label,
  result,
  skippedNote,
  extraNote,
}: {
  label: string;
  result: StageResult<string> | null;
  skippedNote?: string;
  extraNote?: string;
}) {
  return (
    <div className="rounded-md border border-line bg-surface p-2">
      <p className="text-[10.5px] font-semibold uppercase tracking-wide text-muted">{label}</p>
      {result === null ? (
        <p className="mt-0.5 text-[12px] italic text-muted">{skippedNote ?? "Not run."}</p>
      ) : result.ok ? (
        <>
          <p className="mt-0.5 text-[13px] leading-relaxed text-ink">{result.value}</p>
          {extraNote && <p className="mt-1 text-[11px] italic text-muted">{extraNote}</p>}
        </>
      ) : (
        <p className="mt-0.5 flex items-start gap-1 text-[12px] text-danger">
          <AlertTriangle size={12} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>{result.error.length > 200 ? `${result.error.slice(0, 200)}…` : result.error}</span>
        </p>
      )}
    </div>
  );
}
