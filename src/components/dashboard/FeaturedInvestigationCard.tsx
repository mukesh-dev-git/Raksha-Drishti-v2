import Link from "next/link";
import { AlertTriangle, ArrowRight } from "lucide-react";
import type { getFeaturedScenario } from "@/lib/dashboardData";
import MiniRelationshipGraph from "./MiniRelationshipGraph";

type Scenario = NonNullable<ReturnType<typeof getFeaturedScenario>>;

export default function FeaturedInvestigationCard({ scenario }: { scenario: Scenario }) {
  return (
    <div className="grid h-full grid-cols-1 gap-6 rounded-xl border border-line bg-surface p-5 shadow-sm lg:grid-cols-[1.3fr_1fr]">
      <div>
        <div className="flex items-center justify-between">
          <p className="text-[15px] font-semibold text-ink">Featured Investigation</p>
          {scenario.hasContradiction && (
            <span className="flex items-center gap-1 rounded-full bg-danger-bg px-2.5 py-1 text-[11px] font-semibold text-danger">
              <AlertTriangle size={12} aria-hidden="true" /> Contradiction flagged
            </span>
          )}
        </div>

        <p className="mt-3 text-lg font-semibold text-navy">{scenario.title}</p>
        <p className="text-xs text-muted">
          {scenario.caseTypeName} · {scenario.districtName} · {scenario.caseMasterIds.length} linked FIR
          {scenario.caseMasterIds.length > 1 ? "s" : ""}
        </p>
        <p className="mt-3 line-clamp-3 text-[13px] leading-relaxed text-muted">{scenario.summary}</p>

        <Link
          href={scenario.link}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-dash-blue px-4 py-2.5 text-[13px] font-semibold text-white transition hover:opacity-90"
        >
          Open Workspace <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </div>

      <div className="flex flex-col justify-center border-t border-line pt-4 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
        <MiniRelationshipGraph counts={scenario.counts} />
      </div>
    </div>
  );
}
