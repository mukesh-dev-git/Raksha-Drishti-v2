"use client";

import { useEffect, useRef, useState } from "react";
import {
  Camera,
  Video,
  Fingerprint,
  FlaskConical,
  Phone,
  Landmark,
  Car,
  MapPin,
  Eye,
  UserRound,
  FileText,
  ShieldAlert,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from "lucide-react";
import type { EntityDetail, EvidenceType, GraphNode, InvestigationData } from "@/lib/investigationData";
import { getEntityDetail } from "@/lib/investigationData";

// -----------------------------------------------------------------------------
// EvidenceBoard — a realistic detective evidence wall.
// Every entity is a pinned paper document / photograph / report, organised into
// investigation zones on a dark corkboard and connected by labelled red strings.
// NOT a graph: positions are hand-authored per zone, cards are real documents.
// -----------------------------------------------------------------------------

const CARD_W = 226;
const PIN_DY = 16; // string anchor offset below a card's top edge
const BOARD_W = 1640;
const BOARD_H = 1240;

function hash(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xffff;
  return h;
}

type Pos = { x: number; y: number; rot: number };

function computeLayout(data: InvestigationData): Map<string, Pos> {
  const { suspects: S, victims: V, witnesses: W, vehicles: VE, phones: PH, banks: BK, locations: L } =
    data.entities;
  const EV = data.evidence;
  const caseNodes = data.graph.nodes.filter((n) => n.type === "case");
  const map = new Map<string, Pos>();
  const rot = (id: string) => ((hash(id) % 5) - 2) * 1.2;
  const set = (id: string | undefined, x: number, y: number) => {
    if (id) map.set(id, { x, y, rot: rot(id) });
  };
  const ev = (t: EvidenceType) => EV.find((e) => e.type === t);

  // Center — the focal triangle: FIR, primary suspect, victim
  set(caseNodes[0]?.id, 690, 372);
  set(S[0]?.id, 946, 486);
  set(V[0]?.id, 636, 628);

  // zone slot allocators
  const zone = (x0: number, y0: number, cols: number, px: number, py: number) => {
    let i = 0;
    return () => {
      const c = i % cols;
      const r = Math.floor(i / cols);
      i++;
      return { x: x0 + c * px, y: y0 + r * py };
    };
  };
  const top = zone(438, 48, 3, 274, 0);
  const left = zone(48, 344, 1, 0, 214);
  const right = zone(1188, 300, 2, 210, 216);
  const bottom = zone(214, 902, 5, 272, 206);

  // TOP — crime scene, CCTV, initial photograph
  { const p = top(); set(L[0]?.id, p.x, p.y); }
  { const c = ev("CCTV Footage"); if (c) { const p = top(); set(c.id, p.x, p.y); } }
  { const c = ev("Photograph"); if (c) { const p = top(); set(c.id, p.x, p.y); } }

  // RIGHT — vehicles, phones, bank records, digital (CDR)
  VE.forEach((x) => { const p = right(); set(x.id, p.x, p.y); });
  PH.forEach((x) => { const p = right(); set(x.id, p.x, p.y); });
  BK.forEach((x) => { const p = right(); set(x.id, p.x, p.y); });
  { const c = ev("Call Detail Record"); if (c) { const p = right(); set(c.id, p.x, p.y); } }

  // LEFT — witnesses, additional crime locations
  W.forEach((x) => { const p = left(); set(x.id, p.x, p.y); });
  L.slice(1).forEach((x) => { const p = left(); set(x.id, p.x, p.y); });

  // BOTTOM — forensics, fingerprint, seized docs, linked cases, other suspects/victims
  (["Forensic Report", "Fingerprint Analysis", "Seized Document"] as EvidenceType[]).forEach((t) => {
    const c = ev(t); if (c) { const p = bottom(); set(c.id, p.x, p.y); }
  });
  caseNodes.slice(1).forEach((x) => { const p = bottom(); set(x.id, p.x, p.y); });
  S.slice(1).forEach((x) => { const p = bottom(); set(x.id, p.x, p.y); });
  V.slice(1).forEach((x) => { const p = bottom(); set(x.id, p.x, p.y); });

  return map;
}

const RELATION_LABEL: Record<string, string> = {
  "linked to scene": "Present At Scene",
  "primary suspect of": "Primary Suspect",
  "associate of": "Associated With",
  "known associate": "Associated With",
  "incident location": "Crime Location",
  "present at": "Seen At",
  identified: "Witness Identified",
  "registered to": "Vehicle Used",
  "owned by": "Owner Of",
  "held by": "Account Holder",
  "evidence of": "Evidence Recovered",
  "case involves": "Linked FIR",
  "filed for": "Filed For",
  "connected to": "Associated With",
};
function relLabel(r: string): string {
  return RELATION_LABEL[r] ?? r.replace(/\b\w/g, (m) => m.toUpperCase());
}

type Kind =
  | "suspect" | "victim" | "witness" | "vehicle" | "phone" | "bank"
  | "fir" | "scene" | "location" | "cctv" | "photo" | "forensic"
  | "fingerprint" | "cdr" | "seized" | "evidence";

function kindOf(node: GraphNode, evType: EvidenceType | undefined, isScene: boolean): Kind {
  switch (node.type) {
    case "suspect": return "suspect";
    case "victim": return "victim";
    case "witness": return "witness";
    case "vehicle": return "vehicle";
    case "phone": return "phone";
    case "bank": return "bank";
    case "case": return "fir";
    case "location": return isScene ? "scene" : "location";
    case "evidence":
      switch (evType) {
        case "CCTV Footage": return "cctv";
        case "Photograph": return "photo";
        case "Forensic Report": return "forensic";
        case "Fingerprint Analysis": return "fingerprint";
        case "Call Detail Record": return "cdr";
        case "Seized Document": return "seized";
        default: return "evidence";
      }
  }
}

export default function EvidenceBoard({
  data,
  caseTypeName,
  districtName,
  activeId,
  highlightSet,
  onSelect,
}: {
  data: InvestigationData;
  caseTypeName: string;
  districtName: string;
  activeId: string | null;
  highlightSet: Set<string>;
  onSelect: (id: string | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [layout] = useState(() => computeLayout(data));
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 0.62 });
  const fittedRef = useRef(false);
  const panRef = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null);
  const movedRef = useRef(false);
  const [hoveredEdge, setHoveredEdge] = useState<string | null>(null);

  const nodeById = new Map(data.graph.nodes.map((n) => [n.id, n]));
  const evById = new Map(data.evidence.map((e) => [e.id, e]));
  const sceneId = data.entities.locations[0]?.id;

  // fit board into the container once measured
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const fit = () => {
      if (fittedRef.current) return;
      const cw = el.clientWidth;
      const ch = el.clientHeight;
      if (cw < 40 || ch < 40) return;
      const k = Math.min(cw / BOARD_W, ch / BOARD_H) * 0.98;
      setTransform({ k, x: (cw - BOARD_W * k) / 2, y: (ch - BOARD_H * k) / 2 });
      fittedRef.current = true;
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  function refit() {
    const el = containerRef.current;
    if (!el) return;
    const cw = el.clientWidth, ch = el.clientHeight;
    const k = Math.min(cw / BOARD_W, ch / BOARD_H) * 0.98;
    setTransform({ k, x: (cw - BOARD_W * k) / 2, y: (ch - BOARD_H * k) / 2 });
  }
  const zoomBy = (f: number) =>
    setTransform((t) => ({ ...t, k: Math.min(1.8, Math.max(0.3, t.k * f)) }));

  function onPointerDown(e: React.PointerEvent) {
    if ((e.target as HTMLElement).closest("[data-interactive]")) return;
    panRef.current = { sx: e.clientX, sy: e.clientY, ox: transform.x, oy: transform.y };
    movedRef.current = false;
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!panRef.current) return;
    const { sx, sy, ox, oy } = panRef.current;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    if (Math.abs(dx) + Math.abs(dy) > 4) movedRef.current = true;
    setTransform((t) => ({ ...t, x: ox + dx, y: oy + dy }));
  }
  function onPointerUp() {
    if (panRef.current && !movedRef.current) onSelect(null);
    panRef.current = null;
  }
  function onWheel(e: React.WheelEvent) {
    e.preventDefault();
    zoomBy(e.deltaY > 0 ? 0.9 : 1.1);
  }

  const dimmed = (id: string) => activeId !== null && !highlightSet.has(id);

  // edges with both endpoints placed
  const edges = data.graph.edges.filter((e) => layout.has(e.source) && layout.has(e.target));

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full touch-none overflow-hidden"
      style={{
        backgroundColor: "#15110c",
        backgroundImage:
          "radial-gradient(circle at 50% 40%, rgba(120,90,50,0.16), transparent 70%), radial-gradient(circle, rgba(160,120,70,0.10) 1px, transparent 1.4px), radial-gradient(circle, rgba(90,70,45,0.10) 1px, transparent 1.4px)",
        backgroundSize: "auto, 7px 7px, 13px 11px",
        cursor: panRef.current ? "grabbing" : "grab",
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onWheel={onWheel}
    >
      {/* controls */}
      <div className="absolute right-3 top-3 z-20 flex gap-1.5" data-interactive>
        {[
          { fn: () => zoomBy(1.2), Icon: ZoomIn, label: "Zoom in" },
          { fn: () => zoomBy(0.82), Icon: ZoomOut, label: "Zoom out" },
          { fn: refit, Icon: Maximize2, label: "Fit board" },
        ].map(({ fn, Icon, label }) => (
          <button
            key={label}
            onClick={fn}
            aria-label={label}
            className="rounded-md border border-amber-200/20 bg-black/40 p-2 text-amber-100/80 backdrop-blur transition hover:border-amber-200/50 hover:text-amber-50"
          >
            <Icon size={16} />
          </button>
        ))}
      </div>

      {/* board layer */}
      <div
        className="absolute left-0 top-0 origin-top-left"
        style={{ width: BOARD_W, height: BOARD_H, transform: `translate(${transform.x}px,${transform.y}px) scale(${transform.k})` }}
      >
        {/* faint zone labels */}
        {[
          { t: "SCENE · CCTV · INITIAL EVIDENCE", x: 560, y: 20 },
          { t: "WITNESSES · LOCATIONS", x: 40, y: 312 },
          { t: "DIGITAL · VEHICLES · FINANCIAL", x: 1188, y: 270 },
          { t: "FORENSICS · FINGERPRINTS · LINKED CASES", x: 214, y: 872 },
          { t: "PRIMARY INVESTIGATION", x: 636, y: 336 },
        ].map((z) => (
          <span
            key={z.t}
            className="pointer-events-none absolute select-none whitespace-nowrap text-[13px] font-semibold uppercase tracking-[0.25em] text-amber-100/25"
            style={{ left: z.x, top: z.y }}
          >
            {z.t}
          </span>
        ))}

        {/* red investigation strings */}
        <svg width={BOARD_W} height={BOARD_H} className="absolute left-0 top-0" style={{ overflow: "visible" }}>
          {edges.map((e) => {
            const a = layout.get(e.source)!;
            const b = layout.get(e.target)!;
            const ax = a.x + CARD_W / 2, ay = a.y + PIN_DY;
            const bx = b.x + CARD_W / 2, by = b.y + PIN_DY;
            const mx = (ax + bx) / 2, my = (ay + by) / 2 + 26; // gravity sag
            const active = activeId !== null && (e.source === activeId || e.target === activeId);
            const hovered = hoveredEdge === e.id;
            const show = active || hovered;
            const faded = activeId !== null && !active;
            const d = `M ${ax} ${ay} Q ${mx} ${my} ${bx} ${by}`;
            return (
              <g key={e.id}>
                {/* wide invisible hit area for hover */}
                <path
                  d={d}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={16}
                  style={{ pointerEvents: "stroke" }}
                  data-interactive
                  onMouseEnter={() => setHoveredEdge(e.id)}
                  onMouseLeave={() => setHoveredEdge((h) => (h === e.id ? null : h))}
                />
                <path
                  d={d}
                  fill="none"
                  stroke={show ? "#f43f5e" : "#b3241f"}
                  strokeWidth={show ? 2.6 : 1.6}
                  strokeOpacity={faded && !hovered ? 0.07 : show ? 0.95 : 0.42}
                  style={{ filter: show ? "drop-shadow(0 0 4px rgba(244,63,94,0.6))" : undefined }}
                />
                {show && (
                  <g transform={`translate(${mx},${my})`}>
                    <foreignObject x={-70} y={-13} width={140} height={26} style={{ overflow: "visible" }}>
                      <div className="flex justify-center">
                        <span className="whitespace-nowrap rounded-sm border border-amber-900/40 bg-[#f6efdd] px-2 py-0.5 text-center text-[11px] font-semibold uppercase tracking-wide text-red-800 shadow">
                          {relLabel(e.relation)}
                        </span>
                      </div>
                    </foreignObject>
                  </g>
                )}
              </g>
            );
          })}
        </svg>

        {/* evidence cards */}
        {data.graph.nodes.map((node) => {
          const pos = layout.get(node.id);
          if (!pos) return null;
          const detail = getEntityDetail(data, node.id);
          if (!detail) return null;
          const evType = evById.get(node.id)?.type;
          const kind = kindOf(node, evType, node.id === sceneId);
          const isDim = dimmed(node.id);
          const selected = node.id === activeId;
          return (
            <div
              key={node.id}
              data-interactive
              onClick={(ev) => {
                ev.stopPropagation();
                onSelect(node.id === activeId ? null : node.id);
              }}
              className="absolute cursor-pointer transition-opacity duration-300"
              style={{
                left: pos.x,
                top: pos.y,
                width: CARD_W,
                transform: `rotate(${pos.rot}deg) scale(${selected ? 1.05 : 1})`,
                transformOrigin: "center top",
                opacity: isDim ? 0.2 : 1,
                zIndex: selected ? 30 : hoveredEdge ? 5 : 10,
                filter: selected ? "drop-shadow(0 12px 22px rgba(0,0,0,0.6))" : "drop-shadow(0 8px 14px rgba(0,0,0,0.5))",
              }}
            >
              <PushPin color={pinColor(kind)} />
              <div className={selected ? "ring-2 ring-rose-400 ring-offset-2 ring-offset-transparent rounded-[3px]" : ""}>
                <EvidenceCardBody kind={kind} detail={detail} node={node} />
              </div>
            </div>
          );
        })}
      </div>

      {/* corner case label */}
      <div className="pointer-events-none absolute bottom-3 left-3 z-20 rounded-sm border border-amber-200/20 bg-black/40 px-3 py-1.5 backdrop-blur">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-100/50">Case Board</p>
        <p className="text-[13px] font-semibold text-amber-50/90">{caseTypeName} · {districtName}</p>
      </div>
    </div>
  );
}

// --- card chrome -------------------------------------------------------------

function PushPin({ color }: { color: string }) {
  return (
    <span
      className="absolute left-1/2 top-0 z-10 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full"
      style={{
        background: `radial-gradient(circle at 35% 30%, #ffffff 0%, ${color} 45%, rgba(0,0,0,0.6) 100%)`,
        boxShadow: `0 2px 4px rgba(0,0,0,0.6), 0 0 8px ${color}88`,
      }}
    />
  );
}

function pinColor(kind: Kind): string {
  const map: Record<string, string> = {
    suspect: "#e11d48", victim: "#0ea5e9", witness: "#10b981", vehicle: "#f59e0b",
    phone: "#06b6d4", bank: "#84cc16", fir: "#dc2626", scene: "#a855f7", location: "#a855f7",
    cctv: "#f97316", photo: "#f97316", forensic: "#f97316", fingerprint: "#f97316",
    cdr: "#06b6d4", seized: "#f97316", evidence: "#f97316",
  };
  return map[kind] ?? "#dc2626";
}

function Tape({ side = "left" }: { side?: "left" | "right" }) {
  return (
    <span
      className="absolute top-0 h-5 w-12 -translate-y-1/2 rotate-[-4deg] bg-amber-100/25"
      style={{ [side]: 12, boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.15)" } as React.CSSProperties}
    />
  );
}

// --- card bodies -------------------------------------------------------------

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[9px] uppercase tracking-wide text-stone-400">{label}</p>
      <p className="truncate text-[12.5px] font-medium text-stone-800">{value}</p>
    </div>
  );
}

function EvidenceCardBody({ kind, detail, node }: { kind: Kind; detail: EntityDetail; node: GraphNode }) {
  const paper = "border border-stone-300 bg-[#f5efe1]";

  switch (kind) {
    case "fir":
      return (
        <div className="relative overflow-hidden rounded-[3px] border border-amber-900/30 bg-[#e9dcc0] p-3 pt-4">
          <div className="absolute right-2 top-2 flex h-9 w-9 rotate-[-12deg] items-center justify-center rounded-full border-2 border-red-700/70 text-[7px] font-black uppercase leading-tight text-red-700/80">
            Police<br/>Seal
          </div>
          <p className="text-[9px] font-bold uppercase tracking-widest text-stone-500">First Information Report</p>
          <p className="mt-1 font-serif text-2xl font-black text-stone-900">{detail.title}</p>
          <p className="mt-1 text-[11.5px] text-stone-600">{node.sub ?? "Registered case file"}</p>
          <div className="mt-2 inline-block rotate-[-3deg] rounded-sm border-2 border-red-700/60 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-red-700/80">
            F I R
          </div>
        </div>
      );

    case "suspect": {
      const status = detail.fields.find((f) => f.label === "Status")?.value ?? "";
      const risk = detail.fields.find((f) => f.label === "Risk")?.value ?? "";
      const wanted = status === "At Large";
      return (
        <div className={`relative overflow-hidden rounded-[3px] ${paper}`}>
          <div className="flex items-center justify-between bg-stone-900 px-2.5 py-1">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white">Suspect</span>
            <span className="text-[9px] font-mono text-stone-400">{node.id}</span>
          </div>
          <div className="flex gap-2.5 p-2.5">
            <div className="flex h-16 w-14 shrink-0 items-center justify-center border border-stone-400 bg-stone-300">
              <UserRound size={30} className="text-stone-500" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[15px] font-bold text-stone-900">{detail.title}</p>
              <p className="truncate text-[11px] italic text-stone-500">{detail.subtitle}</p>
              <p className="mt-1 text-[11px] text-stone-600">{detail.fields.find((f) => f.label === "Age")?.value} yrs · {detail.fields.find((f) => f.label === "Gender")?.value}</p>
              <p className="mt-0.5 text-[10px] font-semibold uppercase text-red-700">Threat {risk}</p>
            </div>
          </div>
          {wanted && (
            <span className="absolute -right-1 bottom-2 rotate-[-8deg] rounded-sm border-2 border-red-700/70 px-2 py-0.5 text-[11px] font-black uppercase tracking-widest text-red-700/80">
              Wanted
            </span>
          )}
        </div>
      );
    }

    case "victim":
      return (
        <div className={`overflow-hidden rounded-[3px] ${paper}`}>
          <div className="flex items-center justify-between bg-sky-900 px-2.5 py-1">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white">Victim</span>
            <span className="text-[9px] font-mono text-sky-200/70">{node.id}</span>
          </div>
          <div className="flex gap-2.5 p-2.5">
            <div className="flex h-16 w-14 shrink-0 items-center justify-center border border-stone-400 bg-stone-200">
              <UserRound size={30} className="text-sky-700/70" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[15px] font-bold text-stone-900">{detail.title}</p>
              <p className="truncate text-[11px] italic text-stone-500">{detail.subtitle}</p>
              <div className="mt-1 grid grid-cols-2 gap-x-2 gap-y-0.5">
                {detail.fields.slice(0, 2).map((f) => (
                  <Field key={f.label} label={f.label} value={f.value} />
                ))}
              </div>
            </div>
          </div>
        </div>
      );

    case "witness":
      return (
        <div className="relative overflow-hidden rounded-[3px] border border-stone-300 bg-[#fbf8ef] p-3">
          <Tape side="right" />
          <p className="text-[9px] font-bold uppercase tracking-widest text-stone-500">Witness Statement</p>
          <div className="mt-1 flex items-center gap-1.5">
            <Eye size={13} className="text-emerald-700" />
            <p className="truncate text-[14px] font-bold text-stone-900">{detail.title}</p>
          </div>
          <p className="mt-1.5 line-clamp-3 border-l-2 border-stone-300 pl-2 text-[11.5px] italic leading-snug text-stone-600">
            &ldquo;{detail.description}&rdquo;
          </p>
          <p className="mt-1.5 text-[10px] font-semibold uppercase text-stone-500">{detail.subtitle}</p>
        </div>
      );

    case "vehicle":
      return (
        <div className="overflow-hidden rounded-[3px] border border-stone-300 bg-[#eef2e9]">
          <div className="flex items-center gap-1.5 bg-emerald-900 px-2.5 py-1">
            <Car size={12} className="text-emerald-200" />
            <span className="text-[9px] font-bold uppercase tracking-widest text-white">Motor Vehicles Dept · RTO</span>
          </div>
          <div className="p-2.5">
            <div className="rounded border-2 border-stone-800 bg-white px-2 py-1 text-center font-mono text-[16px] font-bold tracking-widest text-stone-900">
              {detail.title}
            </div>
            <p className="mt-1.5 text-[12px] font-medium text-stone-700">{detail.subtitle}</p>
            <p className="text-[11px] text-stone-500">Colour: {detail.fields.find((f) => f.label === "Colour")?.value}</p>
          </div>
        </div>
      );

    case "phone":
    case "cdr":
      return (
        <div className="overflow-hidden rounded-[3px] border border-stone-300 bg-[#eef4f6]">
          <div className="flex items-center gap-1.5 bg-cyan-900 px-2.5 py-1">
            <Phone size={12} className="text-cyan-200" />
            <span className="text-[9px] font-bold uppercase tracking-widest text-white">Call Detail Record</span>
          </div>
          <div className="p-2.5">
            <p className="font-mono text-[13.5px] font-bold text-stone-900">{detail.title}</p>
            <p className="text-[11px] text-stone-500">{detail.subtitle}</p>
            <div className="mt-1.5 space-y-0.5">
              {["+91 98•••• 4471", "+91 90•••• 1122"].map((n, i) => (
                <div key={i} className="flex justify-between font-mono text-[10px] text-stone-500">
                  <span>{n}</span><span>{6 + i}m</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      );

    case "bank":
      return (
        <div className="overflow-hidden rounded-[3px] border border-stone-300 bg-[#f2f5ea]">
          <div className="flex items-center gap-1.5 bg-lime-900 px-2.5 py-1">
            <Landmark size={12} className="text-lime-200" />
            <span className="text-[9px] font-bold uppercase tracking-widest text-white">Transaction Record</span>
          </div>
          <div className="p-2.5">
            <p className="text-[13px] font-bold text-stone-900">{detail.title}</p>
            <p className="font-mono text-[11px] text-stone-600">A/C {detail.subtitle}</p>
            <p className="mt-0.5 text-[11px] text-stone-500">Holder: {detail.fields.find((f) => f.label === "Holder")?.value}</p>
            <div className="mt-1.5 flex justify-between border-t border-dashed border-stone-300 pt-1 font-mono text-[11px]">
              <span className="text-stone-500">Flagged</span>
              <span className="font-semibold text-red-700">₹ 2,40,000</span>
            </div>
          </div>
        </div>
      );

    case "scene":
    case "cctv":
    case "photo": {
      const isCctv = kind === "cctv";
      const label = kind === "scene" ? "Crime Scene" : isCctv ? "CCTV Snapshot" : "Scene Photograph";
      return (
        <div className="relative rounded-[2px] border border-stone-200 bg-white p-2 pb-1 shadow">
          <Tape side="left" />
          <div className="relative h-24 w-full overflow-hidden bg-gradient-to-br from-slate-700 via-slate-800 to-slate-950">
            {/* scanlines */}
            <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "repeating-linear-gradient(0deg, rgba(255,255,255,0.12) 0px, transparent 2px, transparent 4px)" }} />
            <div className="absolute inset-0 flex items-center justify-center">
              {isCctv ? <Video size={30} className="text-white/25" /> : kind === "scene" ? <MapPin size={30} className="text-white/25" /> : <Camera size={30} className="text-white/25" />}
            </div>
            {isCctv && (
              <div className="absolute left-1.5 top-1.5 flex items-center gap-1 text-[8px] font-bold text-red-400">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500" /> REC
              </div>
            )}
            <div className="absolute bottom-1 right-1.5 font-mono text-[8px] text-white/60">{isCctv ? "CAM-07" : "IMG"}</div>
          </div>
          <p className="mt-1.5 px-0.5 font-serif text-[12.5px] italic leading-tight text-stone-700">{detail.title}</p>
          <p className="px-0.5 text-[9px] uppercase tracking-wide text-stone-400">{label}</p>
        </div>
      );
    }

    case "forensic":
      return (
        <div className="overflow-hidden rounded-[3px] border border-amber-900/30 bg-[#d9c9a6] p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <FlaskConical size={13} className="text-amber-900" />
              <span className="text-[9px] font-bold uppercase tracking-widest text-amber-900/80">Forensic · FSL</span>
            </div>
            <span className="rotate-[6deg] rounded-sm border border-red-800/60 px-1 text-[8px] font-black uppercase text-red-800/80">Sealed</span>
          </div>
          <p className="mt-1.5 text-[13px] font-bold text-stone-800">{detail.title}</p>
          <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-stone-600">{detail.description}</p>
        </div>
      );

    case "fingerprint":
      return (
        <div className="overflow-hidden rounded-[3px] border border-stone-300 bg-white p-3">
          <p className="text-[9px] font-bold uppercase tracking-widest text-stone-500">Fingerprint Bureau · AFIS</p>
          <div className="mt-1.5 flex gap-2.5">
            <svg width={44} height={54} viewBox="0 0 44 54" className="shrink-0">
              {[6, 11, 16, 21].map((r, i) => (
                <ellipse key={i} cx={22} cy={27} rx={r} ry={r + 5} fill="none" stroke="#57534e" strokeWidth={1.1} opacity={0.75} />
              ))}
              <path d="M22 6 Q10 27 22 48" fill="none" stroke="#57534e" strokeWidth={1.1} opacity={0.6} />
            </svg>
            <div className="min-w-0">
              <div className="flex items-center gap-1"><Fingerprint size={13} className="text-stone-700" /><p className="truncate text-[12.5px] font-bold text-stone-800">{detail.title}</p></div>
              <p className="mt-1 text-[10.5px] text-stone-500">Ridge match queued</p>
              <p className="text-[10px] font-semibold uppercase text-amber-700">Partial · pending</p>
            </div>
          </div>
        </div>
      );

    case "seized":
      return (
        <div className="relative overflow-hidden rounded-[3px] border-2 border-dashed border-stone-400 bg-[#efe9db] p-3">
          <span className="absolute right-2 top-2 rounded-sm bg-red-700 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider text-white">Evidence</span>
          <p className="text-[9px] font-bold uppercase tracking-widest text-stone-500">Seized Documents</p>
          <p className="mt-1 text-[13px] font-bold text-stone-800">{detail.title}</p>
          <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-stone-600">{detail.description}</p>
          <p className="mt-1.5 font-mono text-[10px] text-stone-400">Exhibit {node.id}</p>
        </div>
      );

    case "location":
      return (
        <div className={`overflow-hidden rounded-[3px] ${paper} p-3`}>
          <div className="flex items-center gap-1.5">
            <MapPin size={13} className="text-violet-700" />
            <span className="text-[9px] font-bold uppercase tracking-widest text-stone-500">Crime Location</span>
          </div>
          <p className="mt-1 text-[13.5px] font-bold text-stone-900">{detail.title}</p>
          <p className="text-[11px] text-stone-600">{detail.subtitle}</p>
          <p className="mt-0.5 text-[10.5px] text-stone-500">{detail.fields.find((f) => f.label === "Address")?.value}</p>
        </div>
      );

    default:
      return (
        <div className={`overflow-hidden rounded-[3px] ${paper} p-3`}>
          <p className="text-[9px] font-bold uppercase tracking-widest text-stone-500">Evidence</p>
          <p className="mt-1 text-[13px] font-bold text-stone-800">{detail.title}</p>
          <p className="mt-1 line-clamp-2 text-[11px] text-stone-600">{detail.description}</p>
        </div>
      );
  }
}
