"use client";

import { motion } from "framer-motion";
import type { TimelineEvent } from "@/lib/investigationData";

// Horizontal chronological rail — each event is a paper note pinned along a
// thread. Clicking a note highlights its related entities across the board.
export default function TimelinePanel({
  events,
  activeId,
  highlightSet,
  onSelect,
}: {
  events: TimelineEvent[];
  activeId: string | null;
  highlightSet: Set<string>;
  onSelect: (id: string | null) => void;
}) {
  return (
    <div className="overflow-x-auto pb-3">
      <div className="relative flex min-w-max gap-5 px-1 pt-5">
        {/* the connecting thread */}
        <div className="absolute left-4 right-4 top-2 h-px bg-gradient-to-r from-transparent via-line-strong to-transparent" />

        {events.map((ev, i) => {
          const active = ev.id === activeId;
          const related = highlightSet.has(ev.id) && activeId !== null;
          const dimmed = activeId !== null && !related && !active;
          return (
            <motion.button
              key={ev.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: dimmed ? 0.4 : 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
              onClick={() => onSelect(active ? null : ev.id)}
              className={`relative w-[264px] shrink-0 rounded border px-4 py-4 text-left transition ${
                active
                  ? "border-navy bg-surface-2 ring-1 ring-navy/40"
                  : "border-line bg-surface shadow-sm hover:-translate-y-0.5 hover:border-navy"
              }`}
            >
              {/* pin on the thread */}
              <span
                className={`absolute -top-[9px] left-1/2 h-3.5 w-3.5 -translate-x-1/2 rounded-full border-2 ${
                  active || related
                    ? "border-navy bg-navy"
                    : "border-line-strong bg-surface-2"
                }`}
              />
              <div className="flex items-center justify-between text-[13px] text-muted">
                <span>{ev.date}</span>
                <span className="font-mono">{ev.time}</span>
              </div>
              <p className="mt-1.5 text-[17px] font-semibold leading-snug text-ink">{ev.title}</p>
              <p className="mt-1.5 text-[14px] leading-relaxed text-muted">{ev.description}</p>
              <span className="mt-2 inline-block text-[12px] font-medium text-muted">
                Step {i + 1} of {events.length}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
