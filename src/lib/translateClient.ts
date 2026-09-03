// -----------------------------------------------------------------------------
// Server-side-only client for Zoho Catalyst QuickML's Zia "Trained NLP
// Models" Text Translation (P7.3). Import this ONLY from Route Handlers /
// Server Components - same discipline as src/lib/llm.ts, src/lib/ttsClient.ts
// (P7.1) and src/lib/sttClient.ts (P7.2), which this module deliberately
// mirrors: it reuses llm.ts's getAccessToken() (same OAuth app, same token
// cache, same `QuickML.deployment.READ` scope) instead of minting a second
// token.
//
// CONFIRMED CONTRACT (2026-09-04, read directly off the Catalyst console's
// own Model Details + Sample Request/Response tabs for this model - QuickML
// -> Trained NLP Models -> Text Translation, NOT the "Zia" microservices
// section, which is a different catalog entirely and does not list this
// model at all). Extensive live-probing (~40 request variants, logged in
// this file's git history) never found this - every JSON attempt used the
// wrong field names (targetLanguage, target_language, to, language, ...),
// which is why every one of them was rejected; the endpoint was never
// actually multipart-only, that was a misreading of a generic gateway
// error against consistently-wrong JSON field names.
//   POST https://api.catalyst.zoho.in/quickml/api/v1/models/zia/translate
//   Headers: CATALYST-ORG, Authorization: Zoho-oauthtoken <token>
//   Body (application/json): { text, src_lang, tgt_lang }
//     - src_lang / tgt_lang: short ISO codes ("hi", "en", "kn", ...) - NOT
//       sourceLanguage/targetLanguage, this module's old best-guess names.
//   Response: 200 JSON { status: "success", src_lang, tgt_lang,
//   translated_text, processing_time_ms } - "translated_text" was already
//   this module's first-tried candidate field, so no response-parsing
//   change was needed, only the request shape.
//   Error response: { status: "error", message, error_code } - e.g.
//   { status:"error", message:"Unsupported language: fr",
//   error_code:"UNSUPPORTED_LANGUAGE" } for HTTP 400/422/500 per the
//   console's own documented status codes.
// -----------------------------------------------------------------------------
import { getAccessToken } from "./llm";

const TRANSLATE_URL = "https://api.catalyst.zoho.in/quickml/api/v1/models/zia/translate";
const REQUEST_TIMEOUT_MS = 20_000;

// Kannada ⇄ English is the point of P7.3 (RESEARCH_AND_PLAN.md §2.1); the
// model supports several other Indian languages too (Hindi, Tamil, Telugu,
// Malayalam, Marathi, Bengali, Gujarati, Punjabi, Odia, per the console's
// own Supported Languages list), but this app only exposes the two it
// actually needs.
export type TranslateLanguage = "kn" | "en";

export type TranslateResult =
  | { ok: true; translatedText: string; raw: unknown }
  | { ok: false; status: number; error: string };

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`translateClient.ts: missing required env var ${name} - see .env.local, RESEARCH_AND_PLAN.md §2.1`);
  return v;
}

/**
 * Calls Zia's Text Translation model. Never throws for an API-level failure
 * (bad request, auth, timeout, unexpected shape) - always returns
 * `{ ok: false }` so callers (the /api/translate route) can show a real
 * error state instead of crashing or fabricating a translation. Throws only
 * for missing configuration (requireEnv), a setup bug rather than a runtime
 * condition - same contract as callGlm(), synthesizeSpeech() and
 * transcribeAudio().
 */
export async function translateText(
  text: string,
  opts: { sourceLanguage: TranslateLanguage; targetLanguage: TranslateLanguage }
): Promise<TranslateResult> {
  const orgId = requireEnv("QUICKML_ORG_ID");

  let accessToken: string;
  try {
    accessToken = await getAccessToken();
  } catch (e) {
    console.error("[translateClient.ts] token acquisition failed", e);
    return { ok: false, status: 0, error: e instanceof Error ? e.message : "token acquisition failed" };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(TRANSLATE_URL, {
      method: "POST",
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
        "CATALYST-ORG": orgId,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      // Field names confirmed live off the console (see module header).
      body: JSON.stringify({ text, src_lang: opts.sourceLanguage, tgt_lang: opts.targetLanguage }),
      signal: controller.signal,
    });
  } catch (e) {
    clearTimeout(timer);
    const timedOut = e instanceof Error && e.name === "AbortError";
    console.error("[translateClient.ts] request failed", { timedOut, error: e });
    return { ok: false, status: 0, error: timedOut ? "timeout" : e instanceof Error ? e.message : "network error" };
  }
  clearTimeout(timer);

  const rawText = await res.text();

  if (!res.ok) {
    // Documented error shape is { status:"error", message, error_code } -
    // but same discipline as every other client here: read as text first,
    // only parse as JSON if it looks like JSON, never assume a shape holds
    // for every real failure (an auth failure upstream of this endpoint
    // could still return an empty body or an HTML error page).
    let errMsg = rawText || `HTTP ${res.status} (empty body)`;
    try {
      const parsed = JSON.parse(rawText) as { message?: string; error_code?: string };
      errMsg = parsed.message ?? parsed.error_code ?? errMsg;
    } catch {
      const looksLikeHtml = /^\s*<(!doctype|html)/i.test(rawText);
      errMsg = looksLikeHtml
        ? `HTTP ${res.status} ${res.statusText || ""}`.trim() + " (non-API error page, not the Zia service itself)"
        : rawText.slice(0, 300);
    }
    console.error("[translateClient.ts] Translation call failed", { status: res.status, body: rawText.slice(0, 500) });
    return { ok: false, status: res.status, error: errMsg };
  }

  let parsed: { status?: string; translated_text?: string };
  try {
    parsed = JSON.parse(rawText);
  } catch {
    console.error("[translateClient.ts] Translation returned non-JSON on a 200", rawText.slice(0, 500));
    return { ok: false, status: res.status, error: "non-JSON success response" };
  }

  if (typeof parsed.translated_text !== "string" || !parsed.translated_text.trim()) {
    // A 200 with status "success" but a missing/empty translated_text would
    // violate the confirmed contract - surface that honestly rather than
    // silently returning an empty string as if it were a real translation.
    console.error("[translateClient.ts] Translation 200 body missing translated_text", { bodyPreview: rawText.slice(0, 300) });
    return { ok: false, status: res.status, error: "response missing translated_text - see server log" };
  }

  console.log("[translateClient.ts] Translation call ok", {
    sourceLanguage: opts.sourceLanguage,
    targetLanguage: opts.targetLanguage,
    inputLength: text.length,
    outputLength: parsed.translated_text.length,
  });

  return { ok: true, translatedText: parsed.translated_text, raw: parsed };
}
