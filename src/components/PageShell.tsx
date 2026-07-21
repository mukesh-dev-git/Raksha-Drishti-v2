import { ReactNode } from "react";
import Breadcrumb, { type Crumb } from "@/components/ui/Breadcrumb";

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
      <Breadcrumb items={breadcrumbs} />

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
