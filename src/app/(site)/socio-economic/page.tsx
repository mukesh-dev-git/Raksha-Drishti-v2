import PageShell from "@/components/PageShell";
import { getSocioEconomicView } from "@/lib/socioEconomicStats";
import SocioEconomicPanel, { type SocioEconomicSeries } from "@/components/socioEconomic/SocioEconomicPanel";

// -----------------------------------------------------------------------------
// /socio-economic — P4.5, the PS's own "Socio-Economic Correlation... urban-
// isation, population, socio-economic indicators" ask (RESEARCH_AND_PLAN.md
// §5.2). Framing agreed before this was built (PLAN.md P1.5/P4.5, resolved
// 2026-08-29): aggregate-only, victim/complainant side, always with a real
// denominator, never offender propensity - see socioEconomicStats.ts and
// SocioEconomicPanel.tsx for how that's enforced, not just stated.
//
// CasteID is deliberately absent from this page. The presentation framing is
// resolved; the caste taxonomy itself is a separate, still-open decision
// (PLAN.md P1.5), and no CasteID values exist in the seed yet to show.
// -----------------------------------------------------------------------------
export const metadata = { title: "Socio-Economic Correlation" };

export default function SocioEconomicPage() {
  const all = getSocioEconomicView();
  const series: SocioEconomicSeries[] = [
    { crimeTypeSlug: null, crimeTypeName: "Statewide", caseCount: all.caseCount, occupation: all.occupation, religion: all.religion, district: all.district },
    ...all.filterOptions.crimeTypes.map((t) => {
      const v = getSocioEconomicView({ crimeTypeSlug: t.slug });
      return { crimeTypeSlug: t.slug, crimeTypeName: t.name, caseCount: v.caseCount, occupation: v.occupation, religion: v.religion, district: v.district };
    }),
  ];

  return (
    <PageShell
      title="Socio-Economic Correlation"
      description="Victim and complainant demographic profile across the real 5,000-case FIR Index — for victim-support and outreach planning, never as an offender signal."
      breadcrumbs={[{ label: "Socio-Economic Correlation", href: "/socio-economic" }]}
      heroImageSrc="/page-hero/socio-economic.png"
    >
      <SocioEconomicPanel series={series} />
    </PageShell>
  );
}
