"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Pin,
  Clock,
  FolderArchive,
  Sparkles,
  Layers,
  FileStack,
  FileText,
  Radar,
  Fingerprint,
  ShieldAlert,
  ArrowRight,
} from "lucide-react";
import type { InvestigationData } from "@/lib/investigationData";
import { computeHighlightSet, getEntityDetail } from "@/lib/investigationData";
import type { CaseFile } from "@/lib/data";
import EvidenceBoard from "./EvidenceBoard";
import RealEvidenceFeed from "./RealEvidenceFeed";
import TimelinePanel from "./TimelinePanel";
import EvidencePanel from "./EvidencePanel";
import AIPanel from "./AIPanel";
import SectionHeading from "./SectionHeading";
import PinnedCard from "./PinnedCard";
import EntityDetailCard from "./EntityDetailCard";
import { ENTITY_STYLES } from "./entityStyles";

// Dignified single accent used for section chrome across the board.
const ACCENT = "#0b2e59";

export default function InvestigationWorkspaceClient({
  data,
  caseTypeName,
  districtName,
  base,
  caseFiles,
  caseTypeSlug,
  districtSlug,
}: {
  data: InvestigationData;
  caseTypeName: string;
  districtName: string;
  base: string;
  /** Real case files for this (caseType, district) pair, resolved against the
   * synthetic seeded dataset — never the old fake 3-item list, so every link
   * this section renders actually resolves (fixes the dead-end 404). */
  caseFiles: CaseFile[];
  caseTypeSlug: string;
  districtSlug: string;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const highlightSet = useMemo(() => computeHighlightSet(activeId, data), [activeId, data]);
  const detail = useMemo(
    () => (activeId ? getEntityDetail(data, activeId) : null),
    [activeId, data]
  );

  const stats = [
    { label: "Suspects", value: data.entities.suspects.length, Icon: ShieldAlert },
    { label: "Evidence Items", value: data.evidence.length, Icon: Fingerprint },
    { label: "Evidence Cards", value: data.graph.nodes.length, Icon: Pin },
    { label: "Linked Threads", value: data.graph.edges.length, Icon: Radar },
    { label: "Timeline Events", value: data.timeline.length, Icon: Clock },
  ];

  return (
    <div className="relative space-y-14">
      {/* light board backdrop — subtle navy dot grid on paper */}
      <div className="pointer-events-none fixed inset-0 -z-10 bg-paper" />
      <div
        className="pointer-events-none fixed inset-0 -z-10 opacity-60"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(11,46,89,0.05) 1px, transparent 1px)",
          backgroundSize: "26px 26px",
        }}
      />

      {/* ── Section 1 · Investigation Summary ─────────────────────────── */}
      <section>
        <SectionHeading
          icon={FileText}
          title="Investigation Summary"
          subtitle={`${caseTypeName} · ${districtName} jurisdiction`}
          accent={ACCENT}
          right={
            <Link
              href={`${base}/case-files`}
              className="flex items-center gap-2 rounded-sm bg-navy px-5 py-3 text-[15px] font-semibold text-white transition hover:bg-navy-hover"
            >
              <FolderArchive size={17} /> Open Case Files
            </Link>
          }
        />
        <PinnedCard pin={ACCENT}>
          <div className="grid gap-6 p-6 lg:grid-cols-[1.4fr_1fr] lg:p-8">
            <div>
              <div className="mb-3 flex flex-wrap gap-2">
                {data.sections.map((s) => (
                  <span
                    key={s}
                    className="rounded-sm border border-line bg-surface-2 px-3 py-1.5 text-[13px] text-muted"
                  >
                    {s}
                  </span>
                ))}
              </div>
              <p className="text-[17px] leading-relaxed text-ink">
                Active investigation into <span className="font-semibold text-navy">{caseTypeName.toLowerCase()}</span>{" "}
                offences across <span className="font-semibold text-navy">{districtName}</span>. The board below maps{" "}
                {data.graph.nodes.length} linked entities and {data.graph.edges.length} relationships spanning suspects,
                victims, witnesses, physical and digital evidence, and connected case files. AI analysis places the
                current composite risk at <span className="font-semibold text-navy">{data.ai.riskScore}/100</span>.
              </p>
              <p className="mt-4 border-l-2 border-navy/40 pl-4 text-[16px] leading-relaxed text-muted">
                {data.ai.modusOperandi}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 self-start sm:grid-cols-3 lg:grid-cols-2">
              {stats.map((s) => (
                <div key={s.label} className="rounded-sm border border-line bg-surface-2 p-4">
                  <s.Icon size={20} className="text-navy" />
                  <p className="mt-2 text-3xl font-semibold text-navy">{s.value}</p>
                  <p className="text-[13px] text-muted">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </PinnedCard>
      </section>

      {/* ── Section 1b · Verified Evidence Feed (real DB, when seeded) ── */}
      <RealEvidenceFeed caseTypeSlug={caseTypeSlug} districtSlug={districtSlug} />

      {/* ── Section 2 · Investigation Evidence Board (hero) ───────────── */}
      <section>
        <SectionHeading
          icon={Pin}
          title="Investigation Evidence Board"
          subtitle="Every entity is a pinned document — click a card to trace its red threads · drag to pan · scroll to zoom"
          accent={ACCENT}
        />
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <PinnedCard pin={ACCENT} className="h-[740px] overflow-hidden">
            <EvidenceBoard
              data={data}
              caseTypeName={caseTypeName}
              districtName={districtName}
              activeId={activeId}
              highlightSet={highlightSet}
              onSelect={setActiveId}
            />
          </PinnedCard>

          <div className="flex flex-col gap-6">
            <PinnedCard pin={ACCENT} className="min-h-[300px] flex-1">
              <EntityDetailCard detail={detail} />
            </PinnedCard>
            <PinnedCard pin={ACCENT}>
              <div className="p-5">
                <p className="mb-3 text-[13px] font-bold uppercase tracking-[0.14em] text-muted">Legend</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                  {(Object.keys(ENTITY_STYLES) as (keyof typeof ENTITY_STYLES)[]).map((k) => {
                    const s = ENTITY_STYLES[k];
                    return (
                      <span key={k} className="flex items-center gap-2 text-[14px] text-ink">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                        {s.label}
                      </span>
                    );
                  })}
                </div>
              </div>
            </PinnedCard>
          </div>
        </div>
      </section>

      {/* ── Section 3 · Timeline ──────────────────────────────────────── */}
      <section>
        <SectionHeading
          icon={Clock}
          title="Investigation Timeline"
          subtitle="Chronological record from first report to latest action"
          accent={ACCENT}
        />
        <PinnedCard pin={ACCENT}>
          <div className="p-5">
            <TimelinePanel
              events={data.timeline}
              activeId={activeId}
              highlightSet={highlightSet}
              onSelect={setActiveId}
            />
          </div>
        </PinnedCard>
      </section>

      {/* ── Section 4 · Evidence ──────────────────────────────────────── */}
      <section>
        <SectionHeading
          icon={Fingerprint}
          title="Evidence Locker"
          subtitle={`${data.evidence.length} exhibits — click to trace links to suspects and locations`}
          accent={ACCENT}
        />
        <EvidencePanel
          evidence={data.evidence}
          activeId={activeId}
          highlightSet={highlightSet}
          onSelect={setActiveId}
        />
      </section>

      {/* ── Section 5 · AI Investigation Insights ─────────────────────── */}
      <section>
        <SectionHeading
          icon={Sparkles}
          title="AI Investigation Insights"
          subtitle="Automated modus operandi, pattern, and next-action analysis"
          accent={ACCENT}
          right={
            <span className="flex items-center gap-2 rounded-sm border border-line bg-surface-2 px-3.5 py-2 text-[13px] font-medium text-muted">
              <span className="h-2 w-2 animate-pulse rounded-full bg-navy" /> Live analysis
            </span>
          }
        />
        <AIPanel ai={data.ai} suspects={data.entities.suspects} activeId={activeId} onSelect={setActiveId} />
      </section>

      {/* ── Section 6 · Related Cases ─────────────────────────────────── */}
      <section>
        <SectionHeading
          icon={Layers}
          title="Related Cases"
          subtitle="Cases sharing suspects, locations, or modus operandi"
          accent={ACCENT}
        />
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {data.ai.similarCases.map((sc, i) => (
            <motion.div
              key={sc.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
            >
              <PinnedCard pin={ACCENT}>
                <div className="p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-[18px] font-bold text-navy">{sc.id}</span>
                    <span className="rounded-sm bg-surface-2 px-2.5 py-1 text-[13px] font-semibold text-ink">
                      {sc.similarity}% match
                    </span>
                  </div>
                  <p className="mt-1.5 text-[15px] text-muted">{sc.title}</p>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-sm bg-surface-2">
                    <motion.div
                      className="h-full rounded-sm bg-navy"
                      initial={{ width: 0 }}
                      animate={{ width: `${sc.similarity}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                    />
                  </div>
                  <p className="mt-3 text-[13px] uppercase tracking-wide text-muted">
                    {sc.district} district
                  </p>
                </div>
              </PinnedCard>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Section 7 · Open Case Files ───────────────────────────────── */}
      <section>
        <SectionHeading
          icon={FileStack}
          title="Open Case Files"
          subtitle="Open a file to read the full digital case-file flipbook"
          accent={ACCENT}
        />
        {caseFiles.length === 0 ? (
          <PinnedCard pin={ACCENT}>
            <p className="p-6 text-[15px] text-muted">
              No synthetic case files are available for this case type and district.
            </p>
          </PinnedCard>
        ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {caseFiles.map((f, i) => (
            <motion.div
              key={f.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
            >
              <Link href={`${base}/case-files/${f.id}`} className="block">
                <PinnedCard variant="paper" pin="#b45309" interactive>
                  <div className="flex items-start gap-4 p-5">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-sm bg-stone-800/90">
                      <FileStack size={22} className="text-stone-100" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[19px] font-bold text-stone-900">{f.id}</p>
                      <p className="mt-0.5 text-[15px] text-stone-600">{f.title}</p>
                      <span className="mt-2 inline-block rounded-sm border border-stone-300 bg-stone-100 px-2.5 py-1 text-[12px] font-medium text-stone-700">
                        {f.status}
                      </span>
                    </div>
                    <ArrowRight size={18} className="mt-1 shrink-0 text-stone-400" />
                  </div>
                </PinnedCard>
              </Link>
            </motion.div>
          ))}
        </div>
        )}
      </section>
    </div>
  );
}
