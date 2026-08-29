"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  type SimulationNodeDatum,
} from "d3-force";
import { useRouter } from "next/navigation";
import { FileText, Repeat } from "lucide-react";
import type { NetworkNode, NetworkEdge } from "@/lib/statewideNetwork";

// -----------------------------------------------------------------------------
// P4.9 item 5 - statewide generalisation of CaseRelationshipGraph.tsx. Same
// engine (d3-force, settled once on mount, drag-to-declutter after) and the
// same discipline (nothing rendered here is invented - every node/edge comes
// straight from statewideNetwork.ts's props). What's different from the
// per-case graph, because the DATA is a different shape here:
//
//  - Bipartite, not person-to-person: Person nodes only ever connect to Case
//    (FIR) nodes, never to each other directly - see statewideNetwork.ts's
//    file header for why there is no real person-to-person edge available
//    across cases.
//  - Clustering is by real scenarioId (colour), not free layout - a Case
//    node's colour is its actual scenario; a Person node's colour is the one
//    real scenario personFusion.ts resolved them into. Same-scenario FIRs
//    sharing a colour is the only "cross-FIR" signal drawn WITHOUT an edge -
//    everything else you see as a line is a real accused-in-this-FIR fact.
// -----------------------------------------------------------------------------

// 15 distinct hues for the 15 real scenarios - deliberately a different set
// from the app's --dash-* record-kind palette (call/transaction/cctv/
// statement), which this graph never draws, so there's no clash to worry
// about. Indexed positionally by first-seen scenarioId order, not hardcoded
// to "C1".."C15", so this still works if scenario ids ever change shape.
const SCENARIO_COLORS = [
  "#2563eb", "#dc2626", "#16a34a", "#ea8a1f", "#7c3aed",
  "#0d9488", "#db2777", "#65a30d", "#0891b2", "#9333ea",
  "#ca8a04", "#e11d48", "#4f46e5", "#059669", "#78350f",
];

function truncateLabel(label: string, max = 18): string {
  return label.length > max ? `${label.slice(0, max - 1)}…` : label;
}

type SimNode = NetworkNode & SimulationNodeDatum;
type Pos = { x: number; y: number };

function nodeRadius(n: NetworkNode): number {
  if (n.kind === "Case") return Math.min(26, 12 + n.recordCount * 2.4);
  return n.isRepeat ? Math.min(16, 9 + n.recordCount * 0.9) : Math.min(11, 6 + n.recordCount * 0.7);
}

/** Settles a static layout via d3-force, run synchronously once - see
 *  CaseRelationshipGraph.tsx's header for why this isn't animated tick-by-
 *  tick. Case nodes are heavier/denser (higher degree) so they naturally act
 *  as cluster anchors for their own scenario's Person nodes under plain
 *  charge+link forces - no separate "cluster force" needed to get the visual
 *  grouping the data itself already implies. */
function settleLayout(nodes: NetworkNode[], edges: NetworkEdge[]): Record<string, Pos> {
  const n = nodes.length;
  const simNodes: SimNode[] = nodes.map((node, i) => {
    const angle = (2 * Math.PI * i) / Math.max(n, 1);
    const r = 220;
    return { ...node, x: r * Math.cos(angle), y: r * Math.sin(angle) };
  });
  const simEdges = edges.map((e) => ({ ...e }));

  const simulation = forceSimulation(simNodes)
    .force(
      "link",
      forceLink(simEdges)
        .id((d) => (d as SimNode).id)
        .distance(58)
        .strength(0.55)
    )
    .force("charge", forceManyBody().strength(-160))
    .force("center", forceCenter(0, 0))
    .force(
      "collide",
      forceCollide<SimNode>().radius((d) => nodeRadius(d) + 10)
    )
    .stop();

  const tickCount = Math.min(600, 120 + n * 6);
  for (let i = 0; i < tickCount; i++) simulation.tick();

  const pos: Record<string, Pos> = {};
  for (const node of simNodes) pos[node.id] = { x: node.x ?? 0, y: node.y ?? 0 };
  return pos;
}

export default function StatewideNetworkGraph({ nodes, edges }: { nodes: NetworkNode[]; edges: NetworkEdge[] }) {
  const router = useRouter();
  const svgRef = useRef<SVGSVGElement>(null);
  const [pos, setPos] = useState<Record<string, Pos> | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragged, setDragged] = useState(false);
  const [repeatOnly, setRepeatOnly] = useState(false);

  useEffect(() => {
    setPos(settleLayout(nodes, edges));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Scenario colour order - first-seen, so it's stable across re-renders of
  // the same dataset without hardcoding a scenario-id shape.
  const scenarioOrder = useMemo(() => {
    const seen: string[] = [];
    for (const n of nodes) if (!seen.includes(n.scenarioId)) seen.push(n.scenarioId);
    return seen;
  }, [nodes]);
  function colorFor(scenarioId: string) {
    const idx = scenarioOrder.indexOf(scenarioId);
    return SCENARIO_COLORS[idx % SCENARIO_COLORS.length];
  }

  // A node is "connected to a repeat subject" if it IS a repeat person, or
  // it's the repeat person's edge partner - used to dim the rest of the
  // graph without removing it from the (already-settled) layout.
  const repeatConnected = useMemo(() => {
    const s = new Set<string>();
    for (const n of nodes) if (n.kind === "Person" && n.isRepeat) s.add(n.id);
    for (const e of edges) {
      if (s.has(e.source)) s.add(e.target);
      if (s.has(e.target)) s.add(e.source);
    }
    return s;
  }, [nodes, edges]);

  function onPointerDown(nodeId: string, e: ReactPointerEvent<SVGGElement>) {
    (e.target as Element).setPointerCapture(e.pointerId);
    setDragId(nodeId);
    setDragged(false);
  }
  function onPointerMove(e: ReactPointerEvent<SVGSVGElement>) {
    if (!dragId || !svgRef.current) return;
    setDragged(true);
    const ctm = svgRef.current.getScreenCTM();
    if (!ctm) return;
    const inv = ctm.inverse();
    const pt = svgRef.current.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgPt = pt.matrixTransform(inv);
    setPos((prev) => (prev ? { ...prev, [dragId]: { x: svgPt.x, y: svgPt.y } } : prev));
  }
  function endDrag() {
    setDragId(null);
  }
  function onNodeClick(n: NetworkNode) {
    if (dragged) return; // don't navigate off the end of a drag
    if (n.kind === "Case" && n.link) router.push(n.link);
    else if (n.kind === "Person") router.push(`/persons/${n.id}`);
  }

  if (nodes.length === 0) {
    return <p className="text-[13px] text-muted">No evidence-linked people in the current seeded dataset.</p>;
  }
  if (!pos) {
    return <div className="flex h-[420px] items-center justify-center text-[12px] text-muted">Laying out statewide network…</div>;
  }

  const R_MARGIN = 50;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const n of nodes) {
    const p = pos[n.id] ?? { x: 0, y: 0 };
    const r = nodeRadius(n) + R_MARGIN / 2;
    minX = Math.min(minX, p.x - r);
    maxX = Math.max(maxX, p.x + r);
    minY = Math.min(minY, p.y - r);
    maxY = Math.max(maxY, p.y + r);
  }
  const vbW = Math.max(300, maxX - minX);
  const vbH = Math.max(300, maxY - minY);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-[12px] text-ink">
          <input
            type="checkbox"
            checked={repeatOnly}
            onChange={(e) => setRepeatOnly(e.target.checked)}
            className="h-3.5 w-3.5"
          />
          Highlight repeat subjects only ({[...repeatConnected].filter((id) => id.startsWith("KA-")).length} people)
        </label>
        <p className="text-[11px] text-muted">Drag a node to declutter · click a person or case to open its real page.</p>
      </div>

      <div className="min-w-0 overflow-hidden rounded-lg border border-line bg-surface-2/50">
        <svg
          ref={svgRef}
          viewBox={`${minX} ${minY} ${vbW} ${vbH}`}
          preserveAspectRatio="xMidYMid meet"
          className="block w-full touch-none"
          style={{ height: 520 }}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerLeave={endDrag}
        >
          {edges.map((e) => {
            const s = pos[e.source] ?? { x: 0, y: 0 };
            const t = pos[e.target] ?? { x: 0, y: 0 };
            const dim = repeatOnly && !(repeatConnected.has(e.source) && repeatConnected.has(e.target));
            const color = colorFor(nodes.find((n) => n.id === e.target)?.scenarioId ?? "");
            return (
              <line
                key={e.id}
                x1={s.x}
                y1={s.y}
                x2={t.x}
                y2={t.y}
                stroke={color}
                strokeWidth={1.1}
                strokeOpacity={dim ? 0.06 : 0.4}
              >
                <title>{e.label}</title>
              </line>
            );
          })}

          {nodes.map((n) => {
            const p = pos[n.id] ?? { x: 0, y: 0 };
            const r = nodeRadius(n);
            const color = colorFor(n.scenarioId);
            const dim = repeatOnly && !repeatConnected.has(n.id);
            const tooltip =
              n.kind === "Case"
                ? `${n.label} — FIR ${n.crimeNo ?? n.caseMasterId} · ${n.crimeTypeName} · ${n.districtName} — ${n.recordCount} accused named`
                : `${n.label}${n.isRepeat ? " — repeat subject" : ""} — ${n.recordCount} evidence record${n.recordCount === 1 ? "" : "s"} · ${n.scenarioTitle}${n.isRepeat ? ` · ${n.caseMasterIds?.length} FIRs` : ""}`;
            return (
              <g
                key={n.id}
                transform={`translate(${p.x}, ${p.y})`}
                onPointerDown={(e) => onPointerDown(n.id, e)}
                onClick={() => onNodeClick(n)}
                className="cursor-pointer"
                opacity={dim ? 0.15 : 1}
              >
                <title>{tooltip}</title>
                {n.kind === "Case" ? (
                  <>
                    <rect x={-r} y={-r} width={r * 2} height={r * 2} rx={5} fill={color} fillOpacity={0.85} stroke={color} strokeWidth={1.5} />
                    <FileText x={-6} y={-6} width={12} height={12} color="#fff" aria-hidden="true" />
                  </>
                ) : (
                  <>
                    <circle r={r} fill={color} fillOpacity={n.isRepeat ? 0.28 : 0.16} stroke={color} strokeWidth={n.isRepeat ? 2.25 : 1.25} />
                    {n.isRepeat && <Repeat x={-5} y={-5} width={10} height={10} color={color} aria-hidden="true" />}
                  </>
                )}
                {(n.kind === "Case" || n.isRepeat) && (
                  <text y={r + 12} textAnchor="middle" fontSize={9.5} fill="var(--ink)" className="select-none">
                    {truncateLabel(n.label)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Scenario legend - the real colour key both node kinds are grouped
          by. Kept compact (swatch + short title) since 15 entries is already
          a lot to show at once. */}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[10.5px] text-muted">
        {scenarioOrder.map((sid) => (
          <span key={sid} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colorFor(sid) }} />
            {sid} · {truncateLabel(nodes.find((n) => n.scenarioId === sid)?.scenarioTitle ?? sid, 28)}
          </span>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-line pt-2.5 text-[11px] text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full border-2 border-line-strong bg-surface-2" /> Person (accused, real KA-P id)
        </span>
        <span className="flex items-center gap-1.5">
          <Repeat size={11} aria-hidden="true" /> Repeat subject — named accused in 2+ real FIRs
        </span>
        <span className="flex items-center gap-1.5">
          <FileText size={11} aria-hidden="true" /> Case (real FIR / CaseMasterID)
        </span>
      </div>
    </div>
  );
}
