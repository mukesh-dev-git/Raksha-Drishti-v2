import {
  Clock,
  FileText,
  Video,
  PhoneCall,
  Landmark,
  MessageSquareQuote,
  type LucideIcon,
} from "lucide-react";
import type { TimelineDetailEvent } from "@/lib/investigation/adaptToTimeline";
import type { TimelineSourceType } from "@/lib/investigation/model";
import PinnedCard from "./PinnedCard";
import SectionHeading from "./SectionHeading";

const ACCENT = "#0b2e59";

const ICON_BY_SOURCE: Record<TimelineSourceType, LucideIcon> = {
  fir: FileText,
  cctv: Video,
  call: PhoneCall,
  transaction: Landmark,
  statement: MessageSquareQuote,
};

// -----------------------------------------------------------------------------
// CaseTimelinePanel — vertical chronological timeline for the case-shell
// Timeline tab. Structure (date markers, event nodes, connecting rail, clean
// cards, earliest→latest scan) follows the approved reference's layout, but
// the visual language is entirely the existing Raksha-Drishti theme (navy
// accent, PinnedCard, SectionHeading) — no red/black, no new design system.
// -----------------------------------------------------------------------------
export default function CaseTimelinePanel({ events }: { events: TimelineDetailEvent[] }) {
  return (
    <div className="space-y-6">
      <SectionHeading
        icon={Clock}
        title="Investigation Timeline"
        subtitle="Chronological record of this case, earliest to latest"
        accent={ACCENT}
      />

      {events.length === 0 ? (
        <PinnedCard pin={ACCENT}>
          <p className="p-6 text-[15px] text-muted">
            No timeline events are available for this case in the synthetic dataset.
          </p>
        </PinnedCard>
      ) : (
        <ol className="relative border-l-2 border-line pl-8 sm:pl-10">
          {events.map((e) => {
            const Icon = ICON_BY_SOURCE[e.sourceType];
            return (
              <li key={e.id} className="relative pb-8 last:pb-0">
                <span
                  className="absolute -left-[41px] top-0 flex h-8 w-8 items-center justify-center rounded-full border-2 bg-surface sm:-left-[49px]"
                  style={{ borderColor: ACCENT }}
                  aria-hidden="true"
                >
                  <Icon size={15} style={{ color: ACCENT }} />
                </span>
                <PinnedCard pin={ACCENT}>
                  <div className="p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="rounded-sm bg-surface-2 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-navy">
                        {e.sourceTypeLabel}
                      </span>
                      <span className="font-mono text-[13px] text-muted">
                        {e.date}{e.time && ` · ${e.time}`}
                      </span>
                    </div>
                    <p className="mt-2.5 text-[15px] leading-relaxed text-ink">{e.description}</p>
                    {e.relatedPeople.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {e.relatedPeople.map((p) => (
                          <span
                            key={p.id}
                            className="rounded-sm border border-line bg-surface-2 px-2 py-1 text-[12px] text-ink"
                          >
                            {p.name}
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="mt-3 border-t border-line pt-2 text-[11px] text-muted">
                      Source record: {e.sourceRecordId}
                    </p>
                  </div>
                </PinnedCard>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
