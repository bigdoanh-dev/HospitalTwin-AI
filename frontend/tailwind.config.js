/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        blue: { 50: '#eef3ff', 100: '#e1eaff', 200: '#c5d5ff', 600: '#3563e9', 700: '#2851d0', 800: '#213f9c' },
        slate: { 50: '#f5f7fb' },
        brand: {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#bae0fd',
          300: '#7cc5fb',
          400: '#38a5f8',
          500: '#0e87eb',
          600: '#026bc9',
          700: '#0355a3',
          800: '#074885',
          900: '#0c3d6e',
          950: '#082749',
        },
        navy: {
          800: '#0f172a',
          900: '#0b1120',
          950: '#060a14',
        },
        teal: {
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
        }
      },
      fontFamily: {
        sans: ['Inter', 'Be Vietnam Pro', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
