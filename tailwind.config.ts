import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Semantic tokens — resolve to CSS vars so high-contrast mode works.
        paper: "var(--paper)",
        surface: "var(--surface)",
        "surface-2": "var(--surface-2)",
        line: "var(--line)",
        "line-strong": "var(--line-strong)",
        ink: "var(--ink)",
        muted: "var(--muted)",
        navy: {
          DEFAULT: "var(--navy)",
          hover: "var(--navy-hover)",
          ink: "var(--navy-ink)",
        },
        saffron: "var(--saffron)",
        green: "var(--green)",
        success: { DEFAULT: "var(--success)", bg: "var(--success-bg)" },
        warning: { DEFAULT: "var(--warning)", bg: "var(--warning-bg)" },
        danger: { DEFAULT: "var(--danger)", bg: "var(--danger-bg)" },
        focus: "var(--focus)",
        // Dashboard-only accent chips - see globals.css for the "why".
        "dash-blue": { DEFAULT: "var(--dash-blue)", bg: "var(--dash-blue-bg)" },
        "dash-purple": { DEFAULT: "var(--dash-purple)", bg: "var(--dash-purple-bg)" },
        "dash-orange": { DEFAULT: "var(--dash-orange)", bg: "var(--dash-orange-bg)" },
        "dash-teal": { DEFAULT: "var(--dash-teal)", bg: "var(--dash-teal-bg)" },
        "dash-pink": { DEFAULT: "var(--dash-pink)", bg: "var(--dash-pink-bg)" },
        "dash-sidebar": {
          DEFAULT: "var(--dash-sidebar)",
          hover: "var(--dash-sidebar-hover)",
          active: "var(--dash-sidebar-active)",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "var(--radius)",
        sm: "var(--radius-sm)",
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
      },
      maxWidth: {
        // Full-bleed content width. `mx-auto` becomes a no-op; the horizontal
        // px-* padding on each container keeps content off the viewport edges.
        content: "100%",
      },
    },
  },
  plugins: [],
};

export default config;
