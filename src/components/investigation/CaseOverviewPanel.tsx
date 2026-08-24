import {
  FileText,
  Gauge,
  HeartPulse,
  Clock,
  Users,
  Fingerprint,
  ListChecks,
  Sparkles,
  ShieldAlert,
  UserRound,
  Eye,
  Landmark,
  BadgeCheck,
} from "lucide-react";
import type { OverviewData } from "@/lib/investigation/adaptToOverview";
import type { PersonRole } from "@/lib/investigation/model";
import PinnedCard from "./PinnedCard";
import SectionHeading from "./SectionHeading";
import StatTile from "@/components/ui/StatTile";
import StatusBadge from "@/components/ui/StatusBadge";

const ACCENT = "#0b2e59";

// Local role -> icon/label mapping for the Key People strip. Deliberately
// separate from entityStyles.tsx (which is keyed to the mock generator's
// EntityType and has no "complainant"/"io" roles) rather than modifying
// that shared file for an unrelated section.
const ROLE_META: Record<PersonRole, { label: string; Icon: typeof UserRound }> = {
  victim: { label: "Victim", Icon: UserRound },
  complainant: { label: "Complainant", Icon: UserRound },
  witness: { label: "Witness", Icon: Eye },
  accused: { label: "Accused", Icon: ShieldAlert },
  io: { label: "Investigating Officer", Icon: BadgeCheck },
};

function statusBadgeStatus(status: string): "verified" | "pending" | "alert" {
  const s = status.toLowerCase();
  if (s.includes("closed") || s.includes("charge sheeted")) return "verified";
  if (s.includes("open") || s.includes("under investigation")) return "pending";
  return "alert";
}

function ProgressBar({ percent, accent }: { percent: number; accent: string }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
      <div className="h-full rounded-full" style={{ width: `${percent}%`, backgroundColor: accent }} />
    </div>
  );
}

export default function CaseOverviewPanel({ data }: { data: OverviewData }) {
  const { fir } = data;

  return (
    <div className="space-y-10">
      {/* Case identity */}
      <section>
        <SectionHeading
          icon={FileText}
          title={data.scenarioTitle}
          subtitle={`FIR ${fir.crimeNo} · ${fir.caseType} · ${fir.district}`}
          accent={ACCENT}
          right={<StatusBadge status={statusBadgeStatus(fir.status)} label={fir.status} />}
        />
        <PinnedCard pin={ACCENT}>
          <div className="grid gap-6 p-6 sm:grid-cols-2 lg:grid-cols-4 lg:p-8">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-muted">Police Station</p>
              <p className="mt-1 text-[16px] font-medium text-ink">{fir.policeStation}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-muted">Investigating Officer</p>
              <p className="mt-1 text-[16px] font-medium text-ink">{fir.officerInCharge}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-muted">Date Filed</p>
              <p className="mt-1 text-[16px] font-medium text-ink">{fir.dateFiled}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-muted">Incident</p>
              <p className="mt-1 text-[16px] font-medium text-ink">
                {fir.incidentDate}{fir.incidentTime ? ` · ${fir.incidentTime}` : ""}
              </p>
            </div>
          </div>
          {fir.sections.length > 0 && (
            <div className="flex flex-wrap gap-2 border-t border-line p-6 pt-4 lg:px-8">
              {fir.sections.map((s) => (
                <span key={s} className="rounded-sm border border-line bg-surface-2 px-3 py-1.5 text-[13px] text-muted">
                  {s}
                </span>
              ))}
            </div>
          )}
        </PinnedCard>
      </section>

      {/* Progress + Health */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <PinnedCard pin={ACCENT}>
          <div className="p-6">
            <div className="flex items-center gap-2.5">
              <Gauge size={18} className="text-navy" />
              <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-navy">Investigation Progress</p>
              <span className="ml-auto text-2xl font-semibold text-navy">{data.progress.percent}%</span>
            </div>
            <div className="mt-3">
              <ProgressBar percent={data.progress.percent} accent={ACCENT} />
            </div>
            <ul className="mt-4 space-y-1.5">
              {data.progress.milestones.map((m) => (
                <li key={m.key} className="flex items-center gap-2 text-[14px] text-ink">
                  <span
                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${m.met ? "bg-success" : "bg-line-strong"}`}
                  />
                  <span className={m.met ? "text-ink" : "text-muted"}>{m.label}</span>
                </li>
              ))}
            </ul>
          </div>
        </PinnedCard>

        <PinnedCard pin={ACCENT}>
          <div className="p-6">
            <div className="flex items-center gap-2.5">
              <HeartPulse size={18} className="text-navy" />
              <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-navy">Investigation Health</p>
              <span className="ml-auto text-2xl font-semibold text-navy">{data.health.percent}%</span>
            </div>
            <div className="mt-3">
              <ProgressBar percent={data.health.percent} accent={ACCENT} />
            </div>
            <ul className="mt-4 space-y-2">
              {data.health.dimensions.map((d) => (
                <li key={d.key} className="flex items-center justify-between gap-3 text-[14px]">
                  <span className="text-ink">{d.label}</span>
                  <span className="shrink-0 text-muted">{d.percent}%</span>
                </li>
              ))}
            </ul>
          </div>
        </PinnedCard>
      </section>

      {/* Recent timeline + Key people */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <PinnedCard pin={ACCENT}>
          <div className="p-6">
            <div className="mb-3 flex items-center gap-2.5">
              <Clock size={18} className="text-navy" />
              <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-navy">Recent Activity</p>
            </div>
            {data.recentEvents.length === 0 ? (
              <p className="text-[14px] text-muted">No timeline events available for this case.</p>
            ) : (
              <ul className="space-y-3">
                {data.recentEvents.map((e) => (
                  <li key={e.id} className="border-l-2 border-navy/30 pl-3">
                    <p className="text-[12px] text-muted">{e.date} {e.time && `· ${e.time}`}</p>
                    <p className="text-[15px] font-medium text-ink">{e.title}</p>
                    <p className="text-[13px] text-muted">{e.description}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </PinnedCard>

        <PinnedCard pin={ACCENT}>
          <div className="p-6">
            <div className="mb-3 flex items-center gap-2.5">
              <Users size={18} className="text-navy" />
              <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-navy">Key People</p>
            </div>
            {data.keyPeople.length === 0 ? (
              <p className="text-[14px] text-muted">No people on record for this case.</p>
            ) : (
              <div className="flex flex-wrap gap-2.5">
                {data.keyPeople.map((p) => {
                  const meta = ROLE_META[p.role];
                  const Icon = meta.Icon;
                  return (
                    <span
                      key={p.id}
                      className="flex items-center gap-2 rounded-sm border border-line bg-surface-2 px-3 py-2 text-[14px] text-ink"
                    >
                      <Icon size={14} className="text-navy" />
                      {p.name}
                      <span className="text-[11px] uppercase tracking-wide text-muted">{meta.label}</span>
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        </PinnedCard>
      </section>

      {/* Evidence summary + Gaps */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <StatTile label="Evidence Items" value={String(data.evidenceSummary.total)} icon={<Fingerprint size={18} />} />
          {data.evidenceSummary.byType.map((t) => (
            <StatTile key={t.type} label={t.type} value={String(t.count)} icon={<Landmark size={18} />} />
          ))}
        </div>

        <PinnedCard pin={ACCENT}>
          <div className="p-6">
            <div className="mb-3 flex items-center gap-2.5">
              <ListChecks size={18} className="text-navy" />
              <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-navy">Pending / Gaps</p>
            </div>
            {data.gaps.length === 0 ? (
              <p className="text-[14px] text-muted">No pending items identified for this case.</p>
            ) : (
              <ul className="space-y-2.5">
                {data.gaps.map((g) => (
                  <li key={g.key} className="rounded-sm border border-warning/30 bg-warning-bg p-3">
                    <p className="text-[14px] font-medium text-ink">{g.label}</p>
                    <p className="mt-0.5 text-[13px] text-muted">{g.detail}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </PinnedCard>
      </section>

      {/* AI summary */}
      <section>
        <PinnedCard pin={ACCENT}>
          <div className="p-6">
            <div className="mb-3 flex items-center gap-2.5">
              <Sparkles size={18} className="text-navy" />
              <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-navy">AI Case Summary</p>
            </div>
            {!data.ai.available ? (
              <p className="text-[14px] text-muted">No AI summary available for this case.</p>
            ) : (
              <>
                <p className="text-[15px] leading-relaxed text-ink">{data.ai.headline}</p>
                {data.ai.insights.length > 0 && (
                  <ul className="mt-3 space-y-1.5">
                    {data.ai.insights.map((ins, i) => (
                      <li key={i} className="flex gap-2 text-[14px] text-ink">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-navy" />
                        {ins}
                      </li>
                    ))}
                  </ul>
                )}
                {data.ai.recommendedActions.length > 0 && (
                  <div className="mt-4">
                    <p className="text-[12px] font-semibold uppercase tracking-wide text-muted">Recommended Next Actions</p>
                    <ul className="mt-1.5 space-y-1.5">
                      {data.ai.recommendedActions.map((a, i) => (
                        <li key={i} className="flex gap-2 text-[14px] text-ink">
                          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-navy text-[11px] font-semibold text-navy">
                            {i + 1}
                          </span>
                          {a}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
            <p className="mt-4 border-t border-line pt-3 text-[12px] italic text-muted">{data.ai.disclaimer}</p>
          </div>
        </PinnedCard>
      </section>
    </div>
  );
}
