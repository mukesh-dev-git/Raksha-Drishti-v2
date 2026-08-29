import { ReactNode } from "react";
import Breadcrumb, { type Crumb } from "@/components/ui/Breadcrumb";
import HeroImage from "@/components/ui/HeroImage";

// -----------------------------------------------------------------------------
// PageShell — standard page scaffold: breadcrumb + page-title band + content.
// Grid-based, generous whitespace, predictable hierarchy on every screen.
// (The site header/footer are provided globally by the root layout.)
//
// heroImageSrc (added 2026-08-30, on request) - an optional top-right
// illustration for the title band, path relative to public/ (e.g.
// "/page-hero/socio-economic.png"). Rendered via HeroImage.tsx, a Client
// Component - it needs an onError handler (hide the element rather than
// show a broken-image icon, since the file for a given page can land after
// the code that references it), and PageShell itself is a Server Component,
// which cannot pass an event handler into its own JSX. All 8 pages now wire
// this in (public/page-hero/README.md has the asset spec).
// -----------------------------------------------------------------------------
export default function PageShell({
  title,
  description,
  breadcrumbs = [],
  actions,
  heroImageSrc,
  heroImageAlt,
  children,
}: {
  title: string;
  description?: string;
  breadcrumbs?: Crumb[];
  actions?: ReactNode;
  heroImageSrc?: string;
  heroImageAlt?: string;
  children?: ReactNode;
}) {
  return (
    <main className="mx-auto w-full max-w-content px-4 pb-16">
      {/* Breadcrumb */}
      <Breadcrumb items={breadcrumbs} />

      {/* Title band */}
      <div className="flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-1 flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-navy sm:text-3xl">{title}</h1>
            {description && (
              <p className="mt-2 max-w-2xl text-muted">{description}</p>
            )}
          </div>
          {heroImageSrc && <HeroImage src={heroImageSrc} alt={heroImageAlt ?? ""} />}
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>

      <div className="mt-8">{children}</div>
    </main>
  );
}
