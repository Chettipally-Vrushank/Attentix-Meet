import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base:    "var(--bg-base)",
        surface: "var(--bg-surface)",
        raised:  "var(--bg-raised)",
        accent:  "var(--accent)",
        danger:  "var(--danger)",
        success: "var(--success)",
        warn:    "var(--warn)",
      },
      fontFamily: {
        sans: ["DM Sans", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
