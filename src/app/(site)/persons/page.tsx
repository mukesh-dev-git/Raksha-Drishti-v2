import PageShell from "@/components/PageShell";
import PersonSearchClient, { type PersonListRow } from "@/components/persons/PersonSearchClient";
import { fuseAllPersons } from "@/lib/personFusion";
import { getWorklistCase } from "@/lib/caseWorklist";
import { getOffenderPhotoUrl } from "@/lib/offenderPhotos";

// -----------------------------------------------------------------------------
// P2.1c - the Crime and Criminal Records Search equivalent: every person in
// the global register (47 today), searchable by name, not only the 6
// repeat subjects /repeat-offenders lists. That page is now a filtered view
// into this one (2+ cases), not the only place a person is reachable.
// -----------------------------------------------------------------------------
export const metadata = { title: "Persons" };

export default function PersonsPage() {
  const people = [...fuseAllPersons().values()]
    .sort((a, b) => b.caseMasterIds.length - a.caseMasterIds.length || a.name.localeCompare(b.name));

  const rows: PersonListRow[] = people.map((p) => {
    const districtNames = [...new Set(
      p.caseMasterIds.map((id) => getWorklistCase(id)?.districtName).filter((n): n is string => !!n)
    )];
    return {
      personId: p.personId,
      name: p.name,
      aliases: p.aliases,
      caseCount: p.caseMasterIds.length,
      districtNames,
      photoUrl: getOffenderPhotoUrl(p.personId),
    };
  });

  return (
    <PageShell
      title="Persons"
      description="Every person in the criminal record register, searchable by name. Repeat subjects (2+ cases) are flagged automatically."
      breadcrumbs={[{ label: "Persons", href: "/persons" }]}
      heroImageSrc="/page-hero/persons.png"
    >
      <PersonSearchClient people={rows} />
    </PageShell>
  );
}
