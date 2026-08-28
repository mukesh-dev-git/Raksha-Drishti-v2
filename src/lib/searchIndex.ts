// -----------------------------------------------------------------------------
// P2.1d - real data behind the header search bar (DashboardTopbar.tsx),
// which until now was a fully decorative <input> with zero state or
// routing wired to it. Built server-side (ShellLayout, a server component)
// and passed down as a small plain-data prop - the client search UI itself
// does no fetching, just filters this pre-resolved list, matching how
// small this dataset actually is (19 cases + 47 people + 8 districts).
// -----------------------------------------------------------------------------
import { getCaseWorklist, caseDetailLink } from "./caseWorklist";
import { fuseAllPersons } from "./personFusion";
import { getDistrictStats } from "./districtStats";

export type SearchItem = {
  kind: "case" | "person" | "district";
  label: string;
  sublabel: string;
  href: string;
  /** Lowercased, space-joined - the only field actually matched against. */
  keywords: string;
};

let cache: SearchItem[] | null = null;

export function getSearchIndex(): SearchItem[] {
  if (cache) return cache;

  const cases: SearchItem[] = getCaseWorklist().map((c) => ({
    kind: "case",
    label: c.title,
    sublabel: `${c.crimeNo} · ${c.districtName}`,
    href: caseDetailLink(c.caseMasterId),
    keywords: `${c.title} ${c.crimeNo} ${c.accusedNames.join(" ")} ${c.districtName} ${c.crimeTypeName}`.toLowerCase(),
  }));

  const persons: SearchItem[] = [...fuseAllPersons().values()].map((p) => ({
    kind: "person",
    label: p.name,
    sublabel: `${p.personId} · ${p.caseMasterIds.length} case${p.caseMasterIds.length === 1 ? "" : "s"}`,
    href: `/persons/${p.personId}`,
    keywords: `${p.name} ${p.aliases.join(" ")}`.toLowerCase(),
  }));

  const districtItems: SearchItem[] = getDistrictStats().map((d) => ({
    kind: "district",
    label: d.name,
    sublabel: `${d.totalCases} case${d.totalCases === 1 ? "" : "s"}`,
    href: `/districts/${d.slug}`,
    keywords: d.name.toLowerCase(),
  }));

  cache = [...cases, ...persons, ...districtItems];
  return cache;
}
