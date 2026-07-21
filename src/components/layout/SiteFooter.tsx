import Link from "next/link";

// -----------------------------------------------------------------------------
// Site footer — official, restrained. Quick links, helpline reminder, and
// statutory-style small print. No decorative flourish.
// -----------------------------------------------------------------------------

const LINKS = [
  { href: "/dashboard", label: "Home" },
  { href: "/crime-count", label: "Crime Count" },
  { href: "/crime-hotspots", label: "Crime Hotspots" },
  { href: "/cases", label: "Cases" },
];

export default function SiteFooter() {
  return (
    <footer className="mt-16 border-t-4 border-navy bg-surface">
      <div className="mx-auto grid max-w-content gap-8 px-4 py-10 sm:grid-cols-3">
        <div>
          <h2 className="text-sm font-semibold text-navy">Raksha-Drishti</h2>
          <p className="mt-2 text-sm text-muted">
            State Police Department crime analytics and investigation portal.
            A public safety utility of the State Government.
          </p>
        </div>

        <nav aria-label="Footer">
          <h2 className="text-sm font-semibold text-navy">Quick links</h2>
          <ul className="mt-2 space-y-1.5 text-sm">
            {LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="text-ink hover:underline">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className="text-sm font-semibold text-navy">In an emergency</h2>
          <p className="mt-2 text-sm text-muted">
            Dial{" "}
            <a href="tel:112" className="font-semibold text-navy hover:underline">
              112
            </a>{" "}
            for immediate assistance. Police{" "}
            <a href="tel:100" className="font-semibold text-navy hover:underline">
              100
            </a>
            .
          </p>
        </div>
      </div>

      <div className="border-t border-line">
        <div className="mx-auto flex max-w-content flex-col gap-1 px-4 py-4 text-xs text-muted sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} State Police Department. All rights reserved.</p>
          <p>
            Accessibility · Privacy Policy · Terms of Use ·{" "}
            <span className="text-muted">Last updated 21 Jul 2026</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
