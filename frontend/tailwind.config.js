/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        night: '#0B0F17',
        surface: '#141B26',
        defense: {
          DEFAULT: '#84AA40',
          glow: 'rgba(132, 170, 64, 0.25)',
        },
        virality: {
          DEFAULT: '#F9A81C',
          glow: 'rgba(249, 168, 28, 0.25)',
        },
        adversary: {
          DEFAULT: '#EF4444',
          glow: 'rgba(239, 68, 68, 0.25)',
        }
      },
      fontFamily: {
        sans: ['Lato', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      }
    },
  },
  plugins: [],
}
