"use client";

// -----------------------------------------------------------------------------
// SegmentedFilter — a small bordered button group for a single-select filter.
// Mirrors the text-size stepper in AccessibilityControls so filter chrome
// reads consistently across the portal. aria-pressed + a filled active state
// keep the current choice legible without relying on colour alone.
// -----------------------------------------------------------------------------
export default function SegmentedFilter<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs font-medium text-muted">{label}</span>
      <div
        role="group"
        aria-label={label}
        className="flex overflow-hidden rounded-sm border border-line"
      >
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-pressed={value === opt.value}
            className={`px-2.5 py-1.5 text-xs font-medium transition-colors ${
              value === opt.value
                ? "bg-navy text-white"
                : "bg-surface text-ink hover:bg-surface-2"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
