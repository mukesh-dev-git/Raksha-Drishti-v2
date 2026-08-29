import { Users, MapPinned, Repeat, Link2 } from "lucide-react";
import PageShell from "@/components/PageShell";
import StatTile from "@/components/ui/StatTile";
import RepeatOffendersClient, { type EnrichedPerson, type PersonCaseInfo } from "@/components/RepeatOffendersClient";
import { getRepeatCaseSuspects } from "@/lib/personFusion";
import { caseDetailLink } from "@/lib/caseWorklist";
import { getOffenderPhotoUrl } from "@/lib/offenderPhotos";
import { getPersonIdentity } from "@/lib/personIdentity";
import { caseTypes, districts } from "@/lib/data";
import scenarioMeta from "@/lib/nosql-seed/scenarioMeta.json";
import caseFactsRaw from "@/lib/nosql-seed/caseFacts.json";

const TITLES = scenarioMeta as Record<string, { title: string }>;

type CaseFact = {
  caseMasterId: number;
  scenarioId: string;
  crimeMinorHeadId: number;
  districtId: number | null;
};
const CASE_FACTS = caseFactsRaw as Record<string, CaseFact>;

// -----------------------------------------------------------------------------
// P4.7 redesign - the discovery surface the PS's "Repeat Offender Tracking...
// across different jurisdictions" ask needs, rebuilt toward a master-detail
// intelligence layout per direct user reference (screenshot of a reference
// dashboard). This file stays the server component: it resolves every real
// fact (district/case-type names, case links, cross-district stats) once at
// request time and hands a plain data object to the client component, which
// owns only the click-to-select UI state - same split as
// InvestigationWorkspaceClient.tsx.
//
// Deliberately built ONLY from real, provable data. Explicitly NOT built,
// because nothing in the seed backs them: a risk score, a Watchlist / "Create
// Investigation Note" action (no CRUD write endpoints exist anywhere in the
// app - confirmed via grep, zero POST/PUT/DELETE/PATCH handlers), device-ID
// based linking, a jurisdiction mini-map with pins, a "Connections Overview"
// network graph, extra tabs (Connections/Pattern/Locations/Communications),
// "AI-Suggested Investigative Leads", a District/Crime Type/Date/Risk filter
// row, or an Export button. The reference mockup has all of these; this page
// intentionally does not, rather than fabricating data to fill them in.
// -----------------------------------------------------------------------------
export const metadata = { title: "Repeat Offenders" };

function resolveCase(caseMasterId: number): PersonCaseInfo {
  const f = CASE_FACTS[String(caseMasterId)];
  const meta = f ? TITLES[f.scenarioId] : undefined;
  const crimeType = f ? caseTypes.find((c) => c.dbId === f.crimeMinorHeadId) : undefined;
  const district = f ? districts.find((d) => d.dbId === f.districtId) : undefined;
  return {
    caseMasterId,
    scenarioId: f?.scenarioId ?? "",
    scenarioTitle: meta?.title ?? String(caseMasterId),
    crimeTypeName: crimeType?.name ?? "Unknown",
    districtId: f?.districtId ?? null,
    districtName: district?.name ?? "Unknown",
    // This specific FIR's own page - NOT scenarioLink(f.scenarioId), which
    // resolves to the scenario's FIRST caseMasterId and would silently
    // mislink every sibling FIR (e.g. Suresh Naik's 9002 row would have
    // linked to 9001's page, since both share scenario C1). Found while
    // building /persons/[personId] and reusing this same function.
    link: f ? caseDetailLink(caseMasterId) : null,
  };
}

export default function RepeatOffendersPage() {
  const people = getRepeatCaseSuspects();

  const enriched: EnrichedPerson[] = people.map((p) => ({
    ...p,
    cases: p.caseMasterIds.map(resolveCase),
    // Resolved server-side (fs.existsSync) and passed down as a plain URL -
    // OffenderAvatar itself stays a pure/presentational component so it can
    // be safely used inside RepeatOffendersClient's client component tree.
    photoUrl: getOffenderPhotoUrl(p.personId),
    // Synthetic KYC fields (masked Aadhaar/phone/address) - see
    // personIdentity.ts's own comment for why this exists and how it's
    // generated. Null is possible in principle (a person outside the
    // register) but never happens for anyone getRepeatCaseSuspects() returns,
    // since that list is itself built from the same Accused register.
    identity: getPersonIdentity(p.personId),
  }));

  // Real, computed-not-claimed numbers for the stat row - see PLAN.md P4.7.
  const totalRepeat = enriched.length;
  const crossDistrict = enriched.filter((p) => new Set(p.cases.map((c) => c.districtId).filter((d) => d !== null)).size > 1).length;
  const threeOrMoreCases = enriched.filter((p) => p.caseMasterIds.length >= 3).length;
  const totalCaseLinks = enriched.reduce((sum, p) => sum + p.caseMasterIds.length, 0);

  return (
    <PageShell
      title="Repeat Offenders"
      description="People named across more than one case file, ranked by how many. Every link below traces back to a real record id — not a name match."
      breadcrumbs={[{ label: "Repeat Offenders", href: "/repeat-offenders" }]}
      heroImageSrc="/page-hero/repeat-offenders.png"
    >
      {enriched.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-surface p-8 text-center text-sm text-muted">
          No one in the current seeded dataset appears in more than one case.
        </div>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatTile label="Repeat subjects" value={String(totalRepeat)} icon={<Users size={18} />} hint="Named in 2+ FIRs" />
            <StatTile
              label="Cross-district"
              value={`${crossDistrict}/${totalRepeat}`}
              icon={<MapPinned size={18} />}
              hint={`${Math.round((crossDistrict / totalRepeat) * 100)}% span more than one district`}
            />
            <StatTile label="3+ case subjects" value={String(threeOrMoreCases)} icon={<Repeat size={18} />} hint="None yet in the seeded set" />
            <StatTile label="Total case-links" value={String(totalCaseLinks)} icon={<Link2 size={18} />} hint="Summed across all repeat subjects" />
          </div>

          <RepeatOffendersClient people={enriched} />
        </div>
      )}
    </PageShell>
  );
}
