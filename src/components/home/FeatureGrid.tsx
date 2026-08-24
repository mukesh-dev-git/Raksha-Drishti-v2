import Link from "next/link";
import { BarChart3, MapPin, Network, Fingerprint, Bell, ArrowRight } from "lucide-react";

const FEATURES = [
  {
    title: "Crime Analytics",
    subtitle: "Deep insights into crime trends and patterns across Karnataka.",
    href: "/crime-count",
    icon: BarChart3,
    accent: "blue" as const,
  },
  {
    title: "Interactive Hotspots",
    subtitle: "Identify high-risk areas with intelligent heatmaps.",
    href: "/crime-hotspots",
    icon: MapPin,
    accent: "teal" as const,
  },
  {
    title: "Investigation Workspace",
    subtitle: "Manage cases, evidence, and investigations seamlessly.",
    href: "/dashboard",
    icon: Network,
    accent: "purple" as const,
  },
  {
    title: "Evidence & Leads",
    subtitle: "Access verified evidence, leads, and contradictions instantly.",
    href: "/dashboard",
    icon: Fingerprint,
    accent: "pink" as const,
  },
  {
    title: "Real-time Alerts",
    subtitle: "Get notified about critical incidents and urgent actions.",
    href: "/dashboard",
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
// "Investigation Workspace" / "Evidence & Leads" / "Real-time Alerts" don't
// have standalone pages yet (same "Soon" state as their sidebar entries) -
// their real, live counterparts today are widgets on /dashboard (Featured
// Investigation, Verified Evidence Feed, Alerts & Leads), so that's where
// these cards link rather than to a page that doesn't exist.
// -----------------------------------------------------------------------------
export default function FeatureGrid() {
  return (
    <section className="mx-auto max-w-[1400px] px-6 py-16">
      <h2 className="text-center text-2xl font-semibold text-ink">Everything You Need. All in One Place.</h2>

      <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
        {FEATURES.map((f) => (
          <Link
            key={f.title}
            href={f.href}
            className="group rounded-xl border border-line bg-surface p-5 shadow-sm transition hover:border-navy hover:shadow-md"
          >
            <span className={`flex h-11 w-11 items-center justify-center rounded-lg ${CHIP[f.accent]}`}>
              <f.icon size={20} aria-hidden="true" />
            </span>
            <p className="mt-4 text-[15px] font-semibold text-ink">{f.title}</p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{f.subtitle}</p>
            <span className="mt-3 inline-flex items-center gap-1 text-[13px] font-semibold text-navy">
              Explore
              <ArrowRight size={13} className="transition group-hover:translate-x-0.5" aria-hidden="true" />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
