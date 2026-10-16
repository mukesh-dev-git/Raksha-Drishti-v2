// -----------------------------------------------------------------------------
// P7.4 - "wire it together": officer speaks in Kannada -> transcribed
// (P7.2, src/lib/sttClient.ts) -> translated to English (P7.3, src/lib/
// translateClient.ts) -> structured/summarized by GLM (src/lib/llm.ts),
// one pipeline. This is the orchestration layer only - each stage's own
// client owns its real API contract and honesty guarantees; this module
// never fabricates a result for a stage that failed, and never lets a
// later stage silently paper over an earlier one's failure.
//
// Stage independence: transcription (P7.2) is CONFIRMED working live
// (real 200s verified end-to-end - see sttClient.ts's module comment).
// Translation (P7.3) is NOT confirmed working (see translateClient.ts's
// module comment - the target-language field name was never found despite
// extensive live-probing) - every real call to it currently fails. This
// pipeline is built to degrade honestly rather than block on that: if
// translation fails, the GLM summarization stage still runs on the RAW
// Kannada transcript instead of silently stopping, and the result is
// labeled accordingly (`usedTranslation: false`) so nothing pretends a
// translation happened that didn't. GLM's own multilingual capability on
// raw Kannada input is unverified (RESEARCH_AND_PLAN.md doesn't document
// it) - this is a best-effort fallback, not a second confirmed contract.
// -----------------------------------------------------------------------------
import { transcribeAudio, type SttLanguage } from "./sttClient";
import { translateText } from "./translateClient";
import { callGlm, type ToolDef } from "./llm";

export type StageResult<T> = { ok: true; value: T } | { ok: false; error: string };

// Forced tool-call, NOT a free-text completion - found live 2026-09-03 (this
// module's own first version) that a plain system-prompt + user-message call
// with no `tools` reliably triggers GLM-4.7's inline chain-of-thought leak
// documented in llm.ts's module comment, in at least two different raw
// shapes across back-to-back calls: once as a `<think>...</think>`-tagged
// block, once as unwrapped numbered-list reasoning prose that ran past
// maxTokens before reaching a real answer. llm.ts's own established fix for
// this class of bug (src/lib/nextQuestion.ts, src/lib/
// contradictionDetector.ts) is architectural, not string-stripping after
// the fact: force the model to answer ONLY via a tool call. Adopted here for
// the same reason.
const SUMMARIZE_TOOL: ToolDef = {
  type: "function",
  function: {
    name: "summarize_statement",
    description:
      "Provide a clean, concise, professional, third-person summary of the reported statement, suitable for the 'Brief facts' field of a real FIR. Call this even when the statement is too unclear to summarize meaningfully - in that case, set tooUnclear to true and explain briefly why in the summary field, rather than guessing at facts.",
    parameters: {
      type: "object",
      properties: {
        summary: {
          type: "string",
          description:
            "The third-person FIR-ready summary, or (if tooUnclear is true) a brief, plain statement of why the input couldn't be summarized. Never invent, assume, or add any fact not present in the input.",
        },
        tooUnclear: {
          type: "boolean",
          description: "True if the input was too short, garbled, or unclear to summarize meaningfully as a real report.",
        },
      },
      required: ["summary", "tooUnclear"],
    },
  },
};

export type KannadaIntakeResult = {
  transcript: StageResult<string>;
  /** null only when transcription itself failed - translation never ran. */
  translation: StageResult<string> | null;
  /** null only when transcription itself failed - summarization never ran. */
  summary: StageResult<string> | null;
  /** True only if the summary was produced from a real English translation;
   *  false if it was produced from the raw (untranslated) Kannada transcript
   *  because P7.3 failed - see module header. Always false when summary is
   *  null or ok:false. */
  usedTranslation: boolean;
};

const SUMMARIZE_SYSTEM_PROMPT =
  "You are assisting a police officer in Karnataka, India who is filing a First Information Report (FIR). You will be given a statement transcribed from spoken audio - it may contain transcription errors, filler words, or repetition. You only respond by calling summarize_statement - never with plain text or step-by-step reasoning. Do not invent, assume, or add any fact not present in the input; do not speculate about names, dates, amounts, or locations beyond what is stated.";

/**
 * Runs the full P7.4 pipeline against one audio recording. Never throws for
 * any individual stage's API-level failure - every stage result is a real
 * `StageResult`, so a caller can render exactly what happened at each step
 * (transcript shown even if translation/summarization failed downstream,
 * translation shown even if it's the thing that failed) rather than an
 * all-or-nothing success/failure.
 */
export async function runKannadaIntakePipeline(
  audio: Blob,
  opts: { filename: string; mimeType: string; language?: SttLanguage }
): Promise<KannadaIntakeResult> {
  const sttResult = await transcribeAudio(audio, {
    filename: opts.filename,
    mimeType: opts.mimeType,
    language: opts.language ?? "kn",
  });

  if (!sttResult.ok) {
    // Nothing downstream can run without a real transcript - translation
    // and summarization are correctly null, not a fabricated empty string.
    return {
      transcript: { ok: false, error: sttResult.error },
      translation: null,
      summary: null,
      usedTranslation: false,
    };
  }

  const transcript: StageResult<string> = { ok: true, value: sttResult.text };

  const translateResult = await translateText(sttResult.text, { sourceLanguage: "kn", targetLanguage: "en" });
  const translation: StageResult<string> = translateResult.ok
    ? { ok: true, value: translateResult.translatedText }
    : { ok: false, error: translateResult.error };

  const usedTranslation = translation.ok;
  const textToSummarize = translation.ok ? translation.value : sttResult.text;

  const glmResult = await callGlm({
    messages: [
      { role: "system", content: SUMMARIZE_SYSTEM_PROMPT },
      {
        role: "user",
        content: `Transcribed statement:\n${textToSummarize}\n\nDo not explain your reasoning in text. Immediately call summarize_statement.`,
      },
    ],
    // tool_choice forcing a specific function is broken on this endpoint -
    // verified live 2026-08-26, RESEARCH_AND_PLAN.md §2.2 - so `tools` +
    // the blunt "immediately call X" instruction is the same auto-mode
    // workaround contradictionDetector.ts/nextQuestion.ts already use.
    tools: [SUMMARIZE_TOOL],
    maxTokens: 400,
    temperature: 0.2,
  });

  let summary: StageResult<string>;
  if (!glmResult.ok) {
    summary = { ok: false, error: glmResult.error };
  } else {
    const call = glmResult.toolCalls.find((c) => c.name === "summarize_statement");
    const args = call?.arguments as { summary?: unknown; tooUnclear?: unknown } | undefined;
    if (!call || !args || typeof args.summary !== "string" || !args.summary.trim()) {
      // Same class of "model never called the tool" failure
      // nextQuestion.ts guards against - surfaced as a real error, not a
      // fabricated summary from whatever raw text (if any) came back.
      summary = {
        ok: false,
        error: `model never called summarize_statement (raw text: ${glmResult.text.slice(0, 200) || "(empty)"})`,
      };
    } else {
      summary = { ok: true, value: args.summary };
    }
  }

  console.log("[kannadaIntakePipeline.ts] pipeline run", {
    transcriptOk: true,
    transcriptLength: sttResult.text.length,
    translationOk: translation.ok,
    usedTranslation,
    summaryOk: summary.ok,
  });

  return { transcript, translation, summary, usedTranslation };
}
