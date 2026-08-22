# Proposed features — investigation intelligence layer

Source: user-proposed, repurposed from another project ("ACPIA") and the
"Mentalist"/PS1 discussion. I don't have visibility into ACPIA's actual
implementation (not referenced anywhere in this repo) — this doc evaluates
each idea purely on fit with Raksha-Drishti's current code and data.

**Overall take: good direction, and not scope creep.** All 6 map directly
onto parts of the Investigation Workspace that are *already* stubbed as
mock/placeholder — `AIInsight.riskScore`/`insights` in
[`src/lib/investigationData.ts`](src/lib/investigationData.ts) is literally
today's fake version of #2, `EvidenceType` already lists `"Call Detail
Record"` and `"CCTV Footage"` as flat mock items, `TimelineEvent` already
exists as a shape. This is filling in what the README already marks
"Pending — feature to be added," not adding a new surface.

**The catch:** none of call records, financial transactions, CCTV logs, or
witness statements exist anywhere in the organizer's FIR ER diagram (see
[`catalyst/DATA_STORE_SCHEMA.md`](catalyst/DATA_STORE_SCHEMA.md)) or the
Data Store. These are genuinely new data sources beyond the given schema —
they'd live in Catalyst NoSQL (already earmarked for investigation-board
data) or a new set of Data Store tables invented for this purpose, seeded
synthetically the same way `gen_seed.py` seeds FIR data today.

## 1. Entity fusion layer
Union-find identity resolution — merge a person across FIRs, call records,
financial transactions, CCTV logs, and witness statements into one canonical
profile despite inconsistent names/IDs across sources.

- **Maps to:** the entity graph in
  [`InvestigationWorkspaceClient.tsx`](src/components/investigation/InvestigationWorkspaceClient.tsx)
  / `entities.suspects|victims|witnesses|...` in `investigationData.ts` —
  currently these are independently-generated mock lists with no real
  cross-source linkage at all.
- **New data needed:** call records, transactions, CCTV logs, witness
  statements — none exist yet. `Victim`/`Accused`/`ComplainantDetails` (real
  Data Store tables) are the only real "person" sources today.
- **This is the foundation feature.** #2, #3, #4 all need a fused
  multi-source profile to reason over — build this first or the "AI" layer
  on top is just reasoning over disconnected mock lists again.

## 2. AI-generated suspicion score with explainability
Weighted signals (crime-scene proximity, contact frequency with known
offenders, transaction anomalies, repeat-offense pattern) instead of a
black-box number; surface which sources contributed and how much.

- **Maps to:** `AIInsight.riskScore` + the `RiskGauge` component in
  [`AIPanel.tsx`](src/components/investigation/AIPanel.tsx) — the UI
  (animated gauge, color bands) already exists and works, it's fed a
  hardcoded seeded number today. This is a real win: swap the number source,
  keep the UI.
- **Depends on:** #1 (fused profile) for the input signals to actually mean
  something.

## 3. "Next question to ask" agent
LLM agent over a person-of-interest's accumulated data flags gaps/contradictions
(e.g. stated location vs. cell tower ping) and generates a specific follow-up
question tied to the discrepancy.

- **Maps to:** new addition to `AIPanel.tsx` / `AIInsight` — no current
  equivalent (`recommendedActions` is close in shape but static/generic, not
  discrepancy-driven).
- **This is the standout feature** — turns the workspace from dashboard into
  active decision support, matches the PS1 angle directly. Real engineering
  lift: needs an LLM call (Claude API) grounded in the fused timeline/profile,
  not just UI work.
- **Depends on:** #1 and #6 (needs real cross-source data + a merged timeline
  to find the contradiction in, in the first place).

## 4. Contradiction detector across sources
Cross-check statements against call logs, transaction timestamps, camera
metadata; flag mismatches automatically instead of manual cross-referencing.

- **Maps to:** would feed both `AIPanel.tsx` (flag list) and
  `EvidencePanel.tsx`/`EvidenceBoard.tsx`.
- Largely the same underlying engine as #3 (contradiction-finding is the hard
  part; #3 is "detect + phrase as a question", #4 is "detect + flag") — worth
  building as one shared module, not two.
- **Depends on:** #1 and #6.

## 5. Citation-grounded leads (non-negotiable)
Every AI-suggested lead/suspicion flag must cite the exact record (transaction
ID, call log line, witness statement) it came from. No hallucinated leads.

- **This is a guardrail, not a standalone feature** — it constrains how #2/#3/#4
  must be built from day one, not something bolted on after. Every signal
  the suspicion score weighs, every contradiction flagged, every generated
  question must carry a record reference back to real seeded data.
- Directly relevant given `DATA_STORE_SCHEMA.md` already flags that
  investigation-board data has no real table backing it yet — if that gap
  gets filled with LLM-generated content instead of real (even if synthetic)
  records with IDs, this guardrail is unenforceable. Build the data model
  before the AI calls, not after.

## 6. Timeline as shared data model
Merge all source timestamps (calls, transactions, camera, statements) into
one entity timeline, with the same skepticism toward device-reported
timestamps already built into ACPIA.

- **Maps to:** `TimelineEvent[]` + [`TimelinePanel.tsx`](src/components/investigation/TimelinePanel.tsx)
  — shape already exists, currently populated from the seeded mock generator
  only, single-source (no notion of "which source reported this timestamp"
  or confidence in it).
- Second foundation piece alongside #1 — #3 and #4 both need this to exist
  and be genuinely cross-source before they can find anything real to flag.

## Recommended build order
1. **Data model first** (#1 entity fusion + #6 shared timeline) — deterministic
   engineering, no LLM needed, and everything else depends on it existing.
   Decide now: new Data Store tables vs. Catalyst NoSQL for
   calls/transactions/CCTV/statements (NoSQL is the better fit — matches the
   existing note in `DATA_STORE_SCHEMA.md` and these sources don't need ZCQL
   relational joins).
2. **#5's citation requirement baked in from the start** of step 1 — every
   synthetic record needs a stable ID before anything reasons over it.
3. **#2 suspicion score** — swap `AIPanel.tsx`'s existing gauge onto real
   weighted signals. Fastest visible win once #1 exists.
4. **#4 contradiction detector**, then **#3 next-question agent** on top of
   the same detection engine — #3 is strictly harder (needs to *phrase* a
   question, not just flag a mismatch), so build #4's detection first and
   layer #3's LLM phrasing on top.

## Open question
Want me to pull in more detail from ACPIA's actual union-find/correlation-scoring
implementation before starting #1/#2, or design these from scratch against
this codebase's shapes?
