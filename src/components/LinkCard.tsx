import Link from "next/link";

// Box-template link used on the dashboard and list pages.
export default function LinkCard({
  href,
  title,
  subtitle,
}: {
  href: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <Link
      href={href}
      className="group block rounded-xl border border-slate-700 bg-slate-800/60 p-6 transition hover:border-indigo-500 hover:bg-slate-800"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-100 group-hover:text-indigo-300">
          {title}
        </h3>
        <span className="text-slate-500 group-hover:text-indigo-300">→</span>
      </div>
      {subtitle && <p className="mt-2 text-sm text-slate-400">{subtitle}</p>}
    </Link>
  );
}
