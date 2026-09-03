// -----------------------------------------------------------------------------
// Server-side-only client for Zoho Catalyst QuickML's Zia "Trained NLP
// Models" Text Translation (P7.3). Import this ONLY from Route Handlers /
// Server Components - same discipline as src/lib/llm.ts, src/lib/ttsClient.ts
// (P7.1) and src/lib/sttClient.ts (P7.2), which this module deliberately
// mirrors: it reuses llm.ts's getAccessToken() (same OAuth app, same token
// cache, same `QuickML.deployment.READ` scope) instead of minting a second
// token.
//
// CONTRACT STATUS - PARTIALLY confirmed by live-probing 2026-09-03 (~40
// request variants against the real API), unlike its two sibling models
// (TTS's contract came straight off the console's API Details tab; STT's
// wrong field name was found and corrected in 3 live tries). This
// endpoint's own parameter validator gave genuinely INCONSISTENT signals -
// the same field name was accepted in one request and rejected in another
// depending purely on what it was paired with, with no combination found
// that returned a 200. That inconsistency is being recorded honestly rather
// than papered over with a confident-looking guess:
//
// CONFIRMED:
//   - URL is real: POST https://api.catalyst.zoho.in/quickml/api/v1/models/zia/translate
//     (a GET probe against it returned a genuine `INVALID_METHOD` API
//     error, not a generic 404 - same proof technique that confirmed the
//     STT URL)
//   - Body must be multipart/form-data, NOT application/json - every JSON
//     attempt failed with `LESS_THAN_MIN_OCCURANCE` on an internal
//     `zoho-inputstream` parameter regardless of JSON field names tried
//   - A plain-string `text` field is very likely the source-text field -
//     it was accepted (not flagged as invalid) in most, but not all,
//     variants tried
//
// UNCONFIRMED - genuinely not found:
//   - The target-language field name. ~15 candidates tried
//     (targetLanguage, target_language, to, language, target, toLang,
//     targetLang, dest, translate, and more) - every one was rejected as
//     `EXTRA_PARAM_FOUND`, but WHICH field got blamed in the error
//     shifted unpredictably between requests with no pattern found.
//
// `text` + `targetLanguage` is used below as the best-available guess
// (closest to ttsClient.ts's own confirmed `language` field naming style),
// but this has NOT produced a real 200 - do not trust this in production
// without checking the Catalyst console's own API Details tab for this
// specific model first (the console is the ground truth that resolved this
// exact class of uncertainty for the TTS model - RESEARCH_AND_PLAN.md
// §2.1's inventory table alone was not enough for that endpoint either).
//   Response: JSON (field names likewise not confirmed - never reached a
//   200 to observe one)
// -----------------------------------------------------------------------------
import { getAccessToken } from "./llm";

const TRANSLATE_URL = "https://api.catalyst.zoho.in/quickml/api/v1/models/zia/translate";
const REQUEST_TIMEOUT_MS = 20_000;

// Kannada ⇄ English is the point of P7.3 (RESEARCH_AND_PLAN.md §2.1); the
// model supports 8 other Indian languages too, per the same inventory, but
// this app only exposes the two it actually needs.
export type TranslateLanguage = "kn" | "en";

export type TranslateResult =
  | { ok: true; translatedText: string; raw: unknown }
  | { ok: false; status: number; error: string };

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`translateClient.ts: missing required env var ${name} - see .env.local, RESEARCH_AND_PLAN.md §2.1`);
  return v;
}

// Response field name is unconfirmed (see module header) - tried in this
// order against whatever the server actually returns, same
// never-fabricate-never-guess-further discipline as sttClient.ts's
// CANDIDATE_TEXT_FIELDS.
const CANDIDATE_TEXT_FIELDS = ["translated_text", "translatedText", "text", "translation", "result", "output"] as const;

function extractTranslation(body: Record<string, unknown>): string | null {
  for (const key of CANDIDATE_TEXT_FIELDS) {
    const v = body[key];
    if (typeof v === "string" && v.trim().length > 0) return v;
  }
  return null;
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
  // `sourceLanguage` is kept in the public signature (callers should always
  // state it - the model likely needs to know the input language even if
  // this module hasn't found where to put it) but is NOT currently sent -
  // no source-language field name was found among ~15 tried (see module
  // header). Wire it in once the console confirms the real field name.
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

  // multipart/form-data is CONFIRMED required (see module header - every
  // application/json attempt failed outright). `text` is the best-evidenced
  // guess for the content field; `targetLanguage` for the language field is
  // UNCONFIRMED - see module header before trusting this in production.
  const form = new FormData();
  form.append("text", text);
  form.append("targetLanguage", opts.targetLanguage);

  let res: Response;
  try {
    res = await fetch(TRANSLATE_URL, {
      method: "POST",
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
        "CATALYST-ORG": orgId,
        // No Content-Type set deliberately - fetch generates the correct
        // multipart boundary itself for a FormData body (same reasoning as
        // sttClient.ts).
        Accept: "application/json",
      },
      body: form,
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
    // Same discipline as ttsClient.ts/sttClient.ts: never assume the
    // documented {code,message,details} error shape holds, and detect a
    // raw HTML error page (edge/app-server 404/502) rather than dumping it
    // verbatim to a caller.
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
    console.error("[translateClient.ts] Translation call failed", { status: res.status, body: rawText.slice(0, 500) });
    return { ok: false, status: res.status, error: errMsg };
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    console.error("[translateClient.ts] Translation returned non-JSON on a 200", rawText.slice(0, 500));
    return { ok: false, status: res.status, error: "non-JSON success response" };
  }

  const translatedText = extractTranslation(parsed);
  if (translatedText === null) {
    console.error("[translateClient.ts] Translation 200 body didn't match any expected field", {
      keysSeen: Object.keys(parsed),
      bodyPreview: rawText.slice(0, 300),
    });
    return { ok: false, status: res.status, error: `unexpected response shape (keys: ${Object.keys(parsed).join(", ") || "none"}) - see server log` };
  }

  console.log("[translateClient.ts] Translation call ok", {
    sourceLanguage: opts.sourceLanguage,
    targetLanguage: opts.targetLanguage,
    inputLength: text.length,
    outputLength: translatedText.length,
  });

  return { ok: true, translatedText, raw: parsed };
}
