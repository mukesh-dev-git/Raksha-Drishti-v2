import { Users, FileText, Waypoints, Repeat } from "lucide-react";
import PageShell from "@/components/PageShell";
import StatTile from "@/components/ui/StatTile";
import StatewideNetworkGraph from "@/components/network/StatewideNetworkGraph";
import { getStatewideNetwork } from "@/lib/statewideNetwork";

// -----------------------------------------------------------------------------
// P4.9 item 5 - "Statewide link-analysis graph": the per-case relationship
// graph (relationshipGraph.ts / CaseRelationshipGraph.tsx, P9.4) generalised
// across every case for the full 47-person evidence-linked register - the
// literal "Network & Behavioral Analysis" capability PLAN.md's P4 header
// names, and closer to what a real link-analysis tool shows than the
// existing /repeat-offenders list view is (P4.9's own framing for this item).
//
// Honest about scope, same discipline as every other real/fallback-free page
// in this app:
//  - Only the 15 authored scenarios' 47 evidence-linked people are in this
//    graph - the 5,000 bulk cases (catalyst/dataset-v2/bulk_cases.mjs) carry
//    no evidence records and no personId, so they have nothing real to plot
//    here and are not touched by statewideNetwork.ts at all.
//  - Only Accused persons appear as Person nodes. Victims/Complainants are
//    deliberately excluded - P1.1's entity-fusion only ever assigned a
//    global KA-Pxxxx id to Accused.PersonID, so a Victim node would need an
//    invented id (personFusion.ts's isFusable comment explains why that
//    was rejected there; the same reasoning applies here unchanged).
//  - Every edge is a real (person, FIR) pair straight from P1.1's own
//    resolvedPersons.caseMasterIds field - not a name/alias coincidence.
//    There is no real person-to-person edge available across cases (see
//    statewideNetwork.ts's header for why), so this graph does not draw one.
// -----------------------------------------------------------------------------
export const metadata = { title: "Statewide Network" };

export default function StatewideNetworkPage() {
  const { nodes, edges, stats } = getStatewideNetwork();

  return (
    <PageShell
      title="Statewide Network"
      description="Every evidence-linked accused person across all 15 investigated scenarios, and the real FIRs they're named in. A line only exists where P1.1's entity resolution actually ties one real person to one real case file — nothing here is a name-match guess."
      breadcrumbs={[
        { label: "Pattern Analysis", href: "/pattern-analysis" },
        { label: "Statewide Network", href: "/pattern-analysis/network" },
      ]}
    >
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatTile label="Accused persons" value={String(stats.personCount)} icon={<Users size={18} />} hint="Real KA-P ids, P1.1 entity fusion" />
          <StatTile label="Case files (FIRs)" value={String(stats.caseCount)} icon={<FileText size={18} />} hint={`Across ${stats.scenarioCount} investigated scenarios`} />
          <StatTile label="Person↔case links" value={String(stats.edgeCount)} icon={<Waypoints size={18} />} hint="One edge per real accused-in-FIR fact" />
          <StatTile label="Repeat subjects" value={String(stats.repeatSubjectCount)} icon={<Repeat size={18} />} hint="Named accused in 2+ real FIRs" />
        </div>

        <div className="min-w-0 rounded-xl border border-line bg-surface p-5 shadow-sm">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
            Link-analysis graph · {nodes.length} nodes, {edges.length} real links
          </p>
          <p className="mb-3 text-[12px] text-muted">
            Squares are case files (FIRs), coloured by scenario. Circles are accused persons, coloured by the scenario
            P1.1 resolved them into. A person with the ring icon is a real repeat subject — named accused in more than
            one FIR — visible here as a node with more than one line out of it.
          </p>
          <StatewideNetworkGraph nodes={nodes} edges={edges} />
        </div>

        <p className="text-[11px] text-muted">
          Not shown, deliberately: victims and witnesses (no global person id exists for them yet — see{" "}
          <code className="font-mono">personFusion.ts</code>&apos;s <code className="font-mono">isFusable</code> comment), and
          any person-to-person edge across different cases, because no real record in the seeded evidence ever names two
          people from two different cases together.
        </p>
      </div>
    </PageShell>
  );
}
