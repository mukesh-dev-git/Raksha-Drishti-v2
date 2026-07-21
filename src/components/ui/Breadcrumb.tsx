import Link from "next/link";
import { ReactNode } from "react";
import { ChevronRight, Home, ArrowLeft } from "lucide-react";

export type Crumb = { label: string; href: string };

// -----------------------------------------------------------------------------
// Breadcrumb — the single, consistent trail used across every page. Starts with
// a Home icon (links to the dashboard). An optional back-navigation icon sits
// before Home for pages that have a natural "up one level" destination.
// -----------------------------------------------------------------------------
export default function Breadcrumb({
  items,
  backHref,
  backLabel = "Go back",
  actions,
}: {
  items: Crumb[];
  backHref?: string;
  backLabel?: string;
  actions?: ReactNode;
}) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="flex flex-wrap items-center gap-1.5 py-4 text-sm text-muted"
    >
      {backHref && (
        <Link
          href={backHref}
          aria-label={backLabel}
          className="mr-1 inline-flex h-6 w-6 items-center justify-center rounded-sm border border-line text-muted transition hover:border-navy hover:text-navy"
        >
          <ArrowLeft size={14} aria-hidden="true" />
        </Link>
      )}

      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1 hover:text-navy hover:underline"
      >
        <Home size={14} aria-hidden="true" /> Home
      </Link>

      {items.map((c, i) => {
        const last = i === items.length - 1;
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

      {actions && <span className="ml-2">{actions}</span>}
    </nav>
  );
}
