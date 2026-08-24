import { CheckCircle2, ShieldAlert, UserRound, Eye, BadgeCheck } from "lucide-react";
import type { CaseFileRecordData, CaseFilePersonRow } from "@/lib/investigation/adaptToCaseFileRecord";
import type { PersonRole } from "@/lib/investigation/model";

// -----------------------------------------------------------------------------
// Page content for the Case File flip-book / print export. Renders the SAME
// real, structured CaseFileRecordData the accordion Case Files tab already
// shows (Step "Case Files → structured record") — this is a different
// presentation of identical real data, not a second derivation and not the
// old mock-data flipbook. No fabricated pages (no AI/Final Report content
// invented here) — every page maps 1:1 onto a real section of the record.
// -----------------------------------------------------------------------------

export const FLIPBOOK_PAGE_DEFS = [
  { key: "cover", label: "Cover" },
  { key: "legal", label: "Legal Details" },
  { key: "persons", label: "Persons" },
  { key: "investigation", label: "Investigation Record" },
  { key: "evidence", label: "Evidence" },
  { key: "supporting", label: "Supporting Info" },
] as const;

export type FlipbookPageKey = (typeof FLIPBOOK_PAGE_DEFS)[number]["key"];

const ROLE_META: Record<PersonRole, { label: string; Icon: typeof UserRound }> = {
  victim: { label: "Victim", Icon: UserRound },
  complainant: { label: "Complainant", Icon: UserRound },
  witness: { label: "Witness", Icon: Eye },
  accused: { label: "Accused / Suspect", Icon: ShieldAlert },
  io: { label: "Investigating Officer", Icon: BadgeCheck },
};

function Letterhead({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="mb-6 flex items-start justify-between border-b-2 border-navy/70 pb-3">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted">
          Raksha Drishti · Case File Export
        </p>
        <h2 className="mt-1 text-xl font-bold text-navy">{title}</h2>
      </div>
      <p className="mt-1 whitespace-nowrap text-[10px] text-muted">{sub}</p>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[9.5px] uppercase tracking-wide text-muted">{label}</p>
      <p className="text-sm font-medium text-ink">{value}</p>
    </div>
  );
}

function PersonList({ role, rows }: { role: PersonRole; rows: CaseFilePersonRow[] }) {
  const meta = ROLE_META[role];
  const Icon = meta.Icon;
  return (
    <div className="mb-4">
      <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-navy">
        <Icon size={13} /> {meta.label} ({rows.length})
      </p>
      {rows.length === 0 ? (
        <p className="text-xs text-muted">Not available in current records.</p>
      ) : (
        <ul className="space-y-1">
          {rows.map((p) => (
            <li key={p.id} className="text-[12.5px] text-ink">
              {p.name}
              {(p.age !== undefined || p.gender || p.extra) && (
                <span className="text-muted"> — {[p.age !== undefined ? `${p.age} yrs` : null, p.gender, p.extra].filter(Boolean).join(" · ")}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function renderFlipbookPage(key: FlipbookPageKey, c: CaseFileRecordData): React.ReactNode {
  switch (key) {
    case "cover":
      return (
        <div className="flex h-full flex-col">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted">Raksha Drishti Police Department</p>
          <div className="mt-1 h-1 w-16 bg-navy" />
          <div className="mt-8 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted">First Information Report</p>
            <h1 className="mt-2 text-3xl font-black leading-tight text-navy">{c.caseIdentity.firNumber}</h1>
            <p className="mt-3 max-w-md text-lg text-ink">{c.caseIdentity.caseTitle}</p>
            <span className="mt-3 inline-block rounded-sm border border-navy/40 bg-surface-2 px-3 py-1 text-[12px] font-semibold uppercase tracking-wide text-navy">
              {c.caseIdentity.status}
            </span>
            <div className="mt-8 grid grid-cols-2 gap-y-5 border-t border-line pt-6">
              <Field label="Crime Type" value={c.caseIdentity.crimeType} />
              <Field label="Police Station" value={c.caseIdentity.policeStation} />
              <Field label="District" value={c.caseIdentity.district} />
              <Field label="Date Filed" value={c.caseIdentity.dateFiled} />
              <Field label="Incident Date/Time" value={`${c.caseIdentity.incidentDate}${c.caseIdentity.incidentTime ? " · " + c.caseIdentity.incidentTime : ""}`} />
            </div>
          </div>
          <p className="border-t border-dashed border-line pt-3 text-[9.5px] text-muted">
            Exported from the Raksha Drishti Investigation Module — synthetic development dataset.
          </p>
        </div>
      );

    case "legal":
      return (
        <div className="flex h-full flex-col">
          <Letterhead title="Legal Details" sub={c.caseIdentity.firNumber} />
          <div className="grid grid-cols-2 gap-5">
            <Field label="Case Classification" value={c.legal.caseCategory} />
            <Field label="Gravity of Offence" value={c.legal.gravityOffence} />
          </div>
          <p className="mb-2 mt-6 text-[10px] font-bold uppercase tracking-wide text-navy">Acts / Sections</p>
          {c.legal.sections.length === 0 ? (
            <p className="text-sm text-muted">Not available in current records.</p>
          ) : (
            <ul className="space-y-1.5">
              {c.legal.sections.map((s) => (
                <li key={s} className="flex items-center gap-2 text-[13px] text-ink">
                  <CheckCircle2 size={12} className="shrink-0 text-navy" /> {s}
                </li>
              ))}
            </ul>
          )}
        </div>
      );

    case "persons":
      return (
        <div className="flex h-full flex-col">
          <Letterhead title="Persons" sub={c.caseIdentity.firNumber} />
          <PersonList role="complainant" rows={c.persons.complainant} />
          <PersonList role="victim" rows={c.persons.victim} />
          <PersonList role="accused" rows={c.persons.accused} />
          <PersonList role="witness" rows={c.persons.witness} />
          <PersonList role="io" rows={c.persons.io} />
        </div>
      );

    case "investigation":
      return (
        <div className="flex h-full flex-col">
          <Letterhead title="Investigation Record" sub={c.caseIdentity.firNumber} />
          <div className="grid grid-cols-4 gap-3">
            <Field label="Activities" value={String(c.investigation.activityCount)} />
            <Field label="Diary Entries" value={String(c.investigation.diaryCount)} />
            <Field label="Timeline Events" value={String(c.investigation.timelineCount)} />
            <Field label="Pending Items" value={String(c.investigation.pendingCount)} />
          </div>
          <p className="mb-2 mt-6 text-[10px] font-bold uppercase tracking-wide text-navy">Recent Timeline</p>
          {c.investigation.recentTimeline.length === 0 ? (
            <p className="text-sm text-muted">Not available in current records.</p>
          ) : (
            <ul className="space-y-2">
              {c.investigation.recentTimeline.map((e) => (
                <li key={e.id} className="border-l-2 border-navy/30 pl-3 text-[12.5px]">
                  <span className="text-muted">{e.date}{e.time && ` · ${e.time}`} — </span>
                  <span className="text-ink">{e.description}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      );

    case "evidence":
      return (
        <div className="flex h-full flex-col">
          <Letterhead title="Evidence Register" sub={`${c.evidence.register.length} exhibits`} />
          {c.evidence.register.length === 0 ? (
            <p className="text-sm text-muted">No evidence on record for this case.</p>
          ) : (
            <table className="w-full text-left text-[11.5px]">
              <thead>
                <tr className="border-b border-line text-[9.5px] uppercase tracking-wide text-muted">
                  <th className="py-1.5 pr-2 font-medium">Exhibit</th>
                  <th className="py-1.5 pr-2 font-medium">Type</th>
                  <th className="py-1.5 pr-2 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {c.evidence.register.map((e) => (
                  <tr key={e.id} className="border-b border-line last:border-0">
                    <td className="py-1.5 pr-2 font-medium text-navy">{e.title}</td>
                    <td className="py-1.5 pr-2 text-ink">{e.type}</td>
                    <td className="py-1.5 pr-2 text-muted">{e.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="mt-4 text-[11px] text-muted">
            Chain of Custody: {c.evidence.custodyAvailable ? "Available" : "Not available in current records."}
          </p>
        </div>
      );

    case "supporting":
      return (
        <div className="flex h-full flex-col">
          <Letterhead title="Supporting Information" sub={c.caseIdentity.firNumber} />
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-navy">Crime Scene</p>
          {c.supporting.crimeScene ? (
            <div className="mb-4 text-[12.5px]">
              <p className="text-ink">{c.supporting.crimeScene.location}</p>
              <p className="mt-1 text-muted">{c.supporting.crimeScene.briefFacts}</p>
            </div>
          ) : (
            <p className="mb-4 text-sm text-muted">Not available in current records.</p>
          )}
          <div className="space-y-1.5">
            <p className="text-[12.5px] text-muted">Forensics: {c.supporting.forensicsAvailable ? "Available" : "Not available in current records."}</p>
            <p className="text-[12.5px] text-muted">Search & Seizure: {c.supporting.searchSeizureAvailable ? "Available" : "Not available in current records."}</p>
            <p className="text-[12.5px] text-muted">Related Cases: {c.supporting.relatedCasesAvailable ? "Available" : "Not available in current records."}</p>
          </div>
        </div>
      );

    default:
      return null;
  }
}
