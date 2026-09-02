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
// P4.9 item 5 - statewide generalisation of CaseRelationshipGraph.tsx.
//
// Redesigned 2026-08-30 on direct feedback ("not visible and good"). Root
// cause, not a styling tweak: this graph is genuinely 15 disconnected
// components - statewideNetwork.ts's own header proves every one of the 47
// fused persons has scenarioIds.length === 1, so no edge ever crosses
// between two scenarios, and none is fabricated to make one. Laying all 15
// out in ONE shared d3-force simulation fights that topology: with no
// attractive force between components, only mutual repulsion + a single
// global center, disconnected clusters drift apart into a mostly-empty
// canvas - a real graph theory failure mode for disconnected-component
// data, not a tuning problem you can fix with different force constants.
//
// Fix: one small SVG per scenario, each with its OWN d3-force layout run
// over just its own 3-7 nodes, arranged in a responsive grid. This loses
// nothing real - there was never a cross-scenario edge to draw by keeping
// them on one canvas - and makes every cluster legible at a glance instead
// of requiring pan/zoom to find it in empty space. Same d3-force engine,
// same discipline (nothing rendered here is invented - every node/edge
// comes straight from statewideNetwork.ts's props); the library was never
// the problem, the shared canvas was.
// -----------------------------------------------------------------------------

const SCENARIO_COLORS = [
  "#2563eb", "#dc2626", "#16a34a", "#ea8a1f", "#7c3aed",
  "#0d9488", "#db2777", "#65a30d", "#0891b2", "#9333ea",
  "#ca8a04", "#e11d48", "#4f46e5", "#059669", "#78350f",
];

function truncateLabel(label: string, max = 16): string {
  return label.length > max ? `${label.slice(0, max - 1)}…` : label;
}

type SimNode = NetworkNode & SimulationNodeDatum;
type Pos = { x: number; y: number };

function nodeRadius(n: NetworkNode): number {
  if (n.kind === "Case") return Math.min(24, 13 + n.recordCount * 2.2);
  return n.isRepeat ? Math.min(16, 10 + n.recordCount * 0.9) : Math.min(12, 7 + n.recordCount * 0.7);
}

/** Settles a small, self-contained layout via d3-force - scoped to ONE
 *  scenario's few nodes, not the whole statewide graph. At this scale
 *  (typically 3-7 nodes) a modest tick count converges cleanly every time. */
function settleLayout(nodes: NetworkNode[], edges: NetworkEdge[]): Record<string, Pos> {
  const n = nodes.length;
  const simNodes: SimNode[] = nodes.map((node, i) => {
    const angle = (2 * Math.PI * i) / Math.max(n, 1);
    const r = 60;
    return { ...node, x: r * Math.cos(angle), y: r * Math.sin(angle) };
  });
  const simEdges = edges.map((e) => ({ ...e }));

  const simulation = forceSimulation(simNodes)
    .force("link", forceLink(simEdges).id((d) => (d as SimNode).id).distance(52).strength(0.7))
    .force("charge", forceManyBody().strength(-90))
    .force("center", forceCenter(0, 0))
    .force("collide", forceCollide<SimNode>().radius((d) => nodeRadius(d) + 14))
    .stop();

  for (let i = 0; i < 300; i++) simulation.tick();

  const pos: Record<string, Pos> = {};
  for (const node of simNodes) pos[node.id] = { x: node.x ?? 0, y: node.y ?? 0 };
  return pos;
}

type ScenarioGroup = {
  scenarioId: string;
  scenarioTitle: string;
  nodes: NetworkNode[];
  edges: NetworkEdge[];
};

function ScenarioCard({
  group,
  color,
  positions,
  setPositions,
  repeatOnly,
  repeatConnected,
  onNodeClick,
}: {
  group: ScenarioGroup;
  color: string;
  positions: Record<string, Pos>;
  setPositions: (updater: (prev: Record<string, Pos>) => Record<string, Pos>) => void;
  repeatOnly: boolean;
  repeatConnected: Set<string>;
  onNodeClick: (n: NetworkNode) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const draggedRef = useRef(false);
  const hasRepeat = group.nodes.some((n) => n.isRepeat);

  function onPointerDown(nodeId: string, e: ReactPointerEvent<SVGGElement>) {
    (e.target as Element).setPointerCapture(e.pointerId);
    setDragId(nodeId);
    draggedRef.current = false;
  }
  function onPointerMove(e: ReactPointerEvent<SVGSVGElement>) {
    if (!dragId || !svgRef.current) return;
    draggedRef.current = true;
    const ctm = svgRef.current.getScreenCTM();
    if (!ctm) return;
    const pt = svgRef.current.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgPt = pt.matrixTransform(ctm.inverse());
    setPositions((prev) => ({ ...prev, [dragId]: { x: svgPt.x, y: svgPt.y } }));
  }
  function endDrag() {
    setDragId(null);
  }

  const R_MARGIN = 34;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const n of group.nodes) {
    const p = positions[n.id] ?? { x: 0, y: 0 };
    const r = nodeRadius(n) + R_MARGIN / 2;
    minX = Math.min(minX, p.x - r);
    maxX = Math.max(maxX, p.x + r);
    minY = Math.min(minY, p.y - r);
    maxY = Math.max(maxY, p.y + r);
  }
  const vbW = Math.max(140, maxX - minX);
  const vbH = Math.max(140, maxY - minY);

  return (
    <div className="min-w-0 overflow-hidden rounded-lg border border-line bg-surface-2">
      <div className="flex items-center gap-2 border-b border-line bg-surface px-3 py-2">
        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
        <p className="min-w-0 flex-1 truncate text-[12px] font-semibold text-ink" title={group.scenarioTitle}>
          {group.scenarioTitle}
        </p>
        {hasRepeat && <Repeat size={12} className="shrink-0 text-muted" aria-hidden="true" />}
      </div>
      <svg
        ref={svgRef}
        viewBox={`${minX} ${minY} ${vbW} ${vbH}`}
        preserveAspectRatio="xMidYMid meet"
        className="block w-full touch-none"
        style={{ height: 176 }}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
      >
        {group.edges.map((e) => {
          const s = positions[e.source] ?? { x: 0, y: 0 };
          const t = positions[e.target] ?? { x: 0, y: 0 };
          const dim = repeatOnly && !(repeatConnected.has(e.source) && repeatConnected.has(e.target));
          return (
            <line key={e.id} x1={s.x} y1={s.y} x2={t.x} y2={t.y} stroke={color} strokeWidth={1.3} strokeOpacity={dim ? 0.08 : 0.5}>
              <title>{e.label}</title>
            </line>
          );
        })}
        {group.nodes.map((n) => {
          const p = positions[n.id] ?? { x: 0, y: 0 };
          const r = nodeRadius(n);
          const dim = repeatOnly && !repeatConnected.has(n.id);
          const tooltip =
            n.kind === "Case"
              ? `${n.label} — FIR ${n.crimeNo ?? n.caseMasterId} · ${n.crimeTypeName} · ${n.districtName} — ${n.recordCount} accused named`
              : `${n.label}${n.isRepeat ? " — repeat subject" : ""} — ${n.recordCount} evidence record${n.recordCount === 1 ? "" : "s"}${n.isRepeat ? ` · ${n.caseMasterIds?.length} FIRs` : ""}`;
          return (
            <g
              key={n.id}
              transform={`translate(${p.x}, ${p.y})`}
              onPointerDown={(e) => onPointerDown(n.id, e)}
              onClick={() => {
                if (!draggedRef.current) onNodeClick(n);
              }}
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
                  <circle r={r} fill={color} fillOpacity={n.isRepeat ? 0.3 : 0.18} stroke={color} strokeWidth={n.isRepeat ? 2.25 : 1.25} />
                  {n.isRepeat && <Repeat x={-5} y={-5} width={10} height={10} color={color} aria-hidden="true" />}
                </>
              )}
              <text y={r + 11} textAnchor="middle" fontSize={9} fill="var(--ink)" className="select-none">
                {truncateLabel(n.label)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default function StatewideNetworkGraph({ nodes, edges }: { nodes: NetworkNode[]; edges: NetworkEdge[] }) {
  const router = useRouter();
  const [pos, setPos] = useState<Record<string, Pos> | null>(null);
  const [repeatOnly, setRepeatOnly] = useState(false);

  const groups = useMemo<ScenarioGroup[]>(() => {
    const order: string[] = [];
    const byId = new Map<string, ScenarioGroup>();
    for (const n of nodes) {
      if (!byId.has(n.scenarioId)) {
        order.push(n.scenarioId);
        byId.set(n.scenarioId, { scenarioId: n.scenarioId, scenarioTitle: n.scenarioTitle, nodes: [], edges: [] });
      }
      byId.get(n.scenarioId)!.nodes.push(n);
    }
    // An edge's two endpoints always share a scenario (statewideNetwork.ts's
    // own invariant - no cross-scenario edge exists), so grouping by the
    // source person's node scenario is exact, not a guess.
    const scenarioOfNode = new Map(nodes.map((n) => [n.id, n.scenarioId]));
    for (const e of edges) {
      const sid = scenarioOfNode.get(e.source) ?? scenarioOfNode.get(e.target);
      if (sid && byId.has(sid)) byId.get(sid)!.edges.push(e);
    }
    return order.map((sid) => byId.get(sid)!);
  }, [nodes, edges]);

  useEffect(() => {
    const next: Record<string, Pos> = {};
    for (const g of groups) Object.assign(next, settleLayout(g.nodes, g.edges));
    setPos(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function colorFor(scenarioId: string) {
    const idx = groups.findIndex((g) => g.scenarioId === scenarioId);
    return SCENARIO_COLORS[idx % SCENARIO_COLORS.length];
  }

  const repeatConnected = useMemo(() => {
    const s = new Set<string>();
    for (const n of nodes) if (n.kind === "Person" && n.isRepeat) s.add(n.id);
    for (const e of edges) {
      if (s.has(e.source)) s.add(e.target);
      if (s.has(e.target)) s.add(e.source);
    }
    return s;
  }, [nodes, edges]);

  function onNodeClick(n: NetworkNode) {
    if (n.kind === "Case" && n.link) router.push(n.link);
    else if (n.kind === "Person") router.push(`/persons/${n.id}`);
  }

  if (nodes.length === 0) {
    return <p className="text-[13px] text-muted">No evidence-linked people in the current seeded dataset.</p>;
  }
  if (!pos) {
    return <div className="flex h-[220px] items-center justify-center text-[12px] text-muted">Laying out statewide network…</div>;
  }

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
        <p className="text-[11px] text-muted">
          One card per real investigation — drag a node to declutter · click a person or case to open its real page.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {groups.map((g) => (
          <ScenarioCard
            key={g.scenarioId}
            group={g}
            color={colorFor(g.scenarioId)}
            positions={pos}
            setPositions={setPos as (updater: (prev: Record<string, Pos>) => Record<string, Pos>) => void}
            repeatOnly={repeatOnly}
            repeatConnected={repeatConnected}
            onNodeClick={onNodeClick}
          />
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-line pt-2.5 text-[11px] text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full border-2 border-line-strong bg-surface-2" /> Person (accused, real KA-P id)
        </span>
        <span className="flex items-center gap-1.5">
          <Repeat size={11} aria-hidden="true" /> Repeat subject — named accused in 2+ real FIRs
        </span>
        <span className="flex items-center gap-1.5">
          <FileText size={11} aria-hidden="true" /> Case (real FIR / CaseMasterID)
        </span>
        <span>Each card is its own real investigation — no line ever crosses cards; no shared record ties two of them together.</span>
      </div>
    </div>
  );
}
