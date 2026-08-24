import {
  ClipboardList,
  Gauge,
  BookOpen,
  ListChecks,
  AlertTriangle,
  Lightbulb,
} from "lucide-react";
import type { InvestigationTabData } from "@/lib/investigation/adaptToInvestigation";
import PinnedCard from "./PinnedCard";
import SectionHeading from "./SectionHeading";
import StatusBadge from "@/components/ui/StatusBadge";

const ACCENT = "#0b2e59";

function statusBadgeStatus(status: string): "verified" | "pending" | "alert" {
  const s = status.toLowerCase();
  if (s.includes("closed") || s.includes("charge sheeted")) return "verified";
  if (s.includes("open") || s.includes("under investigation")) return "pending";
  return "alert";
}

// -----------------------------------------------------------------------------
// CaseInvestigationPanel — the Investigation tab's working surface: Status,
// Activities, Case Diary, Tasks, Gaps, Recommended Next Actions. Stacked
// sections + native <details> accordions for the two potentially-longer
// lists (Activities, Case Diary) — no new component library, no nested
// pages, everything reuses PinnedCard/SectionHeading/StatusBadge.
// -----------------------------------------------------------------------------
export default function CaseInvestigationPanel({ data }: { data: InvestigationTabData }) {
  return (
    <div className="space-y-10">
      {/* Status */}
      <section>
        <SectionHeading
          icon={Gauge}
          title="Investigation Status"
          subtitle="Current case status and milestone progress"
          accent={ACCENT}
          right={<StatusBadge status={statusBadgeStatus(data.caseStatus)} label={data.caseStatus} />}
        />
        <PinnedCard pin={ACCENT}>
          <div className="p-6">
            <div className="flex items-center gap-3">
              <span className="text-2xl font-semibold text-navy">{data.progress.percent}%</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
                <div className="h-full rounded-full" style={{ width: `${data.progress.percent}%`, backgroundColor: ACCENT }} />
              </div>
            </div>
            <ul className="mt-4 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {data.progress.milestones.map((m) => (
                <li key={m.key} className="flex items-center gap-2 text-[14px]">
                  <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${m.met ? "bg-success" : "bg-line-strong"}`} />
                  <span className={m.met ? "text-ink" : "text-muted"}>{m.label}</span>
                </li>
              ))}
            </ul>
          </div>
        </PinnedCard>
      </section>

      {/* Activities */}
      <section>
        <SectionHeading
          icon={ClipboardList}
          title="Investigation Activities"
          subtitle={`${data.activities.length} activit${data.activities.length === 1 ? "y" : "ies"} on record`}
          accent={ACCENT}
        />
        {data.activities.length === 0 ? (
          <PinnedCard pin={ACCENT}>
            <p className="p-6 text-[15px] text-muted">No investigation activities are on record for this case.</p>
          </PinnedCard>
        ) : (
          <div className="space-y-3">
            {data.activities.map((a) => (
              <details key={a.id} className="group rounded border border-line bg-surface shadow-sm" open>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4">
                  <span className="flex items-center gap-3">
                    <span className="rounded-sm bg-surface-2 px-2.5 py-1 text-[12px] font-semibold text-navy">{a.methodType}</span>
                    <span className="text-[13px] text-muted">{a.date}{a.time && ` · ${a.time}`}</span>
                  </span>
                  <StatusBadge status="verified" label={a.status} />
                </summary>
                <div className="border-t border-line p-4 pt-3">
                  <p className="text-[14px] leading-relaxed text-ink">{a.findings}</p>
                  <p className="mt-2 text-[12px] text-muted">Officer: {a.assignedOfficer}</p>
                  {a.evidenceRefs.length > 0 && (
                    <p className="mt-1 text-[12px] text-muted">Evidence generated: {a.evidenceRefs.join(", ")}</p>
                  )}
                </div>
              </details>
            ))}
          </div>
        )}
      </section>

      {/* Case Diary */}
      <section>
        <SectionHeading
          icon={BookOpen}
          title="Case Diary"
          subtitle={`${data.diary.length} entr${data.diary.length === 1 ? "y" : "ies"} on record`}
          accent={ACCENT}
        />
        {data.diary.length === 0 ? (
          <PinnedCard pin={ACCENT}>
            <p className="p-6 text-[15px] text-muted">No case diary entries are on record for this case.</p>
          </PinnedCard>
        ) : (
          <PinnedCard pin={ACCENT}>
            <div className="divide-y divide-line p-2">
              {data.diary.map((d) => (
                <div key={d.id} className="flex gap-4 p-4">
                  <div className="w-24 shrink-0 text-[12px] text-muted">
                    <p>{d.date}</p>
                    {d.time && <p className="font-mono">{d.time}</p>}
                  </div>
                  <div className="min-w-0 flex-1 border-l-2 border-navy/30 pl-4">
                    <p className="text-[13px] font-semibold uppercase tracking-wide text-navy">{d.activity}</p>
                    <p className="mt-1 text-[14px] leading-relaxed text-ink">{d.observation}</p>
                    <p className="mt-1.5 text-[12px] text-muted">
                      Officer: {d.officer}
                      {d.personsInvolved.length > 0 && ` · Persons: ${d.personsInvolved.join(", ")}`}
                    </p>
                    {d.evidenceRefs.length > 0 && (
                      <p className="mt-0.5 text-[12px] text-muted">Evidence: {d.evidenceRefs.join(", ")}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </PinnedCard>
        )}
      </section>

      {/* Tasks + Gaps */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <SectionHeading icon={ListChecks} title="Tasks / Pending Actions" accent={ACCENT} />
          {data.tasks.length === 0 ? (
            <PinnedCard pin={ACCENT}>
              <p className="p-6 text-[15px] text-muted">No pending procedural tasks for this case.</p>
            </PinnedCard>
          ) : (
            <ul className="space-y-2.5">
              {data.tasks.map((t) => (
                <li key={t.id} className="rounded border border-line bg-surface p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[14px] font-medium text-ink">{t.label}</p>
                    <StatusBadge status="pending" label={t.status} />
                  </div>
                  <p className="mt-1 text-[12px] text-muted">{t.detail}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <SectionHeading icon={AlertTriangle} title="Investigation Gaps" accent={ACCENT} />
          {data.gaps.length === 0 ? (
            <PinnedCard pin={ACCENT}>
              <p className="p-6 text-[15px] text-muted">No gaps identified for this case.</p>
            </PinnedCard>
          ) : (
            <ul className="space-y-2.5">
              {data.gaps.map((g) => (
                <li key={g.key} className="rounded-sm border border-warning/30 bg-warning-bg p-4">
                  <p className="text-[14px] font-medium text-ink">{g.label}</p>
                  <p className="mt-1 text-[12px] text-muted">{g.detail}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Recommended Next Actions */}
      <section>
        <SectionHeading
          icon={Lightbulb}
          title="Recommended Next Actions"
          subtitle="Deterministic follow-ups tied to a specific identified contradiction — not AI-generated"
          accent={ACCENT}
        />
        {data.recommendedActions.length === 0 ? (
          <PinnedCard pin={ACCENT}>
            <p className="p-6 text-[15px] text-muted">No recommended next actions for this case.</p>
          </PinnedCard>
        ) : (
          <ul className="space-y-2.5">
            {data.recommendedActions.map((a, i) => (
              <li key={a.id} className="flex items-start gap-3 rounded border border-line bg-surface-2 p-4">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-navy text-[12px] font-semibold text-navy">
                  {i + 1}
                </span>
                <div>
                  <p className="text-[14px] font-medium text-ink">{a.label}</p>
                  <p className="mt-1 text-[12px] text-muted">{a.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
