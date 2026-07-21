import clsx from "clsx";

// A card that looks pinned to the board. Two surfaces:
//  - "dark"  : official white panel (data / analysis) — light theme
//  - "paper" : warm document paper (evidence, notes, files)
// A push-pin sits at the top; the whole board reads as neatly pinned
// documents rather than a scattered corkboard.
export default function PinnedCard({
  variant = "dark",
  pin = "#38bdf8",
  className,
  children,
  interactive = false,
  active = false,
}: {
  variant?: "dark" | "paper";
  pin?: string;
  className?: string;
  children: React.ReactNode;
  interactive?: boolean;
  active?: boolean;
}) {
  return (
    <div
      className={clsx(
        "relative rounded border shadow-md transition",
        variant === "paper"
          ? "border-stone-300/70 bg-[#f4efe1] text-stone-800"
          : "border-line bg-surface text-ink",
        interactive &&
          (variant === "paper"
            ? "hover:-translate-y-0.5 hover:border-stone-400/70"
            : "hover:-translate-y-0.5 hover:border-navy"),
        active && (variant === "paper" ? "ring-2 ring-navy/50" : "border-navy ring-1 ring-navy/40"),
        className
      )}
    >
      {/* push-pin */}
      <span
        className="pointer-events-none absolute -top-2 left-1/2 z-10 h-4 w-4 -translate-x-1/2 rounded-full"
        style={{
          background: `radial-gradient(circle at 35% 30%, #ffffff 0%, ${pin} 45%, rgba(0,0,0,0.55) 100%)`,
          boxShadow: `0 2px 5px rgba(0,0,0,0.5), 0 0 10px ${pin}66`,
        }}
      />
      {children}
    </div>
  );
}
