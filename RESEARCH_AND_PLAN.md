# Domain research + AI build plan

Two things in one doc, because they constrain each other:

1. **Who Karnataka State Police actually is**, and what that means for how this
   app should be scoped — research done 2026-08-25 against KSP's own org pages.
2. **What AI we can actually build now** on the Zoho Catalyst capabilities
   available to us (2 served LLMs + Zia microservices), and in what order.

> **This doc is the *why*.** The sequenced *what and when* now lives in
> [`PLAN.md`](PLAN.md) — check there for current task status before acting on
> any checklist here; several items below have been superseded or already
> done, and are marked inline where so.

Status: research + rationale. Companion docs:
[`features.md`](features.md) (the 6 proposed investigation-intelligence
features, still valid), [`catalyst/README.md`](catalyst/README.md) (backend
source of truth), [`catalyst/DATA_STORE_SCHEMA.md`](catalyst/DATA_STORE_SCHEMA.md).

---

# Part 1 — How Karnataka State Police actually works

## 1.1 The command chain is five tiers, not two

We built `state` vs `district` as a binary. The real structure has more levels,
and two of them matter for this app.

```
                    DGP & IGP (State Police HQ)
                              |
        +---------------------+---------------------+------------------+
        |                     |                     |                  |
  ADGP Law & Order     ADGP Crime & Tech        CID (DGP-rank)    6 City
        |                     |                  state-wide,      Commissionerates
   7 RANGES (IGP)          **SCRB**              by assignment          |
   3-6 districts each   statewide crime data                      DCP Divisions
        |                 & statistics                                 |
   31 DISTRICTS (SP)      (since 1977)                            City Police
        |                                                           Stations
   91 Sub-Divisions (SDPO) / 230 Circles
        |
   906 POLICE STATIONS  <- FIRs are registered here
```

Key facts (sources at the bottom of Part 1):

- **7 Ranges**, each headed by an IGP, each covering **3–6 districts**.
  e.g. Southern Range = Mysuru + Kodagu + Mandya + Hassan + Chamarajanagara.
- **31 District Police Offices**, headed by an SP ("unit officers"),
  **91 SDPOs**, **230 circles**, **906 police stations**.
- **6 City Commissionerates** run *in parallel* to the district structure —
  Bengaluru's CP is ADGP-rank, the rest DIG-rank. Bengaluru City alone is
  **11 law-and-order DCP divisions + 4 traffic divisions**. A commissionerate
  is **not** a district.
- **SCRB** sits under the ADGP (Crime & Technical Services) via the Police
  Computer Wing. Since 1977 its statutory job is to compile crime/criminal
  information statewide and feed NCRB.
- **CID** is DGP-rank with four wings — CID proper (homicide/burglary/special
  inquiries), Economic Offences, Cyber Crimes & Narcotics, and the Forest Cell.

## 1.2 The single most important finding: SCRB is the customer

Re-read the problem statement with the org chart in hand:

> *"The State Crime Records Bureau currently receives limited, fragmented
> information, hindering its ability to perform comprehensive state-wide
> analysis."*

That is not a general grievance about policing. It **names one specific desk**,
and it describes exactly that desk's statutory function failing. SCRB's whole
purpose is to be the point where every district's and every commissionerate's
crime returns converge into one state picture. Today that convergence happens
on paper and in Excel.

Every one of the six capabilities the PS asks for — hotspot maps, link
analysis, socio-economic overlays, predictive risk, trend discovery, ML
intelligence — is only possible *after* that convergence exists.

**Implication for us:** the statewide Dashboard is not a peer view sitting
alongside the District view. It **is the product**. District and station views
exist so the data SCRB depends on gets entered once, correctly, where the
incident happened. We should stop presenting the two as symmetric options.

## 1.3 What each tier needs from this app

| Tier | Sees | Job in this app | Current build |
|---|---|---|---|
| **SCRB / State HQ** | All districts + commissionerates | Cross-district correlation, overlays, predictive risk, trend discovery | Statewide dashboard ✅ · all AI ❌ |
| **Range (IGP)** | 3–6 districts | Compare districts in a region; catch a pattern crossing 2–3 neighbours before it reaches state level | **Missing tier** ❌ |
| **District (SP)** | One district, all its stations | Own cases, hotspots, repeat offenders; drill into any station | ✅ as a **filter** — `/dashboard?district=NNN`, not a login role (see below) |
| **Commissionerate (CP/DCP)** | One city, its DCP divisions | Same shape of need as a District SP, different unit type | **Not modeled** ❌ |
| **CID** | Only cases assigned to it | Track its caseload — a *list*, not a geography | **Wrong model** ⚠️ (see 1.4) |
| **Station / IO** | Their own case | Timeline, evidence, network graph, MO | ✅ Investigation Workspace |

## 1.4 Three corrections the current build needs

### (a) Add the Range tier — small, mechanical
**Reframed since this was written.** District turned out not to belong as a
login *role* at all — the PS asks for SCRB to drill into districts, not for
district officers to get restricted logins, and with no real auth a
self-selected jurisdiction implied an access boundary the app doesn't have.
`viewScope.ts` / `viewScope.server.ts` / `ViewScopeSwitcher.tsx` are deleted;
district is now a URL filter (`/dashboard?district=`, `DistrictFilter.tsx`).

So the Range tier is no longer "a third role" — it's a **coarser filter
option**: one entry per Range in the same drill-down control, resolving to
that Range's 3–6 districts. `scenarioInDistrict(id, districtId?)` generalises
to a district-*set* test. Tracked as X1 in [`PLAN.md`](PLAN.md).

### (b) Stop deriving CID from geography — this one is actually wrong
`catalyst/dataset-v2/build_seed.mjs` currently does:

```js
handlingLevel = districtIds.length > 1 ? "State CID" : "District"
```

Real CID intake has nothing to do with how many districts a case touches. Per
CID's own org page, cases reach CID by **explicit assignment**: order of the
Government of Karnataka, order of the DGP, or Supreme Court / High Court
referral — plus category-based intake (economic offences above ₹1 crore,
cybercrime, human trafficking) and one automatic trigger: **police custodial
death is always taken up by CID.** Organized-crime cases run under KCOCA 2000.

Cross-district ≠ CID. Two district SPs coordinating directly, or the Range IGP
coordinating them, is the *normal* path.

**Fix:** replace the derived field with a seeded, explicit
`assignedTo: "District" | "CID"` plus a stated `assignmentReason` (e.g.
`"EOW — fraud > ₹1cr"`, `"DGP order"`, `"custodial death — automatic"`). Then
the "State CID" badge in the UI means something real.

### (c) Commissionerates aren't districts
If the seed folds Bengaluru/Mysuru/etc. into `DistrictID` alongside revenue
districts, that's a modeling shortcut. Even if the UI keeps treating them
identically for now, it needs to be **stated explicitly** in
`DATA_STORE_SCHEMA.md` rather than left implicit — otherwise the next person
reads district counts as revenue districts and is wrong.

## 1.5 Sources

- [KSP — Organization](https://ksp.karnataka.gov.in/page/About+Us/Organization/en) — ranges, districts, SCRB under Police Computer Wing, hierarchy
- [Karnataka CID — Organisation](https://cid.karnataka.gov.in/2/organisation/en) — four wings, case categories, escalation/assignment rules
- [Wikipedia — Karnataka State Police](https://en.wikipedia.org/wiki/Karnataka_State_Police) — station/circle/SDPO/DPO counts
- [Wikipedia — Bengaluru City Police](https://en.wikipedia.org/wiki/Bengaluru_City_Police) — DCP division structure

> Treat exact commissionerate city lists and rank details as approximate —
> verify against ksp.karnataka.gov.in before quoting externally.

---

# Part 2 — What AI we actually have available

## 2.1 Inventory

**QuickML → Generative AI → LLM Serving** (2 models deployed in our project):

| Model | Shape | Notes |
|---|---|---|
| **GLM-4.7-Flash** | MoE text LLM | 200K input context, up to 128K output cap (4,096 max_tokens per response, default 500), temperature 0.0–1.0 (default 0.7), **native tool calling**, "Enable Thinking" step-reasoning mode, custom system Instructions. Available in the IN data centre. |
| **Qwen 3.6 – 35B Vision Language** | 35B MoE, 3B active, multimodal | Image + text in. |

**Zia microservices** (ready-made, no training):
Text Analytics (sentiment + NER + keyword extraction, **1500 char limit per
request**), OCR (beta), Face Analytics, Identity Scanner (beta), Image
Moderation, Object Recognition, Barcode Scanner.

**Trained NLP Models (Zia)** — evaluated 2026-08-26, and this is a real find:
**all three support Kannada**, Karnataka's official language, which nothing
else in the stack does. Same auth as GLM (`CATALYST-ORG` +
`Zoho-oauthtoken`, scope `QuickML.deployment.READ`) - `llm.ts`'s token logic
covers these too, just a different endpoint.

| Model | Method | Endpoint | Kannada? |
|---|---|---|---|
| **Text-to-Audio Synthesis** | POST, `application/json` in → `audio/wav` out | `.../models/zia/audio/synthesize` (path inferred, confirm in console) | ✅ `kn`, incl. named Kannada voices (Suresh/Chetan/Anu/Vidya) |
| **Audio-to-Text Transcription** | POST, `multipart/form-data` in (WAV/MP3) → JSON out | `https://api.catalyst.zoho.in/quickml/api/v1/models/zia/audio/transcribe` | ✅ Kannada language identifier |
| **Text Translation** | POST, `application/json` → JSON | `https://api.catalyst.zoho.in/quickml/api/v1/models/zia/translate` | ✅ Kannada ⇄ English + 8 other Indian languages |

**Why this matters more than it looks:** the PS's own diagnosis is
"Excel-based reporting" and "data silos" - a lot of that friction in a real
Karnataka station is a **Kannada-English gap**, not just a paper-vs-digital
one. Witness statements and FIR narratives are routinely given in Kannada;
an SCRB state-level report needs English (and NCRB needs it nationally).
Audio-to-Text + Translation is a real answer to that, not a demo trick - and
unlike OCR/Face/Object Recognition (blocked on P6.0, since we have zero
images), **audio is a track we're not blocked on**: Text-to-Audio can
synthesize the input Audio-to-Text would need, straight from prose we
already have (`WitnessStatements[].statementText`), no external asset
sourcing required. See PLAN.md P7 for the buildable slice of this.

**Also present in the console, not yet evaluated:** RAG, Knowledge Base,
Pipelines, Endpoints.

## 2.2 The LLM Serving API contract — ✅ read from the console (P5.0)

Taken from *Generative AI → LLM Serving → model → Model Details → API
Details* + the Sample Request and Response tab, 2026-08-25. **Not from public
docs — they don't document this.** Both models are POST, OAuth, scope
`QuickML.deployment.READ`.

Common to both: org `60079393411`, project `56806000000070001`.

### The single most important gotcha: display name ≠ model id

The string you put in `"model"` is **not** the name shown in the console.
Getting this wrong is the most likely first failure:

| Console shows | `"model"` must be | Endpoint path |
|---|---|---|
| GLM-4.7-Flash | `crm-di-glm47b_30b_it` | `/glm/chat` |
| Qwen 3.6 - 35B Vision Language | `VL-Qwen3.6-35B-A3B` | `/vlm/chat` |

### The two endpoints are NOT the same API

This is the second thing that will bite. GLM is OpenAI-compatible; the VLM is
a bespoke flat-prompt shape. Do not write one client for both.

```
POST https://api.catalyst.zoho.in/quickml/v1/project/56806000000070001/glm/chat
POST https://api.catalyst.zoho.in/quickml/v1/project/56806000000070001/vlm/chat
```

**GLM — OpenAI chat-completions shape.** Request takes `messages[]`
(role/content), `max_tokens`, `temperature`, `stream`, `tools[]`,
`tool_choice`, plus a Zoho extension `chat_template_kwargs:
{enable_thinking: bool}`. Response is a standard `chat.completion`:
`choices[0].message` with `content`, `tool_calls[]`, `finish_reason`, and a
top-level `usage`.

Two details that matter for P5.2/P5.6:
- `tool_calls[].function.arguments` is a **JSON-encoded string**, not an
  object. Parse it, and parse it defensively.
- With `enable_thinking: true` the message carries a non-standard
  **`reasoning`** field alongside `content`. It is the model's scratchpad.
  Log it for the audit trail; **never render it as a finding** — it contains
  hedging and discarded hypotheses, exactly the "vague suspicion" the
  citation guardrail exists to keep out of the UI.

**VLM — flat prompt, no tool calling.** Request is `{prompt, model, images[],
system_prompt, top_k, top_p, temperature, max_tokens}` where `images[]` are
base64 strings. Response is `{request_id, model, response, metrics}` — and
`response` is a **raw string**, which in the vendor's own sample arrives
wrapped in a ` ```json ` markdown fence. Strip the fence before parsing; do
not assume valid JSON. No `tools` support, so structured output here is
prompt-discipline plus validation, not a schema guarantee.

### Errors and latency

Error responses use a completely different shape from success —
`{code, message, details: {reason}}` — so branch on the shape, not on a
status code alone. Note the vendor's own sample has `details.reason: ""`,
so assume error detail may be empty and log the raw body.

The VLM sample reports `queue_wait_time` 2.4s and `total_time_taken` 8.9s for
256 output tokens. **There is a queue.** Timeouts must be generous and every
call needs a fallback path — see P5.1.

### ✅ Resolved 2026-08-26: BOTH `Authorization` schemes work

Verified against `/glm/chat` with a real access token — `Zoho-oauthtoken
<token>` and `Bearer <token>` both return HTTP 200 for the identical request.
The disagreement between the console and the code samples was real but
harmless; the gateway accepts either. **Use `Zoho-oauthtoken`** in
`llm.ts` anyway, since it's the scheme the console itself documents and the
one that will keep working if `Bearer` is ever tightened up.

**What was actually blocking every prior call was two compounding problems,
not the auth scheme:**
1. The token in use was a **grant token used as an access token** (see the
   ruled-out table below) - a genuinely dead token, hence the bare 401s.
2. Once a real token was minted, the *next* failure was
   `CATALYST-ORG_HEADER_UNAVAILABLE` - **the `CATALYST-ORG` header is
   required** and wasn't in the earlier probes. Add it:
   `CATALYST-ORG: 60079393411`.

A third, non-blocking finding: sending the JSON body as a literal
command-line string through PowerShell mangles embedded quotes before curl
ever sees them (`JSON_PARSE_ERROR` / `zoho-inputstream`). Write the body to a
file and use `curl --data-binary @file.json`, on Windows specifically.

### ⚠️ NEW finding: the real response shape doesn't match the console's own sample

A live call returns:

```json
{"response": "...", "tool_calls": [], "usage": {...}, "model": "...", "created_time": 1787721087}
```

**Not** the OpenAI `chat.completion` shape (`choices[0].message.content`)
the console's Sample Response tab documents. The actual reply text is the
top-level `response` string, not `choices[0].message.content`. `tool_calls`
is still a top-level array, not nested under `message`. **Write `llm.ts`
against this real shape, not the sample** - anyone who trusted the sample
would have a client that silently reads `undefined` from every call.

(Not yet re-verified: whether `tool_calls[].function.arguments` is still a
JSON-encoded string in this shape, since this smoke test didn't exercise
tool calling. Confirm with a real tool-calling request before P5.2 relies on
it.)

### ✅ Resolved 2026-08-26: the refresh_token grant works

`src/lib/llm.ts` mints via `grant_type=refresh_token` (not the
`authorization_code` exchange used once to bootstrap `.env.local`) and it
was exercised for real on the first dev-server request - the minted token's
prefix differed from the one written to `.env.local`, proving a fresh mint
rather than a reused cache hit. `QUICKML_REFRESH_TOKEN` +
`QUICKML_CLIENT_ID`/`SECRET` are therefore sufficient going forward;
`QUICKML_ACCESS_TOKEN` in `.env.local` is now just the original bootstrap
value and `llm.ts` never reads it.

Also confirmed live: **GLM does not reliably follow short-output
instructions.** Asked twice to "reply with exactly one word," it narrated
step-by-step reasoning instead and got truncated by `max_tokens`. Not a bug
in the client - a real model-behavior property to design around. P5.2's
contradiction detector should lean on `tools`/`tool_choice` for structured
output rather than parsing free text, which sidesteps this rather than
fighting it with prompt instructions.

Also note what "OAuth" implies and a static API key does not: **the access
token is short-lived** (Zoho's are typically ~1 hour). `src/lib/llm.ts`
therefore needs token acquisition + caching + refresh, not a constant read
once from the environment. There is no existing OAuth handling anywhere in
this repo — `initCatalyst()` in `zcql.ts` relies on Slate injecting request
context for Data Store access, which is a different mechanism and does not
obviously yield a QuickML token. Resolving how the token is minted on Slate
is the remaining piece of P5.1.

#### What we've ruled out so far (2026-08-25)

Two rounds of live calls, both **inconclusive on the scheme** — the token was
rejected before the scheme mattered, so neither round is evidence either way:

| Probe | Result |
|---|---|
| `/glm/chat` + `Zoho-oauthtoken` | 401, **empty body** |
| `/glm/chat` + `Bearer` | 401, **empty body** |
| `/glm/chat` without `CATALYST-ORG` | 401, empty body |
| `baas/v1/project` (plain Catalyst, same token) | 401, empty body |

That last row is the informative one. The token fails against **plain
Catalyst BaaS too**, not just QuickML — so it isn't a scope or a
QuickML-specific header problem. A missing scope on BaaS would return a scope
error, not a bare 401. The token simply isn't recognised. Repeated with a
freshly generated token; identical result.

**Most likely cause: the grant token is being used as the access token.**
Zoho's Self Client is a two-step flow and *both* values have the same
`1000.xxx.yyy` shape, which makes them trivial to confuse:

1. **Generate Code** → a **grant token**, valid ~10 minutes, not an API
   credential.
2. Exchange it at `accounts.zoho.in/oauth/v2/token` (`grant_type=
   authorization_code`) → the actual `access_token`.

Skipping step 2 produces exactly this signature: 401 on every endpoint, every
scheme. Two other candidates worth eliminating at the same time — the token
must be minted in the **India** DC (`accounts.zoho.in` /
`api-console.zoho.in`) to match the `api.catalyst.zoho.**in**` host, and the
scope must include `QuickML.deployment.READ` at code-generation time.

**Confirmed regardless of how this resolves:** the 401 body is **empty**, not
the documented `{code, message, details}` error shape. So `llm.ts` cannot
assume an error response is parseable JSON — it must handle an empty body and
fall back to the status code. That's a real finding from these calls even
though the auth question is still open.

**Silver lining for P5.1:** working through the Self Client exchange yields
the `client_id` / `client_secret` / `refresh_token` triple, which is exactly
what the deployed Slate build needs to mint its own access tokens. That turns
the OAuth dance into one-time setup rather than an hourly chore, and answers
P5.1's "how does the deployed build get a token" question as a side effect.

**Never commit the token.** The org id, project id and endpoint URLs above
are identifiers, not secrets, and are fine in this doc. The access token (and
any client secret / refresh token used to mint it) belongs in `.env.local`,
already covered by `.gitignore`'s `.env*.local`, and in Catalyst's own
environment config for the deployed build.

## 2.3 What our data can actually feed

This is the part that determines what's buildable *now* vs. what needs new data.

**Real free text we already have (this is the good news):**
- `CaseMaster.BriefFacts` (Text) — a narrative per case, **populated in the seed**
- `WitnessStatements.json` — 22 statements, real `statementText` prose
- `scenarioMeta.json` — 15 scenarios with `title` + `summary` prose
- `Contradictions.json` — **15 hand-authored contradiction descriptions**
- `CallRecords`, `Transactions`, `CCTVSightings`, `TimelineEvents` — structured

**The critical observation about `Contradictions.json`:** those 15
contradictions are *pre-authored by us*, not detected. Right now the app
"finds" contradictions it was told about. That's the honest gap — and it's also
a gift: **those 15 become the ground-truth eval set.** If a detector we build
independently rediscovers them from `WitnessStatements` + `CCTVSightings` +
`CallRecords`, we have a real, measurable claim. If it doesn't, we know.

**What we do NOT have:** any images. So Qwen-VL, OCR, Face Analytics, Identity
Scanner, Image Moderation, Object Recognition and Barcode Scanner have **no
input** unless we generate or source case-document scans / CCTV stills. This is
why Zia goes last — agreed.

## 2.4 Honest fit assessment per capability

| Capability | Tool | Verdict |
|---|---|---|
| Contradiction detection across sources | GLM-4.7-Flash (tool calling + 200K ctx) | ✅ **Best fit.** Whole scenario fits in context; tool calling gives us structured, citable output |
| "Next question to ask" agent | GLM-4.7-Flash | ✅ Same engine, different phrasing step |
| Entity fusion / repeat-offender linking | **Deterministic code, not LLM** | ✅ Union-find over name variants + IDs. Don't reach for an LLM here — it's a correctness problem, not a language problem |
| Suspicion score + explainability | Weighted signals in code; LLM only writes the explanation | ✅ Keep the number deterministic and auditable |
| FIR narrative → structured entities | Zia NER, or GLM | ⚠️ Zia caps at 1500 chars; GLM has no such limit and gives citations. **Prefer GLM**, keep Zia as a cheap cross-check |
| Sentiment on complainant statements | Zia Text Analytics | ❌ **Skip.** Sentiment on a crime complaint is not a meaningful policing signal — it would be analytics theatre |
| Case-document OCR, CCTV image analysis | Zia OCR / Qwen-VL | ⏸️ Blocked on having images at all |
| Predictive risk scoring / hotspot forecast | QuickML Pipelines (classical ML) | ⏸️ Needs a real historical baseline the seed doesn't carry yet |
| Socio-economic overlays | — | ⏸️ Needs an external census/urbanization dataset we have no source for |

---

# Part 3 — Things to be done

Three tracks. **A and B run in parallel** (different people, no shared files).
C is gated behind having images at all.

## Track A — Domain correctness (no AI, unblocks nothing else)

Small, safe, mostly mechanical. Good for whoever isn't on the AI track.

- [x] **A1.** ~~Replace derived `handlingLevel` with seeded `assignedTo` +
      `assignmentReason`~~ — **done**, commit `38853d5`.
- [ ] **A2.** Add Range options to the district drill-down filter (see §1.4a
      as reframed); generalise `scenarioInDistrict()` to a district-set test.
      Now tracked as **X1** in [`PLAN.md`](PLAN.md).
- [ ] **A3.** Document the commissionerate-vs-district modeling shortcut in
      `DATA_STORE_SCHEMA.md`.
- [x] **A4.** ~~Reframe the Dashboard copy so statewide reads as the SCRB
      intelligence view~~ — **done** (P0.4/P0.5, `c349d48` / `db5b1bd`).
- [x] **A5.** ~~Decide the fate of `feature/state-district-scope`~~ — merged
      to `main` and the branch deleted. The Crime Hotspots fix it carried is
      now live; the scope model it carried was reworked (P0.5).

## Track B — AI, on GLM-4.7-Flash (the real differentiator)

- [ ] **B0. 🚧 BLOCKER — get the real LLM Serving API contract** from the
      console (2.2) and paste endpoint + headers + request/response schema
      into this doc. Nobody writes client code before this.
- [ ] **B1.** `src/lib/llm.ts` — a thin server-side GLM client. Route
      Handler-only (credentials never reach the browser), typed request/
      response, timeout + graceful fallback, and **every call logged with its
      prompt + response** so we can show the working.
- [ ] **B2.** **Entity fusion (deterministic).** Union-find over
      `Accused`/`Victim`/`ComplainantDetails` + NoSQL persons. Canonical person
      ID stable across cases. **No LLM.** This is `features.md` #1 and it is
      still the foundation — B3/B4/B5 are all reasoning over it.
- [ ] **B3.** **Cross-source timeline merge** (`features.md` #6) — one ordered
      timeline per person, each event tagged with which source reported it.
- [ ] **B4.** **Contradiction detector.** GLM + tool calling over a fused
      person's timeline, returning structured `{claim, conflictingClaim,
      sourceRecordIds[], confidence}`. **Evaluate against the 15 authored
      contradictions in `Contradictions.json`** — report the real hit rate,
      including misses.
- [ ] **B5.** **"Next question to ask"** — phrasing layer on B4's output.
      Same engine, different prompt.
- [ ] **B6.** **Suspicion score** — deterministic weighted signals feeding the
      existing `RiskGauge` in `AIPanel.tsx`; GLM only writes the prose
      explanation, never the number.
- [ ] **B7.** **Citation guardrail** (`features.md` #5) — enforce in the tool
      schema itself: no finding is renderable without at least one real record
      ID. Build this into B4's contract from day one, not after.
- [ ] **B8.** **Repeat-offender view** — the cross-case surface B2 unlocks.
      This is the PS's "impossible in Excel" claim made literal, and it's
      SCRB/CID-facing, not IO-facing.

## Track C — Zia (last, and only if we get images)

- [ ] **C1.** Decide: do we generate synthetic case-document scans / CCTV
      stills at all? If no, Track C is closed — say so and stop.
- [ ] **C2.** If yes: OCR on a scanned FIR → extracted text → GLM structuring.
      A genuinely good demo of "paper record → queryable intelligence," which
      is exactly the PS's framing.
- [ ] **C3.** Qwen-VL on a CCTV still → description cross-checked against the
      `CCTVSightings` record. Only meaningful *after* B4 exists to check against.
- [ ] **C4.** Zia NER on `BriefFacts` as a cheap cross-check on B2's entity
      extraction. Cap-aware (1500 chars) — chunk or skip long narratives.
- [ ] **Explicitly not doing:** sentiment analysis on complaints, face
      recognition on synthetic faces, barcode scanning. No policing value here;
      including them would be feature theatre. (Face recognition on real police
      data would also be a serious civil-liberties question we should not
      hand-wave in a demo.)

## Sequencing at a glance

```
Track A  ──────────────────────────────────>  (independent, any time)

Track B  B0 ──> B1 ──> B2 ──> B3 ──┬──> B4 ──> B5
  blocker      client   fusion   timeline │      B6, B7, B8
                                          └── eval vs. the 15 authored contradictions

Track C                                    ────> gated on C1 (do images exist?)
```

---

# Part 4 — Open decisions (for the planning session)

1. **Merge or rebase `feature/state-district-scope`?** It's unmerged and Track
   A builds on it. Decide before A1.
2. **Who takes which track?** A and B genuinely don't collide — different files.
3. **Do we invest in images at all** (C1)? A yes/no now saves arguing later.
4. **Does the 15-contradiction eval get shown in the UI?** Reporting "our
   detector found 11 of 15, and here are the 4 it missed" is a much stronger
   claim to a judging panel than a silent AI panel. Recommend yes.
5. **Is the Range tier worth the effort**, or is it academically correct but
   demo-irrelevant? It's cheap (A2), but it's not zero.
6. **Do we ever wire real Catalyst Authentication?** Everything scope-related
   today is a client-writable cookie — a display preference, not access
   control. Fine for a demo; needs saying out loud, not discovering.

---

# Part 5 — Data Store audit (added 2026-08-25)

Triggered by the right question: *"are we using all the tables they gave us?"*
The organizers' ER diagram is not documentation — **it is a specification of
the features they expect.** Every column they defined and we ignore is an
unmet requirement.

## 5.1 The headline numbers

| | Count |
|---|---|
| Tables in the organizers' ER diagram | **27** (21 backbone + 6 extended) |
| Tables built + seeded in Catalyst | 20 |
| **Tables the app ever reads** | **4** |
| Tables seeded but never read once | 16 |
| Backbone tables never even seeded | 1 (`ChargesheetDetails`) |
| Extended tables never built | 6 |

The four we read: `CaseMaster`, `CrimeSubHead`, `District`, `Unit`.
That is **15% of the schema we were handed.**

It's worse one level down. `CaseMaster` has 18 columns; we read **5** —
`CaseMasterID`, `CrimeRegisteredDate`, `CaseStatusID`, `PoliceStationID`,
`CrimeMinorHeadID`. Confirmed by grep: **nothing in `src/` reads**
`latitude`, `longitude`, `IncidentFromDate`, `IncidentToDate`, `BriefFacts`,
`GravityOffenceID`, `CaseCategoryID`, `CourtID`, or `PolicePersonID`.

## 5.2 The unused columns ARE the unbuilt PS capabilities

This is the part that matters. Line up what we ignore against what the
problem statement asks for:

| Unused table / column | PS capability it directly unlocks |
|---|---|
| `CaseMaster.latitude` / `longitude` | Hotspot map on **real incident coordinates** — the map's headline feature |
| `CaseMaster.IncidentFromDate` (time of day) | *"Spatiotemporal Clusters: layering **time of day** with location"* — **named verbatim in the PS**, and the column is already seeded |
| `Accused.PersonID` | **Repeat-offender tracking across jurisdictions** — the organizers gave us a person key on purpose |
| `GravityOffenceID` (Heinous / Non-Heinous) | The primary NCRB/SCRB severity split; every state crime report leads with it |
| `ChargesheetDetails` | Chargesheet rate + **time-to-chargesheet** — a core SCRB performance metric |
| `Act` / `Section` / `ActSectionAssociation` | MO by legal section; "same sections charged" is a real case-linkage signal |
| `Employee` / `Rank` / `Designation` | IO workload, clearance rate by officer and unit |
| `Court` | Disposal and prosecution tracking |
| `CasteMaster` / `ReligionMaster` / `OccupationMaster` | *"Socio-Economic Correlation... urbanization, population, socio-economic indicators"* — **also named in the PS.** `ComplainantDetails` already has all three FK columns |
| `CaseCategory` (FIR / UDR / **Zero FIR** / PAR) | Zero FIR = registered outside jurisdiction then transferred — inherently an SCRB-level view |

**Conclusion: we do not have an "AI features missing" problem so much as a
"we are using 15% of the given schema" problem.** Most of what the PS asks
for is reachable from columns already sitting in the Data Store.

## 5.3 Two bugs found during the audit

### (a) `Accused.PersonID` was unusable as a person key — ✅ fixed (P1.1)
The organizers put a `PersonID` Text column on `Accused` — the natural
cross-case person identifier. Our seed populated it with **scenario-local
labels** (`A1`, `A2`, `A3`, `A4`) that collided across scenarios:

```
A1 -> 17 distinct names: Suresh Naik / Suresh N. / Praveen Achari / Zoya Merchant ...
A2 -> 18 distinct names: Deepak M / Manoj Kumar S / Tarun Bhatia ...
A3 -> 12 distinct names   A4 -> 5 distinct names
```

The one column designed for repeat-offender tracking made 17 different people
look like the same person. This was a seed bug, not a schema bug.

**Fixed:** `PersonID` is now a global register handle, `KA-P0001`…`KA-P0047` —
47 distinct people across 53 `Accused` rows, one ID per human, stable dataset-
wide. The 6 people who appear in more than one FIR keep a single ID across
them, and their different name spellings are preserved rather than normalised
away, because that alias pair *is* the entity-fusion signal P3.1 has to catch:

```
KA-P0001  cases 9001+9002  Suresh Naik / Suresh N.
KA-P0008  cases 9004+9005  Zoya Merchant (QuickCash) / Z. Merchant (RapidFin)
KA-P0009  cases 9004+9005  Tarun Bhatia (call-centre lead) / Tarun Bhatia
KA-P0020  cases 9009+9010  Halappa D
KA-P0021  cases 9009+9010  Somesh K (truck driver) / Somesh Kumar
KA-P0039  cases 9016+9017  Deepak Rathore (card cloner) / Deepak Rathore
```

### (a2) The evidence layer's person citations resolved 0 of 47 — ✅ fixed (P1.1)
Found while fixing (a). Every NoSQL evidence record ships a `resolvedPersons`
map whose stated purpose is citation-grounding — giving a later entity-fusion
pass real record IDs to merge rather than narrative labels. It was keyed by the
scenario-local `Accused.PersonID` (`A1`…`A4`), while every call, CCTV sighting,
witness statement and timeline event cites people by a *different* token
(`P1`…`P4`). The two ID spaces never met, so **not one of the 47 person
citations in the dataset resolved.**

It went unnoticed because the only consumer, `dashboardData.ts`, reads
`Object.values(resolvedPersons)` — values only, never keys — so the person
counts looked right while the join underneath was dead.

**Fixed:** each scenario in `cases.json` now carries a machine-readable
`personIndex` (`{"P1": "KA-P0001", …}`) bridging narrative token → global
`PersonID`; `resolvePersonRefs()` in `build_seed.mjs` keys the map by the token
the records actually cite. **107/107 citation occurrences now resolve.** The
hand-authored `personRefs` prose glossary is untouched and stays the human-
readable note. This is what P5.6's citation guardrail ("no finding renders
without a real record ID") depends on to be enforceable at all.

### (b) We swapped a 406-case dataset for a 19-case one
Two seeds exist and only one is live:

| | `catalyst/seed/` (original) | `catalyst/dataset-v2/` (**live**) |
|---|---|---|
| `CaseMaster` | **406** | **19** |
| `Victim` / `Accused` / `Complainant` | 406 / 406 / 406 | 14 / 53 / 22 |
| `ChargesheetDetails` | **233** | **absent** |
| Authored scenarios + evidence | none | **15, with NoSQL evidence** |

dataset-v2 is far richer *per case* but **21× smaller**. Across 8 districts
and 5 years, 19 cases is roughly **half a case per district per year** —
you cannot do trend analysis, hotspot clustering, anomaly detection or
predictive risk on that, and those are four of the PS's six asks.

Note the local dashboard shows ~2,880 FIRs; that is the **mock fallback** in
`data.ts` (local dev has no Catalyst context). The deployed app's real
number is 19. Worth being clear-eyed about before any demo.

## 5.4 On wiping the Data Store

Wiping is safe and cheap — every table is regenerated deterministically from
`cases.json` via `build_seed.mjs`, and re-imported with `catalyst ds:import`.

**But do not wipe first.** The rows aren't the problem; the *generator* is.
Wiping now just reproduces the same 15%-of-schema dataset. Correct order:

1. Fix the generator (Track D below).
2. Regenerate locally and verify the CSVs.
3. **Then** wipe and re-import once, cleanly.

## 5.5 Track D — make the seed match the schema

Runs alongside Tracks A and B; it is the true unblocker for most of B and C.

- [x] **D1.** ~~Make `Accused.PersonID` globally unique and stable, and reuse
      the same ID for the same human across scenarios~~ — done, §5.3(a).
      `KA-P0001`…`KA-P0047`. Also fixed the evidence layer's 0/47 citation
      join found alongside it, §5.3(a2).
- [ ] **D2.** **Merge the two seeds.** One dataset that is both broad
      (hundreds of cases, for statistics to mean anything) and deep (the 15
      authored scenarios with full evidence). Generate the bulk cases
      statistically, keep the 15 hand-authored ones as the rich subset.
- [x] **D3.** ~~Populate `latitude`/`longitude` with real per-incident
      coordinates inside the right district~~ — done. The coordinates were
      already real and in the right district; the defect was that they were
      **reused** (19 FIRs over 14 points, 5 station centroids serving 2 cases
      each). Now 19/19 distinct, anchored on their authored location.
      `catalyst/dataset-v2/geo_time.mjs`.
- [~] **D4.** Time-of-day profiles built and calibrated, but **nothing to
      apply them to yet** — the authored 15 already carry realistic times, or
      correctly carry none (period offences). Real target is P1.2's bulk
      cases. See PLAN.md P1.4 for why one apparent gap turned out to be
      load-bearing, and the `isPeriodOffence()` warning that P4.2 depends on.
- [ ] **D5.** Seed `ChargesheetDetails` (it exists in the original seed —
      port it) to unlock chargesheet rate and time-to-chargesheet.
- [ ] **D6.** Populate `OccupationID` / `ReligionID` / `CasteID` and build
      the three lookup tables, for the socio-economic correlation the PS
      names. **Handle with care** — caste/religion breakdowns of crime data
      are legitimate NCRB reporting practice but trivially misread; present
      them as victim/complainant demographics with explicit denominators,
      never as an offender-propensity signal.
- [ ] **D7.** Then wipe + re-import, and record row counts here.

## 5.6 Revised priority

Track D outranks most of Track B. Contradiction detection over 15 scenarios
is a nice demo; **hotspots, trends, anomaly detection and predictive risk
are four of the six PS asks and all four are blocked on D2/D3/D4**, not on
any LLM. Sequence: **D1–D4 → Phase 1/2 UI work → B2 person spine → B4 AI.**

---

# Part 6 — P5.2/P5.3 eval, run for real (2026-08-26)

Ran the contradiction detector against all 15 authored contradictions, not
estimated. Real result: **1 hit / 15**, and the reason is the finding, not
the number itself.

## 6.1 The false assumption

`Contradictions.json`'s `conflictingRecords` was assumed to always be a
2-record pair (`[claimId, conflictingId]`) — true for exactly **2 of 15**
scenarios (C1, C5). The other 13 are 3-4 record chains:

```
C2  3  ["C2-WS-2","C2-CC-2","C2-CL-1"]
C6  4  ["C6-WS-2","C6-CL-1","C6-CL-2","C6-WS-1"]
C13 4  ["C13-WS-1","C13-TX-1","C13-TX-2","C13-CL-3"]
...
```

A pair-only detector schema made those 13 structurally unfindable regardless
of how well the model reasoned. Found by running the eval, not by re-reading
the schema — `contradictionDetector.ts`'s `recordIds: string[]` (min 2)
replaces the fixed pair.

## 6.2 The deeper finding: most contradictions are cross-person

Even after fixing the schema, 13/15 still miss - `findOwner()` (does one
person's fused timeline contain every ground-truth id?) returns null for
them. Verified on **C2**, not assumed: traced each cited record to its
person via `resolvedPersons`.

```
C2-WS-2  relatedPerson P4  -> Ravindra Naidu (fence, pawnbroker) - alibi
C2-CC-2  personOrVehicle "P1 entering with a bag"    -> Praveen Achari, sighted
C2-CL-1  from P1, to P4                              -> Praveen calls Ravindra
```

The contradiction is: Ravindra's alibi (WS-2) is undercut by Praveen being
sighted (CC-2) *and* the call between them (CL-1) placing them in contact —
**two people's records, read together**, not one suspect's own claims
conflicting. C1 (the one hit) is the exception: Suresh's own witness
statement contradicts a CCTV sighting of *his own* vehicle - genuinely
single-person.

**Implication:** P5.2 as literally specified ("contradiction detector over
a fused person's timeline") can only ever address single-person cases —
a minority of this dataset (2 of 15). The detector itself is not shown to
be wrong by this result; it was pointed at too narrow a slice of the
evidence. **P5.2b (PLAN.md) generalizes to scenario-level evidence** —
every person's timeline merged for a scenario, not filtered to one — before
any hit-rate number should be shown to anyone.

## 6.3 Two bugs the eval run also caught live

- **`llm.ts`'s `text` field could be `undefined` on a live 200**, despite
  its type declaring `string` - a truncated/malformed generation can omit
  `response` from the body entirely. Crashed a caller
  (`contradictionDetector.ts`'s error-path `.slice()`) that reasonably
  trusted the type. Fixed by defaulting `text: parsed.response ?? ""` at
  the source, not by defensive-coding every caller separately.
- The original pair-only schema (6.1) was itself found by running data
  through the eval, not by review - a reminder that this project's pattern
  of "verify against real data before trusting a type or a schema" applies
  to code we write ourselves, not only to the vendor's docs.
