/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "bg-primary":  "var(--bg-primary)",
        "bg-surface":  "var(--bg-surface)",
        "bg-card":     "var(--bg-card)",
        "border-c":    "var(--border)",
        accent:        "var(--accent)",
        warning:       "var(--warning)",
        danger:        "var(--danger)",
        "text-primary":"var(--text-primary)",
        "text-muted":  "var(--text-muted)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains)", "JetBrains Mono", "Fira Code", "monospace"],
      },
      animation: {
        "pulse-dot": "pulse-dot 1.5s ease-in-out infinite",
        shimmer:     "shimmer 1.6s infinite",
        "fade-in":   "fadeIn 0.25s ease-out forwards",
      },
      keyframes: {
        "pulse-dot": {
          "0%, 100%": { opacity: "1" },
          "50%":      { opacity: "0.4" },
        },
        shimmer: {
          "0%":   { "background-position": "-200% 0" },
          "100%": { "background-position": "200% 0" },
        },
        fadeIn: {
          from: { opacity: "0", transform: "translateY(6px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
