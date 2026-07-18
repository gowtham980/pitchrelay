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
        stadium: {
          bg: "#0B1220",
          panel: "#111827",
          border: "#1F2937",
          muted: "#9CA3AF",
          text: "#E5E7EB",
          green: "#22C55E",
          "green-dim": "#15803D",
          amber: "#F59E0B",
          red: "#EF4444",
          blue: "#38BDF8",
          purple: "#A78BFA",
        },
      },
      fontFamily: {
        sans: [
          "var(--font-geist-sans)",
          "Inter",
          "system-ui",
          "-apple-system",
          "sans-serif",
        ],
      },
      boxShadow: {
        card: "0 4px 24px rgba(0,0,0,0.35)",
      },
    },
  },
  plugins: [],
};

export default config;
