"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { CaseFileContent } from "@/lib/investigationData";
import { PAGE_DEFS, renderCaseFilePage } from "./pages";

const pageVariants = {
  enter: (dir: number) => ({
    rotateY: dir > 0 ? 42 : -42,
    x: dir > 0 ? 70 : -70,
    opacity: 0,
  }),
  center: { rotateY: 0, x: 0, opacity: 1 },
  exit: (dir: number) => ({
    rotateY: dir > 0 ? -42 : 42,
    x: dir > 0 ? -70 : 70,
    opacity: 0,
  }),
};

export default function CaseFileFlipbook({ content }: { content: CaseFileContent }) {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);

  const goTo = (next: number) => {
    if (next < 0 || next >= PAGE_DEFS.length || next === index) return;
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

  const page = PAGE_DEFS[index];

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="relative mx-auto" style={{ perspective: 2200 }}>
        <div
          className="relative flex overflow-hidden rounded-2xl border border-stone-400/40 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.7)]"
          style={{ minHeight: 620 }}
        >
          {/* binder spine */}
          <div className="hidden w-9 shrink-0 flex-col items-center justify-evenly bg-gradient-to-b from-stone-900 to-stone-800 sm:flex">
            {[0, 1, 2, 3, 4].map((i) => (
              <span key={i} className="h-2.5 w-2.5 rounded-full bg-stone-950 shadow-inner" />
            ))}
          </div>

          {/* page surface */}
          <div
            className="relative flex-1 bg-[#f6f1e4] bg-[radial-gradient(ellipse_at_top_left,rgba(0,0,0,0.05),transparent_60%)]"
            style={{ transformStyle: "preserve-3d" }}
          >
            <div className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-black/10 to-transparent" />

            <AnimatePresence custom={direction} initial={false}>
              <motion.div
                key={page.key}
                custom={direction}
                variants={pageVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
                className="absolute inset-0 overflow-y-auto p-6 sm:p-9"
                style={{ backfaceVisibility: "hidden" }}
              >
                {renderCaseFilePage(page.key, content)}
              </motion.div>
            </AnimatePresence>

            {/* corner turn affordances */}
            <button
              aria-label="Previous page"
              onClick={() => goTo(index - 1)}
              disabled={index === 0}
              className="group absolute bottom-3 left-3 z-10 flex h-9 w-9 items-center justify-center rounded-full text-stone-400 transition hover:bg-black/5 disabled:pointer-events-none disabled:opacity-0"
            >
              <ChevronLeft size={18} className="transition group-hover:-translate-x-0.5" />
            </button>
            <button
              aria-label="Next page"
              onClick={() => goTo(index + 1)}
              disabled={index === PAGE_DEFS.length - 1}
              className="group absolute bottom-3 right-3 z-10 flex h-9 w-9 items-center justify-center rounded-full text-stone-400 transition hover:bg-black/5 disabled:pointer-events-none disabled:opacity-0"
            >
              <ChevronRight size={18} className="transition group-hover:translate-x-0.5" />
            </button>
          </div>
        </div>
      </div>

      {/* controls */}
      <div className="mt-5 flex items-center justify-between gap-3">
        <button
          onClick={() => goTo(index - 1)}
          disabled={index === 0}
          className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-white/20 hover:text-white disabled:opacity-30"
        >
          <ChevronLeft size={14} /> Prev
        </button>

        <p className="text-[11px] text-slate-500">
          Page <span className="text-slate-300">{index + 1}</span> of {PAGE_DEFS.length} —{" "}
          <span className="text-slate-400">{page.label}</span>
        </p>

        <button
          onClick={() => goTo(index + 1)}
          disabled={index === PAGE_DEFS.length - 1}
          className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-white/20 hover:text-white disabled:opacity-30"
        >
          Next <ChevronRight size={14} />
        </button>
      </div>

      {/* index tabs */}
      <div className="mt-4 flex flex-wrap justify-center gap-1.5">
        {PAGE_DEFS.map((p, i) => (
          <button
            key={p.key}
            onClick={() => goTo(i)}
            className={`rounded-full border px-2.5 py-1 text-[10px] font-medium transition ${
              i === index
                ? "border-sky-400/60 bg-sky-500/15 text-sky-200"
                : "border-white/10 bg-white/[0.02] text-slate-500 hover:border-white/20 hover:text-slate-300"
            }`}
          >
            {i + 1}. {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}
