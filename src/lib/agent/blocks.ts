// -----------------------------------------------------------------------------
// Agent Workspace (#16) - the result blocks the agent can put on screen.
// Shared by the server (src/lib/agent/tools.ts builds them) and the client
// (src/components/agent/* renders them), so this file must stay free of any
// server-only import.
//
// The trust rule from #16, enforced by construction: a block is only ever
// built in code, from a tool's own result. The model chooses WHICH tool and
// WHICH arguments; it never writes a block, a chart spec, or a number.
// Every block carries its provenance (tool, arguments, data source, rows)
// for the "How was this made?" panel, and says whether its data is real
// (KSP / Census) or the app's demo case data.
// -----------------------------------------------------------------------------

export type DataKind = "real" | "demo";

export type Provenance = {
  tool: string;
  args: Record<string, unknown>;
  kind: DataKind;
  source: string;
  rows: number;
  notes?: string[];
};

type Base = { id: string; title: string; subtitle?: string; provenance: Provenance };

export type Block =
  | (Base & { kind: "stats"; items: { label: string; value: string; hint?: string }[] })
  | (Base & { kind: "bar"; unit?: string; signed?: boolean; rows: { label: string; value: number }[] })
  | (Base & { kind: "line"; unit?: string; points: { label: string; value: number }[] })
  | (Base & { kind: "table"; columns: string[]; rows: (string | number)[][]; links?: (string | null)[] })
  | (Base & {
      kind: "districtMap";
      metric: "ratePerLakh2025" | "changePct";
      /** censusCode -> value; the client draws the polygons. */
      values: Record<string, number>;
      highlight?: number[];
    })
  | (Base & { kind: "hotspotMap"; district: string | null; crimeType: string | null });

/** One NDJSON line of the /api/agent stream. */
export type AgentEvent =
  | { type: "step"; text: string }
  | { type: "block"; block: Block }
  /** `unverified`: numbers in the answer that don't appear in any tool
   *  result - the UI flags them rather than presenting them as checked. */
  | { type: "answer"; text: string; unverified: string[] }
  | { type: "error"; text: string }
  /** More rounds to go: POST again with this signed state (see /api/agent). */
  | { type: "continue"; state: string }
  | { type: "done" };
