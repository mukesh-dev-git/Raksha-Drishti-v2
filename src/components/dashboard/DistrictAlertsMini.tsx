import Link from "next/link";
import districtMap from "@/lib/real-data/districtMap.json";

// -----------------------------------------------------------------------------
// Dashboard card: Karnataka's 30 districts shaded by real crime change (2025
// vs the 2022-23 average) plus the districts that tripped a trend alert.
// Replaces the old scaled-down iframe of the simulated Bengaluru heatmap.
//
// Drawn as a plain server-rendered SVG from the same real data the full
// District Map uses (catalyst/real-data/district-map/build.mjs) - no map
// engine, no tiles, no client JS, so it's on screen with the page. Same
// colour scale and alert threshold as choropleth.html, so the card and the
// full map can't disagree.
// -----------------------------------------------------------------------------

type Props = { censusCode: number; name: string; label: string; changePct: number; ratePerLakh2025: number };
type Geometry = { type: "Polygon" | "MultiPolygon"; coordinates: number[][][] | number[][][][] };

const SPIKE = 10;
const RISE = 5;
const STOPS = [-10, -5, 5, 10, 15];
const COLORS = ["#2f5d8a", "#8fb0cf", "#ecebe6", "#f6b48a", "#e0613a", "#a8231a"];
const colorFor = (v: number) => COLORS[STOPS.filter((s) => v >= s).length];

const W = 300;

function buildPaths() {
  const feats = districtMap.features as unknown as { geometry: Geometry; properties: Props }[];
  const rings = (g: Geometry) =>
    g.type === "Polygon" ? (g.coordinates as number[][][]) : (g.coordinates as number[][][][]).flat();

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const f of feats) for (const r of rings(f.geometry)) for (const [x, y] of r) {
    minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  }
  // Equirectangular with a cos(latitude) correction - accurate enough at
  // Karnataka's size, and exactly how a small reference map should look.
  const k = Math.cos((((minY + maxY) / 2) * Math.PI) / 180);
  const scale = W / ((maxX - minX) * k);
  const H = Math.ceil((maxY - minY) * scale);
  const pt = ([x, y]: number[]) => `${((x - minX) * k * scale).toFixed(1)},${((maxY - y) * scale).toFixed(1)}`;

  const paths = feats.map((f) => ({
    p: f.properties,
    d: rings(f.geometry).map((r) => "M" + r.map(pt).join("L") + "Z").join(""),
  }));
  return { paths, H };
}

const { paths, H } = buildPaths();

export default function DistrictAlertsMini() {
  const props = paths.map((x) => x.p);
  const rising = props.filter((p) => p.changePct >= RISE).sort((a, b) => b.changePct - a.changePct);
  const state = districtMap.meta.state;

  return (
    <div className="h-full rounded-xl border border-line bg-surface p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-[15px] font-semibold text-ink">District Trend Alerts</p>
        <Link href="/crime-hotspots" className="text-xs font-medium text-dash-blue hover:underline">
          Open District Map
        </Link>
      </div>
      <p className="mt-1 text-xs text-muted">
        Real KSP IPC/BNS cases, 2025 vs the 2022–23 average · statewide{" "}
        {state.changePct > 0 ? "+" : ""}
        {state.changePct}%
      </p>

      <div className="mt-3 flex flex-col gap-4 sm:flex-row lg:flex-col xl:flex-row">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full max-w-[220px] shrink-0 self-center"
          role="img"
          aria-label="Map of Karnataka districts shaded by change in crime"
        >
          {paths.map(({ p, d }) => (
            <path
              key={p.censusCode}
              d={d}
              fill={colorFor(p.changePct)}
              stroke={p.changePct >= SPIKE ? "#b3261e" : "#ffffff"}
              strokeWidth={p.changePct >= SPIKE ? 2 : 0.8}
            >
              <title>{`${p.label}: ${p.changePct > 0 ? "+" : ""}${p.changePct}%`}</title>
            </path>
          ))}
        </svg>

        <div className="min-w-0 flex-1">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted">Rising districts</p>
          {rising.length === 0 ? (
            <p className="mt-2 text-xs text-muted">No district is up {RISE}% or more.</p>
          ) : (
            <ul className="mt-1.5 space-y-1">
              {rising.map((p) => (
                <li key={p.censusCode} className="flex items-center justify-between gap-2 text-[13px] text-ink">
                  <span className="truncate">
                    {p.changePct >= SPIKE && (
                      <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-[#b3261e]" aria-label="Trend alert" />
                    )}
                    {p.label}
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums ${
                      p.changePct >= SPIKE ? "bg-[#fbe4e2] text-[#b3261e]" : "bg-[#fdeee2] text-[#c2410c]"
                    }`}
                  >
                    +{p.changePct}%
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-[11px] leading-snug text-muted">
            Red outline = trend alert (up {SPIKE}% or more). Blue districts are falling.
          </p>
        </div>
      </div>
    </div>
  );
}
