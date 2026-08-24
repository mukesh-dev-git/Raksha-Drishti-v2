"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import SearchInput from "@/components/ui/SearchInput";
import StatusBadge from "@/components/ui/StatusBadge";
import type { CaseFile } from "@/lib/data";

// Map free-text status to the muted, functional status system.
function statusFor(raw: string): "verified" | "pending" | "alert" {
  const s = raw.toLowerCase();
  if (s.includes("closed")) return "verified";
  if (s.includes("investigation") || s.includes("open")) return "pending";
  return "pending";
}

// -----------------------------------------------------------------------------
// /cases/[caseType]/[district]/case-files — searchable list of case files.
// Each row opens the digital case-file booklet.
// -----------------------------------------------------------------------------
export default function CaseFilesListClient({
  caseFiles,
  base,
}: {
  caseFiles: CaseFile[];
  base: string;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return caseFiles;
    return caseFiles.filter(
      (f) =>
        f.id.toLowerCase().includes(q) ||
        f.title.toLowerCase().includes(q) ||
        f.status.toLowerCase().includes(q)
    );
  }, [query, caseFiles]);

  return (
    <div>
      <div className="max-w-sm">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search case files…"
          ariaLabel="Search case files by ID, title, or status"
        />
      </div>

      <div className="mt-5 overflow-hidden rounded border border-line bg-surface shadow-sm">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Case files for this district</caption>
          <thead>
            <tr className="border-b border-line bg-surface-2 text-xs uppercase tracking-wide text-muted">
              <th scope="col" className="px-4 py-3 font-medium">File</th>
              <th scope="col" className="px-4 py-3 font-medium">Description</th>
              <th scope="col" className="px-4 py-3 font-medium">Status</th>
              <th scope="col" className="px-4 py-3 text-right font-medium">
                <span className="sr-only">Open booklet</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((f) => (
              <tr key={f.id} className="border-b border-line last:border-0 hover:bg-surface-2">
                <th scope="row" className="px-4 py-3 font-medium text-navy">
                  <Link href={`${base}/case-files/${f.id}`} className="hover:underline">
                    {f.id}
                  </Link>
                </th>
                <td className="px-4 py-3 text-ink">{f.title}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={statusFor(f.status)} label={f.status} />
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`${base}/case-files/${f.id}`}
                    className="inline-flex items-center gap-1 rounded-sm border border-line px-3 py-1.5 text-xs font-medium text-navy hover:border-navy"
                  >
                    Open booklet
                    <ArrowRight size={14} aria-hidden="true" />
                  </Link>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-sm text-muted">
                  {query.trim()
                    ? <>No case files match &ldquo;{query}&rdquo;.</>
                    : "No synthetic case files are available for this case type and district."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
