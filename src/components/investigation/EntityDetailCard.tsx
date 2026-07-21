"use client";

import { AnimatePresence, motion } from "framer-motion";
import { MousePointerClick, Link2 } from "lucide-react";
import type { EntityDetail } from "@/lib/investigationData";
import { ENTITY_STYLES } from "./entityStyles";

// The right-hand rail beside the network graph: shows the selected node's
// full detail, or a hint prompt when nothing is selected.
export default function EntityDetailCard({ detail }: { detail: EntityDetail | null }) {
  return (
    <div className="flex h-full flex-col">
      <AnimatePresence mode="wait">
        {detail ? (
          <motion.div
            key={detail.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className="flex h-full flex-col"
          >
            <DetailBody detail={detail} />
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-sm border border-line bg-surface-2">
              <MousePointerClick size={24} className="text-muted" />
            </span>
            <p className="text-lg font-semibold text-ink">Select an entity</p>
            <p className="max-w-[15rem] text-[15px] leading-relaxed text-muted">
              Click any node in the network — or a timeline event or evidence card — to trace its
              connections and read the full record here.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DetailBody({ detail }: { detail: EntityDetail }) {
  const style = ENTITY_STYLES[detail.type];
  const { Icon } = style;
  return (
    <div className="flex h-full flex-col p-5">
      <div className="flex items-start gap-3">
        <span
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border"
          style={{ borderColor: `${style.color}55`, backgroundColor: `${style.color}18` }}
        >
          <Icon size={22} style={{ color: style.color }} />
        </span>
        <div className="min-w-0">
          <p
            className="text-[11px] font-bold uppercase tracking-[0.18em]"
            style={{ color: style.color }}
          >
            {style.label}
          </p>
          <h3 className="mt-0.5 truncate text-xl font-bold text-ink">{detail.title}</h3>
          {detail.subtitle && <p className="text-[15px] text-muted">{detail.subtitle}</p>}
        </div>
      </div>

      {detail.fields.length > 0 && (
        <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3">
          {detail.fields.map((f) => (
            <div key={f.label}>
              <dt className="text-[11px] uppercase tracking-wide text-muted">{f.label}</dt>
              <dd className="mt-0.5 text-[15px] font-medium text-ink">{f.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {detail.description && (
        <p className="mt-5 rounded-sm border border-line bg-surface-2 p-3.5 text-[15px] leading-relaxed text-ink">
          {detail.description}
        </p>
      )}

      <div className="mt-auto flex items-center gap-2 pt-5 text-[13px] text-muted">
        <Link2 size={14} style={{ color: style.color }} />
        Highlighting <span className="font-semibold text-ink">{detail.relatedCount}</span>{" "}
        direct connection{detail.relatedCount === 1 ? "" : "s"} on the board.
      </div>
    </div>
  );
}
