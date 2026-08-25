import { ArrowRight } from "lucide-react";
import HeroLiveOverview from "./HeroLiveOverview";
import type { Summary } from "@/lib/api";

// Same photo ScrollZoomHero.tsx already used for the old Home hero (police
// response backdrop) - confirmed a real, resolving Unsplash photo via curl.
// The original URL here was a guessed photo ID that 404'd (no image ever
// loaded, confirmed via network inspection) - don't hand-write an Unsplash
// URL without verifying it resolves first.
const HERO_IMG =
  "https://images.unsplash.com/photo-1453873531674-2151bcd01707?auto=format&fit=crop&w=1920&q=80";

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

      <div className="relative mx-auto grid max-w-[1400px] gap-8 px-6 py-8 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:py-10">
        <div>
          <h1 className="text-3xl font-bold leading-tight text-white sm:text-4xl">
            Smart Policing.
            <br />
            Safer Karnataka.
          </h1>
          <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-white/80">
            Raksha-Drishti is the unified crime analytics and investigation platform empowering Karnataka State
            Police with real-time insights, smart maps and faster actions.
          </p>
          {/* Points at the sign-in panel rather than deep-linking past it -
              "/" is the sign-in screen and the scope picker there is the only
              way in. See PLAN.md P0.1. */}
          <div className="mt-5 flex flex-wrap gap-3">
            <a
              href="#officer-sign-in"
              className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 font-semibold text-navy hover:bg-white/90"
            >
              Sign in to continue <ArrowRight size={16} aria-hidden="true" />
            </a>
          </div>
        </div>

        <div className="flex justify-center lg:justify-end">
          <HeroLiveOverview summary={summary} />
        </div>
      </div>
    </section>
  );
}
