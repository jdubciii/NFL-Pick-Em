/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        broadcast: {
          base: '#0f172a',
          surface: '#1e293b',
          elevated: '#334155'
        },
        danger: {
          DEFAULT: '#e11d48',
          pulse: 'rgba(225, 29, 72, 0.2)'
        },
        safe: {
          DEFAULT: '#10b981'
        },
        active: {
          DEFAULT: '#06b6d4'
        }
      },
      boxShadow: {
        'glow-cyan': '0 0 15px rgba(6, 182, 212, 0.4)',
        'glow-rose': '0 0 15px rgba(225, 29, 72, 0.5)',
        'glow-emerald': '0 0 15px rgba(16, 185, 129, 0.3)'
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Roboto Mono', 'monospace'],
      }
    },
  },
  plugins: [],
}
