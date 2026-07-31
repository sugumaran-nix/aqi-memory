/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    // Include Tremor source so JIT doesn't purge its dynamic classes
    "./node_modules/@tremor/react/dist/**/*.{js,cjs}",
  ],
  safelist: [
    // Tremor color classes — must not be purged (generated dynamically at runtime)
    {
      pattern:
        /^(bg|text|border|ring|from|to|fill|stroke|shadow)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(50|100|200|300|400|500|600|700|800|900|950)$/,
    },
    // Tremor opacity variants
    { pattern: /^bg-opacity-(10|20|30|40|50|60|70|80|90)$/ },
    // Tremor semantic tokens
    "bg-tremor-brand",
    "bg-tremor-brand-muted",
    "bg-tremor-brand-subtle",
    "bg-tremor-brand-emphasis",
    "text-tremor-brand",
    "text-tremor-brand-muted",
    "text-tremor-content",
    "text-tremor-content-subtle",
    "text-tremor-content-emphasis",
    "border-tremor-brand",
    "ring-tremor-brand",
    // BadgeDelta variants
    "bg-emerald-100","text-emerald-800",
    "bg-red-100","text-red-800",
    "bg-yellow-100","text-yellow-800",
    "bg-blue-100","text-blue-800",
    "bg-gray-100","text-gray-800",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains)", "JetBrains Mono", "monospace"],
      },
      colors: {
        accent:  "var(--accent)",
        border:  "var(--border)",
        surface: "var(--bg-surface)",
      },
      keyframes: {
        /* Magic UI — shimmer button sweep */
        "shimmer-sweep": {
          "0%":   { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(200%)" },
        },
        /* Magic UI — shimmer slide on old ShimmerButton (kept for reference) */
        "shimmer-slide": {
          to: { transform: "translate(calc(100cqw - 100%), 0)" },
        },
        /* Magic UI — border beam rotation (conic-gradient spin) */
        "beam-spin": {
          "0%":   { "--beam-angle": "0deg" },
          "100%": { "--beam-angle": "360deg" },
        },
        /* Magic UI — border beam rotation (legacy offset-distance — kept for reference but unused) */
        "border-beam": {
          "100%": { "offset-distance": "100%" },
        },
        /* Magic UI — gradient text animation */
        gradient: {
          to: { "background-position": "200% center" },
        },
        /* Magic UI — marquee horizontal */
        marquee: {
          from: { transform: "translateX(0)" },
          to:   { transform: "translateX(calc(-100% - var(--gap)))" },
        },
        /* Magic UI — marquee vertical */
        "marquee-vertical": {
          from: { transform: "translateY(0)" },
          to:   { transform: "translateY(calc(-100% - var(--gap)))" },
        },
        /* App — fade in up */
        fadeIn: {
          from: { opacity: "0", transform: "translateY(8px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        /* App — shimmer skeleton */
        shimmer: {
          "0%":   { "background-position": "-200% 0" },
          "100%": { "background-position":  "200% 0" },
        },
        /* App — pulse dot */
        pulseDot: {
          "0%, 100%": { opacity: "1", "box-shadow": "0 0 0 0 rgba(0,229,160,0.4)" },
          "50%":      { opacity: "0.6", "box-shadow": "0 0 0 6px rgba(0,229,160,0)" },
        },
      },
      animation: {
        "shimmer-slide": "shimmer-slide var(--speed) ease-in-out infinite alternate",
        "beam-spin":     "beam-spin var(--duration, 12s) linear infinite",
        "border-beam":   "border-beam calc(var(--duration)*1s) infinite linear",
        gradient:        "gradient 3s linear infinite",
        marquee:         "marquee var(--duration) infinite linear",
        "marquee-vertical": "marquee-vertical var(--duration) linear infinite",
        "fade-in":       "fadeIn 0.3s ease-out forwards",
        shimmer:         "shimmer 1.8s ease-in-out infinite",
        "pulse-dot":     "pulseDot 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
