"use client";

import { useEffect, useState } from "react";

// -----------------------------------------------------------------------------
// Accessibility controls — font-size stepper (A / A+ / A++) and a high-contrast
// toggle. Standard, always-visible government-portal controls. Preferences are
// applied to <html> via data-attributes and persisted in localStorage.
// Click-first (no hover dependency), each control has a clear focus state.
// -----------------------------------------------------------------------------

type FontSize = "normal" | "large" | "xlarge";

const FONT_STEPS: { value: FontSize; label: string; aria: string }[] = [
  { value: "normal", label: "A", aria: "Normal text size" },
  { value: "large", label: "A+", aria: "Large text size" },
  { value: "xlarge", label: "A++", aria: "Extra large text size" },
];

// "dark" (default) is the original styling for the navy utility bar in
// SiteHeader. "light" is for use on a light surface (e.g. the /dashboard
// top bar, which has its own shell without SiteHeader - see
// DashboardTopbar.tsx) - same behaviour, just readable on white.
export default function AccessibilityControls({ variant = "dark" }: { variant?: "dark" | "light" }) {
  const [fontSize, setFontSize] = useState<FontSize>("normal");
  const [highContrast, setHighContrast] = useState(false);

  // Load saved preferences on mount.
  useEffect(() => {
    const savedFont = (localStorage.getItem("rd-font-size") as FontSize) || "normal";
    const savedContrast = localStorage.getItem("rd-contrast") === "high";
    setFontSize(savedFont);
    setHighContrast(savedContrast);
  }, []);

  // Reflect to <html> + persist.
  useEffect(() => {
    document.documentElement.setAttribute("data-font-size", fontSize);
    localStorage.setItem("rd-font-size", fontSize);
  }, [fontSize]);

  useEffect(() => {
    document.documentElement.setAttribute(
      "data-contrast",
      highContrast ? "high" : "normal"
    );
    localStorage.setItem("rd-contrast", highContrast ? "high" : "normal");
  }, [highContrast]);

  const light = variant === "light";
  return (
    <div className={`flex items-center gap-4 text-xs ${light ? "text-ink" : "text-white/90"}`}>
      <div className="flex items-center gap-1.5">
        <span className="hidden sm:inline">Text size:</span>
        <div
          className={`flex overflow-hidden rounded-sm border ${light ? "border-line" : "border-white/30"}`}
          role="group"
          aria-label="Text size"
        >
          {FONT_STEPS.map((step) => (
            <button
              key={step.value}
              type="button"
              onClick={() => setFontSize(step.value)}
              aria-pressed={fontSize === step.value}
              aria-label={step.aria}
              className={`px-2 py-1 leading-none transition-colors ${
                fontSize === step.value
                  ? light
                    ? "bg-navy text-white font-semibold"
                    : "bg-white text-navy font-semibold"
                  : light
                    ? "bg-transparent text-ink hover:bg-surface-2"
                    : "bg-transparent text-white hover:bg-white/15"
              }`}
            >
              {step.label}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={() => setHighContrast((v) => !v)}
        aria-pressed={highContrast}
        className={`flex items-center gap-1.5 rounded-sm border px-2 py-1 ${
          light ? "border-line hover:bg-surface-2" : "border-white/30 hover:bg-white/15"
        }`}
      >
        <span
          aria-hidden="true"
          className={`inline-block h-3 w-3 rounded-full border bg-[conic-gradient(#fff_0_50%,#000_50%_100%)] ${
            light ? "border-ink" : "border-white"
          }`}
        />
        High contrast: {highContrast ? "On" : "Off"}
      </button>
    </div>
  );
}
