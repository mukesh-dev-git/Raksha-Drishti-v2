"use client";

import { useState } from "react";
import Link from "next/link";
import { FolderKanban, Layers, Clock, MapPinned, Fingerprint, ChevronRight, CreditCard, Phone, Home, UserSquare2 } from "lucide-react";
import OffenderAvatar from "@/components/OffenderAvatar";
import CrossSourceTimeline from "@/components/CrossSourceTimeline";
import type { FusedPerson } from "@/lib/personFusion";
import type { PersonIdentity } from "@/lib/personIdentity";

export type PersonCaseInfo = {
  caseMasterId: number;
  scenarioId: string;
  scenarioTitle: string;
  crimeTypeName: string;
  districtId: number | null;
  districtName: string;
  link: string | null;
};

export type EnrichedPerson = FusedPerson & {
  cases: PersonCaseInfo[];
  photoUrl: string | null;
  identity: PersonIdentity | null;
};

// -----------------------------------------------------------------------------
// Master-detail per direct user ask: click a person on the left, see more on
// the right - same selection-state pattern InvestigationWorkspaceClient.tsx
// already uses. Data is 100% precomputed server-side (page.tsx); this
// component only owns which personId is selected.
// -----------------------------------------------------------------------------
export default function RepeatOffendersClient({ people }: { people: EnrichedPerson[] }) {
  const [selectedId, setSelectedId] = useState(people[0]?.personId ?? null);
  const selected = people.find((p) => p.personId === selectedId) ?? people[0];

  const districtNames = (p: EnrichedPerson) => [...new Set(p.cases.map((c) => c.districtName))];
  const crimeTypeNames = (p: EnrichedPerson) => [...new Set(p.cases.map((c) => c.crimeTypeName))];

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[340px_1fr] lg:items-start">
      {/* Left: compact selectable list */}
      <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
        <div className="border-b border-line bg-surface-2/50 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
            {people.length} people · 2+ cases each
          </p>
        </div>
        <div className="max-h-[720px] divide-y divide-line overflow-y-auto">
          {people.map((p) => {
            const active = p.personId === selected?.personId;
            return (
              <button
                key={p.personId}
                onClick={() => setSelectedId(p.personId)}
                className={`flex w-full items-center gap-3 px-4 py-3 text-left transition ${
                  active ? "bg-dash-blue-bg/60" : "hover:bg-surface-2/60"
                }`}
                aria-pressed={active}
              >
                <OffenderAvatar personId={p.personId} name={p.name} photoUrl={p.photoUrl} size={44} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-semibold text-navy">{p.name}</span>
                  <span className="mt-0.5 flex items-center gap-2 text-[11.5px] text-muted">
                    <FolderKanban size={12} aria-hidden="true" /> {p.caseMasterIds.length} cases
                    <span aria-hidden="true">·</span>
                    <MapPinned size={12} aria-hidden="true" /> {districtNames(p).length} districts
                  </span>
                </span>
                <ChevronRight size={16} className={active ? "text-dash-blue" : "text-muted/40"} aria-hidden="true" />
              </button>
            );
          })}
        </div>
      </div>

      {/* Right: detail panel for the selected person */}
      {selected && (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
            <div className="flex flex-wrap items-start gap-4 border-b border-line bg-surface-2/50 px-5 py-4">
              <OffenderAvatar personId={selected.personId} name={selected.name} photoUrl={selected.photoUrl} size={112} />
              <div className="min-w-0 flex-1">
                <p className="text-[16px] font-semibold text-navy">{selected.name}</p>
                <p className="mt-0.5 font-mono text-[11px] text-muted">{selected.personId}</p>
                {selected.aliases.length > 1 && (
                  <p className="mt-1.5 text-[12px] text-muted">
                    Also recorded as: {selected.aliases.filter((a) => a !== selected.name).join(", ")}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-4 text-[13px] text-muted">
                  <span className="flex items-center gap-1.5">
                    <FolderKanban size={14} aria-hidden="true" /> {selected.caseMasterIds.length} cases
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Layers size={14} aria-hidden="true" /> {selected.scenarioIds.length} investigation
                    {selected.scenarioIds.length === 1 ? "" : "s"}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock size={14} aria-hidden="true" /> {selected.timeline.length} linked records
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MapPinned size={14} aria-hidden="true" /> {districtNames(selected).length} district
                    {districtNames(selected).length === 1 ? "" : "s"}
                  </span>
                </div>
                <Link
                  href={`/persons/${selected.personId}`}
                  className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-navy hover:underline"
                >
                  <UserSquare2 size={14} aria-hidden="true" /> View full profile
                </Link>
              </div>
            </div>

            {selected.identity && (
              <div className="border-b border-line bg-surface-2/30 px-5 py-3">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
                  Registered identity
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <span className="flex items-start gap-2 text-[13px] text-ink">
                    <CreditCard size={14} className="mt-0.5 shrink-0 text-muted" aria-hidden="true" />
                    <span>
                      <span className="block text-[10.5px] uppercase tracking-wide text-muted">Aadhaar</span>
                      <span className="font-mono">{selected.identity.aadhaarMasked}</span>
                    </span>
                  </span>
                  <span className="flex items-start gap-2 text-[13px] text-ink">
                    <Phone size={14} className="mt-0.5 shrink-0 text-muted" aria-hidden="true" />
                    <span>
                      <span className="block text-[10.5px] uppercase tracking-wide text-muted">Phone</span>
                      <span className="font-mono">{selected.identity.phone}</span>
                    </span>
                  </span>
                  {selected.identity.address && (
                    <span className="flex items-start gap-2 text-[13px] text-ink">
                      <Home size={14} className="mt-0.5 shrink-0 text-muted" aria-hidden="true" />
                      <span>
                        <span className="block text-[10.5px] uppercase tracking-wide text-muted">Address</span>
                        {selected.identity.address}
                      </span>
                    </span>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-5 p-5 md:grid-cols-[1fr_1.3fr]">
              {/* How this person was linked - provable facts only, no
                  invented confidence scoring */}
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
                  <Fingerprint size={12} aria-hidden="true" /> How this was flagged
                </p>
                <ul className="space-y-2 text-[13px] leading-relaxed text-ink">
                  <li>
                    Same resolved <span className="font-mono text-[12px]">{selected.personId}</span> cited across{" "}
                    <strong>{selected.caseMasterIds.length}</strong> separate FIRs — a shared record id, not a name match.
                  </li>
                  <li>
                    Spans <strong>{districtNames(selected).length}</strong> district
                    {districtNames(selected).length === 1 ? "" : "s"}: {districtNames(selected).join(", ")}.
                  </li>
                  <li>
                    Case types involved: {crimeTypeNames(selected).join(", ")}.
                  </li>
                  {selected.aliases.length > 1 && (
                    <li>
                      Recorded under {selected.aliases.length} name variant{selected.aliases.length === 1 ? "" : "s"}, resolved
                      to one identity.
                    </li>
                  )}
                </ul>
              </div>

              {/* Cases */}
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">Cases</p>
                <div className="space-y-1.5">
                  {selected.cases.map((c) => {
                    const content = (
                      <div className="flex items-center justify-between gap-2 rounded-lg border border-line px-3 py-2 text-[13px] transition hover:border-navy">
                        <span className="min-w-0">
                          <span className="block truncate text-ink">{c.scenarioTitle}</span>
                          <span className="text-[11px] text-muted">
                            {c.crimeTypeName} · {c.districtName}
                          </span>
                        </span>
                        <span className="shrink-0 font-mono text-[11px] text-muted">{c.scenarioId}</span>
                      </div>
                    );
                    return c.link ? (
                      <Link key={c.caseMasterId} href={c.link}>
                        {content}
                      </Link>
                    ) : (
                      <div key={c.caseMasterId}>{content}</div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Cross-source timeline GRAPH */}
          <div className="rounded-xl border border-line bg-surface p-5 shadow-sm">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
              Cross-source timeline · {selected.timeline.length} records
            </p>
            <p className="mb-3 text-[12px] text-muted">
              Every call, sighting, transaction and statement linked to this person, merged in chronological order across every case.
            </p>
            <CrossSourceTimeline items={selected.timeline} />
          </div>
        </div>
      )}
    </div>
  );
}
