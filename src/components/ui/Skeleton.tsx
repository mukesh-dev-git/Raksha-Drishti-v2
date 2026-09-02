// -----------------------------------------------------------------------------
// Loading-skeleton pass (2026-09-03). P10 Phase 4 put real, multi-second
// latency on a meaningful fraction of requests across most of the app (see
// liveCaseFacts.ts's header for the measured numbers - a per-instance TTL
// cache on a multi-instance runtime with no session affinity, so "cached"
// is not "always fast"). Before this pass, that latency was silent: the
// browser just sat on a blank paper-colored page until the RSC payload
// arrived. These primitives, plus a loading.tsx per route (see each
// route's own file), give every live-backed page an immediate, honest
// "this is loading" state shaped like the real content, instead of nothing.
//
// Pure CSS (bg-surface-2 + animate-pulse), no JS, no client component -
// these render as part of the static loading.tsx fallback Next.js shows
// before any Server Component work (including the data fetch) has
// resolved, so they must not themselves depend on data.
//
// motion-reduce:animate-none respects prefers-reduced-motion - a pulsing
// page is exactly the kind of motion that setting exists to suppress.
// -----------------------------------------------------------------------------
function cx(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

/** A single pulsing block - the base every other skeleton shape composes. */
export function SkelBlock({ className, style }: { className?: string; style?: { width?: string; height?: string } }) {
  return <div className={cx("animate-pulse rounded-md bg-surface-2 motion-reduce:animate-none", className)} style={style} />;
}

/** One line of "text" at a given width. */
export function SkelText({ width = "100%", className }: { width?: string; className?: string }) {
  return <SkelBlock className={cx("h-3.5", className)} style={{ width }} />;
}

/** The PageShell title band - breadcrumb + heading + description, so a
 *  route's loading.tsx can open with the same shape the real page settles
 *  into a beat later. */
export function SkelTitleBand({ withDescription = true }: { withDescription?: boolean }) {
  return (
    <div className="flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <SkelBlock className="h-3 w-40" />
        <SkelBlock className="mt-3 h-8 w-64" />
        {withDescription && <SkelBlock className="mt-3 h-4 w-96 max-w-full" />}
      </div>
    </div>
  );
}

/** A row of stat tiles, matching StatTile-shaped components used across
 *  the worklist/dashboard/district pages. */
export function SkelStatRow({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-lg border border-line bg-surface p-3.5">
          <SkelBlock className="h-3 w-20" />
          <SkelBlock className="mt-2 h-6 w-12" />
        </div>
      ))}
    </div>
  );
}

/** A filter bar - search box + a few dropdown-shaped blocks. */
export function SkelFilterBar({ selects = 3 }: { selects?: number }) {
  return (
    <div className="flex flex-wrap gap-2">
      <SkelBlock className="h-10 min-w-[220px] flex-1" />
      {Array.from({ length: selects }).map((_, i) => (
        <SkelBlock key={i} className="h-10 w-36" />
      ))}
    </div>
  );
}

/** A data table - header row + N body rows, each with `cols` cells of
 *  varying width so it doesn't read as a uniform grid. */
export function SkelTable({ rows = 8, cols = 6 }: { rows?: number; cols?: number }) {
  const widths = ["70%", "90%", "60%", "50%", "80%", "40%"];
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
      <div className="border-b border-line bg-surface-2 px-4 py-3">
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {Array.from({ length: cols }).map((_, i) => (
            <SkelBlock key={i} className="h-2.5 w-16" />
          ))}
        </div>
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="border-b border-line px-4 py-3.5 last:border-0">
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
            {Array.from({ length: cols }).map((_, c) => (
              <SkelBlock key={c} className="h-3.5" style={{ width: widths[c % widths.length] }} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/** A chart-shaped card - title + a block standing in for a chart canvas. */
export function SkelChartCard({ height = "h-64" }: { height?: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4 shadow-sm">
      <SkelBlock className="h-4 w-40" />
      <SkelBlock className={cx("mt-4 w-full", height)} />
    </div>
  );
}

/** A grid of `count` chart-shaped cards - the common shape for analytics
 *  pages (crime-count, socio-economic, pattern-analysis). */
export function SkelChartGrid({ count = 2, className }: { count?: number; className?: string }) {
  return (
    <div className={cx("grid gap-4 lg:grid-cols-2", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <SkelChartCard key={i} />
      ))}
    </div>
  );
}

/** A generic content card - label + a few text lines. Useful for detail
 *  pages (case detail, person detail) built from stacked info cards. */
export function SkelCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4 shadow-sm">
      <SkelBlock className="h-3.5 w-28" />
      <div className="mt-3 space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <SkelText key={i} width={i === lines - 1 ? "55%" : "90%"} />
        ))}
      </div>
    </div>
  );
}

/** A flat list of icon+text rows - the shape /districts and /persons both
 *  use (an avatar/badge, a name line, a detail line). */
export function SkelListRows({ count = 10, withAvatar = false }: { count?: number; withAvatar?: boolean }) {
  return (
    <div className="space-y-1.5">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 rounded-xl border border-line bg-surface px-4 py-3.5 shadow-sm">
          <SkelBlock className={cx("shrink-0 rounded-lg", withAvatar ? "h-10 w-10 rounded-full" : "h-9 w-9")} />
          <div className="min-w-0 flex-1 space-y-1.5">
            <SkelText width="35%" />
            <SkelText width="55%" className="h-3" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** The two-column detail layout used by case/person detail pages - a
 *  narrower left column and a wider right column, each a stack of cards. */
export function SkelTwoColDetail({ leftCards = 3, rightCards = 2 }: { leftCards?: number; rightCards?: number }) {
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.1fr_1.4fr] lg:items-start">
      <div className="min-w-0 space-y-5">
        {Array.from({ length: leftCards }).map((_, i) => (
          <SkelCard key={i} lines={i === 0 ? 4 : 2} />
        ))}
      </div>
      <div className="min-w-0 space-y-5">
        {Array.from({ length: rightCards }).map((_, i) => (
          <SkelCard key={i} lines={3} />
        ))}
      </div>
    </div>
  );
}
