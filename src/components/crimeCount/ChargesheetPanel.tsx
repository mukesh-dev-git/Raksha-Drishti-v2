import type { ChargesheetAnalytics } from "@/lib/crimeCountStats";

// -----------------------------------------------------------------------------
// P4.4 - chargesheet rate + time-to-chargesheet histogram, from real
// ChargesheetDetails csdate data (catalyst/dataset-v2/build_seed.mjs, bundled
// as chargesheetDates.json), plus the Heinous/Non-Heinous split from real
// GravityOffenceID. Hand-rolled SVG bars, no charting dependency.
// -----------------------------------------------------------------------------
export default function ChargesheetPanel({ data }: { data: ChargesheetAnalytics }) {
  const maxBucket = Math.max(...data.timeToChargesheetHistogram.map((b) => b.count), 1);

  return (
    <div className="rounded border border-line bg-surface p-5 shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <p className="text-sm text-muted">Chargesheet rate</p>
          <p className="mt-1 text-3xl font-semibold text-navy">{data.chargesheetRatePct}%</p>
          <p className="mt-1 text-xs text-muted">
            {data.chargesheetedCases.toLocaleString("en-IN")} of {data.totalCases.toLocaleString("en-IN")} cases reached Charge Sheeted
          </p>
        </div>
        {data.medianDaysToChargesheet !== null && (
          <div className="text-right">
            <p className="text-sm text-muted">Median time to chargesheet</p>
            <p className="mt-1 text-3xl font-semibold text-navy">{data.medianDaysToChargesheet}d</p>
          </div>
        )}
      </div>

      {/* Time-to-chargesheet histogram */}
      <div className="mt-6">
        <p className="text-xs font-medium text-muted">Time-to-chargesheet distribution</p>
        <div className="mt-3 flex items-end gap-3" style={{ height: 120 }}>
          {data.timeToChargesheetHistogram.map((b) => (
            <div key={b.bucketLabel} className="flex flex-1 flex-col items-center gap-1.5" title={`${b.bucketLabel}: ${b.count} cases`}>
              <div className="flex w-full flex-1 items-end">
                <div
                  className="w-full rounded-t bg-dash-blue"
                  style={{ height: `${Math.max((b.count / maxBucket) * 100, b.count > 0 ? 4 : 0)}%` }}
                />
              </div>
              <span className="text-[11px] font-medium text-ink">{b.count}</span>
              <span className="text-center text-[10px] leading-tight text-muted">{b.bucketLabel}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Heinous / Non-Heinous split */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <GravityRow label="Heinous" tone="var(--danger)" g={data.gravity.heinous} />
        <GravityRow label="Non-Heinous" tone="var(--dash-teal)" g={data.gravity.nonHeinous} />
      </div>

      {data.chargesheetedWithoutDate > 0 && (
        <p className="mt-4 text-[11px] text-muted">
          Note: {data.chargesheetedWithoutDate} charge-sheeted case(s) had no matching chargesheet date on file, so they count toward the rate but not the day-count histogram.
        </p>
      )}
    </div>
  );
}

function GravityRow({
  label,
  tone,
  g,
}: {
  label: string;
  tone: string;
  g: { total: number; chargesheeted: number; ratePct: number };
}) {
  return (
    <div className="rounded-md border border-line bg-surface-2 p-3">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[13px] font-medium text-ink">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: tone }} />
          {label}
        </span>
        <span className="text-[13px] font-semibold text-ink">{g.ratePct}%</span>
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-surface">
        <div className="h-1.5 rounded-full" style={{ width: `${g.ratePct}%`, backgroundColor: tone }} />
      </div>
      <p className="mt-1.5 text-[11px] text-muted">
        {g.chargesheeted.toLocaleString("en-IN")} of {g.total.toLocaleString("en-IN")} charge-sheeted
      </p>
    </div>
  );
}
