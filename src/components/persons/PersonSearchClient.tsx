"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { FolderKanban, MapPinned, ShieldAlert } from "lucide-react";
import SearchInput from "@/components/ui/SearchInput";
import OffenderAvatar from "@/components/OffenderAvatar";

export type PersonListRow = {
  personId: string;
  name: string;
  aliases: string[];
  caseCount: number;
  districtNames: string[];
  photoUrl: string | null;
};

// -----------------------------------------------------------------------------
// P2.1c - the Crime and Criminal Records Search equivalent: search any
// person in the global register by name, not only the repeat subjects.
// -----------------------------------------------------------------------------
export default function PersonSearchClient({ people }: { people: PersonListRow[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return people;
    return people.filter((p) => `${p.name} ${p.aliases.join(" ")}`.toLowerCase().includes(q));
  }, [people, query]);

  return (
    <div className="space-y-4">
      <div className="max-w-sm">
        <SearchInput value={query} onChange={setQuery} placeholder="Search a name…" ariaLabel="Search persons" />
      </div>

      <div className="space-y-1.5">
        {filtered.map((p) => (
          <Link
            key={p.personId}
            href={`/persons/${p.personId}`}
            className="flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-2.5 shadow-sm transition hover:border-navy"
          >
            <OffenderAvatar personId={p.personId} name={p.name} photoUrl={p.photoUrl} size={40} />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium text-navy">{p.name}</span>
              <span className="mt-0.5 flex flex-wrap items-center gap-3 text-[11.5px] text-muted">
                <span className="flex items-center gap-1"><FolderKanban size={11} aria-hidden="true" /> {p.caseCount} case{p.caseCount === 1 ? "" : "s"}</span>
                <span className="flex items-center gap-1"><MapPinned size={11} aria-hidden="true" /> {p.districtNames.join(", ") || "Unknown"}</span>
              </span>
            </span>
            {p.caseCount > 1 && (
              <span className="flex shrink-0 items-center gap-1 rounded-full bg-dash-pink-bg px-2.5 py-1 text-[11px] font-medium text-dash-pink">
                <ShieldAlert size={12} aria-hidden="true" /> Repeat
              </span>
            )}
          </Link>
        ))}
        {filtered.length === 0 && (
          <div className="rounded-xl border border-dashed border-line bg-surface p-8 text-center text-sm text-muted">
            No one matches &ldquo;{query}&rdquo;.
          </div>
        )}
      </div>
    </div>
  );
}
