"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import SearchInput from "@/components/ui/SearchInput";
import type { CaseType } from "@/lib/data";

// -----------------------------------------------------------------------------
// /cases — searchable list of crime categories. Click a row to see its
// district-wise breakdown.
// -----------------------------------------------------------------------------
export default function CasesListClient({ caseTypes }: { caseTypes: CaseType[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return caseTypes;
    return caseTypes.filter((c) => c.name.toLowerCase().includes(q));
  }, [query, caseTypes]);

  return (
    <div>
      <div className="max-w-sm">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search case types…"
          ariaLabel="Search case types"
        />
      </div>

      <div className="mt-5 overflow-hidden rounded border border-line bg-surface shadow-sm">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">
            Crime categories and their registered case counts
          </caption>
          <thead>
            <tr className="border-b border-line bg-surface-2 text-xs uppercase tracking-wide text-muted">
              <th scope="col" className="px-4 py-3 font-medium">Case Type</th>
              <th scope="col" className="px-4 py-3 font-medium">Registered Cases</th>
              <th scope="col" className="px-4 py-3 text-right font-medium">
                <span className="sr-only">Open district-wise view</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.slug} className="border-b border-line last:border-0 hover:bg-surface-2">
                <th scope="row" className="px-4 py-3 font-medium text-navy">
                  <Link href={`/cases/${c.slug}/district-wise`} className="hover:underline">
                    {c.name}
                  </Link>
                </th>
                <td className="px-4 py-3 tabular-nums text-ink">
                  {c.total.toLocaleString("en-IN")}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/cases/${c.slug}/district-wise`}
                    className="inline-flex items-center gap-1 rounded-sm border border-line px-3 py-1.5 text-xs font-medium text-navy hover:border-navy"
                  >
                    View districts
                    <ArrowRight size={14} aria-hidden="true" />
                  </Link>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-sm text-muted">
                  No case types match &ldquo;{query}&rdquo;.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
