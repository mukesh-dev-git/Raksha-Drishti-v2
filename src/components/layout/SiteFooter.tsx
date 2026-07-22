import Link from "next/link";

// -----------------------------------------------------------------------------
// Site footer — Government-of-India initiative strip (logos + tagline), an
// Indian-monuments skyline silhouette band, then the dark footer columns over
// a subtly darkened photographic backdrop.
// -----------------------------------------------------------------------------

const LINKS = [
  { href: "/dashboard", label: "Home" },
  { href: "/crime-count", label: "Crime Count" },
  { href: "/crime-hotspots", label: "Crime Hotspots" },
  { href: "/cases", label: "Cases" },
];

const FOOTER_BG =
  "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&w=1920&q=60";

// Indian monuments skyline band (Red Fort, Qutub Minar, India Gate, Taj Mahal,
// Parliament, temple gopurams …) — full-bleed image strip above the dark footer.
function SkylineBand() {
  return (
    <img
      src="/india-skyline.jpeg"
      alt=""
      aria-hidden="true"
      className="block w-full select-none"
    />
  );
}

export default function SiteFooter() {
  return (
    <footer className="mt-16">
      {/* Monuments skyline silhouette */}
      <SkylineBand />

      {/* Dark footer columns over a darkened photographic backdrop */}
      <div className="relative border-t-4 border-navy">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${FOOTER_BG})` }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{ backgroundColor: "rgba(9,22,44,0.93)" }}
        />

        <div className="relative mx-auto grid max-w-content gap-8 px-4 py-10 text-white sm:grid-cols-3">
          <div>
            <h2 className="text-sm font-semibold text-white">Raksha-Drishti</h2>
            <p className="mt-2 text-sm text-white/70">
              State Police Department crime analytics and investigation portal.
              A public safety utility of the State Government.
            </p>
          </div>

          <nav aria-label="Footer">
            <h2 className="text-sm font-semibold text-white">Quick links</h2>
            <ul className="mt-2 space-y-1.5 text-sm">
              {LINKS.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-white/80 hover:text-white hover:underline">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h2 className="text-sm font-semibold text-white">In an emergency</h2>
            <p className="mt-2 text-sm text-white/70">
              Dial{" "}
              <a href="tel:112" className="font-semibold text-white hover:underline">
                112
              </a>{" "}
              for immediate assistance. Police{" "}
              <a href="tel:100" className="font-semibold text-white hover:underline">
                100
              </a>
              .
            </p>
          </div>
        </div>

        <div className="relative border-t border-white/15">
          <div className="mx-auto flex max-w-content flex-col gap-1 px-4 py-4 text-xs text-white/60 sm:flex-row sm:justify-between">
            <p>© {new Date().getFullYear()} State Police Department. All rights reserved.</p>
            <p>
              Accessibility · Privacy Policy · Terms of Use ·{" "}
              <span>Last updated 21 Jul 2026</span>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
