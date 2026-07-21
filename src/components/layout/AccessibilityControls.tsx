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

export default function AccessibilityControls() {
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

  return (
    <div className="flex items-center gap-4 text-xs text-white/90">
      <div className="flex items-center gap-1.5">
        <span className="hidden sm:inline">Text size:</span>
        <div
          className="flex overflow-hidden rounded-sm border border-white/30"
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
                  ? "bg-white text-navy font-semibold"
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
        className="flex items-center gap-1.5 rounded-sm border border-white/30 px-2 py-1 hover:bg-white/15"
      >
        <span
          aria-hidden="true"
          className="inline-block h-3 w-3 rounded-full border border-white bg-[conic-gradient(#fff_0_50%,#000_50%_100%)]"
        />
        High contrast: {highContrast ? "On" : "Off"}
      </button>
    </div>
  );
}
