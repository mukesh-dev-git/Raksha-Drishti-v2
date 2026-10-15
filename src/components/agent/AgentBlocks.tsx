"use client";

import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import { Pin, PinOff, Info } from "lucide-react";
import MapEmbed from "@/components/MapEmbed";
import { BASE_PATH } from "@/lib/basePath";
import type { Block } from "@/lib/agent/blocks";

// -----------------------------------------------------------------------------
// Agent Workspace (#16) - renderers for the blocks /api/agent streams back.
// Plain SVG/HTML, no chart library: same approach as the app's existing
// dashboard charts, and every block is small enough that a library would
// only add weight. Each card shows its data source (Real / Demo data) and a
// "How was this made?" panel with the exact tool, arguments and source.
// -----------------------------------------------------------------------------

const fmt = (n: number) => n.toLocaleString("en-IN", { maximumFractionDigits: 1 });

export function BlockCard({ block, pinned, onTogglePin, compact = false }: {
  block: Block; pinned: boolean; onTogglePin: () => void; compact?: boolean;
}) {
  const [showHow, setShowHow] = useState(false);
  const p = block.provenance;
  const real = p.kind === "real";
  return (
    <section className="flex min-w-0 flex-col rounded-lg border border-line bg-surface shadow-sm" aria-label={block.title}>
      <header className="flex items-start gap-2 px-4 pb-2 pt-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-[13.5px] font-semibold leading-snug text-ink">{block.title}</h3>
          {block.subtitle && <p className="mt-0.5 text-[11.5px] text-muted">{block.subtitle}</p>}
        </div>
        <span className={`shrink-0 rounded px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide ${real ? "bg-success-bg text-success" : "bg-warning-bg text-warning"}`}>
          {real ? "Real" : "Demo data"}
        </span>
        <button type="button" onClick={onTogglePin} aria-label={pinned ? "Unpin from board" : "Pin to board"} title={pinned ? "Unpin" : "Pin to board"}
          className={`shrink-0 rounded p-1 ${pinned ? "text-navy" : "text-muted hover:text-navy"}`}>
          {pinned ? <PinOff size={14} /> : <Pin size={14} />}
        </button>
      </header>
      <div className={`min-w-0 px-4 ${compact ? "pb-3" : "pb-2"}`}>
        <BlockBody block={block} compact={compact} />
      </div>
      {!compact && (
        <div className="mt-auto border-t border-line px-4 py-2">
          <button type="button" onClick={() => setShowHow((v) => !v)} aria-expanded={showHow}
            className="flex items-center gap-1 text-[11.5px] font-medium text-muted hover:text-navy">
            <Info size={12} /> How was this made?
          </button>
          {showHow && (
            <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[11.5px]">
              <dt className="text-muted">Tool</dt><dd className="font-mono text-ink">{p.tool}</dd>
              <dt className="text-muted">Inputs</dt><dd className="break-words font-mono text-ink">{formatArgs(p.args)}</dd>
              <dt className="text-muted">Data</dt><dd className="text-ink">{p.source}</dd>
              <dt className="text-muted">Records</dt><dd className="text-ink">{fmt(p.rows)}</dd>
              {p.notes?.map((n, i) => (
                <Fragment key={i}><dt className="text-muted">{i === 0 ? "Notes" : ""}</dt><dd className="text-ink">{n}</dd></Fragment>
              ))}
            </dl>
          )}
        </div>
      )}
    </section>
  );
}

function formatArgs(a: Record<string, unknown>) {
  const parts = Object.entries(a).filter(([, v]) => v != null && v !== "").map(([k, v]) => `${k}=${typeof v === "string" ? v : JSON.stringify(v)}`);
  return parts.length ? parts.join(", ") : "none";
}

function BlockBody({ block, compact }: { block: Block; compact: boolean }) {
  switch (block.kind) {
    case "stats": return <Stats items={block.items} />;
    case "bar": return <Bars rows={block.rows} unit={block.unit} signed={block.signed} max={compact ? 8 : 15} />;
    case "line": return <Line points={block.points} unit={block.unit} />;
    case "table": return <Table columns={block.columns} rows={block.rows} links={block.links} max={compact ? 6 : 50} />;
    case "districtMap": return <DistrictMap metric={block.metric} values={block.values} highlight={block.highlight} />;
    case "hotspotMap": {
      const q = new URLSearchParams();
      if (block.district) q.set("district", block.district);
      if (block.crimeType) q.set("only", block.crimeType);
      const qs = q.toString();
      return compact
        ? <p className="text-[12px] text-muted">Interactive map — open it from the conversation.</p>
        : <MapEmbed src={`${BASE_PATH}/crime-map/hotspots.html${qs ? `?${qs}` : ""}`} title={block.title} />;
    }
  }
}

function Stats({ items }: { items: { label: string; value: string; hint?: string }[] }) {
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
      {items.map((it) => (
        <div key={it.label}>
          <dt className="text-[11px] text-muted">{it.label}</dt>
          <dd className="text-[19px] font-semibold tabular-nums text-ink">{it.value}</dd>
          {it.hint && <dd className={`text-[11px] ${it.hint === "trend alert" ? "font-semibold text-danger" : "text-muted"}`}>{it.hint}</dd>}
        </div>
      ))}
    </dl>
  );
}

function Bars({ rows, unit = "", signed, max }: { rows: { label: string; value: number }[]; unit?: string; signed?: boolean; max: number }) {
  const shown = rows.slice(0, max);
  const peak = Math.max(...shown.map((r) => Math.abs(r.value)), 1);
  if (!shown.length) return <p className="py-2 text-[12px] text-muted">No matching records.</p>;
  return (
    <ul className="space-y-1.5">
      {shown.map((r) => {
        const neg = r.value < 0;
        const w = `${Math.max(1.5, (Math.abs(r.value) / peak) * 100)}%`;
        return (
          <li key={r.label} className="grid grid-cols-[minmax(0,38%)_1fr_auto] items-center gap-2 text-[12px]">
            <span className="truncate text-ink" title={r.label}>{r.label}</span>
            <span className="h-2.5 rounded-sm bg-surface-2">
              <span className={`block h-full rounded-sm ${signed ? (neg ? "bg-[#2f5d8a]" : "bg-[#c2410c]") : "bg-navy"}`} style={{ width: w }} />
            </span>
            <span className="w-16 text-right tabular-nums text-ink">{signed && r.value > 0 ? "+" : ""}{fmt(r.value)}{unit}</span>
          </li>
        );
      })}
      {rows.length > max && <li className="pt-1 text-[11px] text-muted">+{rows.length - max} more</li>}
    </ul>
  );
}

function Line({ points, unit = "" }: { points: { label: string; value: number }[]; unit?: string }) {
  const W = 520, H = 170, L = 44, R = 10, T = 12, B = 26;
  if (points.length < 2) return <Bars rows={points} unit={unit} max={20} />;
  const vals = points.map((p) => p.value);
  const lo = Math.min(0, ...vals), hi = Math.max(...vals) * 1.08 || 1;
  const x = (i: number) => L + (i / (points.length - 1)) * (W - L - R);
  const y = (v: number) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
  const d = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join("");
  const ticks = [lo, (lo + hi) / 2, hi];
  const every = Math.ceil(points.length / 8);
  const last = points[points.length - 1];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`Line chart, ${points.length} points`}>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="var(--line)" />
          <text x={L - 6} y={y(t) + 3.5} textAnchor="end" fontSize="10" fill="var(--muted)">{fmt(Math.round(t))}</text>
        </g>
      ))}
      <path d={`${d}L${x(points.length - 1)},${y(lo)}L${x(0)},${y(lo)}Z`} fill="var(--navy)" opacity="0.08" />
      <path d={d} fill="none" stroke="var(--navy)" strokeWidth="2" />
      {points.map((p, i) => (
        <g key={p.label}>
          <circle cx={x(i)} cy={y(p.value)} r={points.length <= 12 ? 3 : 0} fill="var(--navy)"><title>{`${p.label}: ${fmt(p.value)}${unit}`}</title></circle>
          {i % every === 0 && <text x={x(i)} y={H - 8} textAnchor="middle" fontSize="10" fill="var(--muted)">{p.label}</text>}
        </g>
      ))}
      <text x={x(points.length - 1)} y={y(last.value) - 7} textAnchor="end" fontSize="10.5" fontWeight="600" fill="var(--ink)">{fmt(last.value)}{unit}</text>
    </svg>
  );
}

function Table({ columns, rows, links, max }: { columns: string[]; rows: (string | number)[][]; links?: (string | null)[]; max: number }) {
  if (!rows.length) return <p className="py-2 text-[12px] text-muted">No matching records.</p>;
  return (
    <div className="max-h-72 overflow-auto">
      <table className="w-full text-left text-[12px]">
        <thead className="sticky top-0 bg-surface">
          <tr>{columns.map((c, i) => <th key={c} className={`border-b border-line py-1.5 pr-3 font-semibold text-muted ${i ? "text-right" : ""}`}>{c}</th>)}</tr>
        </thead>
        <tbody>
          {rows.slice(0, max).map((r, ri) => (
            <tr key={ri} className="border-b border-line/60">
              {r.map((cell, ci) => (
                <td key={ci} className={`py-1.5 pr-3 tabular-nums text-ink ${ci ? "text-right" : ""}`}>
                  {ci === 0 && links?.[ri] ? <Link href={links[ri]!} className="text-navy hover:underline">{cell}</Link> : typeof cell === "number" ? fmt(cell) : cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length > max && <p className="pt-1 text-[11px] text-muted">+{rows.length - max} more rows</p>}
    </div>
  );
}

// --- District map: same colour scales and thresholds as choropleth.html ------
type Geo = { type: "Polygon" | "MultiPolygon"; coordinates: number[][][] | number[][][][] };
type Feature = { geometry: Geo; properties: { censusCode: number; label: string } };
let geoPromise: Promise<{ code: number; label: string; d: string }[]> | null = null;

function loadPaths() {
  geoPromise ??= fetch("/crime-map/data/district-map.json").then((r) => r.json()).then((fc: { features: Feature[] }) => {
    const rings = (g: Geo) => (g.type === "Polygon" ? (g.coordinates as number[][][]) : (g.coordinates as number[][][][]).flat());
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const f of fc.features) for (const r of rings(f.geometry)) for (const [x, y] of r) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    const k = Math.cos((((y0 + y1) / 2) * Math.PI) / 180), s = 300 / ((x1 - x0) * k);
    const pt = ([x, y]: number[]) => `${((x - x0) * k * s).toFixed(1)},${((y1 - y) * s).toFixed(1)}`;
    return fc.features.map((f) => ({ code: f.properties.censusCode, label: f.properties.label, d: rings(f.geometry).map((r) => "M" + r.map(pt).join("L") + "Z").join("") }));
  });
  return geoPromise;
}

const SCALES = {
  ratePerLakh2025: { stops: [125, 150, 175, 200, 250, 300], colors: ["#fff4e6", "#fdd9b0", "#fdb87a", "#f8924c", "#e8692b", "#c44a1a", "#8f2f0e"], fmt: (v: number) => `${Math.round(v)} /lakh` },
  changePct: { stops: [-10, -5, 5, 10, 15], colors: ["#2f5d8a", "#8fb0cf", "#ecebe6", "#f6b48a", "#e0613a", "#a8231a"], fmt: (v: number) => `${v > 0 ? "+" : ""}${v}%` },
};

function DistrictMap({ metric, values, highlight = [] }: { metric: keyof typeof SCALES; values: Record<string, number>; highlight?: number[] }) {
  const [paths, setPaths] = useState<{ code: number; label: string; d: string }[] | null>(null);
  const [err, setErr] = useState(false);
  useEffect(() => { loadPaths().then(setPaths).catch(() => setErr(true)); }, []);
  const sc = SCALES[metric];
  const color = (v: number) => sc.colors[sc.stops.filter((s) => v >= s).length];
  if (err) return <p className="text-[12px] text-muted">Couldn't load district boundaries.</p>;
  if (!paths) return <div className="h-64 animate-pulse rounded bg-surface-2" />;
  return (
    <div className="flex flex-wrap items-end gap-4">
      <svg viewBox="0 0 300 330" className="w-full max-w-[260px]" role="img" aria-label="Karnataka district map">
        {paths.map((p) => {
          const v = values[String(p.code)];
          const hl = highlight.includes(p.code);
          return (
            <path key={p.code} d={p.d} fill={v == null ? "#eee" : color(v)} stroke={hl ? "#1f3a5f" : "#fff"} strokeWidth={hl ? 1.6 : 0.7}>
              <title>{`${p.label}: ${v == null ? "no data" : sc.fmt(v)}`}</title>
            </path>
          );
        })}
      </svg>
      <div className="text-[11px] text-muted">
        <div className="flex h-2.5 w-40 overflow-hidden rounded-sm">{sc.colors.map((c) => <span key={c} className="flex-1" style={{ background: c }} />)}</div>
        <div className="mt-1 flex w-40 justify-between tabular-nums"><span>{sc.fmt(sc.stops[0])}</span><span>{sc.fmt(sc.stops[sc.stops.length - 1])}</span></div>
        {highlight.length > 0 && <p className="mt-2">Outlined: the districts listed alongside.</p>}
      </div>
    </div>
  );
}

/** CSV rows for a block, for board export. Null when the block has no tabular data. */
export function blockToCsv(b: Block): string[][] | null {
  switch (b.kind) {
    case "bar": return [["label", `value${b.unit ? ` (${b.unit.trim()})` : ""}`], ...b.rows.map((r) => [r.label, String(r.value)])];
    case "line": return [["label", "value"], ...b.points.map((r) => [r.label, String(r.value)])];
    case "table": return [b.columns, ...b.rows.map((r) => r.map(String))];
    case "stats": return [["measure", "value"], ...b.items.map((i) => [i.label, i.value])];
    case "districtMap": return [["census_code", b.metric], ...Object.entries(b.values).map(([k, v]) => [k, String(v)])];
    default: return null;
  }
}
