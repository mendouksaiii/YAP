import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-geist)", "system-ui"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
      colors: {
        bg: "#0a0a0b",
        panel: "#131316",
        "panel-2": "#1a1a1f",
        border: "#26262d",
        muted: "#8b8b94",
        accent: "#ff5e3a",
        "accent-2": "#ff8a3a",
      },
      animation: {
        "pulse-ring": "pulse-ring 1.4s ease-out infinite",
        bar: "bar 0.8s ease-in-out infinite",
        blink: "blink 1.4s ease-in-out infinite",
      },
      keyframes: {
        "pulse-ring": {
          "0%": { transform: "scale(0.95)", opacity: "1" },
          "100%": { transform: "scale(1.4)", opacity: "0" },
        },
        bar: {
          "0%, 100%": { transform: "scaleY(0.4)" },
          "50%": { transform: "scaleY(1)" },
        },
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.3" },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
