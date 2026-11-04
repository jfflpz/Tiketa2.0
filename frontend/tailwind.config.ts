import type { Config } from 'tailwindcss';

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#F7F8FA",
        surface: "#FFFFFF",
        line: {
          DEFAULT: "#ECEEF2",
          dark: "#DCDFE5",
          subtle: "#F3F4F6",
        },
        ink: {
          DEFAULT: "#111827",
          muted: "#374151",
          subtle: "#6B7280",
          faint: "#9CA3AF",
        },
        brand: {
          DEFAULT: "#13784F",
          hover: "#0F6B47",
          tint: "#E8F5EE",
          dark: "#18181B",
        },
        peach: {
          DEFAULT: "#FDDCC7",
          text: "#7C2D12",
        },
        lav: {
          DEFAULT: "#E7E9FB",
          text: "#1E3A8A",
        },
        mint: {
          DEFAULT: "#C9F5DC",
          text: "#065F46",
        },
        fivestar: {
          red: '#DC2626',
          darkRed: '#991B1B',
          yellow: '#FBBF24',
          navy: '#1E293B',
          slate: '#0F172A'
        }
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["'JetBrains Mono'", "ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
      },
      borderRadius: {
        xl: "14px",
        "2xl": "18px",
        "3xl": "24px",
      },
      boxShadow: {
        card: "0 1px 3px 0 rgba(0, 0, 0, 0.03), 0 1px 2px -1px rgba(0, 0, 0, 0.03)",
        subtle: "0 4px 20px -2px rgba(0, 0, 0, 0.04)",
      },
    },
  },
  plugins: [],
} satisfies Config;