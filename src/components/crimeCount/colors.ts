// -----------------------------------------------------------------------------
// One consistent crime-type -> color mapping for every /crime-count chart,
// so the same "Theft" bar is the same blue in the stat cards, the control
// chart, and the Sankey. CaseStatusPill.tsx already owns the canonical
// status-color mapping (1 Open=dash-blue, 4 Under Investigation=warning,
// 2 Charge Sheeted=dash-purple, 3 Closed=success) - reused as-is here rather
// than re-picked, so a status means the same color everywhere in the app.
//
// Known bug (see PLAN.md): Tailwind's `/NN` opacity modifier silently fails
// on these plain-hex CSS vars. Charts that need a translucent fill use
// inline `style={{ opacity }}` or an rgba()-equivalent, never `/NN` classes.
// -----------------------------------------------------------------------------
export const CRIME_TYPE_COLOR: Record<string, string> = {
  theft: "var(--dash-blue)",
  assault: "var(--dash-pink)",
  fraud: "var(--dash-purple)",
  burglary: "var(--dash-orange)",
};

export const CRIME_TYPE_COLOR_CLASS: Record<string, string> = {
  theft: "bg-dash-blue",
  assault: "bg-dash-pink",
  fraud: "bg-dash-purple",
  burglary: "bg-dash-orange",
};

export function crimeTypeColor(slug: string): string {
  return CRIME_TYPE_COLOR[slug] ?? "var(--muted)";
}
