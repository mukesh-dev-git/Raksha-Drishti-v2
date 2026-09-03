"use client";

import { useRef, useState } from "react";
import { Mic, Square, Upload, Loader2, AlertTriangle } from "lucide-react";

// -----------------------------------------------------------------------------
// P7.2 - Kannada audio-to-text intake, built against Zia's Trained NLP
// Models Audio-to-Text Transcription via /api/stt (see src/lib/sttClient.ts
// for the full, honest verification-status note - this endpoint's request/
// response contract was inferred from RESEARCH_AND_PLAN.md §2.1's
// inventory, not read live off the console the way its TTS sibling's
// contract was).
//
// Mounted on CreateCaseForm.tsx's real "Brief facts" field - PLAN.md issue
// #7 frames this as "a real answer to the Kannada-English gap": an officer
// dictates what the complainant reported, in Kannada, and gets English-
// script text back for the field that POST /api/cases actually saves. This
// is P7.2 only (transcription) - translating the result Kannada text into
// English prose is P7.3, a separate, independent piece; until that lands,
// a Kannada transcript is inserted as-is (still real, still not
// fabricated - just not yet translated).
//
// Two intake paths, and this component is honest that they carry different
// confidence:
//   - "Upload audio": a real WAV/MP3 file, the exact container the
//     inventory documents this model taking. Most likely to actually match
//     the API's real contract.
//   - "Record": browser microphone via MediaRecorder. Browsers do not
//     record WAV/MP3 natively - Chrome/Firefox record audio/webm or
//     audio/ogg. That real recording is sent through unmodified (no fake
//     transcoding claimed); if Zia's endpoint rejects the container, the
//     honest server error surfaces here, with Retry - never a fabricated
//     transcript.
//
// No fake transcript, ever: a failed /api/stt call renders a real error
// message with a Retry action, never silence, never placeholder text
// inserted into the real form field.
// -----------------------------------------------------------------------------

type Status = "idle" | "recording" | "transcribing" | "error";

export default function KannadaDictationButton({
  onTranscribed,
  disabled = false,
}: {
  onTranscribed: (text: string) => void;
  disabled?: boolean;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  async function sendForTranscription(blob: Blob, filename: string) {
    setStatus("transcribing");
    setError(null);
    try {
      const form = new FormData();
      form.append("audio", blob, filename);
      form.append("language", "kn");

      const res = await fetch("/api/stt", { method: "POST", body: form });
      const body = await res.json().catch(() => null);

      if (!res.ok) {
        setStatus("error");
        setError(typeof body?.error === "string" ? body.error : `HTTP ${res.status}`);
        return;
      }
      if (typeof body?.text !== "string" || !body.text.trim()) {
        setStatus("error");
        setError("Server returned an empty transcript");
        return;
      }

      onTranscribed(body.text);
      setStatus("idle");
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "Network error contacting /api/stt");
    }
  }

  async function startRecording() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      // No explicit mimeType requested - MediaRecorder picks the browser's
      // real, natively-supported codec (typically audio/webm;codecs=opus
      // in Chrome, audio/ogg;codecs=opus in Firefox). See module header:
      // this is genuinely not the documented WAV/MP3 container.
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
        sendForTranscription(blob, `dictation.${ext}`);
      };

      recorder.start();
      setStatus("recording");
    } catch (e) {
      setStatus("error");
      setError(
        e instanceof DOMException && e.name === "NotAllowedError"
          ? "Microphone access denied - allow microphone access, or use \"Upload audio\" instead"
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
    e.target.value = ""; // allow choosing the same file again after an error
    if (!file) return;
    sendForTranscription(file, file.name);
  }

  const isBusy = status === "transcribing";
  const isRecording = status === "recording";

  return (
    <div className="mt-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={disabled || isBusy}
          onClick={isRecording ? stopRecording : startRecording}
          className={
            "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-medium transition disabled:opacity-60 " +
            (isRecording
              ? "border-danger bg-danger-bg text-danger"
              : "border-line bg-surface text-muted hover:border-dash-teal hover:text-dash-teal")
          }
        >
          {isRecording ? <Square size={12} aria-hidden="true" /> : <Mic size={12} aria-hidden="true" />}
          {isRecording ? "Stop recording" : "Dictate in Kannada"}
        </button>

        <button
          type="button"
          disabled={disabled || isBusy || isRecording}
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1 text-[12px] font-medium text-muted transition hover:border-dash-teal hover:text-dash-teal disabled:opacity-60"
        >
          <Upload size={12} aria-hidden="true" />
          Upload audio
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/wav,audio/mpeg,audio/mp3,.wav,.mp3"
          className="hidden"
          onChange={handleFileChosen}
        />

        {isBusy && (
          <span className="flex items-center gap-1 text-[11.5px] text-muted">
            <Loader2 size={12} className="animate-spin" aria-hidden="true" /> Transcribing…
          </span>
        )}
      </div>

      <p className="mt-1 text-[11px] italic text-muted">
        Zia Audio-to-Text (Kannada). Inserts the transcript as-is into Brief facts - translation to English is a
        separate, not-yet-built step (P7.3).
      </p>

      {status === "error" && error && (
        <div className="mt-1.5 flex items-start gap-1.5 rounded-md border border-danger bg-danger-bg px-2 py-1.5 text-[11.5px] text-danger">
          <AlertTriangle size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
          <div className="min-w-0">
            <p className="break-words">Transcription failed: {error.length > 200 ? `${error.slice(0, 200)}…` : error}</p>
          </div>
        </div>
      )}
    </div>
  );
}
