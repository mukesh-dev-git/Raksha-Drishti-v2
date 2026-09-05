// -----------------------------------------------------------------------------
// Server-side-only client for Zoho Catalyst QuickML's Zia "Trained NLP
// Models" Audio-to-Text Transcription (P7.2). Import this ONLY from Route
// Handlers / Server Components - same discipline as src/lib/llm.ts and
// src/lib/ttsClient.ts (P7.1), which this module deliberately mirrors: it
// reuses llm.ts's getAccessToken() (same OAuth app, same token cache, same
// `QuickML.deployment.READ` scope - RESEARCH_AND_PLAN.md §2.1 confirms all
// three Trained NLP Models share GLM's auth) instead of minting a second
// token.
//
// CONFIRMED CONTRACT (2026-09-03, discovered by live-probing the real API -
// this model has no console "API Details" tab entry the way GLM/TTS do, and
// the freshly-installed catalyst-zia skill's reference docs don't cover the
// Trained NLP Models capability at all, so a real live call was the only
// way to find this, exactly as ttsClient.ts's own history predicted it
// might go. The originally-guessed field name (`audio`) was WRONG - a real
// 404 from Zoho's own infra for that field name specifically, not a
// URL/auth/config problem; a GET probe against the same URL got a genuine
// `INVALID_METHOD` API error, proving the URL itself was always right):
//   POST https://api.catalyst.zoho.in/quickml/api/v1/models/zia/audio/transcribe
//   Headers: CATALYST-ORG, Authorization: Zoho-oauthtoken <token>
//   Body (multipart/form-data):
//     - file: the audio blob (confirmed live with a WAV file; MP3 support
//       is per RESEARCH_AND_PLAN.md's inventory, not independently
//       re-verified) - NOT "audio", the originally-guessed field name.
//     - language: REQUIRED, not optional - omitting it is a real 400
//       (`LESS_THAN_MIN_OCCURANCE`, "Error in processing `language`
//       parameter"). Both "kn" and "en" confirmed live.
//   Response: 200 JSON `{ status: "success", language, text,
//   processing_time_ms }` - `text` is the transcript field (one of this
//   module's original candidate guesses, confirmed correct); `transcript`/
//   `transcription`/`result`/`output` were never real, kept in
//   CANDIDATE_TEXT_FIELDS below only as defense-in-depth in case the
//   response shape ever changes.
// -----------------------------------------------------------------------------
import { getAccessToken } from "./llm";

const STT_URL = "https://api.catalyst.zoho.in/quickml/api/v1/models/zia/audio/transcribe";
const REQUEST_TIMEOUT_MS = 30_000;

export type SttLanguage = "kn" | "en";

export type SttResult =
  | { ok: true; text: string; raw: unknown }
  | { ok: false; status: number; error: string };

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`sttClient.ts: missing required env var ${name} - see .env.local, RESEARCH_AND_PLAN.md §2.1`);
  return v;
}

// The inventory doesn't name the JSON response field. Tried in this order
// against whatever the server actually returns - never invented, never
// defaulted to empty-string-as-success. If none of these keys are present,
// transcribeAudio() reports "unexpected response shape" rather than
// guessing further or returning a fabricated transcript.
const CANDIDATE_TEXT_FIELDS = ["text", "transcript", "transcription", "result", "output"] as const;

function extractTranscript(body: Record<string, unknown>): string | null {
  for (const key of CANDIDATE_TEXT_FIELDS) {
    const v = body[key];
    if (typeof v === "string" && v.trim().length > 0) return v;
  }
  return null;
}

/**
 * Calls Zia's Audio-to-Text Transcription model. Never throws for an
 * API-level failure (bad request, auth, timeout, unexpected shape) - always
 * returns `{ ok: false }` so callers (the /api/stt route) can show a real
 * error state instead of crashing or fabricating a transcript. Throws only
 * for missing configuration (requireEnv), a setup bug rather than a runtime
 * condition - same contract as callGlm() and synthesizeSpeech().
 *
 * `audio` is the raw recorded/uploaded bytes; `filename`/`mimeType` are
 * passed straight through as given by the browser (MediaRecorder or a file
 * <input>) - this module does not transcode or validate the audio
 * container. WAV is confirmed live (see module header); a browser
 * microphone recording is very often webm/opus or ogg instead (browsers do
 * not record WAV natively), so a live 4xx citing an unsupported format is
 * plausible and real, not a bug in this client - see
 * KannadaDictationButton.tsx's own note on the two supported intake paths
 * (record vs. upload a real WAV file).
 */
export async function transcribeAudio(
  audio: Blob,
  opts: { filename: string; mimeType: string; language?: SttLanguage } = { filename: "audio", mimeType: "audio/wav" }
): Promise<SttResult> {
  const orgId = requireEnv("QUICKML_ORG_ID");
  // REQUIRED by the real API (see module header) - always sent, never
  // omitted even when the caller doesn't specify one.
  const language = opts.language ?? "kn";

  let accessToken: string;
  try {
    accessToken = await getAccessToken();
  } catch (e) {
    console.error("[sttClient.ts] token acquisition failed", e);
    return { ok: false, status: 0, error: e instanceof Error ? e.message : "token acquisition failed" };
  }

  // Field names confirmed live 2026-09-03 (see module header) - "file", NOT
  // "audio" (the originally-guessed name, which got a real 404).
  const form = new FormData();
  form.append("file", audio, opts.filename);
  form.append("language", language);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(STT_URL, {
      method: "POST",
      headers: {
        // Same scheme confirmed for GLM and (separately) for the TTS
        // sibling model - not independently re-confirmed for this endpoint.
        Authorization: `Zoho-oauthtoken ${accessToken}`,
        "CATALYST-ORG": orgId,
        // No Content-Type set deliberately - fetch sets the correct
        // multipart/form-data boundary itself when the body is a FormData;
        // setting it manually here would drop the boundary parameter and
        // break the multipart body.
        Accept: "application/json",
      },
      body: form,
      signal: controller.signal,
    });
  } catch (e) {
    clearTimeout(timer);
    const timedOut = e instanceof Error && e.name === "AbortError";
    console.error("[sttClient.ts] request failed", { timedOut, error: e });
    return { ok: false, status: 0, error: timedOut ? "timeout" : e instanceof Error ? e.message : "network error" };
  }
  clearTimeout(timer);

  const rawText = await res.text();

  if (!res.ok) {
    // Same discipline as ttsClient.ts: never assume the documented
    // {code,message,details} error shape holds in practice, and detect a
    // raw HTML error page (edge/app-server 404/502, not the API's own
    // error format) rather than dumping it verbatim to a caller.
    let errMsg = rawText || `HTTP ${res.status} (empty body)`;
    try {
      const parsed = JSON.parse(rawText) as { code?: string; message?: string; details?: { reason?: string } };
      errMsg = parsed.message ?? parsed.code ?? errMsg;
    } catch {
      const looksLikeHtml = /^\s*<(!doctype|html)/i.test(rawText);
      errMsg = looksLikeHtml
        ? `HTTP ${res.status} ${res.statusText || ""}`.trim() + " (non-API error page, not the Zia service itself)"
        : rawText.slice(0, 300);
    }
    console.error("[sttClient.ts] Audio-to-Text call failed", { status: res.status, body: rawText.slice(0, 500) });
    return { ok: false, status: res.status, error: errMsg };
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    console.error("[sttClient.ts] Audio-to-Text returned non-JSON on a 200", rawText.slice(0, 500));
    return { ok: false, status: res.status, error: "non-JSON success response" };
  }

  const text = extractTranscript(parsed);
  if (text === null) {
    console.error("[sttClient.ts] Audio-to-Text 200 body didn't match any expected field", {
      keysSeen: Object.keys(parsed),
      bodyPreview: rawText.slice(0, 300),
    });
    return { ok: false, status: res.status, error: `unexpected response shape (keys: ${Object.keys(parsed).join(", ") || "none"}) - see server log` };
  }

  console.log("[sttClient.ts] Audio-to-Text call ok", { language, mimeType: opts.mimeType, audioBytes: audio.size, transcriptLength: text.length });

  return { ok: true, text, raw: parsed };
}
