"use client";

import { useRef } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion, useScroll, useTransform } from "framer-motion";

// -----------------------------------------------------------------------------
// ScrollZoomHero — the dashboard hero: the background image scales up, blurs
// and fades as you scroll, under a navy wash. Includes a decorative shield ↔
// eye SVG path-morph ("Raksha" protection / "Drishti" vision) and staggered
// text entrances. CTAs are plain links (no page-transition system).
// -----------------------------------------------------------------------------

// Police response — crime/law-enforcement themed backdrop (patrol car, lights on).
const HERO_IMG =
  "https://images.unsplash.com/photo-1453873531674-2151bcd01707?auto=format&fit=crop&w=1920&q=80";

// Compatible paths (same command structure) so the `d` attribute can morph.
const SHIELD_PATH =
  "M50 5 C65 15 80 18 92 20 C92 45 88 75 50 95 C12 75 8 45 8 20 C20 18 35 15 50 5 Z";
const EYE_PATH =
  "M50 22 C72 22 88 38 92 50 C88 62 72 78 50 78 C28 78 12 62 8 50 C12 38 28 22 50 22 Z";

export default function ScrollZoomHero() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  // Scroll-zoom: scale up, blur, and fade the backdrop as it leaves view.
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.35]);
  const filter = useTransform(scrollYProgress, [0, 1], ["blur(0px)", "blur(10px)"]);
  const opacity = useTransform(scrollYProgress, [0, 0.85], [1, 0.2]);

  return (
    <section ref={ref} className="relative overflow-hidden bg-navy text-white">
      {/* Backdrop image (zooms/blurs/fades on scroll) under a navy wash */}
      <motion.div
        aria-hidden="true"
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${HERO_IMG})`, scale, filter, opacity }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(135deg, rgba(11,32,66,0.72) 0%, rgba(16,46,93,0.52) 55%, rgba(11,32,66,0.30) 100%)",
        }}
      />

      {/* Decorative morphing emblem — shield ⇄ eye */}
      <motion.svg
        aria-hidden="true"
        viewBox="0 0 100 100"
        className="pointer-events-none absolute -right-8 top-1/2 hidden h-[420px] w-[420px] -translate-y-1/2 opacity-[0.14] lg:block"
        initial={{ rotate: -4 }}
        animate={{ rotate: 4 }}
        transition={{ duration: 8, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }}
      >
        <motion.path
          d={SHIELD_PATH}
          fill="none"
          stroke="#ffffff"
          strokeWidth="1.6"
          animate={{ d: [SHIELD_PATH, EYE_PATH, SHIELD_PATH] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.circle
          cx="50"
          cy="50"
          fill="#ffffff"
          animate={{ r: [6, 11, 6] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.svg>

      <div className="relative mx-auto max-w-content px-4 py-14 sm:py-20">
        <motion.p
          className="text-sm font-medium uppercase tracking-wide text-white/70"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.08 }}
        >
          State Police Department
        </motion.p>
        <motion.h1
          className="mt-2 max-w-3xl text-3xl font-semibold sm:text-4xl"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.16 }}
        >
          Crime Analytics &amp; Investigation Portal
        </motion.h1>
        <motion.p
          className="mt-4 max-w-2xl text-white/85"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.24 }}
        >
          A single, reliable place to understand crime in the state — view
          counts and trends, locate hotspots, and follow cases from district
          summaries through to individual investigation files.
        </motion.p>

        <motion.div
          className="mt-6 flex flex-wrap gap-3"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.32 }}
        >
          <Link
            href="/cases"
            className="inline-flex items-center gap-2 rounded-sm bg-white px-5 py-2.5 font-medium text-navy hover:bg-white/90"
          >
            Browse cases <ArrowRight size={16} aria-hidden="true" />
          </Link>
          <Link
            href="/crime-count"
            className="inline-flex items-center gap-2 rounded-sm border border-white/40 px-5 py-2.5 font-medium text-white hover:bg-white/10"
          >
            View crime statistics
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
