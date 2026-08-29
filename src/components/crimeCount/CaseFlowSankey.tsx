import type { CaseFlowSankeyData, SankeyLink } from "@/lib/crimeCountStats";
import { crimeTypeColor } from "./colors";

// -----------------------------------------------------------------------------
// P4.9 case-flow Sankey - crime type -> status -> pendency bucket, showing
// where the pipeline leaks by crime type. Hand-built proportional-band SVG,
// no charting dependency (per PLAN.md P4.9's own note: "hand-built
// proportional bands is fine, no new dependency required").
// -----------------------------------------------------------------------------
const NAME_TO_SLUG: Record<string, string> = { Theft: "theft", Assault: "assault", Fraud: "fraud", Burglary: "burglary" };
const STATUS_COLOR: Record<string, string> = {
  Open: "var(--dash-blue)",
  "Under Investigation": "var(--warning)",
  "Charge Sheeted": "var(--dash-purple)",
  Closed: "var(--success)",
};
const BUCKET_COLOR: Record<string, string> = {
  "Charge Sheeted": "var(--dash-purple)",
  Closed: "var(--success)",
  "Still Pending": "var(--warning)",
};

type Pos = { x: number; y: number; h: number };

// Stacks each column's nodes vertically, height proportional to its real
// total case count - `gap` px of breathing room between nodes, subtracted
// from the usable height before scaling so totals still fill the column.
function layoutColumn(names: string[], totals: Map<string, number>, total: number, x: number, top: number, height: number, gap: number) {
  const usable = height - gap * (names.length - 1);
  const scale = total > 0 ? usable / total : 0;
  const pos = new Map<string, Pos>();
  let y = top;
  for (const name of names) {
    const h = (totals.get(name) ?? 0) * scale;
    pos.set(name, { x, y, h });
    y += h + gap;
  }
  return { pos, scale };
}

// For every link touching a node, its cumulative vertical offset within that
// node's stack - ordered by the OTHER column's node order, so bands leaving
// (or entering) one node stay stacked in the same order as the nodes they
// connect to, rather than crossing each other more than the data requires.
function stackOffsets(links: SankeyLink[], groupBy: "source" | "target", otherOrder: string[]) {
  const other = groupBy === "source" ? "target" : "source";
  const grouped = new Map<string, SankeyLink[]>();
  for (const l of links) {
    const key = l[groupBy];
    const arr = grouped.get(key) ?? [];
    arr.push(l);
    grouped.set(key, arr);
  }
  const offsets = new Map<string, number>();
  for (const arr of grouped.values()) {
    arr.sort((a, b) => otherOrder.indexOf(a[other]) - otherOrder.indexOf(b[other]));
    let cum = 0;
    for (const l of arr) {
      offsets.set(`${l.source}|${l.target}`, cum);
      cum += l.value;
    }
  }
  return offsets;
}

function ribbonPath(x0: number, top0: number, bot0: number, x1: number, top1: number, bot1: number) {
  const mid = (x0 + x1) / 2;
  return `M${x0},${top0} C${mid},${top0} ${mid},${top1} ${x1},${top1} L${x1},${bot1} C${mid},${bot1} ${mid},${bot0} ${x0},${bot0} Z`;
}

function sumBy(links: SankeyLink[], key: "source" | "target") {
  const m = new Map<string, number>();
  for (const l of links) m.set(l[key], (m.get(l[key]) ?? 0) + l.value);
  return m;
}

export default function CaseFlowSankey({ data }: { data: CaseFlowSankeyData }) {
  const W = 900;
  const H = 420;
  const PAD_T = 20;
  const PAD_B = 20;
  const plotH = H - PAD_T - PAD_B;
  const GAP = 10;

  const X0 = 110,
    NODE_W0 = 10;
  const X1 = 440,
    NODE_W1 = 70;
  const X2 = 800,
    NODE_W2 = 10;

  const total = data.crimeToStatus.reduce((s, l) => s + l.value, 0);

  const crimeTotals = sumBy(data.crimeToStatus, "source");
  const statusTotals = sumBy(data.crimeToStatus, "target");
  const bucketTotals = sumBy(data.statusToBucket, "target");

  const { pos: col0, scale: scale0 } = layoutColumn(data.crimeTypeNodes, crimeTotals, total, X0, PAD_T, plotH, GAP);
  const { pos: col1, scale: scale1 } = layoutColumn(data.statusNodes, statusTotals, total, X1, PAD_T, plotH, GAP);
  const { pos: col2, scale: scale2 } = layoutColumn(data.bucketNodes, bucketTotals, total, X2, PAD_T, plotH, GAP);

  const off0Out = stackOffsets(data.crimeToStatus, "source", data.statusNodes);
  const off1In = stackOffsets(data.crimeToStatus, "target", data.crimeTypeNodes);
  const off1Out = stackOffsets(data.statusToBucket, "source", data.bucketNodes);
  const off2In = stackOffsets(data.statusToBucket, "target", data.statusNodes);

  return (
    <div className="rounded border border-line bg-surface p-5 shadow-sm">
      <p className="text-sm font-medium text-ink">Case flow — crime type &rarr; status &rarr; outcome</p>
      <p className="mt-1 text-xs text-muted">Where the pendency pipeline leaks, by crime type. Band width is proportional to real case counts.</p>

      <svg viewBox={`0 0 ${W} ${H}`} className="mt-4 w-full" role="img" aria-label="Case flow from crime type through status to outcome">
        {/* stage 1 ribbons: crime type -> status */}
        {data.crimeToStatus.map((l, i) => {
          const p0 = col0.get(l.source);
          const p1 = col1.get(l.target);
          if (!p0 || !p1 || l.value === 0) return null;
          const key = `${l.source}|${l.target}`;
          const top0 = p0.y + (off0Out.get(key) ?? 0) * scale0;
          const bot0 = top0 + l.value * scale0;
          const top1 = p1.y + (off1In.get(key) ?? 0) * scale1;
          const bot1 = top1 + l.value * scale1;
          return (
            <path
              key={`s1-${i}`}
              d={ribbonPath(p0.x + NODE_W0, top0, bot0, p1.x, top1, bot1)}
              fill={crimeTypeColor(NAME_TO_SLUG[l.source])}
              opacity={0.38}
            >
              <title>{`${l.source} → ${l.target}: ${l.value.toLocaleString("en-IN")} cases`}</title>
            </path>
          );
        })}

        {/* stage 2 ribbons: status -> outcome bucket */}
        {data.statusToBucket.map((l, i) => {
          const p0 = col1.get(l.source);
          const p1 = col2.get(l.target);
          if (!p0 || !p1 || l.value === 0) return null;
          const key = `${l.source}|${l.target}`;
          const top0 = p0.y + (off1Out.get(key) ?? 0) * scale1;
          const bot0 = top0 + l.value * scale1;
          const top1 = p1.y + (off2In.get(key) ?? 0) * scale2;
          const bot1 = top1 + l.value * scale2;
          return (
            <path
              key={`s2-${i}`}
              d={ribbonPath(p0.x + NODE_W1, top0, bot0, p1.x, top1, bot1)}
              fill={STATUS_COLOR[l.source] ?? "var(--muted)"}
              opacity={0.38}
            >
              <title>{`${l.source} → ${l.target}: ${l.value.toLocaleString("en-IN")} cases`}</title>
            </path>
          );
        })}

        {/* column 0: crime type nodes */}
        {data.crimeTypeNodes.map((name) => {
          const p = col0.get(name)!;
          return (
            <g key={name}>
              <rect x={p.x} y={p.y} width={NODE_W0} height={Math.max(p.h, 1)} fill={crimeTypeColor(NAME_TO_SLUG[name])} rx={2}>
                <title>{`${name}: ${(crimeTotals.get(name) ?? 0).toLocaleString("en-IN")} cases`}</title>
              </rect>
              <text x={p.x - 8} y={p.y + p.h / 2} dy="0.35em" textAnchor="end" fontSize={11} fill="var(--ink)">
                {name}
              </text>
            </g>
          );
        })}

        {/* column 1: status nodes */}
        {data.statusNodes.map((name) => {
          const p = col1.get(name)!;
          const showInline = p.h >= 13;
          return (
            <g key={name}>
              <rect x={p.x} y={p.y} width={NODE_W1} height={Math.max(p.h, 1)} fill={STATUS_COLOR[name] ?? "var(--muted)"} rx={2}>
                <title>{`${name}: ${(statusTotals.get(name) ?? 0).toLocaleString("en-IN")} cases`}</title>
              </rect>
              {showInline ? (
                <text x={p.x + NODE_W1 / 2} y={p.y + p.h / 2} dy="0.35em" textAnchor="middle" fontSize={10.5} fill="var(--navy-ink)" fontWeight={600}>
                  {name}
                </text>
              ) : (
                <text x={p.x + NODE_W1 / 2} y={p.y - 3} textAnchor="middle" fontSize={9} fill="var(--muted)">
                  {name}
                </text>
              )}
            </g>
          );
        })}

        {/* column 2: outcome bucket nodes */}
        {data.bucketNodes.map((name) => {
          const p = col2.get(name)!;
          return (
            <g key={name}>
              <rect x={p.x} y={p.y} width={NODE_W2} height={Math.max(p.h, 1)} fill={BUCKET_COLOR[name] ?? "var(--muted)"} rx={2}>
                <title>{`${name}: ${(bucketTotals.get(name) ?? 0).toLocaleString("en-IN")} cases`}</title>
              </rect>
              <text x={p.x + NODE_W2 + 8} y={p.y + p.h / 2} dy="0.35em" textAnchor="start" fontSize={11} fill="var(--ink)">
                {name} ({(bucketTotals.get(name) ?? 0).toLocaleString("en-IN")})
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
