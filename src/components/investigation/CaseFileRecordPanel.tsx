"use client";

import { useState } from "react";
import {
  FileText,
  ClipboardList,
  Layers,
  ShieldAlert,
  UserRound,
  Eye,
  BadgeCheck,
  ArrowRight,
  BookOpen,
} from "lucide-react";
import type { CaseFileRecordData, CaseFilePersonRow } from "@/lib/investigation/adaptToCaseFileRecord";
import type { PersonRole } from "@/lib/investigation/model";
import SectionHeading from "./SectionHeading";
import StatusBadge from "@/components/ui/StatusBadge";
import StatTile from "@/components/ui/StatTile";
import CaseFileFlipbookView from "./CaseFileFlipbookView";

const ACCENT = "#0b2e59";

const ROLE_META: Record<PersonRole, { label: string; Icon: typeof UserRound }> = {
  victim: { label: "Victim", Icon: UserRound },
  complainant: { label: "Complainant", Icon: UserRound },
  witness: { label: "Witness", Icon: Eye },
  accused: { label: "Accused / Suspect", Icon: ShieldAlert },
  io: { label: "Investigating Officer", Icon: BadgeCheck },
};

function statusBadgeStatus(status: string): "verified" | "pending" | "alert" {
  const s = status.toLowerCase();
  if (s.includes("closed") || s.includes("charge sheeted")) return "verified";
  if (s.includes("open") || s.includes("under investigation")) return "pending";
  return "alert";
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="p-4 text-[14px] text-muted">{children}</p>;
}

function PersonGroup({ role, rows }: { role: PersonRole; rows: CaseFilePersonRow[] }) {
  const meta = ROLE_META[role];
  const Icon = meta.Icon;
  return (
    <div>
      <p className="mb-2 flex items-center gap-2 text-[12px] font-bold uppercase tracking-wide text-navy">
        <Icon size={14} /> {meta.label} ({rows.length})
      </p>
      {rows.length === 0 ? (
        <p className="text-[13px] text-muted">Not available in current records.</p>
      ) : (
        <div className="space-y-1.5">
          {rows.map((p) => (
            <div key={p.id} className="rounded-sm border border-line bg-surface-2 px-3 py-2 text-[13px]">
              <span className="font-medium text-ink">{p.name}</span>
              {(p.age !== undefined || p.gender || p.extra) && (
                <span className="ml-2 text-muted">
                  {[p.age !== undefined ? `${p.age} yrs` : null, p.gender, p.extra].filter(Boolean).join(" · ")}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// CaseFileRecordPanel — the Case Files tab's structured, scannable record:
// Case/FIR Details, Legal Details, Persons, Investigation Record (condensed,
// with links into the fuller Timeline/Investigation tabs), Evidence
// (register + custody note), Supporting Information. Accordions
// (native <details>) keep navigation shallow while allowing expansion.
// -----------------------------------------------------------------------------
export default function CaseFileRecordPanel({
  data,
  onNavigateTab,
}: {
  data: CaseFileRecordData;
  onNavigateTab: (tab: "timeline" | "investigation" | "people" | "evidence" | "more") => void;
}) {
  const { caseIdentity, legal, persons, investigation, evidence, supporting } = data;
  const [view, setView] = useState<"record" | "flipbook">("record");

  if (view === "flipbook") {
    return <CaseFileFlipbookView data={data} onClose={() => setView("record")} />;
  }

  return (
    <div className="space-y-8">
      <SectionHeading
        icon={FileText}
        title="Case File"
        subtitle="Structured record of this case — expand a section for more detail"
        accent={ACCENT}
        right={
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setView("flipbook")}
              className="flex items-center gap-1.5 rounded-sm border border-line bg-surface px-3 py-1.5 text-[13px] font-medium text-navy transition hover:border-navy"
            >
              <BookOpen size={14} /> View as Flip Book / Export PDF
            </button>
            <StatusBadge status={statusBadgeStatus(caseIdentity.status)} label={caseIdentity.status} />
          </div>
        }
      />

      {/* Case / FIR Details */}
      <details open className="group rounded border border-line bg-surface shadow-sm">
        <summary className="cursor-pointer list-none p-5 text-[16px] font-semibold text-navy">Case / FIR Details</summary>
        <div className="grid grid-cols-1 gap-5 border-t border-line p-5 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="FIR Number" value={caseIdentity.firNumber} />
          <Field label="Case Title" value={caseIdentity.caseTitle} />
          <Field label="Crime Type" value={caseIdentity.crimeType} />
          <Field label="Police Station" value={caseIdentity.policeStation} />
          <Field label="District" value={caseIdentity.district} />
          <Field label="Date Filed" value={caseIdentity.dateFiled} />
          <Field label="Incident Date/Time" value={`${caseIdentity.incidentDate}${caseIdentity.incidentTime ? ` · ${caseIdentity.incidentTime}` : ""}`} />
          <Field label="Current Status" value={caseIdentity.status} />
        </div>
      </details>

      {/* Legal Details */}
      <details open className="group rounded border border-line bg-surface shadow-sm">
        <summary className="cursor-pointer list-none p-5 text-[16px] font-semibold text-navy">Legal Details</summary>
        <div className="border-t border-line p-5">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="Case Classification" value={legal.caseCategory} />
            <Field label="Gravity of Offence" value={legal.gravityOffence} />
          </div>
          <p className="mb-2 mt-4 text-[11px] uppercase tracking-wide text-muted">Acts / Sections</p>
          {legal.sections.length === 0 ? (
            <Empty>Not available in current records.</Empty>
          ) : (
            <div className="flex flex-wrap gap-2">
              {legal.sections.map((s) => (
                <span key={s} className="rounded-sm border border-line bg-surface-2 px-3 py-1.5 text-[13px] text-ink">{s}</span>
              ))}
            </div>
          )}
        </div>
      </details>

      {/* Persons */}
      <details open className="group rounded border border-line bg-surface shadow-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between p-5">
          <span className="text-[16px] font-semibold text-navy">Persons</span>
          <button
            type="button"
            onClick={(ev) => { ev.preventDefault(); onNavigateTab("people"); }}
            className="flex items-center gap-1 text-[13px] font-medium text-navy hover:underline"
          >
            View People tab <ArrowRight size={13} />
          </button>
        </summary>
        <div className="grid grid-cols-1 gap-5 border-t border-line p-5 sm:grid-cols-2 lg:grid-cols-3">
          <PersonGroup role="complainant" rows={persons.complainant} />
          <PersonGroup role="victim" rows={persons.victim} />
          <PersonGroup role="accused" rows={persons.accused} />
          <PersonGroup role="witness" rows={persons.witness} />
          <PersonGroup role="io" rows={persons.io} />
        </div>
      </details>

      {/* Investigation Record */}
      <details open className="group rounded border border-line bg-surface shadow-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between p-5">
          <span className="text-[16px] font-semibold text-navy">Investigation Record</span>
          <button
            type="button"
            onClick={(ev) => { ev.preventDefault(); onNavigateTab("investigation"); }}
            className="flex items-center gap-1 text-[13px] font-medium text-navy hover:underline"
          >
            View Investigation tab <ArrowRight size={13} />
          </button>
        </summary>
        <div className="border-t border-line p-5">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatTile label="Activities" value={String(investigation.activityCount)} icon={<ClipboardList size={16} />} />
            <StatTile label="Diary Entries" value={String(investigation.diaryCount)} icon={<FileText size={16} />} />
            <StatTile label="Timeline Events" value={String(investigation.timelineCount)} icon={<Layers size={16} />} />
            <StatTile label="Pending Items" value={String(investigation.pendingCount)} icon={<ShieldAlert size={16} />} />
          </div>
          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[12px] font-semibold uppercase tracking-wide text-muted">Recent Timeline</p>
              <button
                type="button"
                onClick={() => onNavigateTab("timeline")}
                className="flex items-center gap-1 text-[13px] font-medium text-navy hover:underline"
              >
                View full Timeline <ArrowRight size={13} />
              </button>
            </div>
            {investigation.recentTimeline.length === 0 ? (
              <Empty>Not available in current records.</Empty>
            ) : (
              <ul className="space-y-2">
                {investigation.recentTimeline.map((e) => (
                  <li key={e.id} className="rounded-sm border border-line bg-surface-2 px-3 py-2 text-[13px]">
                    <span className="text-muted">{e.date}{e.time && ` · ${e.time}`} — </span>
                    <span className="text-ink">{e.description}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </details>

      {/* Evidence */}
      <details open className="group rounded border border-line bg-surface shadow-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between p-5">
          <span className="text-[16px] font-semibold text-navy">Evidence</span>
          <button
            type="button"
            onClick={(ev) => { ev.preventDefault(); onNavigateTab("evidence"); }}
            className="flex items-center gap-1 text-[13px] font-medium text-navy hover:underline"
          >
            View Evidence tab <ArrowRight size={13} />
          </button>
        </summary>
        <div className="border-t border-line p-5">
          {evidence.register.length === 0 ? (
            <Empty>No evidence on record for this case.</Empty>
          ) : (
            <div className="overflow-hidden rounded border border-line">
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="border-b border-line bg-surface-2 text-[11px] uppercase tracking-wide text-muted">
                    <th className="px-3 py-2 font-medium">Exhibit</th>
                    <th className="px-3 py-2 font-medium">Type</th>
                    <th className="px-3 py-2 font-medium">Date</th>
                    <th className="px-3 py-2 font-medium">Linked People</th>
                  </tr>
                </thead>
                <tbody>
                  {evidence.register.map((e) => (
                    <tr key={e.id} className="border-b border-line last:border-0 hover:bg-surface-2">
                      <td className="px-3 py-2 font-medium text-navy">{e.title}</td>
                      <td className="px-3 py-2 text-ink">{e.type}</td>
                      <td className="px-3 py-2 text-muted">{e.date}</td>
                      <td className="px-3 py-2 text-muted">
                        {e.linkedPeople.length > 0 ? e.linkedPeople.map((p) => p.name).join(", ") : "Not available in current records"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-4 text-[13px] text-muted">
            Chain of Custody: {evidence.custodyAvailable ? "Available" : "Not available in current records."}
          </p>
        </div>
      </details>

      {/* Supporting Information */}
      <details className="group rounded border border-line bg-surface shadow-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between p-5">
          <span className="text-[16px] font-semibold text-navy">Supporting Information</span>
          <button
            type="button"
            onClick={(ev) => { ev.preventDefault(); onNavigateTab("more"); }}
            className="flex items-center gap-1 text-[13px] font-medium text-navy hover:underline"
          >
            View More tab <ArrowRight size={13} />
          </button>
        </summary>
        <div className="grid grid-cols-1 gap-5 border-t border-line p-5 sm:grid-cols-2">
          <div>
            <p className="mb-1.5 text-[12px] font-bold uppercase tracking-wide text-navy">Crime Scene</p>
            {supporting.crimeScene ? (
              <div className="rounded-sm border border-line bg-surface-2 p-3 text-[13px]">
                <p className="text-ink">{supporting.crimeScene.location}</p>
                <p className="mt-1 text-muted">{supporting.crimeScene.briefFacts}</p>
                {!supporting.crimeScene.hasCoordinates && <p className="mt-1 text-muted">No coordinates on record.</p>}
              </div>
            ) : (
              <p className="text-[13px] text-muted">Not available in current records.</p>
            )}
          </div>
          <div className="space-y-2">
            <p className="text-[12px] font-bold uppercase tracking-wide text-navy">Other Supporting Records</p>
            <p className="text-[13px] text-muted">Forensics: {supporting.forensicsAvailable ? "Available" : "Not available in current records."}</p>
            <p className="text-[13px] text-muted">Search & Seizure: {supporting.searchSeizureAvailable ? "Available" : "Not available in current records."}</p>
            <p className="text-[13px] text-muted">Related Cases: {supporting.relatedCasesAvailable ? "Available" : "Not available in current records."}</p>
          </div>
        </div>
      </details>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-[15px] font-medium text-ink">{value}</p>
    </div>
  );
}
