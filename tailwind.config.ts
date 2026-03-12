// tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        racing: {
          bg: '#080A0E',
          bg2: '#0D1017',
          bg3: '#111520',
          bg4: '#161B27',
          cyan: '#00E5FF',
          cyan2: '#0098AA',
          green: '#00FF87',
          green2: '#00CC6A',
          orange: '#FF6B2B',
          purple: '#7B5FFF',
          red: '#FF3B5B',
          yellow: '#FFD600',
        },
      },
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        mono: ['DM Mono', 'Fira Code', 'monospace'],
        display: ['Syne', 'system-ui', 'sans-serif'],
      },
      animation: {
        'card-in': 'cardIn 0.4s ease backwards',
        shimmer: 'shimmer 1.5s infinite',
      },
      keyframes: {
        cardIn: {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
      },
      boxShadow: {
        glow: '0 0 30px rgba(0,229,255,0.08)',
        'glow-green': '0 0 30px rgba(0,255,135,0.08)',
        card: '0 12px 40px rgba(0,0,0,0.4)',
      },
      backdropBlur: {
        xs: '4px',
      },
    },
  },
  plugins: [],
};

export default config;
