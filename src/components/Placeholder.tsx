import { ReactNode } from "react";
import { Wrench } from "lucide-react";

// -----------------------------------------------------------------------------
// Placeholder — marks where a teammate feature will be built. Uses a functional
// amber "pending" treatment (not a bright/playful color), with a text label so
// status is never conveyed by color alone.
// -----------------------------------------------------------------------------
export default function Placeholder({
  label,
  children,
}: {
  label: string;
  children?: ReactNode;
}) {
  return (
    <section className="rounded border border-line bg-surface p-6 shadow-sm">
      <div className="flex items-center gap-2">
        <span
          className="flex h-6 w-6 items-center justify-center rounded-sm bg-warning-bg text-warning"
          aria-hidden="true"
        >
          <Wrench size={14} />
        </span>
        <span className="rounded-sm bg-warning-bg px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-warning">
          Pending — feature to be added
        </span>
      </div>
      <h3 className="mt-3 text-lg font-semibold text-ink">{label}</h3>
      {children && <div className="mt-2 text-sm leading-relaxed text-muted">{children}</div>}
    </section>
  );
}
