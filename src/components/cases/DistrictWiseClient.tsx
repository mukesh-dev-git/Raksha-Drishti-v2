"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, TrendingUp, TrendingDown } from "lucide-react";
import SearchInput from "@/components/ui/SearchInput";
import SegmentedFilter from "@/components/ui/SegmentedFilter";
import Sparkline from "@/components/ui/Sparkline";
import StatusBadge from "@/components/ui/StatusBadge";
import type { District } from "@/lib/data";

// Clearance rate thresholds — mirrors the muted, functional status system
// used throughout the portal (StatusBadge). Never colour alone: each badge
// pairs an icon with the rate as text.
function clearanceStatus(rate: number): "verified" | "pending" | "alert" {
  if (rate >= 60) return "verified";
  if (rate >= 35) return "pending";
  return "alert";
}

type ClearanceFilter = "all" | "verified" | "pending" | "alert";
type TrendFilter = "all" | "up" | "down";

// -----------------------------------------------------------------------------
// /cases/[caseType]/district-wise — searchable, filterable district table.
// Each row opens that district's investigation workspace.
// -----------------------------------------------------------------------------
export default function DistrictWiseClient({
  districts,
  caseTypeSlug,
  caseTypeName,
  firstYear,
  lastYear,
}: {
  districts: District[];
  caseTypeSlug: string;
  caseTypeName: string;
  firstYear: number;
  lastYear: number;
}) {
  const [query, setQuery] = useState("");
  const [clearanceFilter, setClearanceFilter] = useState<ClearanceFilter>("all");
  const [trendFilter, setTrendFilter] = useState<TrendFilter>("all");

  const ranked = useMemo(
    () => [...districts].sort((a, b) => b.count - a.count),
    [districts]
  );

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ranked
      .map((d) => {
        const first = d.trend[0];
        const last = d.trend[d.trend.length - 1];
        const pct = Math.round(((last - first) / first) * 100);
        return { d, first, last, pct, up: pct >= 0 };
      })
      .filter(({ d, pct }) => {
        if (q && !d.name.toLowerCase().includes(q)) return false;
        if (clearanceFilter !== "all" && clearanceStatus(d.clearanceRate) !== clearanceFilter)
          return false;
        if (trendFilter === "up" && pct < 0) return false;
        if (trendFilter === "down" && pct >= 0) return false;
        return true;
      });
  }, [ranked, query, clearanceFilter, trendFilter]);

  const hasActiveFilters = query.trim() !== "" || clearanceFilter !== "all" || trendFilter !== "all";

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-sm flex-1">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search districts…"
            ariaLabel="Search districts by name"
          />
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          <SegmentedFilter
            label="Clearance"
            value={clearanceFilter}
            onChange={setClearanceFilter}
            options={[
              { value: "all", label: "All" },
              { value: "verified", label: "High" },
              { value: "pending", label: "Medium" },
              { value: "alert", label: "Low" },
            ]}
          />
          <SegmentedFilter
            label="Trend"
            value={trendFilter}
            onChange={setTrendFilter}
            options={[
              { value: "all", label: "All" },
              { value: "up", label: "Rising" },
              { value: "down", label: "Falling" },
            ]}
          />
        </div>
      </div>

      <div className="mt-5 overflow-hidden rounded border border-line bg-surface shadow-sm">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">
            {caseTypeName} cases by district, ranked highest to lowest
          </caption>
          <thead>
            <tr className="border-b border-line bg-surface-2 text-xs uppercase tracking-wide text-muted">
              <th scope="col" className="px-4 py-3 font-medium">District</th>
              <th scope="col" className="px-4 py-3 font-medium">Cases</th>
              <th scope="col" className="hidden px-4 py-3 font-medium sm:table-cell">
                Trend {firstYear}–{lastYear}
              </th>
              <th scope="col" className="hidden px-4 py-3 font-medium md:table-cell">
                Clearance Rate
              </th>
              <th scope="col" className="px-4 py-3 text-right font-medium">
                <span className="sr-only">Open workspace</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ d, first, last, pct, up }) => {
              const TrendIcon = up ? TrendingUp : TrendingDown;
              return (
                <tr key={d.slug} className="border-b border-line last:border-0 hover:bg-surface-2">
                  <th scope="row" className="px-4 py-3 font-medium text-navy">
                    <Link
                      href={`/cases/${caseTypeSlug}/${d.slug}/investigation-workspace`}
                      className="hover:underline"
                    >
                      {d.name}
                    </Link>
                  </th>
                  <td className="px-4 py-3 tabular-nums text-ink">
                    {d.count.toLocaleString("en-IN")}
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <div className="flex items-center gap-3">
                      <Sparkline
                        data={d.trend}
                        width={96}
                        height={28}
                        ariaLabel={`${d.name} ${caseTypeName.toLowerCase()} cases went from ${first} in ${firstYear} to ${last} in ${lastYear}, ${up ? "up" : "down"} ${Math.abs(pct)} percent.`}
                      />
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-ink">
                        <TrendIcon size={14} aria-hidden="true" />
                        {up ? "+" : "−"}{Math.abs(pct)}%
                      </span>
                    </div>
                  </td>
                  <td className="hidden px-4 py-3 md:table-cell">
                    <StatusBadge
                      status={clearanceStatus(d.clearanceRate)}
                      label={`${d.clearanceRate}% cleared`}
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/cases/${caseTypeSlug}/${d.slug}/investigation-workspace`}
                      className="inline-flex items-center gap-1 rounded-sm border border-line px-3 py-1.5 text-xs font-medium text-navy hover:border-navy"
                    >
                      Open workspace
                      <ArrowRight size={14} aria-hidden="true" />
                    </Link>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted">
                  No districts match your search or filters.
                  {hasActiveFilters && (
                    <>
                      {" "}
                      <button
                        type="button"
                        onClick={() => {
                          setQuery("");
                          setClearanceFilter("all");
                          setTrendFilter("all");
                        }}
                        className="font-medium text-navy hover:underline"
                      >
                        Clear all
                      </button>
                    </>
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
