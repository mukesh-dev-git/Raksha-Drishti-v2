"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Download, LayoutList } from "lucide-react";
import type { CaseFileRecordData } from "@/lib/investigation/adaptToCaseFileRecord";
import { FLIPBOOK_PAGE_DEFS, renderFlipbookPage } from "./caseFileFlipbookPages";

const pageVariants = {
  enter: (dir: number) => ({ rotateY: dir > 0 ? 42 : -42, x: dir > 0 ? 70 : -70, opacity: 0 }),
  center: { rotateY: 0, x: 0, opacity: 1 },
  exit: (dir: number) => ({ rotateY: dir > 0 ? -42 : 42, x: dir > 0 ? -70 : 70, opacity: 0 }),
};

// -----------------------------------------------------------------------------
// CaseFileFlipbookView — additional export view for the Case Files tab (the
// accordion CaseFileRecordPanel remains the working view; this is reached
// via its "View as Flip Book" toggle). Two renders of the SAME real
// CaseFileRecordData:
//   1. An interactive, page-turning screen view (print:hidden) — same
//      page-turn mechanics as the original flipbook, existing navy theme
//      instead of the old sepia paper look.
//   2. A hidden-on-screen, print-only stack (hidden print:block) with every
//      page forced onto its own A4 sheet via break-after-page, so
//      "Download PDF" (window.print()) produces a real, multi-page, A4
//      document with selectable text — no new dependency, no server-side
//      renderer, uses the browser's native print-to-PDF.
// -----------------------------------------------------------------------------
export default function CaseFileFlipbookView({ data, onClose }: { data: CaseFileRecordData; onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);

  const goTo = (next: number) => {
    if (next < 0 || next >= FLIPBOOK_PAGE_DEFS.length || next === index) return;
    setDirection(next > index ? 1 : -1);
    setIndex(next);
  };

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") goTo(index + 1);
      if (e.key === "ArrowLeft") goTo(index - 1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  const page = FLIPBOOK_PAGE_DEFS[index];

  return (
    <div>
      {/* @page rule is document-level by nature (can't be scoped to an
          element), so it's declared here rather than in a shared global
          stylesheet — keeps this entirely self-contained to this component. */}
      <style>{`@media print { @page { size: A4; margin: 14mm; } }`}</style>

      {/* screen-only toolbar */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-1.5 rounded-sm border border-line bg-surface px-3 py-1.5 text-[13px] text-ink transition hover:border-navy hover:text-navy"
        >
          <LayoutList size={14} /> Back to record view
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="flex items-center gap-1.5 rounded-sm bg-navy px-3.5 py-2 text-[13px] font-semibold text-white transition hover:bg-navy-hover"
        >
          <Download size={14} /> Download PDF (A4)
        </button>
      </div>

      {/* interactive screen view — hidden when printing */}
      <div className="mx-auto w-full max-w-3xl print:hidden">
        <div className="relative mx-auto" style={{ perspective: 2200 }}>
          <div
            className="relative flex overflow-hidden rounded-lg border border-line shadow-[0_20px_50px_-15px_rgba(11,46,89,0.35)]"
            style={{ minHeight: 560 }}
          >
            <div className="hidden w-8 shrink-0 flex-col items-center justify-evenly bg-navy sm:flex">
              {[0, 1, 2, 3, 4].map((i) => (
                <span key={i} className="h-2 w-2 rounded-full bg-white/20" />
              ))}
            </div>
            <div className="relative flex-1 bg-surface" style={{ transformStyle: "preserve-3d" }}>
              <AnimatePresence custom={direction} initial={false}>
                <motion.div
                  key={page.key}
                  custom={direction}
                  variants={pageVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
                  className="absolute inset-0 overflow-y-auto p-7 sm:p-9"
                  style={{ backfaceVisibility: "hidden" }}
                >
                  {renderFlipbookPage(page.key, data)}
                </motion.div>
              </AnimatePresence>

              <button
                aria-label="Previous page"
                onClick={() => goTo(index - 1)}
                disabled={index === 0}
                className="absolute bottom-3 left-3 z-10 flex h-9 w-9 items-center justify-center rounded-full text-muted transition hover:bg-surface-2 disabled:pointer-events-none disabled:opacity-0"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                aria-label="Next page"
                onClick={() => goTo(index + 1)}
                disabled={index === FLIPBOOK_PAGE_DEFS.length - 1}
                className="absolute bottom-3 right-3 z-10 flex h-9 w-9 items-center justify-center rounded-full text-muted transition hover:bg-surface-2 disabled:pointer-events-none disabled:opacity-0"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            onClick={() => goTo(index - 1)}
            disabled={index === 0}
            className="flex items-center gap-1.5 rounded-sm border border-line px-3 py-1.5 text-[12px] font-medium text-ink transition hover:border-navy disabled:opacity-30"
          >
            <ChevronLeft size={13} /> Prev
          </button>
          <p className="text-[12px] text-muted">
            Page <span className="text-ink">{index + 1}</span> of {FLIPBOOK_PAGE_DEFS.length} — {page.label}
          </p>
          <button
            onClick={() => goTo(index + 1)}
            disabled={index === FLIPBOOK_PAGE_DEFS.length - 1}
            className="flex items-center gap-1.5 rounded-sm border border-line px-3 py-1.5 text-[12px] font-medium text-ink transition hover:border-navy disabled:opacity-30"
          >
            Next <ChevronRight size={13} />
          </button>
        </div>

        <div className="mt-4 flex flex-wrap justify-center gap-1.5">
          {FLIPBOOK_PAGE_DEFS.map((p, i) => (
            <button
              key={p.key}
              onClick={() => goTo(i)}
              className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
                i === index ? "border-navy bg-surface-2 text-navy" : "border-line text-muted hover:border-navy hover:text-navy"
              }`}
            >
              {i + 1}. {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* print-only stack — every page on its own A4 sheet */}
      <div className="hidden print:block">
        {FLIPBOOK_PAGE_DEFS.map((p) => (
          <div key={p.key} className="break-after-page p-2">
            {renderFlipbookPage(p.key, data)}
          </div>
        ))}
      </div>
    </div>
  );
}
