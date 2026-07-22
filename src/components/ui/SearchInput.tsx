"use client";

import { Search, X } from "lucide-react";

// -----------------------------------------------------------------------------
// SearchInput — a plain, accessible search field. No floating label (per the
// portal's form guidance); placeholder + aria-label carry the purpose, and a
// clear (×) button appears once there's text to clear.
// -----------------------------------------------------------------------------
export default function SearchInput({
  value,
  onChange,
  placeholder,
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  ariaLabel: string;
}) {
  return (
    <div className="relative">
      <Search
        size={16}
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className="w-full rounded-sm border border-line bg-surface py-2.5 pl-9 pr-9 text-sm text-ink placeholder:text-muted"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-sm p-0.5 text-muted hover:text-navy"
        >
          <X size={16} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
