import { BarChart3, MapPin, Network, Fingerprint, Bell } from "lucide-react";

const FEATURES = [
  {
    title: "Crime Analytics",
    subtitle: "Deep insights into crime trends and patterns across Karnataka.",
    icon: BarChart3,
    accent: "blue" as const,
  },
  {
    title: "Interactive Hotspots",
    subtitle: "Identify high-risk areas with intelligent heatmaps.",
    icon: MapPin,
    accent: "teal" as const,
  },
  {
    title: "Investigation Workspace",
    subtitle: "Manage cases, evidence, and investigations seamlessly.",
    icon: Network,
    accent: "purple" as const,
  },
  {
    title: "Evidence & Leads",
    subtitle: "Access verified evidence, leads, and contradictions instantly.",
    icon: Fingerprint,
    accent: "pink" as const,
  },
  {
    title: "Real-time Alerts",
    subtitle: "Get notified about critical incidents and urgent actions.",
    icon: Bell,
    accent: "orange" as const,
  },
];

const CHIP: Record<string, string> = {
  blue: "bg-dash-blue-bg text-dash-blue",
  teal: "bg-dash-teal-bg text-dash-teal",
  purple: "bg-dash-purple-bg text-dash-purple",
  pink: "bg-dash-pink-bg text-dash-pink",
  orange: "bg-dash-orange-bg text-dash-orange",
};

// -----------------------------------------------------------------------------
// Descriptive only - these cards deliberately do NOT link anywhere. They used
// to (five links straight past the sign-in panel, into /crime-count,
// /crime-hotspots and /dashboard), which made signing in optional and the
// scope choice meaningless. "/" is the sign-in screen; everything these cards
// describe is reachable from the sidebar once the officer is through it.
// See PLAN.md P0.1.
// -----------------------------------------------------------------------------
export default function FeatureGrid() {
  return (
    <section className="mx-auto max-w-[1400px] px-6 py-16">
      <h2 className="text-center text-2xl font-semibold text-ink">Everything You Need. All in One Place.</h2>
      <p className="mx-auto mt-2 max-w-xl text-center text-[13px] text-muted">
        Available once you sign in and choose a viewing scope.
      </p>

      <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
        {FEATURES.map((f) => (
          <div key={f.title} className="rounded-xl border border-line bg-surface p-5 shadow-sm">
            <span className={`flex h-11 w-11 items-center justify-center rounded-lg ${CHIP[f.accent]}`}>
              <f.icon size={20} aria-hidden="true" />
            </span>
            <p className="mt-4 text-[15px] font-semibold text-ink">{f.title}</p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{f.subtitle}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
