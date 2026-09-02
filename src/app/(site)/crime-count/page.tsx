import PageShell from "@/components/PageShell";
import MapEmbed from "@/components/MapEmbed";
import { BASE_PATH } from "@/lib/basePath";
import {
  getCrimeCountSummary,
  getChargesheetAnalytics,
  getTimeHeatmapData,
  getTrendControlChartData,
  getCaseFlowSankeyData,
} from "@/lib/crimeCountStats";
import CrimeCountStatCards from "@/components/crimeCount/CrimeCountStatCards";
import ChargesheetPanel from "@/components/crimeCount/ChargesheetPanel";
import TimeHeatmap from "@/components/crimeCount/TimeHeatmap";
import TrendControlChart from "@/components/crimeCount/TrendControlChart";
import CaseFlowSankey from "@/components/crimeCount/CaseFlowSankey";

// -----------------------------------------------------------------------------
// /crime-count — P4.8 baseline + P4.2/P4.3/P4.4/P4.9 real analytics. Every
// number below is computed once, server-side, from the real 5,000-case FIR
// Index (getCaseWorklist()) and the real ChargesheetDetails data - no LLM,
// no fabricated figures (PLAN.md P4's own framing).
// -----------------------------------------------------------------------------
export const metadata = { title: "Crime Count" };

export default async function CrimeCountPage() {
  // Run in parallel - each independently awaits the same underlying live
  // fetch (getLiveCaseFacts()'s single-flight cache means five concurrent
  // callers share one rebuild, not five).
  const [summary, chargesheet, heatmap, trend, sankey] = await Promise.all([
    getCrimeCountSummary(),
    getChargesheetAnalytics(),
    getTimeHeatmapData(),
    getTrendControlChartData(),
    getCaseFlowSankeyData(),
  ]);

  return (
    <PageShell
      title="Crime Count"
      description="Total registered crime, broken down by category, time period, and region. Use the interactive map below to explore totals across Bengaluru."
      breadcrumbs={[{ label: "Crime Count", href: "/crime-count" }]}
      heroImageSrc="/page-hero/crime-count.png"
    >
      <MapEmbed src={`${BASE_PATH}/crime-map/map.html`} title="Bengaluru crime map" />

      <div className="mt-10 space-y-6">
        <CrimeCountStatCards summary={summary} />
        <ChargesheetPanel data={chargesheet} />
        <TimeHeatmap data={heatmap} />
        <TrendControlChart series={trend} />
        <CaseFlowSankey data={sankey} />
      </div>
    </PageShell>
  );
}
