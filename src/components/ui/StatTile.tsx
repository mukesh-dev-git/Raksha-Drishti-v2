import { ReactNode } from "react";

// -----------------------------------------------------------------------------
// StatTile — a single summary metric. Solid card, soft shadow, clear hierarchy.
// -----------------------------------------------------------------------------
export default function StatTile({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="rounded border border-line bg-surface p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">{label}</p>
        {icon && <span className="text-navy" aria-hidden="true">{icon}</span>}
      </div>
      <p className="mt-2 text-3xl font-semibold text-navy">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}
