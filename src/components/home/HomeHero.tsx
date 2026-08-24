import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import HeroLiveOverview from "./HeroLiveOverview";
import type { Summary } from "@/lib/api";

const HERO_IMG =
  "https://images.unsplash.com/photo-1595854341625-f33e32bc3fd6?auto=format&fit=crop&w=1920&q=80";

export default function HomeHero({ summary }: { summary: Summary }) {
  return (
    <section className="relative overflow-hidden bg-navy">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${HERO_IMG})` }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(115deg, rgba(11,32,66,0.94) 0%, rgba(11,32,66,0.82) 45%, rgba(11,32,66,0.35) 100%)",
        }}
      />

      <div className="relative mx-auto grid max-w-[1400px] gap-10 px-6 py-16 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:py-24">
        <div>
          <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl">
            Smart Policing.
            <br />
            Safer Karnataka.
          </h1>
          <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-white/80">
            Raksha-Drishti is the unified crime analytics and investigation platform empowering Karnataka State
            Police with real-time insights, smart maps and faster actions.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-3 font-semibold text-navy hover:bg-white/90"
            >
              Explore Dashboard <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <Link
              href="/cases"
              className="inline-flex items-center gap-2 rounded-lg border border-white/40 px-5 py-3 font-semibold text-white hover:bg-white/10"
            >
              <BookOpen size={16} aria-hidden="true" /> Learn More
            </Link>
          </div>
        </div>

        <div className="flex justify-center lg:justify-end">
          <HeroLiveOverview summary={summary} />
        </div>
      </div>
    </section>
  );
}
