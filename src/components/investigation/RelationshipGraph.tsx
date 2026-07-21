"use client";

import { useEffect, useRef, useState } from "react";
import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  type Simulation,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from "d3-force";
import { ZoomIn, ZoomOut, Locate } from "lucide-react";
import type { GraphEdge, GraphNode } from "@/lib/investigationData";
import { ENTITY_STYLES } from "./entityStyles";

type SimNode = GraphNode & SimulationNodeDatum;
type SimLink = SimulationLinkDatum<SimNode> & { id: string; relation: string };

// small deterministic hash so a given edge always curves the same way
function edgeHash(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xffff;
  return h;
}

export default function RelationshipGraph({
  nodes,
  edges,
  activeId,
  highlightSet,
  onSelect,
}: {
  nodes: GraphNode[];
  edges: GraphEdge[];
  activeId: string | null;
  highlightSet: Set<string>;
  onSelect: (id: string | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const simRef = useRef<Simulation<SimNode, SimLink> | null>(null);
  const simNodesRef = useRef<SimNode[]>([]);
  const simLinksRef = useRef<SimLink[]>([]);
  const nodeMapRef = useRef<Map<string, SimNode>>(new Map());
  const draggingRef = useRef<{ id: string; pointerId: number } | null>(null);
  const panRef = useRef<{ startX: number; startY: number; ox: number; oy: number } | null>(null);

  const [size, setSize] = useState({ width: 900, height: 620 });
  const [, forceTick] = useState(0);
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (rect) setSize({ width: Math.max(rect.width, 320), height: Math.max(rect.height, 360) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const simNodes: SimNode[] = nodes.map((n) => ({ ...n }));
    const simLinks: SimLink[] = edges.map((e) => ({ ...e }));
    simNodesRef.current = simNodes;
    simLinksRef.current = simLinks;
    nodeMapRef.current = new Map(simNodes.map((n) => [n.id, n]));

    const sim = forceSimulation<SimNode>(simNodes)
      .force(
        "link",
        forceLink<SimNode, SimLink>(simLinks)
          .id((d) => d.id)
          .distance(130)
          .strength(0.45)
      )
      .force("charge", forceManyBody().strength(-620))
      .force("center", forceCenter(size.width / 2, size.height / 2))
      .force("collide", forceCollide().radius(52))
      .force("x", forceX(size.width / 2).strength(0.05))
      .force("y", forceY(size.height / 2).strength(0.07))
      .on("tick", () => forceTick((t) => t + 1));

    simRef.current = sim;
    return () => {
      sim.stop();
      simRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges]);

  useEffect(() => {
    simRef.current?.force("center", forceCenter(size.width / 2, size.height / 2));
    simRef.current?.force("x", forceX(size.width / 2).strength(0.05));
    simRef.current?.force("y", forceY(size.height / 2).strength(0.07));
    simRef.current?.alpha(0.3).restart();
  }, [size.width, size.height]);

  function screenToWorld(clientX: number, clientY: number) {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (clientX - rect.left - transform.x) / transform.k,
      y: (clientY - rect.top - transform.y) / transform.k,
    };
  }

  function onNodePointerDown(e: React.PointerEvent, id: string) {
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    draggingRef.current = { id, pointerId: e.pointerId };
    simRef.current?.alphaTarget(0.2).restart();
  }

  function onSvgPointerMove(e: React.PointerEvent) {
    if (draggingRef.current) {
      const node = nodeMapRef.current.get(draggingRef.current.id);
      if (node) {
        const { x, y } = screenToWorld(e.clientX, e.clientY);
        node.fx = x;
        node.fy = y;
      }
      forceTick((t) => t + 1);
      return;
    }
    if (panRef.current) {
      const { startX, startY, ox, oy } = panRef.current;
      setTransform((t) => ({ ...t, x: ox + (e.clientX - startX), y: oy + (e.clientY - startY) }));
    }
  }

  function onSvgPointerUp() {
    if (draggingRef.current) {
      simRef.current?.alphaTarget(0);
      draggingRef.current = null;
    }
    panRef.current = null;
  }

  function onSvgPointerDown(e: React.PointerEvent) {
    if (e.target === svgRef.current) {
      panRef.current = { startX: e.clientX, startY: e.clientY, ox: transform.x, oy: transform.y };
      onSelect(null);
    }
  }

  function onWheel(e: React.WheelEvent) {
    e.preventDefault();
    setTransform((t) => ({ ...t, k: Math.min(2.4, Math.max(0.4, t.k * (e.deltaY > 0 ? 0.9 : 1.1))) }));
  }

  function zoomBy(factor: number) {
    setTransform((t) => ({ ...t, k: Math.min(2.4, Math.max(0.4, t.k * factor)) }));
  }

  function resetView() {
    setTransform({ x: 0, y: 0, k: 1 });
    simNodesRef.current.forEach((n) => {
      n.fx = null;
      n.fy = null;
    });
    simRef.current?.alpha(0.6).restart();
  }

  const isDimmed = (id: string) => activeId !== null && !highlightSet.has(id);

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden rounded-2xl">
      {/* zoom controls */}
      <div className="absolute right-3 top-3 z-10 flex gap-1.5">
        {[
          { fn: () => zoomBy(1.2), Icon: ZoomIn, label: "Zoom in" },
          { fn: () => zoomBy(0.82), Icon: ZoomOut, label: "Zoom out" },
          { fn: resetView, Icon: Locate, label: "Reset view" },
        ].map(({ fn, Icon, label }) => (
          <button
            key={label}
            onClick={fn}
            aria-label={label}
            className="rounded-sm border border-line bg-surface p-2 text-navy shadow-sm transition hover:border-navy"
          >
            <Icon size={16} />
          </button>
        ))}
      </div>

      <svg
        ref={svgRef}
        width={size.width}
        height={size.height}
        className="cursor-grab touch-none active:cursor-grabbing"
        onPointerMove={onSvgPointerMove}
        onPointerUp={onSvgPointerUp}
        onPointerDown={onSvgPointerDown}
        onWheel={onWheel}
      >
        <g transform={`translate(${transform.x},${transform.y}) scale(${transform.k})`}>
          {/* thread lines (curved "strings") */}
          {simLinksRef.current.map((link) => {
            const s = typeof link.source === "object" ? link.source : nodeMapRef.current.get(link.source as unknown as string);
            const t = typeof link.target === "object" ? link.target : nodeMapRef.current.get(link.target as unknown as string);
            if (!s || !t || s.x == null || t.x == null || s.y == null || t.y == null) return null;

            const active = highlightSet.has(s.id) && highlightSet.has(t.id) && activeId !== null;
            const dx = t.x - s.x;
            const dy = t.y - s.y;
            const len = Math.hypot(dx, dy) || 1;
            // alternate curvature direction per edge to reduce overlap
            const dir = edgeHash(link.id) % 2 === 0 ? 1 : -1;
            const bend = Math.min(len * 0.14, 46) * dir;
            const cx = (s.x + t.x) / 2 + (-dy / len) * bend;
            const cy = (s.y + t.y) / 2 + (dx / len) * bend;
            const d = `M ${s.x} ${s.y} Q ${cx} ${cy} ${t.x} ${t.y}`;

            return (
              <path
                key={link.id}
                d={d}
                fill="none"
                stroke={active ? "#0b57d0" : "#94a3b8"}
                strokeWidth={active ? 2.2 : 1.2}
                strokeOpacity={activeId ? (active ? 0.95 : 0.12) : 0.5}
                strokeDasharray={active ? "5 7" : undefined}
              >
                {active && (
                  <animate attributeName="stroke-dashoffset" from="24" to="0" dur="0.9s" repeatCount="indefinite" />
                )}
              </path>
            );
          })}

          {/* nodes */}
          {simNodesRef.current.map((node) => {
            if (node.x == null || node.y == null) return null;
            const style = ENTITY_STYLES[node.type];
            const { Icon } = style;
            const selected = node.id === activeId;
            const dimmed = isDimmed(node.id);
            const highlighted = highlightSet.has(node.id) && activeId !== null;
            const r = node.type === "case" ? 20 : selected ? 27 : 23;
            return (
              <g
                key={node.id}
                transform={`translate(${node.x},${node.y})`}
                onPointerDown={(e) => onNodePointerDown(e, node.id)}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(node.id === activeId ? null : node.id);
                }}
                className="cursor-pointer"
                opacity={dimmed ? 0.22 : 1}
              >
                {selected && (
                  <circle r={r + 8} fill="none" stroke={style.color} strokeWidth={1.5} opacity={0.5}>
                    <animate attributeName="r" values={`${r + 6};${r + 13};${r + 6}`} dur="1.9s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.55;0.08;0.55" dur="1.9s" repeatCount="indefinite" />
                  </circle>
                )}
                <circle
                  r={r}
                  fill="#ffffff"
                  stroke={style.color}
                  strokeWidth={selected ? 3 : 1.75}
                  style={{
                    filter: selected || highlighted ? `drop-shadow(0 0 8px ${style.glow})` : undefined,
                  }}
                />
                <foreignObject x={-12} y={-12} width={24} height={24} className="pointer-events-none">
                  <Icon size={24} color={style.color} strokeWidth={2} />
                </foreignObject>
                <text
                  y={r + 17}
                  textAnchor="middle"
                  className="pointer-events-none select-none"
                  fill={dimmed ? "#94a3b8" : "#1a2230"}
                  fontSize={13}
                  fontWeight={selected ? 700 : 500}
                >
                  {node.label.length > 18 ? `${node.label.slice(0, 17)}…` : node.label}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
