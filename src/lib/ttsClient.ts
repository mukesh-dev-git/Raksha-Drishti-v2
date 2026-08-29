// -----------------------------------------------------------------------------
// Server-side-only client for Zoho Catalyst QuickML's Zia "Trained NLP
// Models" Text-to-Audio Synthesis (P7.1). Import this ONLY from Route
// Handlers / Server Components - same discipline as src/lib/llm.ts, which
// this module deliberately mirrors rather than reinventing: it reuses
// llm.ts's getAccessToken() (same OAuth app, same token cache, same
// `QuickML.deployment.READ` scope - RESEARCH_AND_PLAN.md §2.1 confirms Zia's
// Trained NLP Models share GLM's auth) instead of minting a second token.
//
// CONFIRMED CONTRACT (2026-08-29, read directly off the Catalyst console's
// own "API Details" tab for this model - the endpoint path this file
// originally guessed, `.../models/zia/audio/synthesize`, was live-verified
// wrong: a real 404 from Zoho's own infra, not a config/auth problem. The
// real path is `.../models/zia/tts/synthesize`):
//   POST https://api.catalyst.zoho.in/quickml/api/v1/models/zia/tts/synthesize
//   Headers: CATALYST-ORG, Authorization: Zoho-oauthtoken <token>
//   Body (application/json): { text, language, speaker, pitch, speed, emotion }
//     - language: ISO code ("hi"/"en"/"kn" - not "lang", the field this file
//       originally guessed)
//     - speaker: a named voice ("Divya" in the console's own sample; the
//       Kannada names this module already used - Suresh/Chetan/Anu/Vidya -
//       matched the console's real inventory exactly, so those needed no
//       change), not "voice" as originally guessed
//     - pitch/speed/emotion: optional, "low"|"moderate"|"high" /
//       "slow"|"moderate"|"fast" / "neutral"|"happy"|"sad"|"angry"
//   Response: 200, `audio/wav` binary body, plus an informational
//   `X-Audio-Info` header ({language, speaker, duration_seconds,
//   sample_rate, processing_time_ms}) - not required to parse the audio,
//   logged here since it's free.
// Everything else in this module (error handling, no-fake-audio-ever
// guarantee) predates this confirmation and needed no change - only the
// URL and the three renamed/added request fields did.
// -----------------------------------------------------------------------------
import { getAccessToken } from "./llm";

const TTS_URL = "https://api.catalyst.zoho.in/quickml/api/v1/models/zia/tts/synthesize";
const REQUEST_TIMEOUT_MS = 30_000;

export type TtsVoice = "Suresh" | "Chetan" | "Anu" | "Vidya";
export type TtsLanguage = "kn" | "en";
export type TtsPitch = "low" | "moderate" | "high";
export type TtsSpeed = "slow" | "moderate" | "fast";
export type TtsEmotion = "neutral" | "happy" | "sad" | "angry";

export type TtsOptions = {
  /** Kannada is the point of P7.1 (RESEARCH_AND_PLAN.md §2.1) - default "kn". */
  language?: TtsLanguage;
  /** Named Kannada voices per the console's real inventory. */
  voice?: TtsVoice;
  pitch?: TtsPitch;
  speed?: TtsSpeed;
  emotion?: TtsEmotion;
};

export type TtsResult =
  | { ok: true; audio: ArrayBuffer; contentType: string }
  | { ok: false; status: number; error: string };

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`ttsClient.ts: missing required env var ${name} - see .env.local, RESEARCH_AND_PLAN.md §2.1`);
  return v;
}

/**
 * Calls Zia's Text-to-Audio Synthesis model. Never throws for an API-level
 * failure (bad request, auth, timeout, unexpected shape) - always returns
 * `{ ok: false }` so callers (the /api/tts route) can show a real error
 * state instead of crashing or faking a clip. Throws only for missing
 * configuration (requireEnv), a setup bug rather than a runtime condition.
 */
export async function synthesizeSpeech(text: string, opts: TtsOptions = {}): Promise<TtsResult> {
  const orgId = requireEnv("QUICKML_ORG_ID");
  const language = opts.language ?? "kn";
  const voice = opts.voice ?? "Vidya";
  const pitch = opts.pitch ?? "moderate";
  const speed = opts.speed ?? "moderate";
  const emotion = opts.emotion ?? "neutral";

  let accessToken: string;
  try {
    accessToken = await getAccessToken();
  } catch (e) {
    console.error("[ttsClient.ts] token acquisition failed", e);
    return { ok: false, status: 0, error: e instanceof Error ? e.message : "token acquisition failed" };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(TTS_URL, {
      method: "POST",
      headers: {
        // Same scheme llm.ts settled on for GLM (RESEARCH_AND_PLAN.md
        // §2.2's "✅ Resolved 2026-08-26" note), confirmed also correct for
        // this endpoint via the console's own API Details tab.
        Authorization: `Zoho-oauthtoken ${accessToken}`,
        "CATALYST-ORG": orgId,
        "Content-Type": "application/json",
        // Ask explicitly for audio bytes back; harmless if the endpoint
        // ignores Accept and returns audio/wav regardless.
        Accept: "audio/wav, application/json",
      },
      // Field names/shape per the console's own sample request - see this
      // file's header comment.
      body: JSON.stringify({ text, language, speaker: voice, pitch, speed, emotion }),
      signal: controller.signal,
    });
  } catch (e) {
    clearTimeout(timer);
    const timedOut = e instanceof Error && e.name === "AbortError";
    console.error("[ttsClient.ts] request failed", { timedOut, error: e });
    return { ok: false, status: 0, error: timedOut ? "timeout" : e instanceof Error ? e.message : "network error" };
  }
  clearTimeout(timer);

  const contentType = res.headers.get("content-type") ?? "";

  if (!res.ok) {
    // llm.ts found the documented {code,message,details} error shape isn't
    // reliable in practice (an empty 401 body, live). Same discipline here:
    // read as text first, only parse as JSON if it looks like JSON, never
    // assume a shape.
    //
    // A non-JSON, non-empty body is very often an HTML error page (a plain
    // 404/502 from the edge/app-server in front of the real API, not the
    // API's own error format) - confirmed live, the inferred endpoint path
    // below returns exactly this. Dumping that raw HTML into `error` means
    // a caller that renders it verbatim (StatementAudioPlayer.tsx does)
    // shows a whole <html><head><style>... document to the officer using
    // the page. Detect that shape specifically and fall back to a short,
    // real status line instead - still honest (still says the call
    // failed, still carries the real HTTP status), just not a raw dump.
    const rawText = await res.text();
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
    console.error("[ttsClient.ts] Text-to-Audio call failed", { status: res.status, contentType, body: rawText.slice(0, 500) });
    return { ok: false, status: res.status, error: errMsg };
  }

  if (!contentType.includes("audio/")) {
    // The confirmed contract (see header comment) is a raw audio/wav body -
    // a 200 that isn't audio means something changed server-side or a
    // request field was rejected silently. Surface that honestly rather
    // than guessing at a second shape.
    const rawText = await res.text();
    console.error("[ttsClient.ts] Text-to-Audio returned 200 with an unexpected content-type", {
      contentType,
      bodyPreview: rawText.slice(0, 300),
    });
    return { ok: false, status: res.status, error: `unexpected response shape (content-type: ${contentType || "none"}) - see server log` };
  }

  const audio = await res.arrayBuffer();
  if (audio.byteLength === 0) {
    return { ok: false, status: res.status, error: "empty audio body on a 200 response" };
  }

  // X-Audio-Info is documented, informational-only (duration/sample rate/
  // processing time) - logged since it's free, never required to use the
  // audio bytes themselves.
  const audioInfo = res.headers.get("x-audio-info");
  console.log("[ttsClient.ts] Text-to-Audio call ok", { textLength: text.length, language, voice, contentType, bytes: audio.byteLength, audioInfo });

  return { ok: true, audio, contentType };
}
