// -----------------------------------------------------------------------------
// Server-side-only client for Zoho Catalyst QuickML's Zia "Trained NLP
// Models" Text-to-Audio Synthesis (P7.1). Import this ONLY from Route
// Handlers / Server Components - same discipline as src/lib/llm.ts, which
// this module deliberately mirrors rather than reinventing: it reuses
// llm.ts's getAccessToken() (same OAuth app, same token cache, same
// `QuickML.deployment.READ` scope - RESEARCH_AND_PLAN.md §2.1 confirms Zia's
// Trained NLP Models share GLM's auth) instead of minting a second token.
//
// ⚠️ HONEST VERIFICATION STATUS (read before trusting this file):
// Unlike llm.ts's `/glm/chat`, this endpoint has NOT been exercised against
// a live 200 response. RESEARCH_AND_PLAN.md §2.1 records it as:
//   `.../models/zia/audio/synthesize` (path inferred, confirm in console)
// - inferred by analogy with the two *confirmed* sibling endpoints on the
// same table (`.../models/zia/audio/transcribe`, `.../models/zia/translate`),
// not read off the console's own API Details tab the way GLM's contract was
// (RESEARCH_AND_PLAN.md §2.2). There is no live Catalyst request context in
// local dev to confirm it here - the same limitation every other live-API
// feature in this project already has (no .env.local, no QuickML secrets
// checked into this worktree). The request/response shapes below are this
// module's best-documented guess (POST application/json in -> audio/wav
// out, per the §2.1 inventory table), not a verified contract:
//   - request field names (`text`, `lang`, `voice`) are inferred from GLM's
//     naming convention and the table's own "kn, incl. named Kannada voices
//     (Suresh/Chetan/Anu/Vidya)" wording, not read from a real sample.
//   - a non-audio/wav 200 (e.g. a JSON wrapper instead of raw bytes) is
//     treated as a shape mismatch and surfaced as a real error, not guessed
//     at further.
// Every failure mode below - network error, timeout, non-200, wrong
// content-type, empty body - resolves to `{ ok: false }` with a real error
// message. There is no synthetic/fallback audio anywhere in this module: a
// caller that gets `ok: false` must show that honestly, not play silence or
// a canned clip.
// -----------------------------------------------------------------------------
import { getAccessToken } from "./llm";

// Confirmed sibling endpoints live under `quickml/api/v1/models/zia/...`
// (not the `quickml/v1/project/{id}/...` shape GLM/VLM use) - see
// RESEARCH_AND_PLAN.md §2.1's table. Text-to-Audio's own path is the one
// entry in that table marked "path inferred, confirm in console".
const TTS_URL = "https://api.catalyst.zoho.in/quickml/api/v1/models/zia/audio/synthesize";
const REQUEST_TIMEOUT_MS = 30_000;

export type TtsVoice = "Suresh" | "Chetan" | "Anu" | "Vidya";
export type TtsLanguage = "kn" | "en";

export type TtsOptions = {
  /** Kannada is the point of P7.1 (RESEARCH_AND_PLAN.md §2.1) - default "kn". */
  language?: TtsLanguage;
  /** Named Kannada voices per the §2.1 inventory table. */
  voice?: TtsVoice;
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
        // §2.2's "✅ Resolved 2026-08-26" note) - not independently
        // re-verified against this endpoint.
        Authorization: `Zoho-oauthtoken ${accessToken}`,
        "CATALYST-ORG": orgId,
        "Content-Type": "application/json",
        // Ask explicitly for audio bytes back; harmless if the endpoint
        // ignores Accept and returns audio/wav regardless (per §2.1).
        Accept: "audio/wav, application/json",
      },
      body: JSON.stringify({ text, lang: language, voice }),
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
    const rawText = await res.text();
    let errMsg = rawText || `HTTP ${res.status} (empty body)`;
    try {
      const parsed = JSON.parse(rawText) as { code?: string; message?: string; details?: { reason?: string } };
      errMsg = parsed.message ?? parsed.code ?? errMsg;
    } catch {
      // non-JSON error body - use the raw text/status as-is
    }
    console.error("[ttsClient.ts] Text-to-Audio call failed", { status: res.status, contentType, body: rawText.slice(0, 500) });
    return { ok: false, status: res.status, error: errMsg };
  }

  if (!contentType.includes("audio/")) {
    // A 200 that isn't audio means the inferred contract above is wrong in
    // some way (e.g. a JSON wrapper `{ audioBase64 }` instead of raw
    // bytes). Surface that honestly rather than guessing at a second shape.
    const rawText = await res.text();
    console.error("[ttsClient.ts] Text-to-Audio returned 200 with an unexpected content-type - inferred contract may be wrong", {
      contentType,
      bodyPreview: rawText.slice(0, 300),
    });
    return { ok: false, status: res.status, error: `unexpected response shape (content-type: ${contentType || "none"}) - see server log` };
  }

  const audio = await res.arrayBuffer();
  if (audio.byteLength === 0) {
    return { ok: false, status: res.status, error: "empty audio body on a 200 response" };
  }

  console.log("[ttsClient.ts] Text-to-Audio call ok", { textLength: text.length, language, voice, contentType, bytes: audio.byteLength });

  return { ok: true, audio, contentType };
}
