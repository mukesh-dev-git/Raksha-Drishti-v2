import { NextRequest, NextResponse } from "next/server";
import { runKannadaIntakePipeline, type StageResult } from "@/lib/kannadaIntakePipeline";

export const dynamic = "force-dynamic";

const MAX_BYTES = 15 * 1024 * 1024; // same guard as /api/stt - no documented limit, a
// sane client-side ceiling against an accidental huge upload.

// POST /api/kannada-intake  multipart/form-data: { audio: File }
// -> 200 { transcript: StageResult<string>, translation: StageResult<string>|null,
//          summary: StageResult<string>|null, usedTranslation: boolean }
//
// P7.4 - "wire it together": runs the full transcribe -> translate ->
// summarize pipeline (src/lib/kannadaIntakePipeline.ts) against one audio
// upload. Always returns 200 with per-stage results rather than a single
// pass/fail - a stage failing partway through (most likely translation,
// see the pipeline module's own note) is real, useful information the
// caller renders, not an error that hides the transcript that DID succeed.
// The one case that returns a non-200 is a hard failure before any stage
// could run at all (bad request, or a thrown setup error like missing
// QUICKML_* config).
export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "expected multipart/form-data" }, { status: 400 });
  }

  const audio = form.get("audio");
  if (!(audio instanceof Blob) || audio.size === 0) {
    return NextResponse.json({ error: "audio file is required" }, { status: 400 });
  }
  if (audio.size > MAX_BYTES) {
    return NextResponse.json({ error: `audio too large (${audio.size} bytes, max ${MAX_BYTES})` }, { status: 400 });
  }

  const filename = audio instanceof File ? audio.name : "audio";
  const mimeType = audio.type || "audio/wav";

  try {
    const result = await runKannadaIntakePipeline(audio, { filename, mimeType, language: "kn" });
    return NextResponse.json(result);
  } catch (e) {
    // Thrown only for missing QUICKML_* config (requireEnv in the
    // underlying clients) - a setup bug, not a runtime condition any
    // individual StageResult models. Same discipline as /api/stt and
    // /api/translate.
    console.error("[api/kannada-intake] pipeline threw (likely missing QUICKML_* config)", e);
    const message = e instanceof Error ? e.message : "Kannada intake pipeline failed";
    const failure: StageResult<string> = { ok: false, error: message };
    return NextResponse.json({ transcript: failure, translation: null, summary: null, usedTranslation: false }, { status: 500 });
  }
}
