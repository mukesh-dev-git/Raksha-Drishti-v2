import Link from "next/link";
import { BarChart3, MapPin, FolderKanban, ArrowRight } from "lucide-react";
import LinkCard from "@/components/LinkCard";
import StatTile from "@/components/ui/StatTile";
import { caseTypes } from "@/lib/data";

// -----------------------------------------------------------------------------
// /dashboard — portal home. Navy gradient hero (imagery placeholder), a summary
// stat row, and the three primary modules as solid cards.
// -----------------------------------------------------------------------------
export const metadata = { title: "Home" };

const totalCases = caseTypes.reduce((sum, c) => sum + c.total, 0);

export default function DashboardPage() {
  return (
    <main id="dashboard">
      {/* Hero — solid navy gradient placeholder (no flashy media) */}
      <section
        className="bg-navy text-white"
        style={{
          backgroundImage:
            "linear-gradient(135deg, var(--navy) 0%, var(--navy-hover) 100%)",
        }}
      >
        <div className="mx-auto max-w-content px-4 py-12 sm:py-16">
          <p className="text-sm font-medium uppercase tracking-wide text-white/70">
            State Police Department
          </p>
          <h1 className="mt-2 max-w-3xl text-3xl font-semibold sm:text-4xl">
            Crime Analytics &amp; Investigation Portal
          </h1>
          <p className="mt-4 max-w-2xl text-white/85">
            A single, reliable place to understand crime in the state — view
            counts and trends, locate hotspots, and follow cases from district
            summaries through to individual investigation files.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
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
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-content px-4">
        {/* Summary stats */}
        <section aria-label="Summary statistics" className="-mt-8 sm:-mt-10">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile label="Registered cases" value={totalCases.toLocaleString("en-IN")} hint="Across all categories" />
            <StatTile label="Crime categories" value={String(caseTypes.length)} hint="Tracked case types" />
            <StatTile label="Districts covered" value="5" hint="Statewide reporting" />
            <StatTile label="Helpline" value="112" hint="24×7 emergency response" />
          </div>
        </section>

        {/* Primary modules */}
        <section aria-labelledby="modules-heading" className="mt-12">
          <h2 id="modules-heading" className="text-xl font-semibold text-navy">
            Explore the portal
          </h2>
          <p className="mt-1 text-muted">Choose a module to get started.</p>

          <div className="mt-6 grid gap-6 sm:grid-cols-3">
            <LinkCard
              href="/crime-count"
              title="Crime Count"
              icon={<BarChart3 size={20} />}
              subtitle="Totals and trends across crime categories, time periods, and regions."
            />
            <LinkCard
              href="/crime-hotspots"
              title="Crime Hotspots"
              icon={<MapPin size={20} />}
              subtitle="Where incidents concentrate — identify and monitor high-risk areas."
            />
            <LinkCard
              href="/cases"
              title="Cases"
              icon={<FolderKanban size={20} />}
              subtitle="Drill from case types to district counts and individual investigations."
            />
          </div>
        </section>
      </div>
    </main>
  );
}
