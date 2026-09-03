import { NextRequest, NextResponse } from "next/server";
import { translateText, type TranslateLanguage } from "@/lib/translateClient";

export const dynamic = "force-dynamic";

const LANGUAGES: TranslateLanguage[] = ["kn", "en"];
const MAX_CHARS = 4000; // no documented limit for this model - a sane client-side
// guard against an accidental huge payload, matching /api/tts's MAX_CHARS.

// POST /api/translate  { text: string, sourceLanguage: "kn"|"en", targetLanguage: "kn"|"en" }
// -> 200 { translatedText: string } on success, or { error } JSON on failure.
//
// P7.3 - server-side proxy to Zia's Trained NLP Models Text Translation
// (src/lib/translateClient.ts). Kept as its own route so QUICKML_* secrets
// never reach the client bundle - same discipline as /api/tts and /api/stt.
//
// UNCONFIRMED against a live 200 - see translateClient.ts's module comment
// for the full honesty note: this endpoint's contract resisted live
// discovery unlike its two siblings (~40 request variants tried, all
// rejected, with the API's own validator giving inconsistent signals about
// which field was wrong). This route's own job is narrower and IS fully
// covered without a live 200: reject a bad request before ever calling
// out, and never fabricate a translation - every failure from
// translateClient.ts is passed through as a real error, never swallowed
// into a fake success.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  const sourceLanguage = typeof body?.sourceLanguage === "string" && LANGUAGES.includes(body.sourceLanguage) ? (body.sourceLanguage as TranslateLanguage) : undefined;
  const targetLanguage = typeof body?.targetLanguage === "string" && LANGUAGES.includes(body.targetLanguage) ? (body.targetLanguage as TranslateLanguage) : undefined;

  if (!text) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }
  if (text.length > MAX_CHARS) {
    return NextResponse.json({ error: `text too long (${text.length} chars, max ${MAX_CHARS})` }, { status: 400 });
  }
  if (!sourceLanguage || !targetLanguage) {
    return NextResponse.json({ error: 'sourceLanguage and targetLanguage are required ("kn" or "en")' }, { status: 400 });
  }
  if (sourceLanguage === targetLanguage) {
    return NextResponse.json({ error: "sourceLanguage and targetLanguage must differ" }, { status: 400 });
  }

  try {
    const result = await translateText(text, { sourceLanguage, targetLanguage });

    if (!result.ok) {
      // status 0 means the failure was before we ever got an HTTP response
      // (missing config, network error, timeout) - map that to 502
      // (upstream failure) rather than lying with a 200 or an arbitrary 4xx.
      const status = result.status === 0 ? 502 : result.status;
      return NextResponse.json({ error: result.error }, { status });
    }

    return NextResponse.json({ translatedText: result.translatedText });
  } catch (e) {
    console.error("[api/translate] translateText threw (likely missing QUICKML_* config)", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Translation failed" }, { status: 500 });
  }
}
