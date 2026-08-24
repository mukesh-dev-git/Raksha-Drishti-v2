import { Siren } from "lucide-react";

const BADGES = [
  { value: "24×7", label: "Support" },
  { value: "Statewide", label: "Coverage" },
  { value: "Real-time", label: "Intelligence" },
];

// -----------------------------------------------------------------------------
// Mission statement strip. The reference design's badges include "100% Data
// Security" - a specific, testable security claim this app can't actually
// back (Slate's X-Frame-Options is one real header, not a security audit),
// so it's dropped rather than asserted; the other three are qualitative
// mission language, not measured statistics.
// -----------------------------------------------------------------------------
export default function MissionStrip() {
  return (
    <section className="mx-auto max-w-[1400px] px-6 pb-16">
      <div className="flex flex-col gap-6 rounded-2xl bg-navy px-8 py-8 text-white sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10">
            <Siren size={20} aria-hidden="true" />
          </span>
          <div>
            <p className="text-[15px] font-semibold text-white">Our Mission</p>
            <p className="mt-1 max-w-md text-sm text-white/70">
              To leverage technology and data-driven insights to empower police personnel and ensure a safer
              Karnataka for everyone.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-8">
          {BADGES.map((b) => (
            <div key={b.label} className="text-center">
              <p className="text-lg font-bold text-white">{b.value}</p>
              <p className="text-xs text-white/60">{b.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
