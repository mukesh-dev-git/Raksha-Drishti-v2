import {
  Users,
  ShieldAlert,
  UserRound,
  Eye,
  BadgeCheck,
} from "lucide-react";
import type { PeopleByRole, PersonDetailView } from "@/lib/investigation/adaptToPeople";
import type { PersonRole } from "@/lib/investigation/model";
import PinnedCard from "./PinnedCard";
import SectionHeading from "./SectionHeading";

const ACCENT = "#0b2e59";

const ROLE_META: Record<PersonRole, { label: string; Icon: typeof UserRound; pin: string }> = {
  complainant: { label: "Complainant", Icon: UserRound, pin: "#0b2e59" },
  victim: { label: "Victim", Icon: UserRound, pin: "#0369a1" },
  accused: { label: "Accused / Suspect", Icon: ShieldAlert, pin: "#be123c" },
  witness: { label: "Witness", Icon: Eye, pin: "#047857" },
  io: { label: "Investigating Officer", Icon: BadgeCheck, pin: "#b45309" },
};

const ROLE_ORDER: PersonRole[] = ["accused", "victim", "complainant", "witness", "io"];

function PersonCard({ person }: { person: PersonDetailView }) {
  const meta = ROLE_META[person.role];
  const Icon = meta.Icon;
  return (
    <details className="group rounded border border-line bg-surface shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4">
        <span className="flex min-w-0 items-center gap-2.5">
          <Icon size={16} style={{ color: meta.pin }} className="shrink-0" />
          <span className="min-w-0">
            <span className="block truncate text-[14px] font-medium text-ink">{person.name}</span>
            {(person.age !== undefined || person.gender || person.extra) && (
              <span className="block truncate text-[12px] text-muted">
                {[person.age !== undefined ? `${person.age} yrs` : null, person.gender, person.extra].filter(Boolean).join(" · ")}
              </span>
            )}
          </span>
        </span>
        <span className="shrink-0 text-[11px] text-muted">
          {person.statements.length} statement{person.statements.length === 1 ? "" : "s"} · {person.relatedEvidence.length} evidence
        </span>
      </summary>
      <div className="space-y-4 border-t border-line p-4">
        {person.aliasNames.length > 0 && (
          <p className="text-[12px] text-muted">
            <span className="font-semibold uppercase tracking-wide">Also recorded as:</span> {person.aliasNames.join(", ")}
          </p>
        )}
        <p className="text-[12px] text-muted">
          On FIR(s): {person.caseMasterIds.length > 0 ? person.caseMasterIds.join(", ") : "Not available in current records"}
        </p>

        <div>
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-navy">Statements</p>
          {person.statements.length === 0 ? (
            <p className="text-[13px] text-muted">Not available in current records.</p>
          ) : (
            <ul className="space-y-1.5">
              {person.statements.map((s) => (
                <li key={s.id} className="rounded-sm border border-line bg-surface-2 p-2.5 text-[13px]">
                  <span className="text-muted">{s.date} — </span>
                  <span className="italic text-ink">&ldquo;{s.text}&rdquo;</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-navy">Linked Evidence</p>
          {person.relatedEvidence.length === 0 ? (
            <p className="text-[13px] text-muted">Not available in current records.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {person.relatedEvidence.map((e) => (
                <span key={e.id} className="rounded-sm border border-line bg-surface-2 px-2 py-1 text-[12px] text-ink">
                  {e.type}: {e.title}
                </span>
              ))}
            </div>
          )}
        </div>

        <p className="text-[12px] text-muted">
          Appears in {person.timelineMentionCount} timeline event{person.timelineMentionCount === 1 ? "" : "s"}.
        </p>
      </div>
    </details>
  );
}

// -----------------------------------------------------------------------------
// CasePeoplePanel — every real person in this connected investigation,
// grouped by role, each expandable to show their statements, linked
// evidence, and timeline presence — the "same person, same entity
// everywhere" cross-referencing the Investigation Module's data model
// guarantees (Step 1's entity fusion).
// -----------------------------------------------------------------------------
export default function CasePeoplePanel({ people }: { people: PeopleByRole }) {
  const totalCount = Object.values(people).reduce((sum, rows) => sum + rows.length, 0);

  return (
    <div className="space-y-8">
      <SectionHeading
        icon={Users}
        title="People"
        subtitle={`${totalCount} person${totalCount === 1 ? "" : "s"} on record across this connected investigation`}
        accent={ACCENT}
      />

      {totalCount === 0 ? (
        <PinnedCard pin={ACCENT}>
          <p className="p-6 text-[15px] text-muted">No people are on record for this case.</p>
        </PinnedCard>
      ) : (
        ROLE_ORDER.map((role) => {
          const rows = people[role];
          const meta = ROLE_META[role];
          return (
            <section key={role}>
              <p className="mb-3 flex items-center gap-2 text-[13px] font-bold uppercase tracking-[0.14em] text-navy">
                <meta.Icon size={15} /> {meta.label} ({rows.length})
              </p>
              {rows.length === 0 ? (
                <p className="text-[14px] text-muted">Not available in current records.</p>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {rows.map((p) => (
                    <PersonCard key={p.id} person={p} />
                  ))}
                </div>
              )}
            </section>
          );
        })
      )}
    </div>
  );
}
