"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import SearchInput from "@/components/ui/SearchInput";
import CaseStatusPill from "@/components/CaseStatusPill";
import { caseDetailLink, type WorklistCase } from "@/lib/caseWorklist";
import { CASE_STATUS_LABEL, type CaseStatusId } from "@/lib/caseStatus";
import { caseTypes, districts } from "@/lib/data";

// -----------------------------------------------------------------------------
// P2 restructure - the FIR Index. Every real case, filterable in place
// (search / crime type / district / status), replacing the old "pick a
// crime type, then a district" gate as the way to reach a case. Filters are
// query state on this one page, not path segments - matches PLAN.md P2.1.
// -----------------------------------------------------------------------------
export default function CaseWorklistClient({ cases }: { cases: WorklistCase[] }) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState("");
  const [district, setDistrict] = useState("");
  const [status, setStatus] = useState<CaseStatusId | "">("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return cases.filter((c) => {
      if (type && c.crimeTypeSlug !== type) return false;
      if (district && c.districtSlug !== district) return false;
      if (status && c.statusId !== status) return false;
      if (q) {
        const haystack = `${c.title} ${c.crimeNo} ${c.accusedNames.join(" ")}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [cases, query, type, district, status]);

  const counts = useMemo(() => {
    const byStatus: Record<CaseStatusId, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
    for (const c of cases) byStatus[c.statusId]++;
    return byStatus;
  }, [cases]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Total cases" value={cases.length} />
        <StatTile label={CASE_STATUS_LABEL[4]} value={counts[4]} />
        <StatTile label={CASE_STATUS_LABEL[2]} value={counts[2]} />
        <StatTile label={CASE_STATUS_LABEL[3]} value={counts[3]} />
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="min-w-[220px] flex-1">
          <SearchInput value={query} onChange={setQuery} placeholder="Search title, FIR no., person…" ariaLabel="Search cases" />
        </div>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="rounded-sm border border-line bg-surface px-3 py-2 text-sm text-ink"
          aria-label="Filter by crime type"
        >
          <option value="">All crime types</option>
          {caseTypes.map((c) => (
            <option key={c.slug} value={c.slug}>{c.name}</option>
          ))}
        </select>
        <select
          value={district}
          onChange={(e) => setDistrict(e.target.value)}
          className="rounded-sm border border-line bg-surface px-3 py-2 text-sm text-ink"
          aria-label="Filter by district"
        >
          <option value="">All districts</option>
          {districts.map((d) => (
            <option key={d.slug} value={d.slug}>{d.name}</option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value ? (Number(e.target.value) as CaseStatusId) : "")}
          className="rounded-sm border border-line bg-surface px-3 py-2 text-sm text-ink"
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          {([1, 2, 3, 4] as CaseStatusId[]).map((id) => (
            <option key={id} value={id}>{CASE_STATUS_LABEL[id]}</option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Registered cases, filterable by crime type, district and status</caption>
          <thead>
            <tr className="border-b border-line bg-surface-2 text-xs uppercase tracking-wide text-muted">
              <th scope="col" className="px-4 py-3 font-medium">Crime no.</th>
              <th scope="col" className="px-4 py-3 font-medium">Case</th>
              <th scope="col" className="px-4 py-3 font-medium">District</th>
              <th scope="col" className="px-4 py-3 font-medium">Type</th>
              <th scope="col" className="px-4 py-3 font-medium">Status</th>
              <th scope="col" className="px-4 py-3 font-medium">Registered</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.caseMasterId} className="border-b border-line last:border-0 hover:bg-dash-blue-bg/40">
                <td className="px-4 py-3">
                  <Link href={caseDetailLink(c.caseMasterId)} className="font-mono text-[11.5px] text-muted hover:text-navy hover:underline">
                    {c.crimeNo}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <Link href={caseDetailLink(c.caseMasterId)} className="block font-medium text-navy hover:underline">
                    {c.title}
                  </Link>
                  {c.accusedNames.length > 0 && (
                    <p className="mt-0.5 text-[11.5px] text-muted">{c.accusedNames.join(", ")}</p>
                  )}
                </td>
                <td className="px-4 py-3 text-ink">{c.districtName}</td>
                <td className="px-4 py-3 text-ink">{c.crimeTypeName}</td>
                <td className="px-4 py-3"><CaseStatusPill statusId={c.statusId} /></td>
                <td className="px-4 py-3 tabular-nums text-ink">{c.registeredDate ?? "—"}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted">
                  No cases match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-line bg-surface p-3.5 shadow-sm">
      <p className="text-[11.5px] text-muted">{label}</p>
      <p className="mt-1 text-xl font-semibold text-navy tabular-nums">{value}</p>
    </div>
  );
}
