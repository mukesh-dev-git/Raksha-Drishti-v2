"use client";

import { useMemo, useState } from "react";
import { Fingerprint, Video, PhoneCall, Landmark, Link2 } from "lucide-react";
import type { EvidenceTabData } from "@/lib/investigation/adaptToEvidence";
import PinnedCard from "./PinnedCard";
import SectionHeading from "./SectionHeading";
import SegmentedFilter from "@/components/ui/SegmentedFilter";
import StatTile from "@/components/ui/StatTile";

const ACCENT = "#0b2e59";

const TYPE_ICON: Record<string, typeof Video> = {
  "CCTV Footage": Video,
  "Call Detail Record": PhoneCall,
  "Financial Transaction": Landmark,
};

// -----------------------------------------------------------------------------
// CaseEvidencePanel — the Evidence tab: register + linked people + linked
// timeline events + chain of custody, per exhibit. A single-select type
// filter (reusing the existing, previously-unused SegmentedFilter) keeps
// navigation shallow instead of a separate page per evidence category.
// -----------------------------------------------------------------------------
export default function CaseEvidencePanel({ data }: { data: EvidenceTabData }) {
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const filterOptions = useMemo(
    () => [{ value: "all", label: `All (${data.rows.length})` }, ...data.countByType.map((t) => ({ value: t.type, label: `${t.type} (${t.count})` }))],
    [data]
  );

  const filtered = typeFilter === "all" ? data.rows : data.rows.filter((r) => r.type === typeFilter);
  const custodyAvailable = data.rows.some((r) => r.custodyAvailable);

  return (
    <div className="space-y-6">
      <SectionHeading
        icon={Fingerprint}
        title="Evidence Register"
        subtitle={`${data.rows.length} exhibit${data.rows.length === 1 ? "" : "s"} on record across this connected investigation`}
        accent={ACCENT}
      />

      {data.rows.length === 0 ? (
        <PinnedCard pin={ACCENT}>
          <p className="p-6 text-[15px] text-muted">No evidence is on record for this case.</p>
        </PinnedCard>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile label="Total Exhibits" value={String(data.rows.length)} icon={<Fingerprint size={16} />} />
            {data.countByType.map((t) => {
              const Icon = TYPE_ICON[t.type] ?? Fingerprint;
              return <StatTile key={t.type} label={t.type} value={String(t.count)} icon={<Icon size={16} />} />;
            })}
          </div>

          <SegmentedFilter label="Filter by type" options={filterOptions} value={typeFilter} onChange={setTypeFilter} />

          <div className="space-y-3">
            {filtered.map((row) => {
              const Icon = TYPE_ICON[row.type] ?? Fingerprint;
              return (
                <details key={row.id} className="group rounded border border-line bg-surface shadow-sm">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4">
                    <span className="flex min-w-0 items-center gap-2.5">
                      <Icon size={16} className="shrink-0 text-navy" />
                      <span className="min-w-0">
                        <span className="block truncate text-[14px] font-medium text-ink">{row.title}</span>
                        <span className="block text-[12px] text-muted">
                          {row.type} · {row.date}{row.time && ` · ${row.time}`}
                        </span>
                      </span>
                    </span>
                    <span className="shrink-0 text-[11px] text-muted">
                      {row.linkedPeople.length} people · {row.linkedTimelineEvents.length} events
                    </span>
                  </summary>
                  <div className="space-y-4 border-t border-line p-4">
                    <p className="text-[14px] leading-relaxed text-ink">{row.description}</p>

                    <div>
                      <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-navy">Linked People</p>
                      {row.linkedPeople.length === 0 ? (
                        <p className="text-[13px] text-muted">Not available in current records.</p>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {row.linkedPeople.map((p) => (
                            <span key={p.id} className="rounded-sm border border-line bg-surface-2 px-2 py-1 text-[12px] text-ink">
                              {p.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-navy">
                        <Link2 size={12} /> Linked Timeline Events
                      </p>
                      {row.linkedTimelineEvents.length === 0 ? (
                        <p className="text-[13px] text-muted">Not available in current records.</p>
                      ) : (
                        <ul className="space-y-1.5">
                          {row.linkedTimelineEvents.map((t) => (
                            <li key={t.id} className="rounded-sm border border-line bg-surface-2 p-2.5 text-[13px]">
                              <span className="text-muted">{t.date}{t.time && ` · ${t.time}`} — </span>
                              <span className="text-ink">{t.description}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <p className="border-t border-line pt-3 text-[12px] text-muted">
                      Chain of Custody: {row.custodyAvailable ? "Available" : "Not available in current records."}
                    </p>
                    <p className="text-[11px] text-muted">Exhibit id: {row.id}</p>
                  </div>
                </details>
              );
            })}
          </div>

          {!custodyAvailable && (
            <PinnedCard pin={ACCENT}>
              <p className="p-4 text-[13px] text-muted">
                No chain-of-custody records exist for any evidence item in this case.
              </p>
            </PinnedCard>
          )}
        </>
      )}
    </div>
  );
}
