/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: '#0B0F17',
          card: '#121824',
          accent: '#00F0FF',
          neon: '#10B981',
          gold: '#F59E0B',
          danger: '#EF4444',
        }
      }
    },
  },
  plugins: [],
}
