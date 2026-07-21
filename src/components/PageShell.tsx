import Link from "next/link";
import { ReactNode } from "react";

type Crumb = { label: string; href: string };

// Reusable page wrapper: breadcrumb + title + description + content area.
export default function PageShell({
  title,
  description,
  breadcrumbs = [],
  children,
}: {
  title: string;
  description: string;
  breadcrumbs?: Crumb[];
  children?: ReactNode;
}) {
  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-10">
      {/* Breadcrumb trail — makes the flow easy to navigate/test */}
      <nav className="mb-6 flex flex-wrap items-center gap-2 text-sm text-slate-400">
        <Link href="/dashboard" className="hover:text-slate-200">
          Dashboard
        </Link>
        {breadcrumbs.map((c) => (
          <span key={c.href} className="flex items-center gap-2">
            <span>/</span>
            <Link href={c.href} className="hover:text-slate-200">
              {c.label}
            </Link>
          </span>
        ))}
      </nav>

      <h1 className="text-3xl font-bold text-slate-100">{title}</h1>
      <p className="mt-2 max-w-2xl text-slate-400">{description}</p>

      <div className="mt-8">{children}</div>
    </main>
  );
}
