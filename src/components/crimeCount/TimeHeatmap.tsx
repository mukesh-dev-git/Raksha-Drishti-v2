import type { TimeHeatmapData } from "@/lib/crimeCountStats";

// -----------------------------------------------------------------------------
// P4.2 + P4.9 - the literal "time of day x location" ask, rendered as a
// 24-hour x 7-day-of-week matrix (location is /crime-hotspots' map; this is
// the temporal half). Period offences (a running scheme with no real time of
// day) are excluded upstream in getTimeHeatmapData() - see incidentTime.ts.
//
// Cell shade is dash-blue at varying opacity (inline style, not a Tailwind
// `/NN` class - see colors.ts's note on the known bug with these hex vars).
// -----------------------------------------------------------------------------
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function TimeHeatmap({ data }: { data: TimeHeatmapData }) {
  const { grid, maxCount, includedCases, excludedPeriodOffences, excludedMissingTime } = data;

  return (
    <div className="rounded border border-line bg-surface p-5 shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-medium text-ink">Time-of-day &times; day-of-week</p>
        <p className="text-xs text-muted">{includedCases.toLocaleString("en-IN")} cases with a real recorded time</p>
      </div>

      <div className="mt-4 overflow-x-auto">
        <div className="inline-block min-w-full">
          {/* hour axis */}
          <div className="ml-10 grid" style={{ gridTemplateColumns: "repeat(24, minmax(18px, 1fr))" }}>
            {Array.from({ length: 24 }, (_, h) => (
              <div key={h} className="text-center text-[9px] text-muted">
                {h % 3 === 0 ? h : ""}
              </div>
            ))}
          </div>

          {DAY_LABELS.map((label, dow) => (
            <div key={label} className="mt-0.5 flex items-center gap-0">
              <div className="w-10 shrink-0 text-[10px] text-muted">{label}</div>
              <div className="grid flex-1 gap-[2px]" style={{ gridTemplateColumns: "repeat(24, minmax(18px, 1fr))" }}>
                {grid[dow].map((count, hour) => {
                  const intensity = maxCount > 0 ? count / maxCount : 0;
                  return (
                    <div
                      key={hour}
                      title={`${label} ${String(hour).padStart(2, "0")}:00 — ${count} case${count === 1 ? "" : "s"}`}
                      className="aspect-square rounded-sm"
                      style={{
                        backgroundColor: "var(--dash-blue)",
                        opacity: count === 0 ? 0.06 : Math.max(intensity, 0.16),
                      }}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <span className="text-[11px] text-muted">Fewer</span>
        <div className="flex gap-[2px]">
          {[0.06, 0.3, 0.55, 0.8, 1].map((o) => (
            <div key={o} className="h-3 w-3 rounded-sm" style={{ backgroundColor: "var(--dash-blue)", opacity: o }} />
          ))}
        </div>
        <span className="text-[11px] text-muted">More</span>
      </div>

      {(excludedPeriodOffences > 0 || excludedMissingTime > 0) && (
        <p className="mt-3 text-[11px] text-muted">
          Excludes {excludedPeriodOffences.toLocaleString("en-IN")} period offence(s) with no real time of day
          {excludedMissingTime > 0 ? ` and ${excludedMissingTime.toLocaleString("en-IN")} case(s) with no recorded incident time` : ""}.
        </p>
      )}
    </div>
  );
}
