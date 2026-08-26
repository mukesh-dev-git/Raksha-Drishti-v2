"use client";

import { PhoneCall, Landmark, Video, MessageSquareQuote } from "lucide-react";
import type { FusedEvidenceItem } from "@/lib/personFusion";

// -----------------------------------------------------------------------------
// A real timeline GRAPH - a connected track of icon nodes, not a bullet
// list of paragraphs. Same icon-per-evidence-kind convention
// RealEvidenceFeed.tsx already uses (PhoneCall/Landmark/Video/
// MessageSquareQuote), so a call reads as a call everywhere in the app, not
// just here.
//
// Horizontal + scrollable, not vertical: this is deliberately modeled on
// the reference design's "Activity Timeline (Cross-Source)" track (a
// connected line of dated nodes), which reads faster at a glance than a
// paragraph-per-event list - the point of a timeline is seeing the shape of
// a sequence, not just its content.
// -----------------------------------------------------------------------------
const KIND_ICON: Record<FusedEvidenceItem["kind"], typeof PhoneCall> = {
  call: PhoneCall,
  transaction: Landmark,
  cctv: Video,
  statement: MessageSquareQuote,
};

const KIND_COLOR: Record<FusedEvidenceItem["kind"], { bg: string; text: string; ring: string }> = {
  call: { bg: "bg-dash-blue-bg", text: "text-dash-blue", ring: "ring-dash-blue/30" },
  transaction: { bg: "bg-dash-orange-bg", text: "text-dash-orange", ring: "ring-dash-orange/30" },
  cctv: { bg: "bg-dash-purple-bg", text: "text-dash-purple", ring: "ring-dash-purple/30" },
  statement: { bg: "bg-dash-teal-bg", text: "text-dash-teal", ring: "ring-dash-teal/30" },
};

function formatShort(item: FusedEvidenceItem): string {
  const d = new Date(item.timestamp);
  const date = d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
  return item.dateOnly ? date : `${date}, ${d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`;
}

export default function CrossSourceTimeline({ items }: { items: FusedEvidenceItem[] }) {
  if (items.length === 0) {
    return <p className="text-[13px] text-muted">No linked records.</p>;
  }

  return (
    <div className="overflow-x-auto pb-2">
      <div className="relative flex min-w-max items-start gap-0 px-1 pt-2">
        {/* connecting line, behind the nodes */}
        <div className="pointer-events-none absolute left-6 right-6 top-[26px] h-px bg-line" aria-hidden="true" />

        {items.map((item, i) => {
          const Icon = KIND_ICON[item.kind];
          const c = KIND_COLOR[item.kind];
          return (
            <div key={item.id} className="relative flex w-[168px] shrink-0 flex-col items-center px-2 text-center">
              <span
                className={`z-10 flex h-[38px] w-[38px] items-center justify-center rounded-full border-2 border-surface ring-4 ${c.bg} ${c.text} ${c.ring}`}
                title={`${item.id} — ${formatShort(item)}`}
              >
                <Icon size={16} aria-hidden="true" />
              </span>
              <p className="mt-2 font-mono text-[10.5px] text-muted">{formatShort(item)}</p>
              <p className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-ink" title={item.summary}>
                {item.summary}
              </p>
              <p className="mt-0.5 font-mono text-[10px] text-muted/70">{item.id}</p>
              {i === items.length - 1 && <span className="sr-only">End of timeline</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
