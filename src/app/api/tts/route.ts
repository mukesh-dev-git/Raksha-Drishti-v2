import { NextRequest, NextResponse } from "next/server";
import { synthesizeSpeech, type TtsLanguage, type TtsVoice } from "@/lib/ttsClient";

export const dynamic = "force-dynamic";

// Real bug fixed 2026-09-03 (live-verified while sanity-checking P7.2
// credentials): this only listed the 4 Kannada names, so any English voice
// StatementAudioPlayer.tsx offers (Mary/Anna/Beth/Thomas/Adam/Brian) was
// silently rejected here and dropped to ttsClient.ts's Kannada default,
// which the real API then correctly rejected for language "en". See
// ttsClient.ts's TtsVoice comment for the full trace.
const VOICES: TtsVoice[] = ["Suresh", "Chetan", "Anu", "Vidya", "Thomas", "Adam", "Brian", "Mary", "Anna", "Beth"];
const LANGUAGES: TtsLanguage[] = ["kn", "en"];
const MAX_CHARS = 4000; // no documented limit for this model (unlike Zia Text Analytics'
// 1500-char cap, RESEARCH_AND_PLAN.md §2.1) - this is a sane client-side
// guard against an accidental huge payload, not a verified server limit.

// POST /api/tts  { text: string, voice?: "Suresh"|"Chetan"|"Anu"|"Vidya", language?: "kn"|"en" }
// -> 200 audio/wav (raw bytes) on success, or { error } JSON on failure.
//
// P7.1 - server-side proxy to Zia's Trained NLP Models Text-to-Audio
// Synthesis (src/lib/ttsClient.ts). Kept as its own route rather than
// inlined in a component so the QUICKML_* secrets never reach the client
// bundle - same discipline as src/lib/llm.ts.
//
// UNVERIFIED against a live 200 - see ttsClient.ts's module comment for the
// full honesty note. This route's own job is narrower and IS fully covered
// without a live call: reject a bad request before ever calling out, and
// never synthesize a fake success - every failure from ttsClient.ts is
// passed through as a real error, never swallowed into empty audio.
//
// synthesizeSpeech() can THROW rather than return `{ok:false}` - only for
// missing QUICKML_* config (its requireEnv calls), same "setup bug, not a
// runtime condition" contract llm.ts documents. Locally, with no
// .env.local, that is exactly what happens on every call - verified live
// below. Caught here so that hits this route's own structured JSON error
// instead of a bare framework 500 with no message, keeping "no silent
// failure" true for this codepath too, not just the ok:false one.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  const voice = typeof body?.voice === "string" && VOICES.includes(body.voice) ? (body.voice as TtsVoice) : undefined;
  const language = typeof body?.language === "string" && LANGUAGES.includes(body.language) ? (body.language as TtsLanguage) : undefined;

  if (!text) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }
  if (text.length > MAX_CHARS) {
    return NextResponse.json({ error: `text too long (${text.length} chars, max ${MAX_CHARS})` }, { status: 400 });
  }

  try {
    const result = await synthesizeSpeech(text, { voice, language });

    if (!result.ok) {
      // status 0 means the failure was before we ever got an HTTP response
      // (missing config, network error, timeout) - map that to 502
      // (upstream failure) rather than lying with a 200 or an arbitrary 4xx.
      const status = result.status === 0 ? 502 : result.status;
      return NextResponse.json({ error: result.error }, { status });
    }

    return new NextResponse(result.audio, {
      status: 200,
      headers: {
        "Content-Type": result.contentType || "audio/wav",
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("[api/tts] synthesizeSpeech threw (likely missing QUICKML_* config)", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Text-to-Audio synthesis failed" }, { status: 500 });
  }
}
