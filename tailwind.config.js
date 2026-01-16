/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#fffbf0',
          100: '#ffeedd',
          200: '#ffcc99',
          300: '#ffb366',
          400: '#ff9933',
          500: '#e68a00',
          600: '#cc7a00',
          700: '#8b4513',
          800: '#6b3610',
          900: '#4d260b',
        }
      }
    }
  },
  plugins: [],
}
