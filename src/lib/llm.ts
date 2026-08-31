// -----------------------------------------------------------------------------
// Server-side-only client for Zoho Catalyst QuickML's GLM-4.7-Flash (P5.1).
// Import this ONLY from Route Handlers / Server Components - it reads
// QUICKML_* secrets from process.env and must never reach the client bundle
// (same discipline as viewScope.server.ts used to keep next/headers out of
// client code - see PLAN.md P0.5's note on that class of bug).
//
// Full contract, gotchas and the 2026-08-26 verification log are in
// RESEARCH_AND_PLAN.md §2.2. The three things that actually blocked every
// earlier call, in the order they were found:
//   1. A grant token was being used as an access token (dead by design -
//      Zoho's Self Client is a two-step exchange; skipping step 2 produces a
//      bare 401 on every endpoint, every auth scheme, even plain Catalyst).
//   2. `CATALYST-ORG` header is required and undocumented in the console
//      sample - its absence returns 400 ORGID_HEADER_UNAVAILABLE.
//   3. (Windows-specific, not a server bug) passing the JSON body as a
//      literal command-line string through PowerShell mangles embedded
//      quotes before curl sees them - write to a file and use
//      `--data-binary @file`, or just don't shell out at all, which is what
//      this module does.
//
// The verified 200 response shape is FLAT, not the OpenAI chat.completion
// shape the console's Sample Response tab shows:
//   { response: string, tool_calls: [...], usage: {...}, model, created_time }
// not `choices[0].message.content`. Trusting the sample here would silently
// read `undefined` on every real call - see RESEARCH_AND_PLAN.md §2.2 for
// the live proof. `reasoning` (only with enableThinking) is unconfirmed at
// the top level vs. nested - treated as optional/top-level until a real
// thinking-mode call proves otherwise. NEVER render `reasoning` - it's the
// model's scratchpad (hedging, discarded hypotheses), which is precisely
// what P5.6's citation guardrail exists to keep out of the UI. Log it.
//
// A SECOND, separate reasoning leak found live 2026-08-31: when a call is
// made with no `tools` in the request, GLM-4.7 emits its chain-of-thought
// INLINE in `response` as a literal `<think>...</think>` block ahead of the
// real text - not via the `reasoning` field above. callGlm() strips this
// before returning `text`, folding it into `reasoning` instead. Every
// caller before that fix happened to always pass `tools`, which is why this
// went unnoticed until src/app/api/ask/route.ts's forced-final-answer round
// (P5.8) started calling without them.
// -----------------------------------------------------------------------------

const TOKEN_URL = "https://accounts.zoho.in/oauth/v2/token";
const GLM_MODEL = "crm-di-glm47b_30b_it"; // console shows "GLM-4.7-Flash" - NOT this string
// Vendor sample: 2.4s queue + 8.9s total for 256 output tokens - there IS a
// queue, and generation time scales with max_tokens. 20s was tuned against
// person-level calls (maxTokens 700); raising maxTokens to 1500 for
// scenario-level calls (contradictionDetector.ts) pushed several real
// calls past 20s and they were aborted mid-generation - a timeout, not a
// model or API failure. 45s gives real headroom at the larger budget.
const REQUEST_TIMEOUT_MS = 45_000;

export type ChatMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
};

export type ToolDef = {
  type: "function";
  function: { name: string; description?: string; parameters: Record<string, unknown> };
};

export type GlmChatOptions = {
  messages: ChatMessage[];
  maxTokens?: number;
  temperature?: number;
  tools?: ToolDef[];
  toolChoice?: "auto" | "none" | { type: "function"; function: { name: string } };
  /** Zoho extension, not standard OpenAI. Enables step-by-step reasoning in
   *  the response - see the module comment on why that field must never be
   *  rendered even though it's logged. */
  enableThinking?: boolean;
};

// The verified live shape (2026-08-26) - see module comment.
type GlmToolCall = {
  id?: string;
  type: "function";
  function: { name: string; arguments: string }; // JSON-encoded STRING, not an object - RESEARCH_AND_PLAN.md §2.2
};

type GlmChatSuccess = {
  response: string;
  tool_calls: GlmToolCall[];
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number; prompt_tokens_details?: unknown };
  model: string;
  created_time: number;
  reasoning?: string; // unconfirmed shape - see module comment
};

// Documented error shape - but the real 401s seen during setup had an EMPTY
// body, not this shape. Never assume an error response is parseable JSON.
type GlmErrorBody = { code?: string; message?: string; details?: { reason?: string } };

export type ParsedToolCall = { name: string; arguments: unknown; rawArguments: string };

export type LlmResult =
  | {
      ok: true;
      text: string;
      toolCalls: ParsedToolCall[];
      reasoning: string | null;
      usage: GlmChatSuccess["usage"];
    }
  | { ok: false; status: number; error: string };

// ---------------------------------------------------------------------------
// Token cache. Module-scope, so it's warm-instance-only - it does NOT
// survive a cold start on Slate, same limitation Route Handlers already have
// with any other in-memory cache. That's an accepted tradeoff for a
// hackathon-scale app, not an oversight; a durable cache (NoSQL row, Edge
// Config) is the real fix if this ever needs to survive cold starts.
// ---------------------------------------------------------------------------
let cachedToken: { accessToken: string; expiresAt: number } | null = null;

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`llm.ts: missing required env var ${name} - see .env.local, RESEARCH_AND_PLAN.md §2.2`);
  return v;
}

async function mintAccessToken(): Promise<{ accessToken: string; expiresIn: number }> {
  const clientId = requireEnv("QUICKML_CLIENT_ID");
  const clientSecret = requireEnv("QUICKML_CLIENT_SECRET");
  const refreshToken = requireEnv("QUICKML_REFRESH_TOKEN");

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
  });

  const res = await fetch(TOKEN_URL, { method: "POST", body });
  const text = await res.text();
  let parsed: { access_token?: string; expires_in?: number; error?: string } = {};
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`llm.ts: token refresh returned non-JSON (HTTP ${res.status}): ${text.slice(0, 200)}`);
  }
  if (!res.ok || !parsed.access_token) {
    throw new Error(`llm.ts: token refresh failed (HTTP ${res.status}): ${parsed.error ?? text.slice(0, 200)}`);
  }
  return { accessToken: parsed.access_token, expiresIn: parsed.expires_in ?? 3600 };
}

/** Returns a valid access token, minting/refreshing if the cached one is
 *  missing or within 5 minutes of expiry. Exported for a one-off health
 *  check; callGlm() calls this itself. */
export async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt - now > 5 * 60_000) {
    return cachedToken.accessToken;
  }
  // No refresh-token flow attempted yet in this session - the working token
  // in .env.local as of 2026-08-26 came from the initial authorization_code
  // exchange (self_client.json, since deleted). This mint call exercises the
  // refresh_token grant for the first time; if QUICKML_REFRESH_TOKEN turns
  // out not to carry the QuickML.deployment.READ scope through a refresh,
  // this is where that would surface - log the raw error rather than swallow it.
  const { accessToken, expiresIn } = await mintAccessToken();
  cachedToken = { accessToken, expiresAt: now + expiresIn * 1000 };
  return accessToken;
}

function parseToolCalls(raw: GlmToolCall[] | undefined): ParsedToolCall[] {
  if (!raw?.length) return [];
  return raw.map((tc) => {
    let args: unknown;
    try {
      args = JSON.parse(tc.function.arguments);
    } catch {
      args = null; // malformed args from the model - caller decides whether that's fatal
    }
    return { name: tc.function.name, arguments: args, rawArguments: tc.function.arguments };
  });
}

// ---------------------------------------------------------------------------
// Fallback: this model sometimes emits a tool call as an inline TEXT tag
// format instead of using the structured `tool_calls` array - found live
// 2026-08-26 (RESEARCH_AND_PLAN.md §2.2), not documented anywhere, and
// found INCONSISTENT across responses on 2026-08-26's P5.3 eval re-run: the
// same call shape produced both
//   <arg_key>contradictions<arg_value>[...]           (no closing tag)
// and
//   <arg_key>contradictions</arg_key><arg_value>[...]  (closing tag present)
// on different calls. The first regex only matched the no-closing-tag form
// and silently failed the eval's C2 call even though the model had found
// the exactly-correct answer - a parsing bug masquerading as a detection
// miss. `(?:<\/arg_key>)?` makes the closing tag optional rather than
// assumed either way.
//
// `tool_calls` is empty when this happens - the structured field and the
// inline-tag format are mutually exclusive per response, not layered - so
// this only runs when the real array came back empty.
// ---------------------------------------------------------------------------
const INLINE_TOOL_CALL_RE = /<tool_call>([a-zA-Z0-9_]+)((?:<arg_key>[\s\S]*?<arg_value>[\s\S]*?)+)(?:<\/tool_call>|$)/;
const INLINE_ARG_RE = /<arg_key>([^<]+)(?:<\/arg_key>)?<arg_value>([\s\S]*?)(?=<arg_key>|<\/tool_call>|$)/g;

function parseInlineToolCall(text: string): ParsedToolCall | null {
  const m = INLINE_TOOL_CALL_RE.exec(text);
  if (!m) return null;
  const name = m[1];
  const argsBlock = m[2];
  const args: Record<string, unknown> = {};
  let am: RegExpExecArray | null;
  INLINE_ARG_RE.lastIndex = 0;
  while ((am = INLINE_ARG_RE.exec(argsBlock))) {
    const key = am[1].trim();
    const rawValue = am[2].trim();
    try {
      args[key] = JSON.parse(rawValue);
    } catch {
      // Truncated (ran out of max_tokens mid-JSON) or a plain string value -
      // either way, not silently coerced. Caller sees this key missing from
      // `arguments` and can decide whether that's fatal; the raw text stays
      // inspectable via the top-level LlmResult.text.
    }
  }
  return { name, arguments: args, rawArguments: argsBlock };
}

/**
 * Calls GLM-4.7-Flash. Never throws for an API-level failure (bad request,
 * auth, timeout) - returns `{ ok: false }` so callers degrade gracefully
 * (P5.1's "graceful fallback" requirement). Throws only for missing
 * configuration (requireEnv), which is a setup bug, not a runtime condition
 * to design around.
 *
 * Every call is logged with the prompt and the response (including
 * `reasoning` if present) for the audit trail P5.1 asks for - but callers
 * must never put `reasoning` in anything user-facing. See module comment.
 */
export async function callGlm(opts: GlmChatOptions): Promise<LlmResult> {
  const projectId = requireEnv("QUICKML_PROJECT_ID");
  const orgId = requireEnv("QUICKML_ORG_ID");
  const url = `https://api.catalyst.zoho.in/quickml/v1/project/${projectId}/glm/chat`;

  const body: Record<string, unknown> = {
    model: GLM_MODEL,
    messages: opts.messages,
  };
  if (opts.maxTokens !== undefined) body.max_tokens = opts.maxTokens;
  if (opts.temperature !== undefined) body.temperature = opts.temperature;
  if (opts.tools) body.tools = opts.tools;
  if (opts.toolChoice) body.tool_choice = opts.toolChoice;
  if (opts.enableThinking) body.chat_template_kwargs = { enable_thinking: true };

  let accessToken: string;
  try {
    accessToken = await getAccessToken();
  } catch (e) {
    console.error("[llm.ts] token acquisition failed", e);
    return { ok: false, status: 0, error: e instanceof Error ? e.message : "token acquisition failed" };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        // Console documents Zoho-oauthtoken; both this and Bearer verified
        // working 2026-08-26 (RESEARCH_AND_PLAN.md §2.2). Using the
        // console's own documented scheme.
        Authorization: `Zoho-oauthtoken ${accessToken}`,
        "CATALYST-ORG": orgId,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (e) {
    clearTimeout(timer);
    const timedOut = e instanceof Error && e.name === "AbortError";
    console.error("[llm.ts] request failed", { timedOut, error: e });
    return { ok: false, status: 0, error: timedOut ? "timeout" : e instanceof Error ? e.message : "network error" };
  }
  clearTimeout(timer);

  const rawText = await res.text();

  if (!res.ok) {
    // Documented shape is {code,message,details}, but the setup-phase 401s
    // had an EMPTY body - never assume this parses.
    let errMsg = rawText || `HTTP ${res.status} (empty body)`;
    try {
      const parsed = JSON.parse(rawText) as GlmErrorBody;
      errMsg = parsed.message ?? parsed.code ?? errMsg;
    } catch {
      // non-JSON error body - use the raw text/status as-is
    }
    console.error("[llm.ts] GLM call failed", { status: res.status, body: rawText.slice(0, 500), request: body });
    return { ok: false, status: res.status, error: errMsg };
  }

  let parsed: GlmChatSuccess;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    console.error("[llm.ts] GLM returned non-JSON on a 200", rawText.slice(0, 500));
    return { ok: false, status: res.status, error: "non-JSON success response" };
  }

  console.log("[llm.ts] GLM call ok", {
    promptMessages: opts.messages.length,
    usage: parsed.usage,
    toolCallCount: parsed.tool_calls?.length ?? 0,
    hasReasoning: !!parsed.reasoning, // logged for audit; NEVER surface parsed.reasoning to the UI
  });

  let toolCalls = parseToolCalls(parsed.tool_calls);
  if (toolCalls.length === 0 && parsed.response?.includes("<tool_call>")) {
    const inline = parseInlineToolCall(parsed.response);
    if (inline) {
      console.warn("[llm.ts] GLM emitted a tool call as inline text, not the tool_calls array - using fallback parser", {
        name: inline.name,
        keysParsed: Object.keys(inline.arguments as object),
      });
      toolCalls = [inline];
    }
  }

  // Found live 2026-08-31 (askTools.ts's route.ts, its forced-final-answer
  // round which calls with no `tools` at all): with no tools in the
  // request, GLM-4.7 emits its chain-of-thought INLINE in `response` as a
  // literal `<think>...</think>` block ahead of the real answer - not via
  // the separate top-level `reasoning` field this module already knows
  // about and already withholds from callers. Every earlier live call this
  // session happened to have `tools` present, which is almost certainly why
  // this was never seen before now: undocumented, and the console's sample
  // response doesn't show it either. Same "never render reasoning" rule as
  // the module header applies here - strip it before `text` ever reaches a
  // caller, log it (truncated) for audit, never surface it in the UI.
  let text = parsed.response ?? "";
  let inlineThinking: string | null = null;
  const thinkMatch = /^\s*<think>([\s\S]*?)<\/think>\s*/i.exec(text);
  if (thinkMatch) {
    inlineThinking = thinkMatch[1];
    text = text.slice(thinkMatch[0].length);
  } else if (/^\s*<think>/i.test(text)) {
    // Opened but never closed - budget ran out mid-thought (same class of
    // truncation already documented below for a missing `response`
    // entirely). Nothing after the tag is a real answer; treat as empty
    // rather than dumping raw scratchpad text to a caller.
    inlineThinking = text;
    text = "";
  }
  if (inlineThinking) {
    console.log("[llm.ts] GLM emitted inline <think> reasoning - stripped from text, logged only", { length: inlineThinking.length, preview: inlineThinking.slice(0, 300) });
  }

  return {
    ok: true,
    // Defaulted, not trusted as-is: found live 2026-08-26 that `response`
    // can be absent from an otherwise-200 body (toolCallCount 0, budget
    // fully consumed - likely a truncated/malformed generation on the
    // vendor's side). The type below says `string`; a live payload doesn't
    // always agree, and a bare `parsed.response` here crashed a caller that
    // reasonably trusted the type (contradictionDetector.ts's error-path
    // .slice()). Never let an external response's shape violate what this
    // module promises its own callers.
    text,
    toolCalls,
    reasoning: parsed.reasoning ?? inlineThinking,
    usage: parsed.usage,
  };
}
