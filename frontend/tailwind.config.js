/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          950: '#06080F',
          900: '#0B0F19',
          850: '#111827',
          800: '#1A2333',
          700: '#26334D',
          600: '#3B4D6E',
        },
        atlas: {
          cyan: '#00F0FF',
          blue: '#38BDF8',
          indigo: '#6366F1',
          purple: '#A855F7',
          pink: '#EC4899',
          rose: '#F43F5E',
          emerald: '#10B981',
          amber: '#F59E0B',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 25px -5px rgba(0, 240, 255, 0.3)',
        'glow-red': '0 0 25px -5px rgba(244, 63, 94, 0.4)',
        'glow-purple': '0 0 25px -5px rgba(168, 85, 247, 0.35)',
      }
    },
  },
  plugins: [],
}
