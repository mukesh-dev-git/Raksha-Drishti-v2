import { ReactNode } from "react";

// A dashed box that tells teammates what feature goes here.
export default function Placeholder({
  label,
  children,
}: {
  label: string;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-slate-600 bg-slate-800/40 p-6">
      <p className="text-xs font-semibold uppercase tracking-wide text-amber-400">
        TODO: teammate — add feature here
      </p>
      <p className="mt-2 font-medium text-slate-200">{label}</p>
      {children && <div className="mt-3 text-sm text-slate-400">{children}</div>}
    </div>
  );
}
