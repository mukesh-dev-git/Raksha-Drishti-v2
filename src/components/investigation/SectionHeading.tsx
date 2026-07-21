import type { LucideIcon } from "lucide-react";

// A consistent, prominent section header for each board area.
// Sans-serif (Inter) title + optional subtitle, with an accent icon chip.
export default function SectionHeading({
  icon: Icon,
  title,
  subtitle,
  accent = "#38bdf8",
  right,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  accent?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="flex items-center gap-3.5">
        <span
          className="flex h-12 w-12 items-center justify-center rounded-2xl border"
          style={{ borderColor: `${accent}55`, backgroundColor: `${accent}14` }}
        >
          <Icon size={22} style={{ color: accent }} />
        </span>
        <div>
          <h2 className="text-[26px] font-semibold leading-tight text-navy">{title}</h2>
          {subtitle && <p className="mt-0.5 text-[15px] text-muted">{subtitle}</p>}
        </div>
      </div>
      {right}
    </div>
  );
}
