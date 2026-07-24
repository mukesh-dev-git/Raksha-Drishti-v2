import {
  UserRound,
  ShieldAlert,
  Eye,
  MapPin,
  FileText,
  type LucideIcon,
} from "lucide-react";
import type { CaseFileContent } from "@/lib/investigationData";

// -----------------------------------------------------------------------------
// CaseBoardPage — the last page of the case-file booklet: a detective evidence
// board that "connects the dots" of THIS crime. The victim sits at the centre;
// suspects, evidence, witnesses and the crime scene are pinned around and joined
// to it by red string threads showing how each links back to the case.
// Polaroid/index-card + pushpin aesthetic (no suspect photos).
// -----------------------------------------------------------------------------

type Kind = "victim" | "suspect" | "evidence" | "witness" | "scene";

type BoardNode = {
  id: string;
  kind: Kind;
  title: string;
  sub: string;
  cx: number;
  cy: number;
  rot: number;
};

type BoardEdge = { a: string; b: string; label: string };

const KIND: Record<Kind, { icon: LucideIcon; color: string; tag: string }> = {
  victim: { icon: UserRound, color: "#b1121f", tag: "Victim" },
  suspect: { icon: ShieldAlert, color: "#1f2937", tag: "Suspect" },
  evidence: { icon: FileText, color: "#b45309", tag: "Evidence" },
  witness: { icon: Eye, color: "#047857", tag: "Witness" },
  scene: { icon: MapPin, color: "#1d4ed8", tag: "Scene" },
};

function buildBoard(c: CaseFileContent): { nodes: BoardNode[]; edges: BoardEdge[] } {
  const CENTER: BoardNode = {
    id: "victim",
    kind: "victim",
    title: c.victim.name,
    sub: `${c.victim.age} / ${c.victim.gender}`,
    cx: 50,
    cy: 50,
    rot: -2,
  };

  // Peripheral "dots" drawn from the actual case content.
  const peripheral: Omit<BoardNode, "cx" | "cy" | "rot">[] = [
    { id: "scene", kind: "scene", title: c.crimeScene.location, sub: "Crime scene" },
    ...c.suspects.slice(0, 3).map((s) => ({
      id: s.id,
      kind: "suspect" as Kind,
      title: s.name,
      sub: s.status,
    })),
    ...c.evidence.slice(0, 3).map((e) => ({
      id: e.id,
      kind: "evidence" as Kind,
      title: e.type,
      sub: e.title,
    })),
    ...c.witnesses.slice(0, 2).map((w) => ({
      id: w.id,
      kind: "witness" as Kind,
      title: w.name,
      sub: `${w.reliability} reliability`,
    })),
  ];

  // Lay the peripheral nodes on an ellipse around the victim. Kept clear of the
  // board edges so cards never clip at the horizontal extremes.
  const n = peripheral.length;
  const rx = 30;
  const ry = 33;
  const nodes: BoardNode[] = [
    CENTER,
    ...peripheral.map((p, i) => {
      const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n;
      return {
        ...p,
        cx: 50 + rx * Math.cos(angle),
        cy: 50 + ry * Math.sin(angle),
        rot: i % 2 === 0 ? -4 : 4,
      };
    }),
  ];

  // Connect the dots: everything links back to the victim; evidence also links
  // to a suspect it implicates.
  const suspectIds = c.suspects.slice(0, 3).map((s) => s.id);
  const edges: BoardEdge[] = [];
  for (const p of peripheral) {
    if (p.kind === "evidence" && suspectIds.length) {
      const target = suspectIds[edges.length % suspectIds.length];
      edges.push({ a: p.id, b: target, label: "implicates" });
    }
    edges.push({
      a: p.id,
      b: "victim",
      label:
        p.kind === "suspect"
          ? "suspected of"
          : p.kind === "witness"
          ? "witnessed"
          : p.kind === "scene"
          ? "found at"
          : "linked",
    });
  }

  return { nodes, edges };
}

function DotCard({ node }: { node: BoardNode }) {
  const meta = KIND[node.kind];
  const Icon = meta.icon;
  const lg = node.kind === "victim";
  return (
    <div className="group absolute z-10" style={{ left: `${node.cx}%`, top: `${node.cy}%` }}>
      <div
        className="-translate-x-1/2 -translate-y-1/2 transition-transform duration-300 group-hover:z-40 group-hover:scale-110"
        style={{ width: lg ? 124 : 104, transform: `rotate(${node.rot}deg)` }}
      >
        <div className="relative bg-[#f7f4ec] p-1.5 shadow-[0_6px_16px_rgba(0,0,0,0.5)] ring-1 ring-black/10">
          {/* Pushpin */}
          <span
            aria-hidden="true"
            className="absolute -top-1.5 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rounded-full shadow"
            style={{ backgroundImage: "radial-gradient(circle at 32% 30%, #ff7b7b 0 22%, #e5242a 60%)" }}
          />
          <div className="flex items-center gap-1.5">
            <span
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm text-white"
              style={{ backgroundColor: meta.color }}
            >
              <Icon size={13} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-[7px] font-bold uppercase tracking-wider" style={{ color: meta.color }}>
                {meta.tag}
              </p>
              <p className="truncate font-serif text-[10px] font-semibold leading-tight text-[#1a1a1a]">
                {node.title}
              </p>
            </div>
          </div>
          <p className="mt-1 truncate text-[8px] text-neutral-500">{node.sub}</p>
        </div>
      </div>
    </div>
  );
}

export default function CaseBoardPage({ content }: { content: CaseFileContent }) {
  const { nodes, edges } = buildBoard(content);
  const pos = Object.fromEntries(nodes.map((n) => [n.id, n]));

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex items-start justify-between border-b-2 border-stone-800/80 pb-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-500">
            Raksha Drishti · Confidential Case File
          </p>
          <h2 className="mt-1 font-serif text-xl font-bold text-stone-900">
            Connecting the Dots
          </h2>
        </div>
        <p className="mt-1 whitespace-nowrap text-[10px] text-stone-500">{content.cover.firNumber}</p>
      </div>

      {/* Evidence board */}
      <div
        className="relative min-h-[440px] flex-1 overflow-hidden rounded-lg ring-1 ring-black/20"
        style={{
          backgroundColor: "#2b2620",
          backgroundImage:
            "linear-gradient(rgba(30,24,16,0.55), rgba(30,24,16,0.72)), url(https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=1200&q=70)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {/* Threads (relationships) */}
        <svg
          aria-hidden="true"
          className="absolute inset-0 z-0 h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          {edges.map((e, i) => {
            const A = pos[e.a];
            const B = pos[e.b];
            if (!A || !B) return null;
            return (
              <line
                key={i}
                x1={A.cx}
                y1={A.cy}
                x2={B.cx}
                y2={B.cy}
                stroke="#c02626"
                strokeWidth={1}
                strokeOpacity={0.65}
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
        </svg>

        {nodes.map((n) => (
          <DotCard key={n.id} node={n} />
        ))}
      </div>

      <p className="mt-2 text-center text-[9px] italic text-stone-400">
        Evidence board — suspects, evidence &amp; witnesses linked to the victim
      </p>
    </div>
  );
}
