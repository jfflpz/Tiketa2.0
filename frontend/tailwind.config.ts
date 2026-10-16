import type { Config } from 'tailwindcss';

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        fivestar: {
          red: '#DC2626',
          darkRed: '#991B1B',
          yellow: '#FBBF24',
          navy: '#1E293B',
          slate: '#0F172A'
        }
      }
    },
  },
  plugins: [],
} satisfies Config;