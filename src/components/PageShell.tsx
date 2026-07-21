import Link from "next/link";
import { ReactNode } from "react";
import { ChevronRight, Home } from "lucide-react";

type Crumb = { label: string; href: string };

// -----------------------------------------------------------------------------
// PageShell — standard page scaffold: breadcrumb + page-title band + content.
// Grid-based, generous whitespace, predictable hierarchy on every screen.
// (The site header/footer are provided globally by the root layout.)
// -----------------------------------------------------------------------------
export default function PageShell({
  title,
  description,
  breadcrumbs = [],
  actions,
  children,
}: {
  title: string;
  description?: string;
  breadcrumbs?: Crumb[];
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <main className="mx-auto w-full max-w-content px-4 pb-16">
      {/* Breadcrumb */}
      <nav
        aria-label="Breadcrumb"
        className="flex flex-wrap items-center gap-1.5 py-4 text-sm text-muted"
      >
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 hover:text-navy hover:underline"
        >
          <Home size={14} aria-hidden="true" /> Home
        </Link>
        {breadcrumbs.map((c, i) => {
          const last = i === breadcrumbs.length - 1;
          return (
            <span key={c.href} className="flex items-center gap-1.5">
              <ChevronRight size={14} aria-hidden="true" className="text-line-strong" />
              {last ? (
                <span className="font-medium text-ink" aria-current="page">
                  {c.label}
                </span>
              ) : (
                <Link href={c.href} className="hover:text-navy hover:underline">
                  {c.label}
                </Link>
              )}
            </span>
          );
        })}
      </nav>

      {/* Title band */}
      <div className="flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-navy sm:text-3xl">{title}</h1>
          {description && (
            <p className="mt-2 max-w-2xl text-muted">{description}</p>
          )}
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>

      <div className="mt-8">{children}</div>
    </main>
  );
}
