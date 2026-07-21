import Link from "next/link";
import { ReactNode } from "react";
import { ArrowRight } from "lucide-react";

// -----------------------------------------------------------------------------
// LinkCard — official, solid card with a soft shadow (not glassy/trendy).
// Barely-rounded corners, clear focus state, whole card is the click target.
// -----------------------------------------------------------------------------
export default function LinkCard({
  href,
  title,
  subtitle,
  icon,
  meta,
}: {
  href: string;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  meta?: string;
}) {
  return (
    <Link
      href={href}
      className="group flex h-full flex-col rounded border border-line bg-surface p-5 shadow-sm hover:border-navy hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {icon && (
            <span
              className="flex h-10 w-10 items-center justify-center rounded-sm bg-navy/10 text-navy"
              aria-hidden="true"
            >
              {icon}
            </span>
          )}
          <h3 className="text-base font-semibold text-navy">{title}</h3>
        </div>
        <ArrowRight
          size={18}
          aria-hidden="true"
          className="mt-1 shrink-0 text-line-strong group-hover:text-navy"
        />
      </div>
      {subtitle && <p className="mt-3 text-sm text-muted">{subtitle}</p>}
      {meta && (
        <p className="mt-auto pt-4 text-sm font-medium text-ink">{meta}</p>
      )}
    </Link>
  );
}
