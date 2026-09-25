import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "rgb(var(--bg) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        "surface-alt": "rgb(var(--surface-alt) / <alpha-value>)",
        border: "rgb(var(--border) / <alpha-value>)",
        primary: {
          DEFAULT: "rgb(var(--accent) / <alpha-value>)",
          hover: "rgb(var(--accent-hover) / <alpha-value>)",
          light: "rgb(var(--accent-soft) / <alpha-value>)",
          dark: "rgb(var(--text-primary) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "rgb(var(--accent) / <alpha-value>)",
          hover: "rgb(var(--accent-hover) / <alpha-value>)",
        },
        "on-accent": "rgb(var(--on-accent) / <alpha-value>)",
        "text-secondary": "rgb(var(--text-secondary) / <alpha-value>)",
        status: {
          ok: "rgb(var(--status-ok) / <alpha-value>)",
          warning: "rgb(var(--status-warning) / <alpha-value>)",
          outdated: "rgb(var(--status-outdated) / <alpha-value>)",
        },
        // Admin chart bar fills only (CLAUDE.md §6, §15).
        chart: {
          green: "rgb(var(--chart-green) / <alpha-value>)",
          blue: "rgb(var(--chart-blue) / <alpha-value>)",
          track: "rgb(var(--chart-track) / <alpha-value>)",
        },
      },
      fontFamily: {
        sans: [
          "var(--font-inter)",
          "Inter",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      boxShadow: {
        soft: "var(--shadow-elevated)",
        softer: "0 1px 2px 0 rgba(46, 92, 138, 0.06), 0 1px 3px 0 rgba(46, 92, 138, 0.06)",
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.25rem",
      },
    },
  },
  plugins: [],
};
export default config;
