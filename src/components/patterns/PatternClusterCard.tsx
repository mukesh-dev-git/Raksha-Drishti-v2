"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, Waypoints, ArrowRight, Link2, Brain, Shield } from "lucide-react";
import OffenderAvatar from "@/components/OffenderAvatar";
import StatusBadge from "@/components/ui/StatusBadge";

type AccusedWithPhoto = { personId: string; name: string; photoUrl: string | null };

type PatternMemberClient = {
  caseMasterId: number;
  scenarioId: string;
  scenarioTitle: string;
  crimeTypeName: string;
  districtName: string;
  sections: string[];
  link: string | null;
  accused: AccusedWithPhoto[];
};

type PatternClusterClient = {
  id: string;
  members: PatternMemberClient[];
  linkingSections: string[];
  strength: "exact" | "partial";
};

export default function PatternClusterCard({
  cluster,
  summary,
  isGlm,
  defaultExpanded = false,
}: {
  cluster: PatternClusterClient;
  summary: string;
  isGlm: boolean;
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const allAccused = cluster.members.flatMap((m) => m.accused);
  const uniqueAccused = allAccused.filter(
    (a, i, arr) => arr.findIndex((x) => x.personId === a.personId) === i
  );

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-sm transition-shadow hover:shadow-md">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full flex-wrap items-center justify-between gap-3 border-b border-line bg-gradient-to-r from-navy/5 to-transparent px-5 py-4 text-left transition-colors hover:from-navy/10"
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy/10">
            <Waypoints size={18} className="text-navy" aria-hidden="true" />
          </div>
          <div>
            <p className="text-[15px] font-semibold text-navy">
              {cluster.members.length} linked cases
            </p>
            <p className="text-xs text-muted">
              {[...new Set(cluster.members.map((m) => m.districtName))].join(", ")}
            </p>
          </div>
          <StatusBadge
            status={cluster.strength === "exact" ? "verified" : "pending"}
            label={cluster.strength === "exact" ? "Exact match" : "Distinctive overlap"}
          />
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden flex-wrap items-center gap-1.5 sm:flex">
            <Link2 size={13} className="text-muted" aria-hidden="true" />
            {cluster.linkingSections.slice(0, 4).map((s) => (
              <span
                key={s}
                className="rounded border border-navy/20 bg-navy/5 px-2 py-0.5 font-mono text-[11px] font-medium text-navy"
              >
                {s}
              </span>
            ))}
            {cluster.linkingSections.length > 4 && (
              <span className="text-xs text-muted">+{cluster.linkingSections.length - 4}</span>
            )}
          </div>
          {expanded ? (
            <ChevronUp size={18} className="text-muted" />
          ) : (
            <ChevronDown size={18} className="text-muted" />
          )}
        </div>
      </button>

      {/* Collapsed preview — accused thumbnails */}
      {!expanded && uniqueAccused.length > 0 && (
        <div className="flex items-center gap-3 border-b border-line bg-surface-2/50 px-5 py-3">
          <Shield size={14} className="shrink-0 text-muted" aria-hidden="true" />
          <div className="flex -space-x-2">
            {uniqueAccused.slice(0, 6).map((a) => (
              <OffenderAvatar key={a.personId} personId={a.personId} name={a.name} photoUrl={a.photoUrl} size={32} />
            ))}
          </div>
          {uniqueAccused.length > 6 && (
            <span className="text-xs text-muted">+{uniqueAccused.length - 6} more</span>
          )}
          <span className="text-xs text-muted">
            {uniqueAccused.length} suspect{uniqueAccused.length !== 1 ? "s" : ""} across cases
          </span>
        </div>
      )}

      {/* Expanded body */}
      {expanded && (
        <>
          {/* AI summary */}
          <div className="border-b border-line bg-gradient-to-r from-dash-purple-bg/30 to-transparent px-5 py-4">
            <div className="mb-2 flex items-center gap-2">
              <Brain size={14} className="text-dash-purple" aria-hidden="true" />
              <span className="text-xs font-semibold uppercase tracking-wider text-dash-purple">
                {isGlm ? "AI Analysis · GLM-4.7-Flash" : "Pattern Summary"}
              </span>
            </div>
            <p className="text-sm leading-relaxed text-ink/80">{summary}</p>
          </div>

          {/* Accused gallery */}
          {uniqueAccused.length > 0 && (
            <div className="border-b border-line px-5 py-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
                Suspects involved ({uniqueAccused.length})
              </p>
              <div className="flex flex-wrap gap-3">
                {uniqueAccused.map((a) => (
                  <div key={a.personId} className="flex items-center gap-2 rounded-lg border border-line bg-surface-2/50 p-2 pr-3">
                    <OffenderAvatar personId={a.personId} name={a.name} photoUrl={a.photoUrl} size={40} />
                    <div>
                      <p className="text-sm font-medium text-ink">{a.name}</p>
                      <p className="font-mono text-[10px] text-muted">{a.personId}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Case cards */}
          <div className="grid grid-cols-1 divide-y divide-line sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-3">
            {cluster.members.map((m) => {
              const card = (
                <div className="flex h-full flex-col gap-2 p-5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[15px] font-semibold text-ink">{m.scenarioTitle}</p>
                    {m.link && <ArrowRight size={15} className="mt-1 shrink-0 text-muted" aria-hidden="true" />}
                  </div>
                  <p className="text-[13px] text-muted">
                    {m.crimeTypeName} · {m.districtName} · Case {m.caseMasterId}
                  </p>
                  {m.accused.length > 0 && (
                    <p className="text-xs text-muted">
                      Suspects: {m.accused.map((a) => a.name).join(", ")}
                    </p>
                  )}
                  <div className="mt-auto flex flex-wrap gap-1.5 pt-2">
                    {m.sections.map((s) => (
                      <span
                        key={s}
                        className={`rounded-sm px-1.5 py-0.5 font-mono text-[11px] ${
                          cluster.linkingSections.includes(s)
                            ? "bg-navy/10 font-medium text-navy"
                            : "bg-surface-2 text-muted"
                        }`}
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              );
              return m.link ? (
                <Link key={m.caseMasterId} href={m.link} className="transition hover:bg-surface-2">
                  {card}
                </Link>
              ) : (
                <div key={m.caseMasterId}>{card}</div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
