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
import { PhoneCall, Landmark, Video, MessageSquareQuote, User, MapPin } from "lucide-react";
import type { GraphNode, GraphEdge, GraphEdgeKind, GraphNodeKind } from "@/lib/relationshipGraph";

// -----------------------------------------------------------------------------
// P9.4 - renders relationshipGraph.ts's real nodes/edges as a force-directed
// graph. `d3-force` (already a dependency) computes the layout; this file
// only draws it and lets the user drag a node to declutter it - no physics
// hand-rolled, no data invented here (this component never sees anything
// but the props it's given).
//
// Positions are settled ONCE on mount by ticking the simulation synchronously
// (this app's graphs are tiny - under 10 nodes, under 15 edges per case - so
// this costs low-single-digit milliseconds) rather than animating every tick
// into React state, which would mean dozens of re-renders per second for a
// visual settle that finishes in well under a second anyway. Dragging after
// that just repositions the one node being dragged - it does not reheat the
// simulation - so the rest of the layout stays put while you declutter one
// crowded corner.
// -----------------------------------------------------------------------------

const EDGE_ICON: Record<GraphEdgeKind, typeof PhoneCall> = {
  call: PhoneCall,
  transaction: Landmark,
  cctv: Video,
  statement: MessageSquareQuote,
};
// Same call/transaction/cctv/statement -> blue/orange/purple/teal convention
// CrossSourceTimeline.tsx already uses, so a record type reads the same way
// everywhere in the app.
const EDGE_COLOR: Record<GraphEdgeKind, string> = {
  call: "var(--dash-blue)",
  transaction: "var(--dash-orange)",
  cctv: "var(--dash-purple)",
  statement: "var(--dash-teal)",
};
const EDGE_LABEL: Record<GraphEdgeKind, string> = {
  call: "Call",
  transaction: "Transaction",
  cctv: "CCTV sighting",
  statement: "Witness statement",
};

// A separate hue set for WHO/WHERE a node is, deliberately distinct from the
// edge palette above (edges answer "what kind of record", nodes answer "what
// kind of entity" - two different questions, two different legends).
// Location intentionally reuses the same purple as the "cctv" edge kind -
// location nodes only ever connect to a cctv edge, so the shared hue
// reinforces which part of the graph is the CCTV trail rather than clashing.
const NODE_COLOR: Record<GraphNodeKind, string> = {
  Accused: "var(--danger)",
  Victim: "var(--success)",
  Complainant: "var(--dash-pink)",
  Witness: "var(--warning)",
  Location: "var(--dash-purple)",
};

function nodeRadius(n: GraphNode): number {
  if (n.kind === "Location") return 15;
  return Math.min(27, 15 + n.recordCount * 2.2);
}

function truncateLabel(label: string, max = 20): string {
  return label.length > max ? `${label.slice(0, max - 1)}…` : label;
}

type SimNode = GraphNode & SimulationNodeDatum;
type Pos = { x: number; y: number };

/** Settles a static layout for this graph via d3-force, run synchronously -
 *  see the file header for why this isn't animated tick-by-tick. */
function settleLayout(nodes: GraphNode[], edges: GraphEdge[]): Record<string, Pos> {
  const n = nodes.length;
  const simNodes: SimNode[] = nodes.map((node, i) => {
    // Seed on a circle rather than (0,0) for everyone - d3-force converges
    // faster and more evenly from a spread-out start.
    const angle = (2 * Math.PI * i) / Math.max(n, 1);
    const r = 120;
    return { ...node, x: r * Math.cos(angle), y: r * Math.sin(angle) };
  });
  const simEdges = edges.map((e) => ({ ...e })); // forceLink resolves .source/.target string ids to node refs itself

  const simulation = forceSimulation(simNodes)
    .force(
      "link",
      forceLink(simEdges)
        .id((d) => (d as SimNode).id)
        .distance(105)
        .strength(0.45)
    )
    .force("charge", forceManyBody().strength(-240))
    .force("center", forceCenter(0, 0))
    .force(
      "collide",
      forceCollide<SimNode>().radius((d) => nodeRadius(d) + 16)
    )
    .stop();

  const tickCount = Math.min(400, 60 + n * 20);
  for (let i = 0; i < tickCount; i++) simulation.tick();

  const pos: Record<string, Pos> = {};
  for (const node of simNodes) pos[node.id] = { x: node.x ?? 0, y: node.y ?? 0 };
  return pos;
}

function pairKey(a: string, b: string): string {
  return [a, b].sort().join("__");
}

export default function CaseRelationshipGraph({ nodes, edges }: { nodes: GraphNode[]; edges: GraphEdge[] }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [pos, setPos] = useState<Record<string, Pos> | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);

  // Layout is settled once per distinct case (nodes/edges are static props
  // coming from a server-rendered page - a new case means a new component
  // mount via React's key, not a prop change mid-life).
  useEffect(() => {
    setPos(settleLayout(nodes, edges));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const edgesWithCurve = useMemo(() => {
    const seenPerPair = new Map<string, number>();
    const totalPerPair = new Map<string, number>();
    for (const e of edges) {
      const k = pairKey(e.source, e.target);
      totalPerPair.set(k, (totalPerPair.get(k) ?? 0) + 1);
    }
    return edges.map((e) => {
      const k = pairKey(e.source, e.target);
      const index = seenPerPair.get(k) ?? 0;
      seenPerPair.set(k, index + 1);
      const total = totalPerPair.get(k) ?? 1;
      // Multiple real records between the same two entities (e.g. 3 real
      // calls between Suresh Naik and Iqbal Sait in C1) must stay visible as
      // 3 distinct lines, not collapse into one - that would visually
      // understate how many real records actually connect them.
      const offset = total === 1 ? 0 : (index - (total - 1) / 2) * 22;
      return { ...e, offset };
    });
  }, [edges]);

  function onPointerDown(nodeId: string, e: ReactPointerEvent<SVGGElement>) {
    (e.target as Element).setPointerCapture(e.pointerId);
    setDragId(nodeId);
  }
  function onPointerMove(e: ReactPointerEvent<SVGSVGElement>) {
    if (!dragId || !svgRef.current) return;
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

  if (nodes.length === 0) {
    return <p className="text-[13px] text-muted">No relationships extracted for this case - too few linked records to draw a graph.</p>;
  }

  if (!pos) {
    return <div className="flex h-[300px] items-center justify-center text-[12px] text-muted">Laying out graph…</div>;
  }

  const R_MARGIN = 60;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const n of nodes) {
    const p = pos[n.id] ?? { x: 0, y: 0 };
    const r = nodeRadius(n) + R_MARGIN / 2;
    minX = Math.min(minX, p.x - r);
    maxX = Math.max(maxX, p.x + r);
    minY = Math.min(minY, p.y - r);
    maxY = Math.max(maxY, p.y + r);
  }
  const vbW = Math.max(200, maxX - minX);
  const vbH = Math.max(160, maxY - minY);

  const presentNodeKinds = [...new Set(nodes.map((n) => n.kind))];
  const presentEdgeKinds = [...new Set(edges.map((e) => e.kind))] as GraphEdgeKind[];

  return (
    <div>
      <div className="min-w-0 overflow-hidden rounded-lg border border-line bg-surface-2">
        <svg
          ref={svgRef}
          viewBox={`${minX} ${minY} ${vbW} ${vbH}`}
          preserveAspectRatio="xMidYMid meet"
          className="block w-full touch-none"
          style={{ height: 380 }}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerLeave={endDrag}
        >
          {edgesWithCurve.map((e) => {
            const s = pos[e.source] ?? { x: 0, y: 0 };
            const t = pos[e.target] ?? { x: 0, y: 0 };
            const mx = (s.x + t.x) / 2;
            const my = (s.y + t.y) / 2;
            const dx = t.x - s.x;
            const dy = t.y - s.y;
            const len = Math.hypot(dx, dy) || 1;
            const nx = -dy / len;
            const ny = dx / len;
            const cx = mx + nx * e.offset;
            const cy = my + ny * e.offset;
            // Point at t=0.5 on the quadratic bezier - where the record-kind
            // icon badge sits, whether the line is straight (offset 0, so
            // this is just the true midpoint) or curved.
            const ix = 0.25 * s.x + 0.5 * cx + 0.25 * t.x;
            const iy = 0.25 * s.y + 0.5 * cy + 0.25 * t.y;
            const Icon = EDGE_ICON[e.kind];
            const color = EDGE_COLOR[e.kind];
            return (
              <g key={e.id}>
                <path d={`M ${s.x} ${s.y} Q ${cx} ${cy} ${t.x} ${t.y}`} fill="none" stroke={color} strokeWidth={1.5} strokeOpacity={0.55} />
                <g transform={`translate(${ix}, ${iy})`}>
                  <title>{`${e.id} — ${EDGE_LABEL[e.kind]}: ${e.label}`}</title>
                  <circle r={9} fill="var(--surface)" stroke={color} strokeWidth={1.5} />
                  <Icon x={-5.5} y={-5.5} width={11} height={11} color={color} aria-hidden="true" />
                </g>
              </g>
            );
          })}

          {nodes.map((n) => {
            const p = pos[n.id] ?? { x: 0, y: 0 };
            const r = nodeRadius(n);
            const color = NODE_COLOR[n.kind];
            const Icon = n.kind === "Location" ? MapPin : User;
            return (
              <g
                key={n.id}
                transform={`translate(${p.x}, ${p.y})`}
                onPointerDown={(e) => onPointerDown(n.id, e)}
                className="cursor-grab active:cursor-grabbing"
              >
                <title>{`${n.label} (${n.kind}) — ${n.recordCount} record${n.recordCount === 1 ? "" : "s"}`}</title>
                <circle r={r} fill={color} fillOpacity={0.16} stroke={color} strokeWidth={2} />
                <Icon x={-7} y={-7} width={14} height={14} color={color} aria-hidden="true" />
                <text y={r + 13} textAnchor="middle" fontSize={10.5} fill="var(--ink)" className="select-none">
                  {truncateLabel(n.label)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend - only the entity/record kinds actually present in this
          case's graph, so a sparse case doesn't imply record types it has
          none of. */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-muted">
        {presentNodeKinds.map((k) => (
          <span key={k} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full border-2" style={{ borderColor: NODE_COLOR[k], backgroundColor: NODE_COLOR[k], opacity: 0.35 }} />
            {k}
          </span>
        ))}
        <span className="text-line-strong">|</span>
        {presentEdgeKinds.map((k) => {
          const Icon = EDGE_ICON[k];
          return (
            <span key={k} className="flex items-center gap-1.5">
              <Icon size={11} color={EDGE_COLOR[k]} aria-hidden="true" />
              {EDGE_LABEL[k]}
            </span>
          );
        })}
      </div>
      <p className="mt-2 text-[11px] text-muted">Drag a node to declutter. Hover a node or edge for details.</p>
    </div>
  );
}
