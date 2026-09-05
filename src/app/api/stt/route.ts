import { NextRequest, NextResponse } from "next/server";
import { transcribeAudio, type SttLanguage } from "@/lib/sttClient";

export const dynamic = "force-dynamic";

const LANGUAGES: SttLanguage[] = ["kn", "en"];
const MAX_BYTES = 15 * 1024 * 1024; // 15MB - no documented limit for this model; a sane
// client-side guard against an accidental huge upload, not a verified server limit
// (same "sane guard, not a confirmed contract" caveat as /api/tts's MAX_CHARS).

// POST /api/stt  multipart/form-data: { audio: File, language?: "kn"|"en" }
// -> 200 { text: string } on success, or { error } JSON on failure.
//
// P7.2 - server-side proxy to Zia's Trained NLP Models Audio-to-Text
// Transcription (src/lib/sttClient.ts). Kept as its own route rather than
// inlined in a component so the QUICKML_* secrets never reach the client
// bundle - same discipline as /api/tts.
//
// UNVERIFIED against a live 200 - see sttClient.ts's module comment for the
// full honesty note on which parts of this contract are inferred rather
// than confirmed. This route's own job is narrower and IS fully covered
// without a live call: reject a bad request before ever calling out, and
// never fabricate a transcript - every failure from sttClient.ts is passed
// through as a real error, never swallowed into an empty/fake success.
//
// transcribeAudio() can THROW rather than return `{ok:false}` - only for
// missing QUICKML_* config (its requireEnv calls), same "setup bug, not a
// runtime condition" contract llm.ts/ttsClient.ts document. Locally, with
// no .env.local, that is exactly what every call does - caught here so it
// surfaces as this route's own structured JSON error instead of a bare
// framework 500 with no message.
export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "expected multipart/form-data" }, { status: 400 });
  }

  const audio = form.get("audio");
  const languageRaw = form.get("language");
  const language = typeof languageRaw === "string" && LANGUAGES.includes(languageRaw as SttLanguage) ? (languageRaw as SttLanguage) : undefined;

  if (!(audio instanceof Blob) || audio.size === 0) {
    return NextResponse.json({ error: "audio file is required" }, { status: 400 });
  }
  if (audio.size > MAX_BYTES) {
    return NextResponse.json({ error: `audio too large (${audio.size} bytes, max ${MAX_BYTES})` }, { status: 400 });
  }

  const filename = audio instanceof File ? audio.name : "audio";
  const mimeType = audio.type || "audio/wav";

  try {
    const result = await transcribeAudio(audio, { filename, mimeType, language });

    if (!result.ok) {
      // status 0 means the failure was before we ever got an HTTP response
      // (missing config, network error, timeout) - map that to 502
      // (upstream failure) rather than lying with a 200 or an arbitrary 4xx.
      const status = result.status === 0 ? 502 : result.status;
      return NextResponse.json({ error: result.error }, { status });
    }

    return NextResponse.json({ text: result.text });
  } catch (e) {
    console.error("[api/stt] transcribeAudio threw (likely missing QUICKML_* config)", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Audio-to-Text transcription failed" }, { status: 500 });
  }
}
