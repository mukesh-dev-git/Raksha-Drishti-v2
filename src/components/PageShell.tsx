import { ReactNode } from "react";
import Breadcrumb, { type Crumb } from "@/components/ui/Breadcrumb";
import { BASE_PATH } from "@/lib/basePath";

// -----------------------------------------------------------------------------
// PageShell — standard page scaffold: breadcrumb + page-title band + content.
// Grid-based, generous whitespace, predictable hierarchy on every screen.
// (The site header/footer are provided globally by the root layout.)
//
// heroImageSrc (added 2026-08-30, on request) - an optional top-right
// illustration for the title band, path relative to public/ (e.g.
// "/page-hero/socio-economic.png"; the component prefixes BASE_PATH). Plain
// <img>, not next/image, same reasoning as OffenderAvatar.tsx: these are
// externally-generated files dropped into public/ with no dimensions known
// ahead of build time. onError hides the element rather than showing a
// broken-image icon, so a page can pass a src before the file exists on
// disk without ever surfacing a broken image to a user - important here
// because the file for a given page may land after the code that
// references it does.
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
          {heroImageSrc && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`${BASE_PATH}${heroImageSrc}`}
              alt={heroImageAlt ?? ""}
              className="hidden h-[104px] w-auto shrink-0 select-none md:block"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          )}
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>

      <div className="mt-8">{children}</div>
    </main>
  );
}
