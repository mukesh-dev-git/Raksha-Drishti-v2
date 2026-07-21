"use client";

import { motion } from "framer-motion";
import {
  Video,
  FlaskConical,
  PhoneCall,
  Fingerprint,
  FileText,
  Image as ImageIcon,
  type LucideIcon,
} from "lucide-react";
import type { EvidenceItem, EvidenceType } from "@/lib/investigationData";
import PinnedCard from "./PinnedCard";

const ICONS: Record<EvidenceType, LucideIcon> = {
  "CCTV Footage": Video,
  "Forensic Report": FlaskConical,
  "Call Detail Record": PhoneCall,
  "Fingerprint Analysis": Fingerprint,
  "Seized Document": FileText,
  Photograph: ImageIcon,
};

// Evidence as a neat grid of pinned paper documents.
export default function EvidencePanel({
  evidence,
  activeId,
  highlightSet,
  onSelect,
}: {
  evidence: EvidenceItem[];
  activeId: string | null;
  highlightSet: Set<string>;
  onSelect: (id: string | null) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {evidence.map((item, i) => {
        const Icon = ICONS[item.type];
        const active = item.id === activeId;
        const related = highlightSet.has(item.id) && activeId !== null;
        const dimmed = activeId !== null && !related && !active;
        return (
          <motion.button
            key={item.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: dimmed ? 0.4 : 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.3 }}
            onClick={() => onSelect(active ? null : item.id)}
            className="text-left"
          >
            <PinnedCard variant="paper" pin="#f97316" interactive active={active}>
              <div className="flex h-full flex-col p-5">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-500/15">
                    <Icon size={18} className="text-orange-700" />
                  </span>
                  <span className="text-[12px] font-bold uppercase tracking-[0.12em] text-stone-500">
                    {item.type}
                  </span>
                </div>
                <p className="mt-3 text-[18px] font-semibold leading-snug text-stone-900">{item.title}</p>
                <p className="mt-2 text-[15px] leading-relaxed text-stone-600">{item.description}</p>
                <div className="mt-4 flex items-center justify-between border-t border-stone-300/70 pt-3 text-[13px] text-stone-500">
                  <span>Exhibit {item.id}</span>
                  <span>Logged {item.date}</span>
                </div>
              </div>
            </PinnedCard>
          </motion.button>
        );
      })}
    </div>
  );
}
