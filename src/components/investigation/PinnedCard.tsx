import clsx from "clsx";

// A card that looks pinned to the board. Two surfaces:
//  - "dark"  : frosted glass panel (data / analysis)
//  - "paper" : warm document paper (evidence, notes, files)
// A metallic push-pin sits at the top; the whole board reads as neatly
// pinned documents rather than a scattered corkboard.
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
        "relative rounded-2xl border shadow-[0_18px_40px_-24px_rgba(0,0,0,0.85)] transition",
        variant === "paper"
          ? "border-stone-300/50 bg-[#f4efe1] text-stone-800"
          : "border-white/10 bg-slate-900/70 text-slate-100 backdrop-blur-xl",
        interactive &&
          (variant === "paper"
            ? "hover:-translate-y-0.5 hover:border-stone-400/70 hover:shadow-[0_24px_48px_-24px_rgba(0,0,0,0.9)]"
            : "hover:-translate-y-0.5 hover:border-white/25"),
        active && (variant === "paper" ? "ring-2 ring-sky-400/70" : "border-sky-400/60 ring-1 ring-sky-400/40"),
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
