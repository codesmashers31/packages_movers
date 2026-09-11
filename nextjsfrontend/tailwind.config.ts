import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
      },
      colors: {
        brand: {
          primary: "#2563EB",
          secondary: "#0EA5E9",
          accent: "#14B8A6",
          slate: "#1E293B",
        },
        surface: {
          canvas: "#EEF2F6",
          card: "#EEF2F6",
          border: "#D9E2EC",
          muted: "#64748B",
          text: "#1E293B",
        },
      },
      boxShadow: {
        'neu-flat': '6px 6px 14px rgba(163, 177, 198, 0.45), -6px -6px 14px #FFFFFF',
        'neu-flat-sm': '3px 3px 8px rgba(163, 177, 198, 0.4), -3px -3px 8px #FFFFFF',
        'neu-raised': '6px 6px 14px rgba(163, 177, 198, 0.5), -6px -6px 14px #FFFFFF',
        'neu-raised-sm': '3px 3px 7px rgba(163, 177, 198, 0.45), -3px -3px 7px #FFFFFF',
        'neu-inset': 'inset 3px 3px 6px rgba(163, 177, 198, 0.45), inset -3px -3px 6px #FFFFFF',
        'neu-inset-sm': 'inset 2px 2px 4px rgba(163, 177, 198, 0.4), inset -2px -2px 4px #FFFFFF',
        'neu-pressed': 'inset 2px 2px 5px rgba(163, 177, 198, 0.6), inset -2px -2px 5px #FFFFFF',
        'neu-primary': '4px 4px 10px rgba(37, 99, 235, 0.35), -3px -3px 8px #FFFFFF',
        'neu-secondary': '4px 4px 10px rgba(14, 165, 233, 0.35), -3px -3px 8px #FFFFFF',
        'neu-teal': '4px 4px 10px rgba(20, 184, 166, 0.35), -3px -3px 8px #FFFFFF',
      },
    },
  },
  plugins: [],
};

export default config;
